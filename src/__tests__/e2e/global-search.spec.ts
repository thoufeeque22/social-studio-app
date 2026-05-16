import { test, expect } from '@playwright/test';

test.describe('Global Search', () => {
  test('should filter history items by search query', async ({ page }) => {
    await page.goto('/history');
    
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Activity Hub' })).toBeVisible();
    
    // Verify seeded data is visible
    await expect(page.getByText('Exploring the Grand Canyon')).toBeVisible();
    await expect(page.getByText('Cooking Italian Pasta')).toBeVisible();
    
    const searchField = page.getByPlaceholder('Search history by title or description...');
    await expect(searchField).toBeVisible();
    
    // 1. Search by Title
    await searchField.fill('Pasta');
    await expect(page.getByText('Cooking Italian Pasta')).toBeVisible();
    await expect(page.getByText('Exploring the Grand Canyon')).not.toBeVisible();
    
    // 2. Search by Description
    await searchField.fill('South Rim');
    await expect(page.getByText('Exploring the Grand Canyon')).toBeVisible();
    await expect(page.getByText('Cooking Italian Pasta')).not.toBeVisible();
    
    // 3. No Results
    await searchField.fill('NonExistentPost123');
    await expect(page.getByText('No matching activity')).toBeVisible();
    await expect(page.getByText('We couldn\'t find any posts matching "NonExistentPost123"')).toBeVisible();
    
    // 4. Clear Search
    await searchField.fill('');
    await expect(page.getByText('Exploring the Grand Canyon')).toBeVisible();
    await expect(page.getByText('Cooking Italian Pasta')).toBeVisible();
  });

  test('should filter media gallery items by search query', async ({ page }) => {
    await page.goto('/media');
    
    await expect(page.getByRole('heading', { name: 'Media Gallery' })).toBeVisible();
    
    // Verify seeded data is visible
    await expect(page.getByText('grand_canyon_vlog.mp4')).toBeVisible();
    await expect(page.getByText('pasta_tutorial.mov')).toBeVisible();
    
    const searchField = page.getByPlaceholder('Search your library...');
    await expect(searchField).toBeVisible();
    
    // 1. Search by Filename
    await searchField.fill('smartphone');
    await expect(page.getByText('smartphone_unboxing.mp4')).toBeVisible();
    await expect(page.getByText('grand_canyon_vlog.mp4')).not.toBeVisible();
    
    // 2. No Results
    await searchField.fill('NonExistentVideo456');
    await expect(page.getByText('No matching videos found.')).toBeVisible();
    
    // 3. Clear Search
    await searchField.fill('');
    await expect(page.getByText('grand_canyon_vlog.mp4')).toBeVisible();
    await expect(page.getByText('pasta_tutorial.mov')).toBeVisible();
  });
});
