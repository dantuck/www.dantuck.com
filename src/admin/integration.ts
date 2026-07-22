/**
 * Astro CMS integration.
 *
 * - Injects /admin, /admin/edit, /admin/new, /admin/data/resume, /admin/data/about routes
 *   from src/admin/pages/
 * - Registers a Vite dev middleware that intercepts /admin/api/* and serves
 *   responses from the local filesystem (no GitHub/Cloudflare credentials needed).
 *
 * Usage in astro.config.mjs:
 *   import adminCms from './src/admin/integration.ts';
 *   export default defineConfig({ integrations: [adminCms()] });
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, rmdirSync } from 'fs';
import { join, relative, dirname } from 'path';
import type { Connect } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import type { AstroIntegration } from 'astro';
import { parseFrontmatter, assembleFile } from './lib/frontmatter';
import type { ArticleSummary, ArticleDetail, DataDetail, DataId } from './lib/types';
import { contentTypeOf, candidatePaths, type ContentTypeConfig } from './lib/content-types';

const ROOT = process.cwd();
const DATA_CONFIG: Record<DataId, { path: string; format: 'json' | 'markdown' }> = {
  resume: { path: 'src/data/resume.json', format: 'json' },
  about: { path: 'src/data/about.md', format: 'markdown' },
};

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

function findContentFiles(ct: ContentTypeConfig): string[] {
  const dir = join(ROOT, ct.dir);
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ct.pathStyle === 'flat') continue; // portfolio: no per-post subdirectories
      for (const sub of existsSync(full) ? readdirSync(full) : []) {
        if (sub === 'index.md' || sub === 'index.mdx') results.push(join(full, sub));
      }
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(full);
    }
  }
  return results;
}

function pathToSlug(absPath: string, ct: ContentTypeConfig): string {
  const rel = relative(join(ROOT, ct.dir), absPath);
  const noExt = rel.replace(/\.(mdx?)$/, '');
  const bare = noExt.endsWith('/index') ? noExt.slice(0, -'/index'.length) : noExt;
  return ct.slugPrefix + bare;
}

function slugToPath(slug: string, ct: ContentTypeConfig): string | undefined {
  return candidatePaths(slug, ct).map(p => join(ROOT, p)).find(existsSync);
}

function localStatus(fm: import('./lib/frontmatter.js').Frontmatter): ArticleSummary['status'] {
  if (fm.draft) return 'draft';
  if (!fm.publishDate) return 'draft';
  if (new Date(fm.publishDate) > new Date()) return 'scheduled';
  return 'live';
}

// ---------- route handlers: content collections (article/recipe/portfolio) ----------

function handleList(ct: ContentTypeConfig, res: ServerResponse) {
  const files = findContentFiles(ct);
  const articles: ArticleSummary[] = files.map(absPath => {
    const content = readFileSync(absPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);
    const slug = pathToSlug(absPath, ct);
    const rel = relative(ROOT, absPath);
    return {
      type: ct.id,
      slug,
      path: rel,
      title: frontmatter.title,
      publishDate: frontmatter.publishDate,
      description: frontmatter.description,
      tags: frontmatter.tags,
      status: localStatus(frontmatter),
    };
  });
  articles.sort((a, b) => {
    if (!a.publishDate && !b.publishDate) return 0;
    if (!a.publishDate) return 1;
    if (!b.publishDate) return -1;
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });
  jsonResponse(res, articles);
}

function handleDetail(slug: string, ct: ContentTypeConfig, res: ServerResponse) {
  const absPath = slugToPath(slug, ct);
  if (!absPath) { jsonResponse(res, { error: 'Not found' }, 404); return; }
  const content = readFileSync(absPath, 'utf-8');
  const { frontmatter, imports, body, extra } = parseFrontmatter(content);
  const rel = relative(ROOT, absPath);
  const detail: ArticleDetail = { type: ct.id, slug, path: rel, fileSha: 'local', branch: 'local', frontmatter, imports, body, extra };
  jsonResponse(res, detail);
}

async function handleSave(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as {
    type?: string; slug: string; path: string;
    frontmatter: import('./lib/frontmatter.js').Frontmatter;
    imports: string; body: string; extra?: string[];
  };
  if (!data.path.startsWith('src/pages/') && !data.path.startsWith('src/data/')) {
    jsonResponse(res, { error: 'Invalid path' }, 400); return;
  }
  if (data.path.includes('..')) { jsonResponse(res, { error: 'Invalid path' }, 400); return; }
  const absPath = join(ROOT, data.path);
  mkdirSync(join(absPath, '..'), { recursive: true });
  writeFileSync(absPath, assembleFile(data.frontmatter, data.imports, data.body, data.extra), 'utf-8');
  jsonResponse(res, { ok: true, fileSha: 'local', branch: 'local' });
}

async function handleSchedule(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as { type?: string; slug: string; path: string; publishDate: string };
  const ct = contentTypeOf(data.type);
  const absPath = slugToPath(data.slug, ct) ?? join(ROOT, data.path);
  if (!existsSync(absPath)) { jsonResponse(res, { error: 'Not found' }, 404); return; }
  const parsed = parseFrontmatter(readFileSync(absPath, 'utf-8'));
  parsed.frontmatter.publishDate = data.publishDate;
  writeFileSync(absPath, assembleFile(parsed.frontmatter, parsed.imports, parsed.body, parsed.extra), 'utf-8');
  jsonResponse(res, { ok: true });
}

async function handleUpload(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as { slug: string; filename: string; base64: string };
  const safeName = data.filename.toLowerCase().replace(/[^a-z0-9.\-]/g, '-').replace(/-+/g, '-');
  const assembledPath = `src/pages/${data.slug}/${safeName}`;
  if (!assembledPath.startsWith('src/pages/') || assembledPath.includes('..')) {
    jsonResponse(res, { error: 'Invalid path' }, 400); return;
  }
  const dir = join(ROOT, 'src/pages', data.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, safeName), Buffer.from(data.base64, 'base64'));
  jsonResponse(res, { ok: true, path: `./${safeName}`, fullPath: `src/pages/${data.slug}/${safeName}` });
}

async function handleUnpublish(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const data = JSON.parse(raw) as { type?: string; slug: string; path: string; redirectTo?: string };
  const ct = contentTypeOf(data.type);
  const absPath = slugToPath(data.slug, ct) ?? join(ROOT, data.path);
  if (!existsSync(absPath)) { jsonResponse(res, { error: 'Not found' }, 404); return; }
  const parsed = parseFrontmatter(readFileSync(absPath, 'utf-8'));
  parsed.frontmatter.draft = true;
  writeFileSync(absPath, assembleFile(parsed.frontmatter, parsed.imports, parsed.body, parsed.extra), 'utf-8');
  if (data.redirectTo) {
    const redirectsPath = join(ROOT, 'public/_redirects');
    const source = `/${data.slug}`;
    const safeRedirectTo = data.redirectTo.replace(/[\r\n]/g, '');
    const line = `${source}  ${safeRedirectTo}  301`;
    if (existsSync(redirectsPath)) {
      const lines = readFileSync(redirectsPath, 'utf-8').split('\n')
        .filter(l => !l.startsWith(`${source} `) && !l.startsWith(`${source}\t`) && !l.startsWith(`${source}  `));
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
  const data = JSON.parse(raw) as { type?: string; slug: string; path: string };
  const ct = contentTypeOf(data.type);
  const absPath = slugToPath(data.slug, ct) ?? join(ROOT, data.path);
  if (!existsSync(absPath)) { jsonResponse(res, { error: 'Not found' }, 404); return; }
  unlinkSync(absPath);
  const dir = dirname(absPath);
  try {
    if (readdirSync(dir).length === 0) rmdirSync(dir);
  } catch { /* leave it */ }
  jsonResponse(res, { ok: true });
}

// ---------- route handlers: JSON-singleton "site data" (resume/about) ----------

function handleDataGet(id: DataId, res: ServerResponse) {
  const config = DATA_CONFIG[id];
  const absPath = join(ROOT, config.path);
  if (!existsSync(absPath)) { jsonResponse(res, { error: 'Not found' }, 404); return; }
  const content = readFileSync(absPath, 'utf-8');
  const detail: DataDetail = config.format === 'json'
    ? { id, path: config.path, fileSha: 'local', branch: 'local', format: 'json', data: JSON.parse(content) }
    : { id, path: config.path, fileSha: 'local', branch: 'local', format: 'markdown', ...parseFrontmatter(content) };
  jsonResponse(res, detail);
}

async function handleDataSave(req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  const body = JSON.parse(raw) as { id: DataId } & Record<string, unknown>;
  const config = DATA_CONFIG[body.id];
  if (!config) { jsonResponse(res, { error: 'Unknown data id' }, 400); return; }
  const absPath = join(ROOT, config.path);
  const content = config.format === 'json'
    ? JSON.stringify(body.data, null, 2) + '\n'
    : assembleFile(body.frontmatter as import('./lib/frontmatter.js').Frontmatter, '', body.body as string, []);
  writeFileSync(absPath, content, 'utf-8');
  jsonResponse(res, { ok: true, fileSha: 'local' });
}

// ---------- Vite dev middleware ----------

const vitePlugin = {
  name: 'admin-local-api',
  configureServer(server: { middlewares: Connect.Server }) {
    server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
      const url = req.url?.split('?')[0];
      if (!url?.startsWith('/admin/api/')) return next();
      const qs = new URLSearchParams(req.url?.split('?')[1] ?? '');
      const method = req.method ?? 'GET';
      const route = url.replace('/admin/api/', '');
      const ct = contentTypeOf(qs.get('type'));
      try {
        if (route === 'articles' && method === 'GET') {
          const slug = qs.get('slug');
          if (slug) handleDetail(slug, ct, res); else handleList(ct, res);
          return;
        }
        if (route === 'save'      && method === 'POST') { await handleSave(req, res);      return; }
        if (route === 'schedule'  && method === 'POST') { await handleSchedule(req, res);  return; }
        if (route === 'upload'    && method === 'POST') { await handleUpload(req, res);    return; }
        if (route === 'status'    && method === 'GET')  { jsonResponse(res, { status: 'live' }); return; }
        if (route === 'publish'   && method === 'POST') { jsonResponse(res, { ok: true }); return; }
        if (route === 'unpublish' && method === 'POST') { await handleUnpublish(req, res); return; }
        if (route === 'delete'    && method === 'POST') { await handleDelete(req, res);    return; }
        if (route === 'data'      && method === 'GET') {
          const id = qs.get('id') as DataId | null;
          if (!id || !DATA_CONFIG[id]) { jsonResponse(res, { error: 'Unknown data id' }, 400); return; }
          handleDataGet(id, res);
          return;
        }
        if (route === 'data'      && method === 'POST') { await handleDataSave(req, res); return; }
      } catch (err) {
        jsonResponse(res, { error: String(err) }, 500);
        return;
      }
      next();
    });
  },
};

// ---------- Astro integration ----------

export default function adminCms(): AstroIntegration {
  return {
    name: 'admin-cms',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        injectRoute({ pattern: '/admin',             entrypoint: './src/admin/pages/index.astro' });
        injectRoute({ pattern: '/admin/edit',         entrypoint: './src/admin/pages/edit.astro' });
        injectRoute({ pattern: '/admin/new',          entrypoint: './src/admin/pages/new.astro' });
        injectRoute({ pattern: '/admin/data/resume',  entrypoint: './src/admin/pages/data-resume.astro' });
        injectRoute({ pattern: '/admin/data/about',   entrypoint: './src/admin/pages/data-about.astro' });
        updateConfig({ vite: { plugins: [vitePlugin] } });
      },
    },
  };
}
