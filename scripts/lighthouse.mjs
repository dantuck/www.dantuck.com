// Prerequisite: Google Chrome installed, and a production build in ./dist (`pnpm build`).
// Usage: pnpm lighthouse [--mobile|--desktop] [--min=90] [--url=/some/path ...]
// Serves ./dist with a minimal static server, audits key pages, prints a score table,
// writes HTML reports to ./.lighthouse, and exits 1 if any category is below --min.
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import * as chromeLauncher from 'chrome-launcher';
import { createServer } from 'http';
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const outputDir = path.join(root, '.lighthouse');
const port = 4399;
const base = `http://localhost:${port}`;

const args = process.argv.slice(2);
const flag = name => args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
const desktop = args.includes('--desktop');
const minScore = Number(flag('min') ?? 0);
const customUrls = args.filter(a => a.startsWith('--url=')).map(a => a.split('=')[1]);

const categories = ['performance', 'accessibility', 'best-practices', 'seo'];

/** First built page under a section, e.g. dist/article/<slug>/index.html → /article/<slug>/ */
async function firstPage(section) {
  try {
    const entries = await readdir(path.join(distDir, section), { withFileTypes: true });
    for (const e of entries.filter(e => e.isDirectory())) {
      if (await stat(path.join(distDir, section, e.name, 'index.html')).then(() => true, () => false)) return `/${section}/${e.name}/`;
    }
  } catch {
    return undefined;
  }
}

const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain',
};

// Mirrors Cloudflare Pages: /foo/ → dist/foo/index.html, /foo → dist/foo.html or dist/foo/index.html
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, base).pathname);
  const candidates = [pathname, path.join(pathname, 'index.html'), `${pathname}.html`];
  for (const candidate of candidates) {
    const file = path.join(distDir, candidate);
    if (!file.startsWith(distDir)) break;
    try {
      if (!(await stat(file)).isFile()) continue;
      const immutable = candidate.startsWith('/_astro/') || candidate.startsWith('/fonts/');
      res.writeHead(200, {
        'content-type': mime[path.extname(file)] ?? 'application/octet-stream',
        ...(immutable && { 'cache-control': 'public, max-age=31536000, immutable' }),
      });
      res.end(await readFile(file));
      return;
    } catch {}
  }
  res.writeHead(404).end('Not found');
});
await new Promise(resolve => server.listen(port, resolve));
const chrome = { current: undefined };

async function cleanup() {
  server.close();
  await chrome.current?.kill();
}

try {
  const pages = customUrls.length
    ? customUrls
    : ['/', '/about/', await firstPage('article'), await firstPage('recipe')].filter(Boolean);

  await mkdir(outputDir, { recursive: true });
  chrome.current = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });

  // Lighthouse's own desktop preset: desktop form factor *and* desktop throttling (not mobile 4G + 4x CPU).
  const config = desktop ? desktopConfig : undefined;

  const rows = [];
  let failed = false;
  for (const page of pages) {
    const result = await lighthouse(
      base + page,
      { port: chrome.current.port, output: 'html', onlyCategories: categories },
      config,
    );
    const scores = Object.fromEntries(
      categories.map(c => [c, Math.round((result.lhr.categories[c].score ?? 0) * 100)]),
    );
    if (Object.values(scores).some(s => s < minScore)) failed = true;
    const name = page === '/' ? 'home' : page.replace(/^\/|\/$/g, '').replace(/\//g, '_');
    await writeFile(path.join(outputDir, `${name}.html`), result.report);
    rows.push({ page, perf: scores.performance, a11y: scores.accessibility, 'best-practices': scores['best-practices'], seo: scores.seo });
  }

  console.log(`\nLighthouse (${desktop ? 'desktop' : 'mobile'}) — reports in .lighthouse/\n`);
  console.table(rows);
  if (failed) {
    console.error(`Some scores are below --min=${minScore}`);
    process.exitCode = 1;
  }
} finally {
  await cleanup();
}
