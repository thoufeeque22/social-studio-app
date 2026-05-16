import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard', () => {
  test('admin can view analytics dashboard', async ({ page }) => {
    // Requires ADMIN role (uses default storageState from auth.setup.ts)
    await page.goto('/admin/analytics');
    
    // Check for dashboard component
    await expect(page.getByTestId('admin-analytics-dashboard')).toBeVisible();
    await expect(page.getByTestId('feature-adoption-chart')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'verification/admin-analytics-dashboard.png', fullPage: true });
  });

  test.describe('non-admin access', () => {
    // Clear the authenticated state for this test block
    test.use({ storageState: { cookies: [], origins: [] } });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/admin/analytics');
      
      // Middleware should redirect to login
      await expect(page).toHaveURL(/.*\/login.*/);
    });
  });
});
