import { readdirSync, readFileSync, rmSync, rmdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { parseFrontmatter, type Frontmatter } from '../admin/lib/frontmatter';

const PAGES_DIR = fileURLToPath(new URL('../pages', import.meta.url));
// Only these sections are date-gated; other pages (about, resume, ...) have no publishDate.
const GATED_SECTIONS = ['article', 'recipe'];

/** Draft, or dated in the future. A missing or unparseable publishDate stays visible. */
export function isUnpublished(fm: Pick<Frontmatter, 'draft' | 'publishDate'>, now = new Date()): boolean {
  if (fm.draft) return true;
  if (!fm.publishDate) return false;
  const date = new Date(fm.publishDate);
  return !Number.isNaN(date.getTime()) && date > now;
}

/** src/pages-relative content path → output pathname, e.g. article/a/index.md → /article/a/ */
export function pagePathname(relPath: string): string {
  const noExt = relPath.split(sep).join('/').replace(/\.mdx?$/, '');
  return `/${noExt.replace(/\/index$/, '')}/`;
}

function contentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return contentFiles(full);
    return /\.mdx?$/.test(entry.name) && !entry.name.startsWith('_') ? [full] : [];
  });
}

/** Pathnames of every draft or future-dated article/recipe. */
export function findUnpublished(pagesDir = PAGES_DIR, now = new Date()): string[] {
  return GATED_SECTIONS.flatMap(section => {
    try {
      return contentFiles(join(pagesDir, section));
    } catch {
      return [];
    }
  })
    .filter(file => isUnpublished(parseFrontmatter(readFileSync(file, 'utf-8')).frontmatter, now))
    .map(file => pagePathname(relative(pagesDir, file)));
}

/** For @astrojs/sitemap's `filter`: true when the URL is an unpublished page. */
export function isUnpublishedUrl(url: string, unpublished: string[] = findUnpublished()): boolean {
  return unpublished.includes(new URL(url).pathname);
}

/**
 * Astro builds a page for every file under src/pages, so a future `publishDate` only hides an
 * article from listings. Remove the built HTML so it is unreachable until a later rebuild
 * (the hourly scheduled-publish worker) finds its date has passed. Runs before pagefind indexes dist.
 */
export default function hideUnpublished(): AstroIntegration {
  return {
    name: 'hide-unpublished',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const out = fileURLToPath(dir);
        const hidden = findUnpublished();
        for (const pathname of hidden) {
          rmSync(join(out, pathname, 'index.html'), { force: true });
          try {
            rmdirSync(join(out, pathname));
          } catch {
            // directory still holds other files — leave it
          }
        }
        logger.info(`removed ${hidden.length} draft/scheduled page(s) from the build`);
      },
    },
  };
}
