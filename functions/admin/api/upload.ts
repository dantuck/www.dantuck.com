import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/lib/admin/github';
import { json, type Env } from './_types';

interface UploadBody {
  slug: string;     // e.g. "article/my-post"
  branch: string;   // draft branch name
  filename: string; // e.g. "hero.webp"
  base64: string;   // raw base64 (no data: prefix)
  existingSha?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const { slug, branch, filename, base64, existingSha } = await request.json() as UploadBody;

  // Slugify filename
  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, '-')
    .replace(/-+/g, '-');

  const dir = `src/pages/${slug}`;
  const path = `${dir}/${safeName}`;

  await gh.putBinary({
    path,
    base64,
    message: `image: add ${safeName} for ${slug}`,
    branch,
    sha: existingSha,
  });

  // Return the relative path to use in MDX import
  return json({ ok: true, path: `./${safeName}`, fullPath: path });
};
