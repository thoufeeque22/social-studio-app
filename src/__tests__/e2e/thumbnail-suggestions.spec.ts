import { test, expect } from '@playwright/test';

test.describe('AI Thumbnail Suggestions', () => {
  const mockMediaData = {
    success: true,
    data: [
      {
        id: '1',
        fileId: 'file-123',
        fileName: 'test-video.mp4',
        fileSize: 1024 * 1024,
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        createdAt: new Date().toISOString(),
        previewUrl: 'mock-url'
      }
    ]
  };

  const mockThumbnailSuccess = {
    success: true,
    bestFrameBase64: 'data:image/jpeg;base64,mockbase64',
    reason: 'This frame has high contrast and a visible face.',
    allFrames: ['data:image/jpeg;base64,mockbase64']
  };

  const mockThumbnailRateLimit = {
    error: 'Rate limit exceeded for thumbnail generation'
  };

  test.beforeEach(async ({ page }) => {
    // Mock login session
    await page.route('/api/auth/session', async route => {
      await route.fulfill({
        json: {
          user: { name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 86400000).toISOString()
        }
      });
    });

    // Mock media fetch
    await page.route('/api/media', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: mockMediaData });
      } else {
        await route.continue();
      }
    });
  });

  test('Happy Path: Should successfully generate and display an AI thumbnail', async ({ page }) => {
    // Mock successful thumbnail generation
    await page.route('/api/media/thumbnails', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ json: mockThumbnailSuccess });
      }
    });

    await page.goto('/media');

    // Wait for the media gallery to load
    await expect(page.getByText('test-video.mp4')).toBeVisible();

    // Select the first video (click the checkbox overlay)
    // The component structure is: div with absolute pos, left 1rem, top 1rem for the checkbox.
    // Let's click the text or the container first, or use a specific locator.
    // The div with file name text-video.mp4 has a sibling which is the checkbox overlay, we can locate it relative to the file.
    // Alternatively, we can just click the top-left area of the video card.
    await page.locator('div').filter({ hasText: /^test-video\.mp4$/ }).locator('..').locator('div').first().click();

    // The HUD should appear with "1 video selected"
    await expect(page.getByText('1 video selected')).toBeVisible();

    // Click the "AI THUMBNAIL" button
    await page.getByTestId('ai-thumbnail-button').click();

    // Expect the button text to change to "ANALYZING..." while loading, but it might be too fast to catch with mocked API.

    // Expect the AI thumbnail dialog to appear
    const dialog = page.getByTestId('ai-thumbnail-dialog');
    await expect(dialog).toBeVisible();

    // Check that the reason and image are displayed
    await expect(page.getByText('This frame has high contrast and a visible face.')).toBeVisible();
    await expect(dialog.locator('img')).toHaveAttribute('src', 'data:image/jpeg;base64,mockbase64');
    
    // Check Close button
    await page.getByTestId('ai-thumbnail-close').click();
    await expect(dialog).not.toBeVisible();
  });

  test('Negative Path: Should display error alert when rate limited', async ({ page }) => {
    // Mock rate limited thumbnail generation
    await page.route('/api/media/thumbnails', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 429, json: mockThumbnailRateLimit });
      }
    });

    await page.goto('/media');

    // Wait for the media gallery to load
    await expect(page.getByText('test-video.mp4')).toBeVisible();

    // Select the video
    await page.locator('div').filter({ hasText: /^test-video\.mp4$/ }).locator('..').locator('div').first().click();

    // Overriding window.alert to capture the message
    let alertMessage = '';
    page.on('dialog', dialog => {
      alertMessage = dialog.message();
      dialog.accept();
    });

    // Click the "AI THUMBNAIL" button
    await page.getByTestId('ai-thumbnail-button').click();

    // Wait for the alert
    await expect.poll(() => alertMessage).toContain('Rate limit exceeded');
    
    // Dialog should not appear
    await expect(page.getByTestId('ai-thumbnail-dialog')).not.toBeVisible();
  });
});
