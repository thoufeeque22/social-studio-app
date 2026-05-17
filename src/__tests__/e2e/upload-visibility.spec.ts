import { test, expect } from '@playwright/test';

test.describe('Enhanced Upload Visibility HUD', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to history page where HUD is implemented
    await page.goto('/history');
  });

  test('Happy Path: HUD appears when upload is active in localStorage', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: 'Uploading video...',
        timestamp: Date.now(),
        active: true
      }));
    });
    
    await page.reload();

    const hudStatusLabel = page.locator('text=Current Progress');
    await expect(hudStatusLabel).toBeVisible();
    await expect(page.locator('text=Uploading video...')).toBeVisible();
    
    // Visual audit
    await page.screenshot({ path: 'verification/upload-hud-progress.png', fullPage: true });
  });

  test('Error Path: HUD displays error status correctly', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: 'Connection failed',
        active: true
      }));
    });
    
    await page.reload();
    await expect(page.locator('text=Connection failed')).toBeVisible();
    await page.screenshot({ path: 'verification/upload-hud-error.png', fullPage: true });
  });

  test('Edge Case: HUD handles indeterminate progress (empty text)', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: '',
        timestamp: Date.now(),
        active: true
      }));
    });
    
    await page.reload();
    
    const hud = page.locator('text=Current Progress');
    await expect(hud).toBeVisible();
  });

  test('Interaction: STOP ALL clears the status and hides HUD', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: 'Uploading...',
        timestamp: Date.now(),
        active: true
      }));
    });
    
    await page.reload();

    const stopButton = page.getByRole('button', { name: /stop all/i });
    await expect(stopButton).toBeVisible();
    
    await stopButton.click();
    
    // Verify HUD is removed
    await expect(page.locator('text=Current Progress')).not.toBeVisible();
  });

  test('Persistence: HUD persists when navigating', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: 'Uploading...',
        timestamp: Date.now(),
        active: true
      }));
    });
    
    await page.goto('/history');
    await expect(page.locator('text=Current Progress')).toBeVisible();
    
    await page.goto('/');
    await expect(page.locator('text=Current Progress')).toBeVisible();
  });

  test('UploadForm: Progress bar appears during upload', async ({ page }) => {
    await page.goto('/');
    
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: 'Staging file...',
        percent: 45,
        active: true
      }));
    });
    
    await page.reload();
    
    await expect(page.locator('text=Current Progress')).toBeVisible();
    await expect(page.locator('text=45%').first()).toBeVisible();
    
    await page.screenshot({ path: 'verification/upload-form-progress.png', fullPage: true });
  });
});
