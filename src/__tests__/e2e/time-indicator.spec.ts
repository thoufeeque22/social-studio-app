import { test, expect } from './base-test';

test.describe('Global Time Indicator', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to settings page and directly to preferences tab
    await page.goto('/settings?tab=preferences');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display time indicator when toggle is enabled and hide when disabled', async ({ page }) => {
    // 1. Locate the toggle switch. The developer should add 'data-testid="show-time-indicator-toggle"' to the Switch/Checkbox component
    const toggle = page.getByTestId('show-time-indicator-toggle').locator('input[type="checkbox"]');
    await expect(toggle).toBeAttached({ timeout: 10000 });
    
    await toggle.setChecked(true, { force: true });
    await page.waitForTimeout(2000);

    // 2. Verify the time indicator is visible in the header
    const timeIndicator = page.getByTestId('time-indicator');
    await expect(timeIndicator).toBeVisible({ timeout: 10000 });
    
    // It should have some text representing the time (e.g. "10:42 AM")
    const timeText = await timeIndicator.textContent();
    expect(timeText).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);

    // 3. Toggle it off
    await toggle.setChecked(false, { force: true });
    await page.waitForTimeout(2000);

    // 4. Verify it's no longer visible
    await expect(timeIndicator).not.toBeVisible();
  });

  test('should update time indicator based on selected timezone', async ({ page }) => {
    // 1. Enable the toggle first
    const toggle = page.getByTestId('show-time-indicator-toggle').locator('input[type="checkbox"]');
    await expect(toggle).toBeAttached({ timeout: 10000 });
    
    await toggle.setChecked(true, { force: true });
    await page.waitForTimeout(2000);

    const timeIndicator = page.getByTestId('time-indicator');
    await expect(timeIndicator).toBeVisible({ timeout: 10000 });

    // 2. Change the timezone in the preferences
    // TimezonePicker uses MUI Autocomplete
    const timezoneInput = page.getByRole('combobox', { name: /timezone/i });
    await expect(timezoneInput).toBeVisible();
    
    // Select Tokyo
    await timezoneInput.click();
    await timezoneInput.fill('Tokyo');
    await page.getByRole('option', { name: /Tokyo/i }).first().click();
    
    await page.waitForTimeout(2000); // Wait for preference to save and time to update
    const tokyoTimeText = await timeIndicator.textContent();
    
    // Select New York
    await timezoneInput.click();
    await timezoneInput.fill('New York');
    await page.getByRole('option', { name: /New York/i }).first().click();
    
    await page.waitForTimeout(2000);
    const nyTimeText = await timeIndicator.textContent();

    // The times should be different between Tokyo and New York
    expect(tokyoTimeText).not.toBe(nyTimeText);
  });
});
