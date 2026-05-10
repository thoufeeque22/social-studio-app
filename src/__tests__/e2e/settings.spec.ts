import { test, expect } from '@playwright/test';

test.describe('Settings Page - Template Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display the template manager', async ({ page }) => {
    await expect(page.locator('h2:has-text("Reusable Snippets")')).toBeVisible();
    await expect(page.locator('div:has-text("No saved snippets yet.")')).toBeVisible();
  });

  test('should create, edit, and delete a template', async ({ page }) => {
    // This test assumes that the user has no templates saved initially.
    // A more robust test would clean up the templates before and after the test.

    const templateName = `Test Template ${Date.now()}`;
    const templateContent = `Test Content ${Date.now()}`;
    const updatedTemplateName = `${templateName} - updated`;

    // Go to dashboard to create a template from there
    await page.goto('/');
    
    // Save a new snippet
    const descriptionField = page.getByTestId('video-description');
    await descriptionField.fill(templateContent);
    await page.getByTestId('snippets-trigger').click();
    await page.getByTestId('save-snippet-form-trigger').click();
    await page.getByTestId('new-snippet-name-input').fill(templateName);
    await page.getByTestId('confirm-save-snippet').click();
    
    // Now go back to settings to manage it
    await page.goto('/settings');
    await expect(page.getByText(templateName)).toBeVisible();
    
    // Edit the template
    const templateRow = page.locator(`div:has-text("${templateName}")`);
    await templateRow.locator('button[aria-label="Edit"]').click();
    
    const nameInput = templateRow.locator('input[placeholder="Name"]');
    await nameInput.fill(updatedTemplateName);
    
    await templateRow.locator('button:has-text("Save")').click();
    await expect(page.getByText(updatedTemplateName)).toBeVisible();

    // Delete the template
    const updatedTemplateRow = page.locator(`div:has-text("${updatedTemplateName}")`);
    await updatedTemplateRow.locator('button[aria-label="Delete"]').click();
    
    // Playwright's dialog handling
    page.on('dialog', dialog => dialog.accept());
    
    await expect(page.getByText(updatedTemplateName)).not.toBeVisible();
    await expect(page.locator('div:has-text("No saved snippets yet.")')).toBeVisible();
  });
});
