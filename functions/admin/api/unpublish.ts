import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/admin/lib/github';
import { parseFrontmatter, assembleFile } from '../../../src/admin/lib/frontmatter';
import { json, isLocalMode, type Env } from './_types';
import { mockOk } from './_mock';

interface UnpublishBody {
  slug: string;
  path: string;
  fileSha: string;
  redirectTo?: string; // e.g. "/" or "/article/other-post"
}

const REDIRECTS_PATH = 'public/_redirects';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (isLocalMode(env)) return mockOk();

  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const { slug, path, fileSha, redirectTo } = await request.json() as UnpublishBody;

  if (!path.startsWith('src/pages/') || path.includes('..')) {
    return json({ error: 'Invalid path' }, 400);
  }

  // 1. Read current file from master and set draft: true
  const file = await gh.getFile(path, 'master');
  if (!file) return json({ error: 'Article not found on master' }, 404);

  const raw = gh.decodeContent(file.content);
  const { frontmatter, imports, body, extra } = parseFrontmatter(raw);
  frontmatter.draft = true;
  const updated = assembleFile(frontmatter, imports, body, extra);

  await gh.putFile({
    path,
    content: updated,
    message: `unpublish: draft ${slug}`,
    branch: 'master',
    sha: fileSha ?? file.sha,
  });

  // 2. Add redirect entry to public/_redirects (if requested)
  if (redirectTo) {
    await updateRedirects(gh, slug, redirectTo);
  }

  return json({ ok: true });
};

async function updateRedirects(gh: GitHubClient, slug: string, redirectTo: string) {
  const source = `/${slug}`;
  const safeRedirectTo = redirectTo.replace(/[\r\n]/g, '');
  const line = `${source}  ${safeRedirectTo}  301`;

  const existing = await gh.getFile(REDIRECTS_PATH, 'master');
  let content: string;
  let sha: string | undefined;

  if (existing) {
    const current = gh.decodeContent(existing.content);
    sha = existing.sha;
    // Replace existing entry for this slug if present, otherwise append
    const lines = current.split('\n').filter(l => !l.startsWith(`${source} `) && !l.startsWith(`${source}\t`));
    lines.push(line);
    content = lines.join('\n').trimStart() + '\n';
  } else {
    content = line + '\n';
  }

  await gh.putFile({
    path: REDIRECTS_PATH,
    content,
    message: `redirect: ${slug} → ${redirectTo}`,
    branch: 'master',
    sha,
  });
}
