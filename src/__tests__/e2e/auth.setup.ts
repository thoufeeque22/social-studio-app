import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Verify E2E form is present (requires NEXT_PUBLIC_E2E=true and NODE_ENV=development)
  const emailInput = page.getByTestId('e2e-email-input');
  await expect(emailInput).toBeVisible();

  // Perform login
  await emailInput.fill('tester@socialstudio.ai');
  await page.getByTestId('e2e-password-input').fill(process.env.E2E_TEST_PASSWORD || 'social-studio-e2e-secret');
  await page.getByTestId('e2e-login-submit').click();

  // Wait for redirect to dashboard
  await page.waitForURL('/');
  await expect(page.locator('h2:has-text("Upload & Automate")')).toBeVisible();

  // End of authentication steps.
  await page.context().storageState({ path: authFile });
});
