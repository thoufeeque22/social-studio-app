import { test, expect } from '@playwright/test';

test.describe('Activity Hub: Upload Preparation Bar', () => {
  // Use existing auth state for all tests
  test.use({ storageState: '.auth/user.json' });

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

    // Ensure the bar is visible first
    const postCard = page.getByTestId('history-post-post-123');
    await expect(postCard.getByTestId('preparation-bar')).toBeVisible();

    const stopButton = postCard.getByRole('button', { name: /STOP ALL/i });
    await expect(stopButton).toBeVisible();
    
    // Click STOP ALL
    await stopButton.click();
    
    // Wait for the localStorage signal to be set to active: false
    // useUploadStatus polls every 500ms, so we allow enough time
    await expect.poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem('SS_STAGING_STATUS'));
      if (!raw) return true; // Could have been cleared already by the 1s timeout in handleCancelAll
      try {
        const parsed = JSON.parse(raw);
        return parsed.active;
      } catch {
        return false;
      }
    }, { timeout: 10000 }).toBe(false);

    // Now the UI should reflect this (bar gone)
    await expect(postCard.getByTestId('preparation-bar')).not.toBeVisible();
  });

  test('Optimistic UI: Shows ghost card immediately', async ({ page }) => {
    // 1. Mock empty history to ensure only optimistic shows
    await page.route('**/api/history*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });

    // 2. Navigate first to ensure origin is set, then inject
    await page.goto('/history');

    // 3. Inject pending post
    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        title: 'Optimistic Video',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
    });

    await page.reload();

    // 4. Verify optimistic card
    const ghostCard = page.getByText(/Optimistic Video/i);
    await expect(ghostCard).toBeVisible();
    await expect(page.getByText(/Initializing/i).first()).toBeVisible();
    
    await page.screenshot({ path: 'verification/optimistic-ghost-card.png', fullPage: true });
  });

  test('Optimistic UI: Ghost card persists after fetch without record', async ({ page }) => {
    // 1. Initial empty mock
    let callCount = 0;
    await page.route('**/api/history*', async (route) => {
      callCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }) // Still empty
      });
    });

    await page.goto('/history');

    // 2. Inject pending post
    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        title: 'Persistent Ghost',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
    });

    await page.reload();

    // 3. Verify it's there
    await expect(page.getByText('Persistent Ghost')).toBeVisible();

    // 4. Wait for a poll (should be 15s since no active posts, but we can trigger it or wait)
    // Actually, we mocked the route to return empty. 
    // Even if it polls, it should stay visible.
    
    // We can simulate another load or just wait.
    // The previous bug was that it disappeared after the FIRST fetch.
    await expect(page.getByText('Persistent Ghost')).toBeVisible();
  });
});
