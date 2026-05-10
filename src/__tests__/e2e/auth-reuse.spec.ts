import { test, expect } from '@playwright/test';

test.describe('Session Reuse Verification', () => {
  test('should access the dashboard without logging in (using storageState)', async ({ page }) => {
    // Navigate directly to the dashboard
    await page.goto('/');

    // Verify we are NOT redirected to login
    await expect(page).not.toHaveURL(/.*login/);
    
    // Verify dashboard elements are visible
    await expect(page.locator('h2:has-text("Upload & Automate")').first()).toBeVisible();
    
    // Verify the test user's accounts are loaded (Tester Alpha and Tester Beta)
    // The names are formatted as "@testeralpha" and "@testerbeta" by formatHandle
    const ytBtn = page.getByRole('button', { name: /youtube: @testeralpha/i });
    const tkBtn = page.getByRole('button', { name: /tiktok: @testerbeta/i });
    
    await expect(ytBtn).toBeVisible();
    await expect(tkBtn).toBeVisible();
  });
});
