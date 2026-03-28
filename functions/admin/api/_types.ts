export type { ArticleSummary } from '../../../src/lib/admin/types';

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  CF_PAGES_PROJECT: string;
  LOCAL_MODE?: string;
}

export function isLocalMode(env: Env): boolean {
  return env.LOCAL_MODE === 'true';
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
