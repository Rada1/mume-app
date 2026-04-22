import { test, expect } from '@playwright/test';

test.describe('Desktop Layout Invariants', () => {
  test('Map drawer should be visible by default on desktop', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Locate the mapper container based on existing CSS classes
    const mapDrawer = page.locator('.mapper-container');
    
    // We expect it to be visible
    await expect(mapDrawer).toBeVisible();
  });
});
