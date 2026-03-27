import type { APIRoute, GetStaticPaths } from 'astro';
import { buildOgImage } from '../../lib/og';

function deriveSlug(filePath: string): string {
  // Vite returns absolute-style keys for absolute globs: '/src/pages/article/nix/git.md'
  return filePath
    .replace(/^.*\/src\/pages\//, '')  // 'article/nix/git.md'
    .replace(/\.(md|mdx)$/, '')         // 'article/nix/git'
    .replace(/\/index$/, '');           // 'article/git-backup'
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Use absolute glob patterns so Vite returns absolute-style keys ('/src/pages/article/...')
  // which the deriveSlug regex can match. Relative globs produce relative keys ('../article/...')
  // that the regex cannot match.
  const articles = import.meta.glob('/src/pages/article/**/*.{md,mdx}', { eager: true });
  const recipes = import.meta.glob('/src/pages/recipe/**/*.md', { eager: true });
  const all = { ...articles, ...recipes };

  return Object.entries(all)
    .filter(([, mod]: any) => !mod.frontmatter?.draft && new Date(mod.frontmatter?.publishDate) <= new Date())
    .map(([filePath, mod]: any) => ({
      params: { slug: deriveSlug(filePath) },
      props: { frontmatter: mod.frontmatter },
    }));
};

export const GET: APIRoute = async ({ props }) => {
  const { frontmatter } = props as any;
  const { title, tags, publishDate, image } = frontmatter;

  const buffer = await buildOgImage({ title, tags, publishDate, image });
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png' },
  });
};
