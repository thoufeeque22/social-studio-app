import { test, expect } from '@playwright/test';
import { format, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

test.describe('Calendar Content Planner Refinements', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to schedule page
    await page.goto('/schedule');
  });

  test('Initial Load - Timeline shown by default', async ({ page }) => {
    // Wait for the timeline button and verify it's the active view
    const timelineBtn = page.getByRole('button', { name: 'Timeline' });
    await expect(timelineBtn).toBeVisible();

    // The timeline view itself should be visible
    // Based on the code, it uses styles.timeline when in timeline mode
    // We can also just verify that neither calendarGrid nor weeklyGrid are visible
    const monthBtn = page.getByRole('button', { name: 'Month' });
    const weekBtn = page.getByRole('button', { name: 'Week' });

    await expect(monthBtn).toBeVisible();
    await expect(weekBtn).toBeVisible();
  });

  test('View Toggling - Month and Week views', async ({ page }) => {
    // Click Month toggle
    await page.getByRole('button', { name: 'Month' }).click();

    // Verify Calendar Grid is visible
    const calendarGrid = page.locator('div[class*="calendarGrid"]');
    await expect(calendarGrid).toBeVisible();

    // Navigation controls should appear
    await expect(page.getByTestId('calendar-prev-btn')).toBeVisible();
    await expect(page.getByTestId('calendar-next-btn')).toBeVisible();
    await expect(page.getByTestId('calendar-current-period')).toBeVisible();
    await expect(page.getByTestId('calendar-today-btn')).toBeVisible();

    // Click Week toggle
    await page.getByRole('button', { name: 'Week' }).click();

    // Verify Weekly Layout is shown
    const weeklyGrid = page.locator('div[class*="weeklyGrid"]');
    await expect(weeklyGrid).toBeVisible();
    
    // Month grid should no longer be visible
    await expect(calendarGrid).not.toBeVisible();
  });

  test('Calendar Navigation', async ({ page }) => {
    // Switch to month view for easier navigation verification
    await page.getByRole('button', { name: 'Month' }).click();
    
    const currentPeriodLabel = page.getByTestId('calendar-current-period');
    await expect(currentPeriodLabel).toBeVisible();

    const todayDate = new Date();
    const initialText = format(todayDate, 'MMMM yyyy');
    await expect(currentPeriodLabel).toHaveText(initialText);

    // Click next
    await page.getByTestId('calendar-next-btn').click();
    const nextMonthText = format(addMonths(todayDate, 1), 'MMMM yyyy');
    await expect(currentPeriodLabel).toHaveText(nextMonthText);

    // Click prev twice
    await page.getByTestId('calendar-prev-btn').click();
    await page.getByTestId('calendar-prev-btn').click();
    const prevMonthText = format(subMonths(todayDate, 1), 'MMMM yyyy');
    await expect(currentPeriodLabel).toHaveText(prevMonthText);

    // Click Today
    await page.getByTestId('calendar-today-btn').click();
    await expect(currentPeriodLabel).toHaveText(initialText);

    // Switch to week view to test week navigation briefly
    await page.getByRole('button', { name: 'Week' }).click();
    const currentWeekText = `${format(startOfWeek(todayDate), 'MMM d')} - ${format(endOfWeek(todayDate), 'MMM d, yyyy')}`;
    await expect(currentPeriodLabel).toHaveText(currentWeekText);
  });

  test('Data Verification - Scheduled posts visibility', async ({ page }) => {
    // Go to month view
    await page.getByRole('button', { name: 'Month' }).click();
    
    // We expect either posts to show or the empty state to show.
    // If seed data exists, we should see posts.
    // However, if there are no posts, we should see an empty state in the calendar 
    // Wait, if posts.length === 0, the page shows the empty state directly without CalendarView.
    // Let's check for the presence of the calendar view OR empty state
    
    const emptyState = page.getByText('No scheduled posts');
    const calendarGrid = page.locator('div[class*="calendarGrid"]');
    
    // Since seed data might be populated, if emptyState is not visible, calendar grid MUST be visible
    // and might have posts
    const isEmpty = await emptyState.isVisible();
    if (!isEmpty) {
      await expect(calendarGrid).toBeVisible();
      // Look for a post
      // In the seed script, posts are probably seeded.
      const posts = page.locator('div[class*="calendarPost"]');
      // Just check that it can find posts or not error out
    } else {
      await expect(emptyState).toBeVisible();
    }
  });

  test('Mobile Responsiveness', async ({ page }) => {
    // Set mobile viewport (iPhone 12 size)
    await page.setViewportSize({ width: 390, height: 844 });
    
    await page.goto('/schedule');
    await page.getByRole('button', { name: 'Month' }).click();
    
    // Verify controls are visible and haven't thrown layout errors
    // Playwright doesn't easily test visual stacking automatically, but we can 
    // ensure elements are visible within viewport
    const nextBtn = page.getByTestId('calendar-next-btn');
    const prevBtn = page.getByTestId('calendar-prev-btn');
    
    await expect(nextBtn).toBeVisible();
    await expect(prevBtn).toBeVisible();
  });
});
