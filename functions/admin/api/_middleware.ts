import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from './_types';

/**
 * Guards all /admin/api/* routes.
 * If ADMIN_SECRET is set in the environment, every request must include:
 *   Authorization: Bearer <ADMIN_SECRET>
 * If ADMIN_SECRET is not set, requests pass through (rely on Cloudflare Access or local dev).
 */
export const onRequest: PagesFunction<Env> = async ({ env, request, next }) => {
  if (!env.ADMIN_SECRET) return next();

  const auth = request.headers.get('Authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token || token !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return next();
};
