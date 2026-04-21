import { test, expect } from '@playwright/test';

test.describe('Message Log Scroll Behavior', () => {
    test('should stay locked to bottom when new messages arrive', async ({ page }) => {
        await page.goto('http://localhost:3001/');
        
        // Wait for connection and account prompt
        await page.waitForSelector('.account-input-trigger');

        const log = page.locator('.message-log');
        
        // Helper to check if scrolled to bottom
        const isAtBottom = async () => {
            return await log.evaluate((el) => {
                const threshold = 5;
                return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
            });
        };

        // 1. Verify initial lock
        expect(await isAtBottom()).toBe(true);

        // 2. Simulate many messages arriving via GMCP-like events or just waiting for login text
        // Since we are at login, we can't easily trigger messages without logging in, 
        // but we can inject messages into the DOM for testing the scroll container logic if needed.
        
        // Let's try to trigger some "game" output by typing nonsense
        const input = page.locator('.account-input-trigger');
        await input.fill('testplayer');
        await input.press('Enter');

        // Wait for some response
        await page.waitForTimeout(1000);
        
        // Check if still at bottom
        expect(await isAtBottom()).toBe(true);

        // 3. Manual scroll up should unlock
        await log.evaluate((el) => {
            el.scrollTop = 0;
        });
        await page.waitForTimeout(200);
        
        // Should NOT be at bottom now
        expect(await isAtBottom()).toBe(false);

        // 4. Send a command - should relock to bottom (as per useLayoutEffect logic for 'user' type)
        await input.fill('help');
        await input.press('Enter');
        await page.waitForTimeout(500);

        // Should be back at bottom
        expect(await isAtBottom()).toBe(true);
    });

    test('should not drift when wheeling near bottom', async ({ page }) => {
        await page.goto('http://localhost:3001/');
        await page.waitForSelector('.message-log');
        const log = page.locator('.message-log');

        // Ensure we are at bottom
        await log.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(100);

        // Simulate a small wheel scroll DOWN (should keep lock)
        await page.mouse.wheel(0, 10);
        await page.waitForTimeout(100);
        
        // This is where the bug might be: wheel event listener unconditionally sets lock = false
        const isLocked = await page.evaluate(() => {
            // @ts-ignore - accessing internal state for test
            return window.viewport?.isLockedToBottomRef.current;
        });
        
        // If we want to check internal state, we'd need to expose it, but let's check behavior.
        // If we add a message now, does it scroll?
    });
});
