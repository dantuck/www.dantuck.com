import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/lib/admin/github';
import { parseFrontmatter } from '../../../src/lib/admin/frontmatter';
import { json, type Env, type ArticleSummary } from './_types';

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const url = new URL(request.url);
  const slugParam = url.searchParams.get('slug');

  // --- Read single article ---
  if (slugParam) {
    const branchName = `draft/${slugParam.replace('article/', '')}`;
    const openPRs = await gh.listOpenPRs();
    const pr = openPRs.find(p => p.head.ref === branchName);
    const ref = pr ? branchName : 'master';

    const candidates = [
      `src/pages/${slugParam}.md`,
      `src/pages/${slugParam}.mdx`,
      `src/pages/${slugParam}/index.md`,
      `src/pages/${slugParam}/index.mdx`,
    ];

    let file = null;
    let filePath = '';
    for (const candidate of candidates) {
      file = await gh.getFile(candidate, ref);
      if (file) { filePath = candidate; break; }
    }

    if (!file) {
      return json({ error: 'Article not found' }, 404);
    }

    const rawContent = gh.decodeContent(file.content);
    const { frontmatter, imports, body, extra } = parseFrontmatter(rawContent);

    return json({
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

  // --- List all articles ---
  const [tree, openPRs] = await Promise.all([
    gh.getTree('master'),
    gh.listOpenPRs(),
  ]);

  // Build a map of branch → PR for quick lookup
  const prByBranch = new Map<string, typeof openPRs[0]>();
  for (const pr of openPRs) {
    prByBranch.set(pr.head.ref, pr);
  }

  // Filter tree to article files only
  const articleFiles = tree.filter(
    item =>
      item.type === 'blob' &&
      item.path.startsWith('src/pages/article/') &&
      (item.path.endsWith('.md') || item.path.endsWith('.mdx')) &&
      !item.path.includes('/_')
  );

  // Deduplicate: prefer index.md/mdx over flat files for same slug
  const slugMap = new Map<string, string>();
  for (const item of articleFiles) {
    const slug = pathToSlug(item.path);
    const existing = slugMap.get(slug);
    if (!existing || item.path.includes('/index.')) {
      slugMap.set(slug, item.path);
    }
  }

  // Read frontmatter for each article in batches of 10
  const slugEntries = Array.from(slugMap.entries());
  const summaries: ArticleSummary[] = [];

  for (let i = 0; i < slugEntries.length; i += 10) {
    const batch = slugEntries.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async ([slug, path]) => {
        const file = await gh.getFile(path, 'master');
        if (!file) return null;
        const { frontmatter } = parseFrontmatter(gh.decodeContent(file.content));

        const branchName = `draft/${slug.replace('article/', '')}`;
        const pr = prByBranch.get(branchName);
        let status: ArticleSummary['status'] = 'live';
        if (pr) {
          const isScheduled = pr.labels.some(l => l.name === 'scheduled');
          status = isScheduled ? 'scheduled' : 'draft';
        }

        const summary: ArticleSummary = {
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
    const draftSlug = `article/${pr.head.ref.replace('draft/', '')}`;
    if (summaries.some(s => s.slug === draftSlug)) continue;

    const candidates = [
      `src/pages/${draftSlug}/index.md`,
      `src/pages/${draftSlug}/index.mdx`,
      `src/pages/${draftSlug}.md`,
      `src/pages/${draftSlug}.mdx`,
    ];
    let file = null;
    let path = '';
    for (const c of candidates) {
      file = await gh.getFile(c, pr.head.ref);
      if (file) { path = c; break; }
    }
    if (!file) continue;

    const { frontmatter } = parseFrontmatter(gh.decodeContent(file.content));
    const isScheduled = pr.labels.some(l => l.name === 'scheduled');
    const branchSlug = pr.head.ref.replace(/\//g, '-').replace(/[^a-z0-9-]/g, '');

    summaries.push({
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

function pathToSlug(path: string): string {
  // "src/pages/article/foo/index.md" → "article/foo"
  // "src/pages/article/foo.md" → "article/foo"
  return path
    .replace('src/pages/', '')
    .replace(/\/index\.(md|mdx)$/, '')
    .replace(/\.(md|mdx)$/, '');
}
