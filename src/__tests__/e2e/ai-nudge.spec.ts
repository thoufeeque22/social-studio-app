import { test, expect } from '@playwright/test';

test.describe('AI Nudge E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    // Force AI Tier to 'Manual' and clear dismissed nudges
    await page.evaluate(() => {
      localStorage.setItem('SS_AI_TIER', 'Manual');
      localStorage.removeItem('ai_nudge_dismissed_title_generator');
      localStorage.removeItem('ai_nudge_dismissed_desc_generator');
    });
    await page.reload();
    // Wait for the form to be visible
    await expect(page.locator('h2:has-text("Upload & Automate")').first()).toBeVisible();
  });

  test('Case 1: Visibility - Ensure AINudge renders in Post Composer', async ({ page }) => {
    // The nudges should be visible when tier is Manual
    const titleNudge = page.getByText('Try AI Title');
    const descNudge = page.getByText('Try AI Polish');

    // Wait for the element to be present in DOM and visible
    await expect(titleNudge).toBeVisible({ timeout: 10000 });
    await expect(descNudge).toBeVisible({ timeout: 10000 });
  });

  test('Case 2: Interaction - Verify clicking nudge triggers tier change', async ({ page }) => {
    const titleNudge = page.getByText('Try AI Title');
    await expect(titleNudge).toBeVisible();
    
    // Click the nudge
    await titleNudge.click();

    // Verify tier changed to "Generate"
    // The AITierSelector buttons have the tier name as text
    const generateBtn = page.getByRole('button', { name: 'Generate' });
    await expect(generateBtn).toBeVisible();
    
    // Check if it's the active one - based on style (fontWeight 700)
    // We use wait until to be sure the transition happened
    await expect(generateBtn).toHaveCSS('font-weight', '700');
    
    // The nudges should now be hidden as tier is no longer Manual
    await expect(page.getByText('Try AI Title')).not.toBeVisible();
  });

  test('Case 3: Persistence - Verify dismissing persists via localStorage', async ({ page }) => {
    // Ensure both are visible initially
    await expect(page.getByText('Try AI Title')).toBeVisible();
    await expect(page.getByText('Try AI Polish')).toBeVisible();

    // Find the dismiss button for the title nudge
    // It's an IconButton with CloseIcon inside, aria-label="Dismiss suggestion"
    const dismissBtn = page.locator('[aria-label="Dismiss suggestion"]').first();
    await dismissBtn.click();

    // Verify it disappears
    await expect(page.getByText('Try AI Title')).not.toBeVisible();
    
    // Verify the other one is still there
    await expect(page.getByText('Try AI Polish')).toBeVisible();

    // Reload page
    await page.reload();

    // Verify title nudge is still hidden (persisted), but polish nudge is visible
    await expect(page.getByText('Try AI Title')).not.toBeVisible();
    await expect(page.getByText('Try AI Polish')).toBeVisible();
    
    // Check localStorage manually
    const isDismissed = await page.evaluate(() => localStorage.getItem('ai_nudge_dismissed_title_generator'));
    expect(isDismissed).toBe('true');
  });

  test('Visual Audit: Capture screenshots of AINudge', async ({ page }) => {
    const titleNudge = page.getByText('Try AI Title');
    await expect(titleNudge).toBeVisible();

    // The Box container has the background and padding. 
    // It's the ancestor div that has "Try AI Title" text but is not just a Typography
    const nudgeContainer = page.locator('div').filter({ hasText: /^Try AI Title$/ }).first();

    // Take screenshots
    await titleNudge.screenshot({ path: 'verification/ai-nudge-active.png' });

    // Hover state
    await titleNudge.hover();
    await page.waitForTimeout(500);
    await titleNudge.screenshot({ path: 'verification/ai-nudge-hover.png' });
  });

  test('Localization & Console Audit', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('Sentry') && !text.includes('Extension')) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      errors.push(err.message);
    });

    // Check tooltip text
    const titleNudge = page.getByText('Try AI Title');
    await titleNudge.hover();
    
    // Tooltip text should be English
    await expect(page.getByRole('tooltip')).toBeVisible();
    const tooltipText = await page.getByRole('tooltip').textContent();
    expect(tooltipText).toContain('Switch to Generate tier');

    // Ensure no major errors in console
    expect(errors).toHaveLength(0);
  });
});
