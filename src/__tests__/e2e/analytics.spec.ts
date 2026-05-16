import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Analytics Dashboard', () => {
  test.beforeAll(async () => {
    // Seed mock data before running tests
    await prisma.systemMetric.deleteMany();
    
    const today = new Date();
    
    const getDaysAgo = (days: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - days);
      return date;
    };

    const days = Array.from({ length: 7 }, (_, i) => getDaysAgo(6 - i));

    // Fluctuating values for a 7-day period with different peaks
    const chatbotUsage = [20, 85, 30, 45, 50, 15, 60];
    const calendarUsage = [10, 30, 90, 40, 35, 55, 10];
    const snippetsUsage = [80, 15, 10, 25, 20, 95, 30];
    const searchUsage = [5, 10, 8, 15, 12, 20, 18];
    const mediaUsage = [25, 50, 40, 80, 55, 10, 90];
    const manualUsage = [15, 10, 20, 5, 85, 30, 40];

    const featureData = days.flatMap((date, i) => [
      { name: 'feature:usage:ai_chatbot', value: chatbotUsage[i], timestamp: date },
      { name: 'feature:usage:calendar', value: calendarUsage[i], timestamp: date },
      { name: 'feature:usage:snippets', value: snippetsUsage[i], timestamp: date },
      { name: 'feature:usage:global_search', value: searchUsage[i], timestamp: date },
      { name: 'feature:usage:media_picker', value: mediaUsage[i], timestamp: date },
      { name: 'feature:usage:manual_mode', value: manualUsage[i], timestamp: date },
    ]);

    await prisma.systemMetric.createMany({
      data: [
        ...featureData,
        // Platform Success/Errors (Totals over the period)
        { name: 'platform:success:youtube', value: 320, timestamp: today },
        { name: 'platform:error:youtube', value: 15, timestamp: today },
        { name: 'platform:success:instagram', value: 285, timestamp: today },
        { name: 'platform:error:instagram', value: 32, timestamp: today },
        { name: 'platform:success:tiktok', value: 410, timestamp: today },
        { name: 'platform:error:tiktok', value: 18, timestamp: today },
        
        // General API Usage
        { name: 'api:consumption:google', value: 1450, timestamp: today },
        { name: 'api:consumption:sentry', value: 124, timestamp: today },
      ],
    });
  });

  test('admin can view analytics dashboard with populated data', async ({ page }) => {
    await page.goto('/admin/analytics');
    
    // Check for dashboard component
    await expect(page.getByTestId('admin-analytics-dashboard')).toBeVisible();
    await expect(page.getByTestId('feature-adoption-chart')).toBeVisible();

    // Wait a brief moment to ensure charts render animations
    await page.waitForTimeout(1000);

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
