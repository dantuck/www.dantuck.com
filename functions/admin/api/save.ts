import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/admin/lib/github';
import { assembleFile, type ArticleFrontmatter } from '../../../src/admin/lib/frontmatter';
import { json, isLocalMode, type Env } from './_types';
import { mockSave } from './_mock';

interface SaveBody {
  slug: string;           // e.g. "article/my-post"
  path: string;           // e.g. "src/pages/article/my-post/index.md"
  fileSha?: string;       // current SHA if file exists; omit for first save
  frontmatter: ArticleFrontmatter;
  imports: string;        // MDX imports block (may be empty string)
  body: string;           // Markdown body
  extra?: string[];       // passthrough frontmatter lines (e.g. layout)
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (isLocalMode(env)) return mockSave();
  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const data = await request.json() as SaveBody;

  if (!data.path.startsWith('src/pages/') || data.path.includes('..')) {
    return json({ error: 'Invalid path' }, 400);
  }

  const branchName = `draft/${data.slug.replace('article/', '')}`;
  const content = assembleFile(data.frontmatter, data.imports, data.body, data.extra);

  // Check if file exists on the draft branch already
  const existingFile = await gh.getFile(data.path, branchName);
  const isFirstSave = !existingFile;

  if (isFirstSave) {
    // Create branch off master
    const sha = await gh.masterSha();
    await gh.createBranch(branchName, sha);
  }

  // Commit the file
  await gh.putFile({
    path: data.path,
    content,
    message: `draft: update ${data.frontmatter.title}`,
    branch: branchName,
    sha: existingFile?.sha ?? data.fileSha,
  });

  // Read back the new file SHA
  const savedFile = await gh.getFile(data.path, branchName);

  if (isFirstSave) {
    // Create PR labeled 'draft'
    const prNumber = await gh.createPR(
      `Draft: ${data.frontmatter.title}`,
      branchName,
      `CMS draft for \`${data.slug}\``
    );
    await gh.addLabels(prNumber, ['draft']);

    const branchSlug = branchName.replace(/\//g, '-').replace(/[^a-z0-9-]/g, '');
    return json({
      ok: true,
      prNumber,
      branch: branchName,
      fileSha: savedFile?.sha,
      previewUrl: `https://${branchSlug}.${env.CF_PAGES_PROJECT}.pages.dev`,
    });
  }

  return json({ ok: true, fileSha: savedFile?.sha });
};
