import { chromium } from '../../../../../../frontend/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 320, height: 812 } });
const measurements = [];

for (const width of [320, 375, 767, 768, 1440]) {
  for (const zoom of [1, 2]) {
    const samples = [];
    for (const repeat of [1, 2, 3, 4, 5]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    await page.evaluate((value) => {
      document.documentElement.style.zoom = String(value);
    }, zoom);
    const measurement = await page.evaluate(() => ({
      viewport: window.innerWidth,
      client: document.documentElement.clientWidth,
      htmlScroll: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      overflowX: getComputedStyle(document.documentElement).overflowX,
    }));
    samples.push({ repeat, ...measurement });
    await page.evaluate(() => {
      document.documentElement.style.zoom = '1';
    });
    }
    measurements.push({ width, zoom, samples });
  }
}

await browser.close();
console.log(JSON.stringify(measurements));
