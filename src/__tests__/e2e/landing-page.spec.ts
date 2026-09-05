import { test, expect } from './base-test';

test.describe('Landing Page', () => {
  // Override global app.localhost:3000 to test the marketing site
  test.use({ baseURL: 'http://localhost:3000', authRole: 'none' });

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
  });
test('should display all 10 major sections @smoke', async ({ page }) => {
  await page.goto('/');

  // 1. Header
  await expect(page.locator('header')).toBeVisible();

  // 2. Hero
  await expect(page.getByRole('heading', { name: 'The Local-First Creator Studio', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Get Started for Free' })).toBeVisible();
    // 3. Social Proof
    await expect(page.getByText('Multi-Platform Native Support')).toBeVisible();
    
    // 4. Core Feature Grid
    await expect(page.getByText('Core Magic')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The SaaS Tax is Over', level: 2 })).toBeVisible();
    
    // 5. Comparison
    await expect(page.getByRole('heading', { name: 'Break the Cycle', level: 2 })).toBeVisible();
    
    // 6. Persona Target
    await expect(page.getByRole('heading', { name: 'Built for Every Workflow', level: 3 })).toBeVisible();
    
    // 7. How It Works
    await expect(page.getByRole('heading', { name: 'How Native Publishing Works', level: 2 })).toBeVisible();
    
    // 8. Pricing
    await expect(page.getByRole('heading', { name: 'Simple, Honest Pricing', level: 2 })).toBeVisible();
    
    // 9. FAQ
    await expect(page.getByRole('heading', { name: 'Common Questions', level: 2 })).toBeVisible();
    
    // 10. Footer
    await expect(page.locator('footer')).toBeVisible();
  });

  test('should toggle between Creator and Developer personas @interactivity @smoke', async ({ page }) => {
    // Default is Creator
    await expect(page.getByText('For the Native Creator')).toBeVisible();
    await expect(page.getByText('One-click distribution to TikTok, IG, YT')).toBeVisible();

    // Switch to Power Users
    await page.getByRole('button', { name: 'Power Users' }).click();
    await expect(page.getByText('For Power Users & Teams')).toBeVisible();
    await expect(page.getByText(/BYOK.*Storage/).first()).toBeVisible();
  });

  test('should expand FAQ items @interactivity @smoke', async ({ page }) => {
    const question = page.getByText("What does 'Native' actually mean?");
    await question.click();
    await expect(page.getByText('connects your computer directly to the platforms')).toBeVisible();
  });

  test('should navigate to login from Hero CTA @navigation @smoke', async ({ page }) => {
    // Click 'Get Started for Free' button in Hero
    await page.getByRole('link', { name: 'Get Started for Free' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should navigate to login from Header CTA @navigation @smoke', async ({ page }) => {
    // Click 'Get Started' button in Header
    await page.locator('header').getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('should be responsive on mobile @smoke', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that desktop-only elements are hidden
      await expect(page.locator('header').getByRole('link', { name: 'Features', exact: true })).not.toBeVisible();
      // Hero title should be smaller but visible
      await expect(page.getByRole('heading', { name: 'The Local-First Creator Studio', level: 1 })).toBeVisible();
    }
  });

  test('should look correct in Light Mode @visual', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    
    // Force the page to be scrollable and naturally sized for the screenshot
    await page.evaluate(() => {
      document.documentElement.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('height', 'auto', 'important');
      document.documentElement.style.setProperty('overflow', 'visible', 'important');
      document.body.style.setProperty('overflow', 'visible', 'important');
    });
    
    await expect(page).toHaveScreenshot('landing-light-mode.png', { fullPage: true });
  });

  test('should look correct in Dark Mode @visual', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    
    // Verify dark background
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', /rgb\(18, 14, 12\)|rgba\(18, 14, 12, 1\)/);
    
    // Force the page to be scrollable and naturally sized for the screenshot
    await page.evaluate(() => {
      document.documentElement.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('height', 'auto', 'important');
      document.documentElement.style.setProperty('overflow', 'visible', 'important');
      document.body.style.setProperty('overflow', 'visible', 'important');
    });

    await expect(page).toHaveScreenshot('landing-dark-mode.png', { fullPage: true });
  });
});
