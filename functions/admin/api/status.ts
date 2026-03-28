import type { PagesFunction } from '@cloudflare/workers-types';
import { json, isLocalMode, type Env } from './_types';
import { mockStatus } from './_mock';

interface CFDeployment {
  id: string;
  environment: string;
  deployment_trigger: { metadata: { branch: string } };
  latest_stage: { name: string; status: 'success' | 'failure' | 'active' | 'idle' };
  url: string;
  created_on: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (isLocalMode(env)) return mockStatus();
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/pages/projects/${env.CF_PAGES_PROJECT}/deployments?per_page=5`,
    {
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!res.ok) {
    return json({ error: 'Failed to fetch deployments' }, 502);
  }

  const data = await res.json() as { result: CFDeployment[] };
  const latest = data.result?.[0];

  if (!latest) return json({ status: 'unknown' });

  const stageName = latest.latest_stage.name;
  const stageStatus = latest.latest_stage.status;

  const deployStatus =
    stageStatus === 'failure' ? 'failed' :
    stageStatus === 'success' && stageName === 'deploy' ? 'live' :
    'building';

  return json({
    status: deployStatus,
    url: latest.url,
    branch: latest.deployment_trigger?.metadata?.branch,
    createdOn: latest.created_on,
  });
};
