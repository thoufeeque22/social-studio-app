import { test, expect } from '@playwright/test';

test('Visual capture of calendar contrast fix', async ({ page }) => {
  await page.goto('/schedule');
  
  // Try to click Month, it might be a button or tab
  const monthBtn = page.getByRole('button', { name: 'Month' });
  if (await monthBtn.isVisible()) {
    await monthBtn.click();
  } else {
    // maybe it's a tab
    await page.getByText('Month', { exact: true }).click();
  }

  // Wait for the calendar post
  await page.waitForSelector('.calendarPost', { state: 'visible', timeout: 10000 }).catch(() => console.log('No .calendarPost found within timeout'));
  
  // Take screenshot
  await page.screenshot({ path: 'verification/calendar-month.png', fullPage: true });

  // Click Week
  const weekBtn = page.getByRole('button', { name: 'Week' });
  if (await weekBtn.isVisible()) {
    await weekBtn.click();
  } else {
    await page.getByText('Week', { exact: true }).click();
  }
  
  // Wait a bit for layout to settle
  await page.waitForTimeout(1000);

  // Take screenshot
  await page.screenshot({ path: 'verification/calendar-week.png', fullPage: true });
});
