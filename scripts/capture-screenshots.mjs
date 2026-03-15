import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '../public/images/portfolio');

const projects = [
  { url: 'https://www.adamsfenceco.com', filename: 'adamsfenceco.jpg' },
  { url: 'https://www.mirandatucker.com', filename: 'mirandatucker.jpg' },
  { url: 'https://www.marshdalepta.com', filename: 'marshdalepta.jpg' },
  { url: 'https://scratch.plantolive.app', filename: 'plantolive-scratch.jpg' },
  { url: 'https://mealq.plantolive.app', filename: 'plantolive-mealq.jpg' },
];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

for (const project of projects) {
  console.log(`Capturing ${project.url}...`);
  try {
    await page.goto(project.url, { waitUntil: 'networkidle', timeout: 30000 });
    const outPath = path.join(outputDir, project.filename);
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
    console.log(`  → saved ${project.filename}`);
  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
  }
}

await browser.close();
console.log('Done.');
