import { test, expect } from '@playwright/test';

test.describe('Privacy-First Cookieless Analytics (Umami)', () => {
  test('injects umami script and fires pageview', async ({ page }) => {
    const umamiRequestPromise = page.waitForRequest(
      (request) => request.url().includes('gateway.umami.is') && request.method() === 'POST'
    );
    
    await page.goto('/');
    
    const umamiScript = page.locator('script[src*="cloud.umami.is"]');
    await expect(umamiScript).toBeAttached();

    const req = await umamiRequestPromise;
    expect(req.url()).toContain('gateway.umami.is');
  });

  test('fires signup and upgrade conversion events', async ({ page }) => {
    const events: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('gateway.umami.is/api/send')) {
        const postData = request.postDataJSON();
        if (postData && postData.payload && postData.payload.name) {
          events.push(postData.payload.name);
        }
      }
    });

    await page.goto('/');
    
    await page.waitForFunction(() => !!(window as any).umami);
    await page.evaluate(() => {
      if (window.umami && window.umami.track) {
        window.umami.track('signup');
        window.umami.track('upgrade');
      }
    });

    await page.waitForTimeout(500);
    
    expect(events).toContain('signup');
    expect(events).toContain('upgrade');
  });

  test('does not crash when umami is blocked (ad-blocker simulation)', async ({ page }) => {
    await page.route('**/*umami*', route => route.abort());

    await page.goto('/');

    let consoleErrorCount = 0;
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrorCount++;
    });

    await page.evaluate(() => {
      if (typeof window !== 'undefined' && window.umami && window.umami.track) {
        window.umami.track('signup');
      }
    });

    expect(consoleErrorCount).toBeLessThanOrEqual(1);
  });

  test('renders privacy-first badge in footer', async ({ page }) => {
    await page.goto('/');
    const footerBadge = page.getByText('🛡️ Privacy-First / Zero Tracking Cookies');
    await expect(footerBadge).toBeVisible();
  });

  test('sets no tracking cookies', async ({ context, page }) => {
    await page.goto('/');
    const cookies = await context.cookies();
    
    const umamiCookies = cookies.filter(c => c.name.includes('umami'));
    expect(umamiCookies.length).toBe(0);
  });
});
