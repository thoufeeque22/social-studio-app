import { test, expect } from '@playwright/test';

test.describe('AI Chatbot E2E', () => {
  test.setTimeout(60000); // 60 seconds for slow local models

  test.beforeEach(async ({ page }) => {
    // Authenticate if necessary. Assuming root page has the chatbot.
    await page.goto('/');
    // Ensure FAB is visible before starting
    await expect(page.getByTestId('chat-fab')).toBeVisible();
  });

  async function openChat(page) {
    const fab = page.getByTestId('chat-fab');
    const window = page.getByTestId('chat-window');
    
    // If window is not visible, click FAB
    if (!(await window.isVisible())) {
      await fab.click();
    }
    
    // Wait for animation and input to be stable/visible
    const input = page.getByTestId('chat-input').locator('input');
    await expect(input).toBeVisible();
    return input;
  }

  test('should toggle chatbot window visibility', async ({ page }) => {
    const fab = page.getByTestId('chat-fab');
    const window = page.getByTestId('chat-window');

    await expect(fab).toBeVisible();
    await expect(window).not.toBeVisible();

    await fab.click();
    await expect(window).toBeVisible();

    await page.getByTestId('chat-close-button').click();
    await expect(window).not.toBeVisible();
  });

  test('should send a message and receive a response', async ({ page }) => {
    const input = await openChat(page);
    const sendButton = page.getByTestId('chat-send-button');

    await input.fill('Hello AI');
    await sendButton.click();

    // Verify message appears in list
    await expect(page.getByTestId('chat-message-user').filter({ hasText: 'Hello AI' })).toBeVisible();
    
    // Verify AI response starts streaming (wait for some content)
    // Note: Assistant message role is applied to the container, and it might contain multiple parts
    const aiResponse = page.getByTestId('chat-message-assistant').first();
    await expect(aiResponse).toBeVisible({ timeout: 20000 });
    await expect(aiResponse).not.toBeEmpty();
  });

  test('should handle "Show my schedule" tool call', async ({ page }) => {
    const input = await openChat(page);
    await input.fill('What is on my schedule?');
    await page.getByTestId('chat-send-button').click();

    const assistantMessage = page.getByTestId('chat-message-assistant').first();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
    await expect(assistantMessage).not.toBeEmpty();
  });

  test('should handle scheduling a video via chat', async ({ page }) => {
    const input = await openChat(page);
    await input.fill('Schedule my first video for tomorrow at 10am');
    await page.getByTestId('chat-send-button').click();

    const assistantMessage = page.getByTestId('chat-message-assistant').first();
    await expect(assistantMessage).toBeVisible({ timeout: 30000 });
    await expect(assistantMessage).not.toBeEmpty();
  });

  test('should display error message on API failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await openChat(page);
    const input = page.getByTestId('chat-input').locator('input');
    await input.fill('Break it');
    await page.getByTestId('chat-send-button').click();

    await expect(page.getByTestId('chat-error-message')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('chat-error-message')).toContainText(/error|failed/i);
  });
});
