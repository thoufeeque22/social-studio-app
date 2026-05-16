import { chromium } from '@playwright/test';

(async () => {
  console.log('Attempting to launch browser...');
  try {
    const browser = await chromium.launch({ headless: true });
    console.log('Browser launched.');
    const page = await browser.newPage();
    console.log('New page created.');
    await page.goto('https://example.com');
    console.log('Navigated to example.com');
    const title = await page.title();
    console.log('Title:', title);
    await browser.close();
    console.log('Browser closed.');
  } catch (err) {
    console.error('Error:', err);
  }
})();
