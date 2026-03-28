import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/lib/admin/github';
import { parseFrontmatter, assembleFile } from '../../../src/lib/admin/frontmatter';
import { json, isLocalMode, type Env } from './_types';
import { mockOk } from './_mock';

interface ScheduleBody {
  prNumber: number;
  slug: string;
  path: string;
  branch: string;
  publishDate: string; // e.g. "27 Apr 2026 14:00 UTC"
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (isLocalMode(env)) return mockOk();
  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const { prNumber, path, branch, publishDate } = await request.json() as ScheduleBody;

  if (!path.startsWith('src/pages/') || path.includes('..')) {
    return json({ error: 'Invalid path' }, 400);
  }

  // Read current file from draft branch
  const file = await gh.getFile(path, branch);
  if (!file) return json({ error: 'File not found on branch' }, 404);

  const { frontmatter, imports, body, extra } = parseFrontmatter(gh.decodeContent(file.content));
  frontmatter.publishDate = publishDate;
  delete frontmatter.draft;

  await gh.putFile({
    path,
    content: assembleFile(frontmatter, imports, body, extra),
    message: `schedule: publish on ${publishDate}`,
    branch,
    sha: file.sha,
  });

  // Update PR labels: remove 'draft', add 'scheduled'
  await gh.removeLabel(prNumber, 'draft');
  await gh.addLabels(prNumber, ['scheduled']);

  return json({ ok: true });
};
