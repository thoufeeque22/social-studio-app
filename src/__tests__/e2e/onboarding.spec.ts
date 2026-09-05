import { test, expect } from './base-test';
import { prisma } from '@/lib/infrastructure/database/prisma';

test.describe('Onboarding Social Platforms', () => {
  test.beforeEach(async ({ workerEmail }) => {
    const user = await prisma.user.findUnique({ where: { email: workerEmail } });
    if (user) {
      await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: { hasCompletedOnboarding: false, onboardingSocialPlatforms: [] },
        create: { userId: user.id, hasCompletedOnboarding: false, onboardingSocialPlatforms: [] }
      });
    }
  });

  test('should display the onboarding modal if not completed', async ({ page }) => {
    await page.goto('/');
    
    const modal = page.locator('text="Help Us Prioritize!"').first();
    await expect(modal).toBeVisible();
    
    await expect(page.getByLabel('TikTok')).toBeVisible();
    await expect(page.getByLabel('Instagram')).toBeVisible();
  });

  test('should close modal on submit', async ({ page }) => {
    await page.goto('/');
    
    await page.getByLabel('TikTok').click();
    await page.getByLabel('Instagram').click();
    
    await page.locator('button:has-text("Help Us Prioritize!")').click();
    
    await expect(page.locator('text="Help Us Prioritize!"').first()).toBeHidden();
  });

  test('should close modal on skip', async ({ page }) => {
    await page.goto('/');
    
    await page.locator('button:has-text("Skip for now")').click();
    
    await expect(page.locator('text="Help Us Prioritize!"').first()).toBeHidden();
  });
});
