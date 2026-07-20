import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/admin/lib/github';
import { parseFrontmatter } from '../../../src/admin/lib/frontmatter';
import { contentTypeOf, candidatePaths, stripSlugPrefix, type ContentTypeConfig } from '../../../src/admin/lib/content-types';
import { json, isLocalMode, type Env, type ArticleSummary } from './_types';
import { mockList, mockDetail } from './_mock';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const slugParam = url.searchParams.get('slug');
  const ct = contentTypeOf(url.searchParams.get('type'));
  if (isLocalMode(env)) return slugParam ? mockDetail(slugParam, ct.id) : mockList(ct.id);

  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);

  // --- Read single article ---
  if (slugParam) {
    const branchName = draftBranchName(slugParam, ct);
    const openPRs = await gh.listOpenPRs();
    const pr = openPRs.find(p => p.head.ref === branchName);
    const ref = pr ? branchName : 'master';

    let file = null;
    let filePath = '';
    for (const candidate of candidatePaths(slugParam, ct)) {
      file = await gh.getFile(candidate, ref);
      if (file) { filePath = candidate; break; }
    }

    if (!file) {
      return json({ error: 'Article not found' }, 404);
    }

    const rawContent = gh.decodeContent(file.content);
    const { frontmatter, imports, body, extra } = parseFrontmatter(rawContent);

    return json({
      type: ct.id,
      slug: slugParam,
      path: filePath,
      fileSha: file.sha,
      branch: ref,
      prNumber: pr?.number,
      frontmatter,
      imports,
      body,
      extra,
    });
  }

  // --- List all articles of this type ---
  const [tree, openPRs] = await Promise.all([
    gh.getTree('master'),
    gh.listOpenPRs(),
  ]);

  // Build a map of branch → PR for quick lookup
  const prByBranch = new Map<string, typeof openPRs[0]>();
  for (const pr of openPRs) {
    prByBranch.set(pr.head.ref, pr);
  }

  // Filter tree to this content type's files only
  const dirPrefix = `${ct.dir}/`;
  const contentFiles = tree.filter(
    item =>
      item.type === 'blob' &&
      item.path.startsWith(dirPrefix) &&
      (item.path.endsWith('.md') || item.path.endsWith('.mdx')) &&
      !item.path.includes('/_')
  );

  // Deduplicate: prefer index.md/mdx over flat files for same slug
  const slugMap = new Map<string, string>();
  for (const item of contentFiles) {
    const slug = pathToSlug(item.path, ct);
    const existing = slugMap.get(slug);
    if (!existing || item.path.includes('/index.')) {
      slugMap.set(slug, item.path);
    }
  }

  // Read frontmatter for each item in batches of 10
  const slugEntries = Array.from(slugMap.entries());
  const summaries: ArticleSummary[] = [];

  for (let i = 0; i < slugEntries.length; i += 10) {
    const batch = slugEntries.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async ([slug, path]) => {
        const file = await gh.getFile(path, 'master');
        if (!file) return null;
        const { frontmatter } = parseFrontmatter(gh.decodeContent(file.content));

        const branchName = draftBranchName(slug, ct);
        const pr = prByBranch.get(branchName);
        let status: ArticleSummary['status'] = 'live';
        if (pr) {
          const isScheduled = pr.labels.some(l => l.name === 'scheduled');
          status = isScheduled ? 'scheduled' : 'draft';
        }

        const summary: ArticleSummary = {
          type: ct.id,
          slug,
          path,
          title: frontmatter.title,
          publishDate: frontmatter.publishDate,
          description: frontmatter.description,
          tags: frontmatter.tags,
          status,
          prNumber: pr?.number,
          branch: pr ? branchName : undefined,
        };

        if (pr) {
          const branchSlug = branchName.replace(/\//g, '-').replace(/[^a-z0-9-]/g, '');
          summary.previewUrl = `https://${branchSlug}.${env.CF_PAGES_PROJECT}.pages.dev`;
        }

        return summary;
      })
    );
    summaries.push(...batchResults.filter((s): s is ArticleSummary => s !== null));
  }

  // Also find new drafts not on master yet
  for (const pr of openPRs) {
    if (!pr.head.ref.startsWith('draft/')) continue;
    const draftSlug = ct.slugPrefix + pr.head.ref.replace('draft/', '');
    if (summaries.some(s => s.slug === draftSlug)) continue;

    let file = null;
    let path = '';
    for (const c of candidatePaths(draftSlug, ct)) {
      file = await gh.getFile(c, pr.head.ref);
      if (file) { path = c; break; }
    }
    if (!file) continue;

    const { frontmatter } = parseFrontmatter(gh.decodeContent(file.content));
    const isScheduled = pr.labels.some(l => l.name === 'scheduled');
    const branchSlug = pr.head.ref.replace(/\//g, '-').replace(/[^a-z0-9-]/g, '');

    summaries.push({
      type: ct.id,
      slug: draftSlug,
      path,
      title: frontmatter.title,
      publishDate: frontmatter.publishDate,
      description: frontmatter.description,
      tags: frontmatter.tags,
      status: isScheduled ? 'scheduled' : 'draft',
      prNumber: pr.number,
      branch: pr.head.ref,
      previewUrl: `https://${branchSlug}.${env.CF_PAGES_PROJECT}.pages.dev`,
    });
  }

  // Sort: drafts/scheduled first, then by publishDate desc
  summaries.sort((a, b) => {
    if (a.status !== 'live' && b.status === 'live') return -1;
    if (a.status === 'live' && b.status !== 'live') return 1;
    const da = a.publishDate ? new Date(a.publishDate).getTime() : 0;
    const db = b.publishDate ? new Date(b.publishDate).getTime() : 0;
    return db - da;
  });

  return json(summaries);
};

/** Draft branch name for a slug under a content type, e.g. "article/foo" -> "draft/foo". */
export function draftBranchName(slug: string, ct: ContentTypeConfig): string {
  return `draft/${stripSlugPrefix(slug, ct)}`;
}

function pathToSlug(path: string, ct: ContentTypeConfig): string {
  // "src/pages/article/foo/index.md" → "article/foo"
  // "src/pages/article/foo.md" → "article/foo"
  // "src/data/portfolio/foo.md" → "foo" (no slug prefix)
  const rel = path
    .replace(`${ct.dir}/`, '')
    .replace(/\/index\.(md|mdx)$/, '')
    .replace(/\.(md|mdx)$/, '');
  return ct.slugPrefix + rel;
}
