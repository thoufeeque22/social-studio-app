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
    
    await expect.poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem('SS_STAGING_STATUS'));
      if (!raw) return true;
      try {
        const parsed = JSON.parse(raw);
        return parsed.active;
      } catch {
        return false;
      }
    }, { timeout: 10000 }).toBe(false);

    await expect(postCard.getByTestId('preparation-bar')).not.toBeVisible();
  });

  test('Optimistic UI: Shows ghost card immediately', async ({ page }) => {
    await page.route('**/api/history*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });

    await page.goto('/history');

    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        title: 'Optimistic Video',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
    });

    await page.reload();

    const ghostCard = page.getByText(/Optimistic Video/i);
    await expect(ghostCard).toBeVisible();
    await expect(page.getByText(/Initializing/i).first()).toBeVisible();
    
    await page.screenshot({ path: 'verification/optimistic-ghost-card.png', fullPage: true });
  });

  test('Optimistic UI: Ghost card persists after fetch without record', async ({ page }) => {
    await page.route('**/api/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.goto('/history');

    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        title: 'Persistent Ghost',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
    });

    await page.reload();

    await expect(page.getByText('Persistent Ghost')).toBeVisible();
    await expect(page.getByText('Persistent Ghost')).toBeVisible();
  });

  test('Optimistic UI: Individual platform stop on ghost card', async ({ page }) => {
    await page.route('**/api/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'real-id-456',
            title: 'Optimistic Video',
            videoFormat: 'short',
            createdAt: new Date().toISOString(),
            platforms: [{ id: 'real-p-1', platform: 'youtube', status: 'pending', progress: 0 }]
          }]
        })
      });
    });

    await page.route('**/api/history/cancel-platform*', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.goto('/history');

    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        historyId: 'real-id-456',
        title: 'Optimistic Video',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
    });

    await page.reload();

    const postCard = page.getByTestId('history-post-real-id-456');
    const stopButton = postCard.getByRole('button', { name: /Stop Platform Upload/i });
    await expect(stopButton).toBeVisible();
    
    await stopButton.click({ force: true });
    await expect(postCard).toBeVisible();
  });
});
