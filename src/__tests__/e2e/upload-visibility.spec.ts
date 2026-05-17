import { test, expect } from '@playwright/test';

test.describe('Activity Hub: Upload Preparation Bar', () => {
  // Use existing auth state for all tests
  test.use({ storageState: '.auth/user.json' });

  // Enable console logs for debugging
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.text().startsWith('[DEBUG]') || msg.text().startsWith('[BROWSER DEBUG]')) {
        console.log(msg.text());
      }
    });
  });

  test('Preparation Bar: Visible inside matching card', async ({ page }) => {
    // 1. Mock specific history for this test
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

    await page.goto('/history');
    
    // 2. Inject local state
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
    // 1. Mock specific history
    await page.route('**/api/history*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [{
              id: 'post-cancel-all',
              title: 'Cancel Me',
              videoFormat: 'short',
              createdAt: new Date().toISOString(),
              platforms: [{ id: 'p-cancel', platform: 'youtube', status: 'processing', progress: 0 }]
            }]
          })
        });
      });

    await page.goto('/history');
    
    await page.evaluate(() => {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        historyId: 'post-cancel-all',
        status: 'Uploading...',
        active: true
      }));
    });
    
    await page.reload();

    // Ensure the bar is visible first
    const postCard = page.getByTestId('history-post-post-cancel-all');
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
    // 1. Mock history with the post already there
    await page.route('**/api/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'real-id-individual',
            title: 'Individual Stop Video',
            videoFormat: 'short',
            createdAt: new Date().toISOString(),
            platforms: [{ id: 'real-p-individual', platform: 'youtube', status: 'pending', progress: 0 }]
          }]
        })
      });
    });

    await page.goto('/history');

    // 2. Inject pending post (Optimistic)
    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        resumeHistoryId: 'real-id-individual',
        title: 'Individual Stop Video',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
    });

    await page.reload();

    // 3. Find the card and its platform stop button
    const postCard = page.getByTestId('history-post-real-id-individual');
    await expect(postCard).toBeVisible();
    
    const stopButton = postCard.getByRole('button', { name: /Stop Platform Upload/i });
    await expect(stopButton).toBeVisible();
    
    // Intercept the server action call
    let actionTriggered = false;
    await page.route('**/history*', async (route) => {
      if (route.request().method() === 'POST') {
         actionTriggered = true;
         await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      } else {
         await route.continue();
      }
    });

    // 4. Click Stop
    await stopButton.click({ force: true });
    
    // 5. Verify action was triggered
    await expect.poll(() => actionTriggered).toBe(true);
  });

  test('Optimistic UI: STOP ALL on ghost card broadcasts abort', async ({ page }) => {
    // 1. Ensure empty history mock for pure ghost card
    await page.route('**/api/history*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [] })
        });
      });

    await page.goto('/history');
    
    // 2. Inject pending post without historyId (pure optimistic-pending)
    await page.evaluate(() => {
      localStorage.setItem('SS_PENDING_POST', JSON.stringify({
        title: 'Initial Ghost',
        videoFormat: 'short',
        platforms: [{ platform: 'youtube', accountId: '1' }]
      }));
      // Simulate active staging for this ghost
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        historyId: 'optimistic-pending',
        status: 'Initializing...',
        active: true
      }));
    });
    
    await page.reload();

    // 3. Verify STOP ALL is visible on ghost card
    const postCard = page.getByText(/Initial Ghost/i);
    const stopAll = page.getByRole('button', { name: /STOP ALL/i });
    await expect(stopAll).toBeVisible();
    
    // 4. Click STOP ALL
    await stopAll.click({ force: true });
    
    // 5. Verify abort signal was broadcast to localStorage
    await expect.poll(async () => {
      const raw = await page.evaluate(() => localStorage.getItem('SS_STAGING_STATUS'));
      if (!raw) return true;
      const parsed = JSON.parse(raw);
      return parsed.active;
    }, { timeout: 10000 }).toBe(false);

    // 6. Ghost card should be removed from view since it was never in the DB
    await expect(page.getByText('Initial Ghost')).not.toBeVisible();
  });
});
