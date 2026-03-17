import type { APIRoute } from 'astro';
import { buildDefaultOgImage } from '../../lib/og';

export const GET: APIRoute = async () => {
  const buffer = await buildDefaultOgImage();
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png' },
  });
};
