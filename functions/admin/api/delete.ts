import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/lib/admin/github';
import { json, isLocalMode, type Env } from './_types';
import { mockOk } from './_mock';

interface DeleteBody {
  slug: string;
  path: string;
  fileSha: string;
  branch: string;   // 'master' for live articles, draft branch name otherwise
  prNumber?: number;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (isLocalMode(env)) return mockOk();

  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const { slug, path, fileSha, branch, prNumber } = await request.json() as DeleteBody;

  if (!path.startsWith('src/pages/') || path.includes('..')) {
    return json({ error: 'Invalid path' }, 400);
  }

  if (branch !== 'master') {
    // Draft: close PR and delete the branch — file was never on master
    if (prNumber) await gh.closePR(prNumber);
    await gh.deleteBranch(branch);
  } else {
    // Live: commit a deletion to master
    await gh.deleteFile(path, fileSha, `delete: remove ${slug}`, 'master');
  }

  return json({ ok: true });
};
