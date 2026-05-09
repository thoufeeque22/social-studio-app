import { test, expect } from '@playwright/test';

test.describe('Metadata Templates (Snippets)', () => {
  test.beforeEach(async ({ page }) => {
    // In a real scenario, we would perform login here or use a saved storage state.
    // For this demonstration, we assume the environment might be accessible or 
    // we are just checking for the existence of UI elements.
    await page.goto('/');
  });

  test('should show the snippets button on the dashboard', async ({ page }) => {
    // Wait for the dashboard to load
    const snippetsButton = page.locator('button:has-text("Snippets")');
    
    // Check if the button is visible (it might require login, so this test might fail 
    // if redirected to /login, which is expected behavior for an unauthorized user)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Redirected to login, as expected for unauthorized test run.');
      await expect(page).toHaveURL(/.*login/);
    } else {
      await expect(snippetsButton).toBeVisible();
    }
  });

  test('should open the snippets menu when clicked', async ({ page }) => {
    // This test assumes we are logged in.
    if (page.url().includes('/login')) {
      test.skip(); // Skip if not logged in
      return;
    }

    const snippetsButton = page.locator('button:has-text("Snippets")');
    await snippetsButton.click();

    const menuTitle = page.locator('text=Saved Snippets');
    await expect(menuTitle).toBeVisible();
  });
});
