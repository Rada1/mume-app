import { test, expect } from '@playwright/test';

test.describe('HUD Stability Tests', () => {
    
    test('Prompt Box should be visible on Desktop', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.app-container');
        
        const promptBox = page.locator('#prompt-box');
        await expect(promptBox).toBeVisible();
        
        // Verify z-index is set high to prevent being obscured by other layers
        const zIndex = await promptBox.evaluate(el => window.getComputedStyle(el).zIndex);
        expect(parseInt(zIndex)).toBeGreaterThanOrEqual(9999);
        
        // Verify HUD indicator text (added for robustness)
        const hudLabel = page.locator('.hud-visibility-indicator');
        await expect(hudLabel).toBeVisible();
        await expect(hudLabel).toHaveText('HUD');
    });

    test('Prompt Box should be visible on Mobile Portrait', async ({ page }) => {
        // Emulate mobile viewport
        await page.setViewportSize({ width: 390, height: 844 });
        
        await page.goto('/');
        await page.waitForSelector('.app-container');
        
        const promptBox = page.locator('#prompt-box');
        await expect(promptBox).toBeVisible();
        
        // Check that it's within the viewport and not pushed off-screen
        const boundingBox = await promptBox.boundingBox();
        const viewportHeight = page.viewportSize()?.height || 0;
        
        expect(boundingBox).not.toBeNull();
        if (boundingBox) {
            // Ensure the bottom of the prompt box is not below the screen edge
            expect(boundingBox.y + boundingBox.height).toBeLessThanOrEqual(viewportHeight);
            // Ensure it's not hidden at the very top (behind header)
            expect(boundingBox.y).toBeGreaterThan(50); 
        }
    });

    test('Prompt Box should remain visible even during login (account state)', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.app-container');
        
        // Ensure prompt is visible even before the user logs in
        const promptBox = page.locator('#prompt-box');
        await expect(promptBox).toBeVisible();
    });
});
