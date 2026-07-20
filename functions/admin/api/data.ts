import type { PagesFunction } from '@cloudflare/workers-types';
import { GitHubClient } from '../../../src/admin/lib/github';
import { json, isLocalMode, DATA_PATHS, type Env } from './_types';
import { mockDataDetail, mockSave } from './_mock';
import type { DataDetail, DataId } from '../../../src/admin/lib/types';

function pathFor(id: string): string | undefined {
  return DATA_PATHS[id];
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') as DataId | null;
  const path = id && pathFor(id);
  if (!id || !path) return json({ error: 'Unknown data id' }, 400);
  if (isLocalMode(env)) return mockDataDetail(id);

  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const branchName = `draft/data-${id}`;
  const openPRs = await gh.listOpenPRs();
  const pr = openPRs.find(p => p.head.ref === branchName);
  const ref = pr ? branchName : 'master';

  const file = await gh.getFile(path, ref);
  if (!file) return json({ error: 'Not found' }, 404);

  const detail: DataDetail = {
    id,
    path,
    fileSha: file.sha,
    branch: ref,
    prNumber: pr?.number,
    data: JSON.parse(gh.decodeContent(file.content)),
  };
  return json(detail);
};

interface SaveDataBody {
  id: DataId;
  fileSha?: string;
  data: unknown;
}

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  if (isLocalMode(env)) return mockSave();
  const gh = new GitHubClient(env.GITHUB_TOKEN, env.GITHUB_REPO);
  const { id, fileSha, data } = await request.json() as SaveDataBody;
  const path = pathFor(id);
  if (!path) return json({ error: 'Unknown data id' }, 400);

  const branchName = `draft/data-${id}`;
  const content = JSON.stringify(data, null, 2) + '\n';

  const existingFile = await gh.getFile(path, branchName);
  const isFirstSave = !existingFile;

  if (isFirstSave) {
    const sha = await gh.masterSha();
    await gh.createBranch(branchName, sha);
  }

  await gh.putFile({
    path,
    content,
    message: `data: update ${id}`,
    branch: branchName,
    sha: existingFile?.sha ?? fileSha,
  });

  const savedFile = await gh.getFile(path, branchName);

  if (isFirstSave) {
    const prNumber = await gh.createPR(`Draft: update ${id}`, branchName, `CMS draft for \`data/${id}\``);
    await gh.addLabels(prNumber, ['draft']);
    return json({ ok: true, prNumber, branch: branchName, fileSha: savedFile?.sha });
  }

  return json({ ok: true, fileSha: savedFile?.sha });
};
