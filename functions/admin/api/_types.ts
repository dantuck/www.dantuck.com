export type { ArticleSummary } from '../../../src/admin/lib/types';
import { CONTENT_TYPES } from '../../../src/admin/lib/content-types';

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  CF_PAGES_PROJECT: string;
  LOCAL_MODE?: string;
}

/** JSON-singleton "site data" documents editable outside the collection-of-posts flow. */
export const DATA_PATHS: Record<string, string> = {
  resume: 'src/data/resume.json',
  about: 'src/data/about.json',
};

const ALLOWED_DIRS = [
  ...Object.values(CONTENT_TYPES).map(ct => `${ct.dir}/`),
  ...Object.values(DATA_PATHS),
];

/** Guards against path traversal and confines writes to known content directories/files. */
export function isAllowedPath(path: string): boolean {
  if (path.includes('..')) return false;
  return ALLOWED_DIRS.some(allowed => path === allowed || path.startsWith(allowed));
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
