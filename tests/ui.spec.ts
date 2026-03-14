import { test, expect } from '@playwright/test';

test.describe('UI Components', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.app-container', { timeout: 15000 });
    });

    test('should open character drawer when clicked', async ({ page }) => {
        const charButton = page.locator('.lucide-user').first();
        if (await charButton.count() > 0) {
            await charButton.click();
            await page.waitForTimeout(500); // Give React time to update state and CSS classes

            // Check body or layout for the drawer open state class
            const isCharOpen = await page.locator('.app-container').evaluate(el => el.classList.contains('character-open') || document.querySelector('.right-drawer') !== null);
            expect(isCharOpen).toBe(true);
        }
    });

    test('should display the mapper and canvas correctly', async ({ page }) => {
        const mapper = page.locator('.mapper-container').first();
        await expect(mapper).toBeAttached();
    });
});
