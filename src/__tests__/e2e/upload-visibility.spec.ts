import { test, expect } from '@playwright/test';

test.describe('Activity Hub: Upload Preparation Bar', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the API response to include an active post
    await page.route('**/api/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'post-123',
            title: 'My Awesome Video',
            videoFormat: 'short',
            createdAt: new Date().toISOString(),
            platforms: [{ id: 'p-1', platform: 'youtube', status: 'processing', progress: 0 }]
          }]
        })
      });
    });
  });

  test('Preparation Bar: Visible inside matching card', async ({ page }) => {
    await page.goto('/history');
    
    // Inject local state
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        historyId: 'post-123',
        status: 'Staging video...',
        percent: 45,
        active: true
      }));
    });
    
    // No reload needed if we wait for polling or just trigger a manual check
    // But reload is safer to ensure hook picks it up from start
    await page.reload();

    const postCard = page.getByTestId('history-post-post-123');
    const prepBar = postCard.getByTestId('preparation-bar');
    
    await expect(prepBar).toBeVisible();
    await expect(prepBar).toContainText('Staging video...');
    
    const progressBar = postCard.getByTestId('preparation-progress');
    await expect(progressBar).toBeVisible();
    
    await page.screenshot({ path: 'verification/activity-card-final.png', fullPage: true });
  });

  test('Interaction: STOP ALL broadcasts abort', async ({ page }) => {
    await page.goto('/history');
    
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        historyId: 'post-123',
        status: 'Uploading...',
        active: true
      }));
    });
    
    await page.reload();

    const postCard = page.getByTestId('history-post-post-123');
    const stopButton = postCard.getByRole('button', { name: /STOP ALL/i });
    
    await expect(stopButton).toBeVisible();
    
    await stopButton.click();
    
    // Wait for the localStorage signal to be set to active: false
    await expect.poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem('SS_STAGING_STATUS'));
      if (!raw) return true; // Could have been cleared already
      return JSON.parse(raw).active;
    }).toBe(false);

    // Now the UI should reflect this (bar gone)
    await expect(postCard.getByTestId('preparation-bar')).not.toBeVisible();
  });
});
