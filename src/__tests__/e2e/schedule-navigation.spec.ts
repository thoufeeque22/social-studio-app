import { test, expect } from '@playwright/test';

test.describe('Schedule Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Fail test on console errors or warnings (like deprecations)
    page.on('console', msg => {
      const text = msg.text();
      // Ignore transient Auth.js fetch errors in E2E environment
      if (text.includes('Failed to fetch') && text.includes('authjs.dev')) return;
      
      if (msg.type() === 'error' || (msg.type() === 'warning' && text.includes('deprecated'))) {
        throw new Error(`Console ${msg.type()} detected: ${text}`);
      }
    });

    // Navigate to dashboard
    await page.goto('/');
    // Ensure dashboard is loaded
    await expect(page.locator('h2:has-text("Upcoming Posts")').first()).toBeVisible();
  });

  test('should navigate to full schedule view from sidebar "View All" button', async ({ page }) => {
    const viewAllButton = page.getByTestId('sidebar-view-all-schedule');
    await expect(viewAllButton).toBeVisible();
    await viewAllButton.click();

    // Verify redirect to /schedule
    await expect(page).toHaveURL(/\/schedule/);
    await expect(page.getByRole('heading', { name: 'Scheduled Posts' })).toBeVisible();
  });

  test('should navigate to specific post in schedule view and highlight it', async ({ page }) => {
    const postTitle = 'Scheduled Post 2';
    const postId = 'e2e-post-2';
    
    const sidebarLink = page.getByTestId(`sidebar-post-${postId}`);
    await expect(sidebarLink).toBeVisible();
    await expect(sidebarLink).toContainText(postTitle);
    
    await sidebarLink.click();

    // Verify redirect with ID param
    await expect(page).toHaveURL(new RegExp(`/schedule\\?id=${postId}`));
    
    // Verify specific post card is visible in schedule
    const scheduleCard = page.getByTestId(`schedule-post-${postId}`);
    await expect(scheduleCard).toBeVisible();
    await expect(scheduleCard).toContainText(postTitle);
    
    // Check if highlight class is applied (MUI pulse animation is usually in CSS modules)
    // We can check if the element has the highlighted class or the styles associated
    // Based on the code: className={`${styles.postCard} ${targetId === post.id ? styles.highlightedPost : ''}`}
    // We can check for the attribute or style
    await expect(scheduleCard).toHaveClass(/highlightedPost/);
  });

  test('should handle non-existent post ID gracefully', async ({ page }) => {
    const invalidId = 'non-existent-id-123';
    await page.goto(`/schedule?id=${invalidId}`);
    
    // Should still load the schedule page
    await expect(page.getByRole('heading', { name: 'Scheduled Posts' })).toBeVisible();
    
    // Should show the list of posts (since we seeded 3)
    await expect(page.getByTestId('schedule-post-e2e-post-1')).toBeVisible();
    
    // None should be highlighted
    const highlighted = page.locator('.highlightedPost');
    await expect(highlighted).toHaveCount(0);
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // In our app, sidebar might be at the bottom or hidden behind a menu.
    // Let's check if "Upcoming Posts" section is visible.
    await expect(page.locator('h2:has-text("Upcoming Posts")')).toBeVisible();
    
    const sidebarLink = page.getByTestId('sidebar-post-e2e-post-1');
    await expect(sidebarLink).toBeVisible();
    await sidebarLink.click();

    await expect(page).toHaveURL(/\/schedule\?id=e2e-post-1/);
    await expect(page.getByTestId('schedule-post-e2e-post-1')).toBeVisible();
  });
});
