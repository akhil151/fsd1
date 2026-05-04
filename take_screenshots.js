import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const pagesToScreenshot = [
    { url: 'http://localhost:3000/', name: 'home' },
    { url: 'http://localhost:3000/dashboard', name: 'dashboard' },
    { url: 'http://localhost:3000/join', name: 'join' },
    { url: 'http://localhost:3000/lobby', name: 'lobby' },
    { url: 'http://localhost:3000/host-lobby/12345', name: 'host-lobby' },
    { url: 'http://localhost:3000/match-control/12345', name: 'match-control' },
    { url: 'http://localhost:3000/arena', name: 'arena' },
    { url: 'http://localhost:3000/post-match', name: 'post-match' },
    { url: 'http://localhost:3000/analytics/1', name: 'analytics' }
  ];

  for (const { url, name } of pagesToScreenshot) {
    try {
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const filePath = path.join(__dirname, 'photos', `${name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`Saved screenshot to ${filePath}`);
    } catch (e) {
      console.error(`Failed to take screenshot of ${url}: ${e}`);
    }
  }

  await browser.close();
}

takeScreenshots();
