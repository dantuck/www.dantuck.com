import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/lib/admin/github';
import { json, type Env } from './_types';

interface PublishBody {
  prNumber: number;
  title: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const { prNumber, title } = await request.json() as PublishBody;

  await gh.mergePR(prNumber, `publish: ${title}`);

  return json({ ok: true });
};
