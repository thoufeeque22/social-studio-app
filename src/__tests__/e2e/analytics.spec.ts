import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Analytics Dashboard', () => {
  test.beforeAll(async () => {
    // Seed mock data before running tests
    await prisma.systemMetric.deleteMany();
    await prisma.systemMetric.createMany({
      data: [
        { name: 'active_users', value: 150 },
        { name: 'daily_posts', value: 45 },
        { name: 'api_latency_ms', value: 120 },
        { name: 'error_rate', value: 0.02 },
      ],
    });
  });

  test('admin can view analytics dashboard with populated data', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    // Check for dashboard component
    await expect(page.getByTestId('admin-analytics-dashboard')).toBeVisible();
    await expect(page.getByTestId('feature-adoption-chart')).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'verification/admin-analytics-dashboard.png', fullPage: true });
  });

  test.describe('non-admin access', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.goto('/admin/analytics');
      await expect(page).toHaveURL(/.*\/login.*/);
    });
  });
});
