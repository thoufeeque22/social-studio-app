import { test, expect } from '@playwright/test';

test.describe('Comparison Matrix Component', () => {
  // Use localhost instead of app.localhost to hit the marketing proxy rewrite
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/pricing');
  });

  test('desktop renders all plans side-by-side with sticky headers', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop only test');
    const matrix = page.locator('#compare');
    await expect(matrix).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 2000));
    
    // Check if table header is sticky
    const tableHeader = page.locator('thead th, thead td').first();
    const position = await tableHeader.evaluate((el) => window.getComputedStyle(el).position);
    expect(position).toBe('sticky');
  });

  test('categories can be expanded and collapsed', async ({ page }) => {
    const categoryRow = page.locator('tr', { hasText: 'Core Features' }).first();
    const featureRow = page.locator('tr', { hasText: 'Social Connections' }).first();

    // Scroll to matrix
    await page.locator('#compare').scrollIntoViewIfNeeded();

    // Features are expanded by default now, so it should be visible initially
    await expect(featureRow).toBeVisible();
    
    // Click category header to collapse
    await categoryRow.click();
    await expect(featureRow).not.toBeVisible();
    
    // Click again to expand
    await categoryRow.click();
    await expect(featureRow).toBeVisible();
  });

  test('mobile renders dropdown selector and compares two plans', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only test');
    // Scroll to matrix
    await page.locator('#compare').scrollIntoViewIfNeeded();
    
    const selects = page.locator('.MuiSelect-select');
    
    await expect(selects).toHaveCount(2);
    await expect(selects.first()).toBeVisible();
    await expect(selects.nth(1)).toBeVisible();
  });

  test('gracefully handles exceptionally long text content', async ({ page }) => {
    await page.locator('#compare').scrollIntoViewIfNeeded();
    const longTextCell = page.locator('th, td').filter({ hasText: 'Client Approval Workflows' }).first();
    if (await longTextCell.count() > 0) {
      await expect(longTextCell).toBeVisible();
      const box = await longTextCell.boundingBox();
      const viewport = page.viewportSize();
      expect(box!.width).toBeLessThanOrEqual(viewport!.width);
    }
  });
});
