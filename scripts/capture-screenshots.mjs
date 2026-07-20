// Prerequisite: run `npx playwright install chromium` once before using this script.
// Usage: pnpm screenshots
import { chromium, devices } from 'playwright';
import { mkdir, readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../public/images/portfolio');
const portfolioDir = path.resolve(__dirname, '../src/data/portfolio');

/** Minimal frontmatter field reader — just enough for the flat key: value lines portfolio entries use. */
function readField(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
}

async function loadProjects() {
  const files = (await readdir(portfolioDir)).filter(f => f.endsWith('.md'));
  const projects = [];
  for (const file of files) {
    const content = await readFile(path.join(portfolioDir, file), 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;
    const frontmatter = match[1];
    if (readField(frontmatter, 'draft') === 'true') continue;
    const url = readField(frontmatter, 'screenshotUrl') ?? readField(frontmatter, 'url');
    const filename = readField(frontmatter, 'screenshot');
    if (!url || !filename) continue;
    projects.push({ url, filename });
  }
  return projects;
}

const DESKTOP = { width: 1280, height: 800 };
const MOBILE_DEVICE = devices['iPhone 14'];  // sets viewport, UA, deviceScaleFactor, touch

const projects = await loadProjects();
if (projects.length === 0) {
  console.log('No portfolio entries with url + screenshot found — nothing to capture.');
  process.exit(0);
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const mobileContext = await browser.newContext(MOBILE_DEVICE);

async function capture(page, url, outPath, filename) {
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
    console.log(`  → saved ${filename}`);
  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
  } finally {
    await page.close();
  }
}

for (const project of projects) {
  const base = project.filename.replace('.jpg', '');

  console.log(`Capturing ${project.url} [desktop]...`);
  const desktopPage = await browser.newPage();
  await desktopPage.setViewportSize(DESKTOP);
  await capture(desktopPage, project.url, path.join(outputDir, project.filename), project.filename);

  const mobileFilename = `${base}-mobile.jpg`;
  console.log(`Capturing ${project.url} [mobile]...`);
  const mobilePage = await mobileContext.newPage();
  await capture(mobilePage, project.url, path.join(outputDir, mobileFilename), mobileFilename);
}

await mobileContext.close();
await browser.close();
console.log('Done.');
