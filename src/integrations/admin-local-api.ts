/**
 * Vite dev plugin: intercepts /admin/api/* and serves responses from the local filesystem.
 * Only active during `astro dev` — not included in production builds.
 *
 * Supports all the same endpoints as the Cloudflare Pages Functions:
 *   GET  /admin/api/articles          → list all articles
 *   GET  /admin/api/articles?slug=…   → get one article
 *   POST /admin/api/save              → write file to disk
 *   POST /admin/api/schedule          → update publishDate and write
 *   POST /admin/api/upload            → write base64 image to disk
 *   GET  /admin/api/status            → { status: 'live' } (no deploy in local mode)
 *   POST /admin/api/publish           → no-op (no PR to merge)
 *   POST /admin/api/delete            → delete file (and empty parent dir) from disk
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, rmdirSync } from 'fs';
import { join, relative, extname, dirname } from 'path';
import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { parseFrontmatter, assembleFile } from '../lib/admin/frontmatter.js';
import type { ArticleSummary, ArticleDetail } from '../lib/admin/types.js';

const ROOT = process.cwd();
const ARTICLES_DIR = join(ROOT, 'src/pages/article');

// ---------- helpers ----------

function jsonResponse(res: ServerResponse, data: unknown, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', (chunk: Buffer) => { buf += chunk.toString(); });
    req.on('end', () => resolve(buf));
    req.on('error', reject);
  });
}

/** Recursively find all .md / .mdx files under a directory. */
function findArticleFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findArticleFiles(full));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
}

/** Convert an absolute path like …/src/pages/article/foo/index.md to "article/foo" */
function pathToSlug(absPath: string): string {
  const rel = relative(join(ROOT, 'src/pages'), absPath);
  // rel looks like "article/foo/index.md" or "article/bar.md"
  const noExt = rel.replace(/\.(mdx?)$/, '');
  return noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt;
}

/** Convert slug back to the most likely filesystem path (prefers index.md/mdx). */
function slugToPath(slug: string): string | undefined {
  // Try index.md, index.mdx, slug.md, slug.mdx
  const candidates = [
    join(ROOT, 'src/pages', slug, 'index.md'),
    join(ROOT, 'src/pages', slug, 'index.mdx'),
    join(ROOT, 'src/pages', `${slug}.md`),
    join(ROOT, 'src/pages', `${slug}.mdx`),
  ];
  return candidates.find(existsSync);
}

// ---------- helpers ----------

function localStatus(fm: import('../lib/admin/frontmatter.js').ArticleFrontmatter): ArticleSummary['status'] {
  if (fm.draft) return 'draft';
  if (!fm.publishDate) return 'draft';
  if (new Date(fm.publishDate) > new Date()) return 'scheduled';
  return 'live';
}

// ---------- route handlers ----------

function handleList(res: ServerResponse) {
  const files = findArticleFiles(ARTICLES_DIR);
  const articles: ArticleSummary[] = files.map(absPath => {
    const content = readFileSync(absPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    const slug = pathToSlug(absPath);
    const rel = relative(ROOT, absPath);
    return {
      slug,
      path: rel,
      title: frontmatter.title,
      publishDate: frontmatter.publishDate,
      description: frontmatter.description,
      tags: frontmatter.tags,
      status: localStatus(frontmatter),
    };
  });
  // Sort newest first
  articles.sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });
  jsonResponse(res, articles);
}

function handleDetail(slug: string, res: ServerResponse) {
  const absPath = slugToPath(slug);
  if (!absPath) {
    jsonResponse(res, { error: 'Not found' }, 404);
    return;
  }
  const content = readFileSync(absPath, 'utf-8');
  const { frontmatter, imports, body, extra } = parseFrontmatter(content);
  const rel = relative(ROOT, absPath);
  const detail: ArticleDetail = {
    slug,
    path: rel,
    fileSha: 'local',
    branch: 'local',
    frontmatter,
    imports,
    body,
    extra,
  };
  jsonResponse(res, detail);
}

async function handleSave(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as {
    slug: string;
    path: string;
    frontmatter: import('../lib/admin/frontmatter.js').ArticleFrontmatter;
    imports: string;
    body: string;
    extra?: string[];
  };

  const absPath = join(ROOT, data.path);
  mkdirSync(join(absPath, '..'), { recursive: true });
  const content = assembleFile(data.frontmatter, data.imports, data.body, data.extra);
  writeFileSync(absPath, content, 'utf-8');

  jsonResponse(res, { ok: true, fileSha: 'local', branch: 'local' });
}

async function handleSchedule(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as {
    slug: string;
    path: string;
    publishDate: string;
    frontmatter?: import('../lib/admin/frontmatter.js').ArticleFrontmatter;
    imports?: string;
    body?: string;
    extra?: string[];
  };

  const absPath = slugToPath(data.slug) ?? join(ROOT, data.path);
  if (!existsSync(absPath)) {
    jsonResponse(res, { error: 'Not found' }, 404);
    return;
  }
  const content = readFileSync(absPath, 'utf-8');
  const parsed = parseFrontmatter(content);
  parsed.frontmatter.publishDate = data.publishDate;
  const updated = assembleFile(parsed.frontmatter, parsed.imports, parsed.body, parsed.extra);
  writeFileSync(absPath, updated, 'utf-8');

  jsonResponse(res, { ok: true });
}

async function handleUpload(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as {
    slug: string;
    filename: string;
    base64: string;
  };

  const safeName = data.filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-]/g, '-')
    .replace(/-+/g, '-');

  const dir = join(ROOT, 'src/pages', data.slug);
  mkdirSync(dir, { recursive: true });
  const absPath = join(dir, safeName);
  writeFileSync(absPath, Buffer.from(data.base64, 'base64'));

  jsonResponse(res, { ok: true, path: `./${safeName}`, fullPath: `src/pages/${data.slug}/${safeName}` });
}

async function handleUnpublish(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as { slug: string; path: string; redirectTo?: string };

  const absPath = slugToPath(data.slug) ?? join(ROOT, data.path);
  if (!existsSync(absPath)) {
    jsonResponse(res, { error: 'Not found' }, 404);
    return;
  }

  // Set draft: true in frontmatter
  const content = readFileSync(absPath, 'utf-8');
  const parsed = parseFrontmatter(content);
  parsed.frontmatter.draft = true;
  writeFileSync(absPath, assembleFile(parsed.frontmatter, parsed.imports, parsed.body, parsed.extra), 'utf-8');

  // Optionally add to public/_redirects
  if (data.redirectTo) {
    const redirectsPath = join(ROOT, 'public/_redirects');
    const source = `/${data.slug}`;
    const safeRedirectTo = data.redirectTo.replace(/[\r\n]/g, '');
    const line = `${source}  ${safeRedirectTo}  301`;
    if (existsSync(redirectsPath)) {
      const current = readFileSync(redirectsPath, 'utf-8');
      const lines = current.split('\n').filter(l => !l.startsWith(`${source} `) && !l.startsWith(`${source}\t`) && !l.startsWith(`${source}  `));
      lines.push(line);
      writeFileSync(redirectsPath, lines.join('\n').trimStart() + '\n', 'utf-8');
    } else {
      writeFileSync(redirectsPath, line + '\n', 'utf-8');
    }
  }

  jsonResponse(res, { ok: true });
}

async function handleDelete(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as { slug: string; path: string };

  const absPath = slugToPath(data.slug) ?? join(ROOT, data.path);
  if (!existsSync(absPath)) {
    jsonResponse(res, { error: 'Not found' }, 404);
    return;
  }

  unlinkSync(absPath);

  // Remove the parent directory if it is now empty
  const dir = dirname(absPath);
  try {
    const remaining = readdirSync(dir);
    if (remaining.length === 0) rmdirSync(dir);
  } catch { /* leave it if anything goes wrong */ }

  jsonResponse(res, { ok: true });
}

// ---------- plugin ----------

export const adminLocalApiPlugin = {
  name: 'admin-local-api',
  configureServer(server: { middlewares: Connect.Server }) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
      const url = req.url?.split('?')[0];
      if (!url?.startsWith('/admin/api/')) return next();

      const qs = new URLSearchParams(req.url?.split('?')[1] ?? '');
      const method = req.method ?? 'GET';
      const route = url.replace('/admin/api/', '');

      try {
        if (route === 'articles' && method === 'GET') {
          const slug = qs.get('slug');
          if (slug) handleDetail(slug, res);
          else handleList(res);
          return;
        }
        if (route === 'save' && method === 'POST') {
          await handleSave(req, res);
          return;
        }
        if (route === 'schedule' && method === 'POST') {
          await handleSchedule(req, res);
          return;
        }
        if (route === 'upload' && method === 'POST') {
          await handleUpload(req, res);
          return;
        }
        if (route === 'status' && method === 'GET') {
          jsonResponse(res, { status: 'live' });
          return;
        }
        if (route === 'publish' && method === 'POST') {
          // No-op in local mode
          jsonResponse(res, { ok: true });
          return;
        }
        if (route === 'unpublish' && method === 'POST') {
          await handleUnpublish(req, res);
          return;
        }
        if (route === 'delete' && method === 'POST') {
          await handleDelete(req, res);
          return;
        }
      } catch (err) {
        jsonResponse(res, { error: String(err) }, 500);
        return;
      }

      next();
    });
  },
};
