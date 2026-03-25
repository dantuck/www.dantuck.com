// Prerequisite: run `npx playwright install chromium` once before using this script.
// Usage: pnpm screenshots
import { chromium, devices } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../public/images/portfolio');

const projects = [
  { url: 'https://www.adamsfenceco.com', filename: 'adamsfenceco.jpg' },
  { url: 'https://www.mirandatucker.com', filename: 'mirandatucker.jpg' },
  { url: 'https://www.marshdalepta.org', filename: 'marshdalepta.jpg' },
  { url: 'https://scratch.plantolive.app/about', filename: 'plantolive-scratch.jpg' },
  { url: 'https://mealq.plantolive.app', filename: 'plantolive-mealq.jpg' },
];

const DESKTOP = { width: 1280, height: 800 };
const MOBILE_DEVICE = devices['iPhone 14'];  // sets viewport, UA, deviceScaleFactor, touch

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
