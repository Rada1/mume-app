import { test, expect } from '@playwright/test';

test.describe('Game Parser Unit Emulation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.app-container', { timeout: 15000 });
    });

    test('should render message log correctly on load', async ({ page }) => {
        await page.waitForTimeout(1000);

        const log = page.locator('.message-log');
        await expect(log).toBeVisible();

        // Ensure that at least some system text is rendered (like "Offline" or an onboarding message)
        const text = await log.textContent();
        expect(text?.length).toBeGreaterThan(0);
    });
});
