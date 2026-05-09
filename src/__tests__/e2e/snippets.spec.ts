import { test, expect } from '@playwright/test';

test.describe('Metadata Templates (Snippets)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open and close the snippets menu correctly', async ({ page }) => {
    const trigger = page.getByTestId('snippets-trigger');
    const menu = page.getByTestId('snippets-menu');

    // Open
    await trigger.click();
    await expect(menu).toBeVisible();

    // Close via X button
    await menu.locator('button:has(svg)').first().click(); // The X button
    await expect(menu).not.toBeVisible();

    // Open again
    await trigger.click();
    await expect(menu).toBeVisible();

    // Close via clicking outside (clicking the dashboard header for example)
    await page.locator('h2:has-text("Upload & Automate")').click();
    await expect(menu).not.toBeVisible();
  });

  test('should save a new snippet and close the menu on success', async ({ page }) => {
    const descriptionField = page.getByTestId('video-description');
    const testContent = `E2E Test Snippet ${Date.now()}`;
    const snippetName = `Name ${Date.now()}`;

    // Type content to save
    await descriptionField.fill(testContent);

    // Open menu
    await page.getByTestId('snippets-trigger').click();
    
    // Open save form
    await page.getByTestId('save-snippet-form-trigger').click();
    
    // Fill name
    await page.getByTestId('new-snippet-name-input').fill(snippetName);
    
    // Save
    await page.getByTestId('confirm-save-snippet').click();

    // Verification: Menu should be CLOSED
    await expect(page.getByTestId('snippets-menu')).not.toBeVisible();

    // Verification: Re-open and check if it exists in list
    await page.getByTestId('snippets-trigger').click();
    await expect(page.getByText(snippetName)).toBeVisible();
  });

  test('should append snippet content to description and close menu', async ({ page }) => {
    const descriptionField = page.getByTestId('video-description');
    await descriptionField.fill('Initial text.');

    // Open menu
    await page.getByTestId('snippets-trigger').click();
    
    // Select first available snippet (assuming one exists from previous test or seed)
    const firstSnippet = page.locator('[data-testid^="snippet-item-"]').first();
    // Wait for templates to load
    await expect(firstSnippet).toBeVisible();
    
    const snippetText = await firstSnippet.locator('span').last().innerText();
    
    await firstSnippet.click();

    // Verification: Menu should be CLOSED
    await expect(page.getByTestId('snippets-menu')).not.toBeVisible();

    // Verification: Content should be appended
    const updatedValue = await descriptionField.inputValue();
    expect(updatedValue).toContain('Initial text.');
    expect(updatedValue).toContain(snippetText);
  });

  test('should work independently for platform-specific descriptions', async ({ page }) => {
    // Enable platform specific toggle if available
    const toggle = page.getByTestId('platform-specific-toggle-label');
    if (await toggle.isVisible()) {
      await toggle.click();
    }

    // This part assumes at least one platform is selected and visible
    const platformHeader = page.locator('span:has-text("Details")').first();
    if (await platformHeader.isVisible()) {
      const platformContainer = platformHeader.locator('xpath=../..');
      const platformTrigger = platformContainer.getByTestId('snippets-trigger');
      const platformInput = platformContainer.getByTestId('video-description-youtube');

      await platformTrigger.click();
      const firstSnippet = page.locator('[data-testid^="snippet-item-"]').first();
      await expect(firstSnippet).toBeVisible();
      await firstSnippet.click();

      // Check input updated
      await expect(platformInput).not.toHaveValue('');
    }
  });
});
