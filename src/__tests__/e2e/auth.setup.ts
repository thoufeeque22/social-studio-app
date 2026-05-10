import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  console.log('[E2E Setup] Starting authentication...');
  
  // Navigate to login
  await page.goto('/login');

  // Verify E2E form is present (requires NEXT_PUBLIC_E2E=true and NODE_ENV=development)
  const emailInput = page.getByTestId('e2e-email-input');
  await expect(emailInput).toBeVisible();

  // Perform login
  const testEmail = 'tester@socialstudio.ai';
  const testPassword = process.env.E2E_TEST_PASSWORD || 'social-studio-e2e-secret';
  
  console.log(`[E2E Setup] Attempting login for ${testEmail}...`);
  
  await emailInput.fill(testEmail);
  await page.getByTestId('e2e-password-input').fill(testPassword);
  await page.getByTestId('e2e-login-submit').click();

  // Wait for redirect to dashboard
  console.log('[E2E Setup] Waiting for redirect to dashboard...');
  await page.waitForNavigation({ url: '/', timeout: 15000 });
  
  // Verify we are on the dashboard
  await expect(page.locator('h2:has-text("Upload & Automate")').first()).toBeVisible();
  console.log('[E2E Setup] Successfully logged in and reached dashboard.');

  // Save storage state
  await page.context().storageState({ path: authFile });
  console.log(`[E2E Setup] Storage state saved to ${authFile}`);
});
