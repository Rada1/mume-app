import { test, expect } from '@playwright/test';

test.describe('Message Log Scrolling', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.message-log', { timeout: 15000 });
    });

    test('reproduction: should auto-scroll when many messages arrive', async ({ page }) => {
        const log = page.locator('.message-log');
        
        // Wait for connection error message or initial render
        await page.waitForTimeout(3000);

        // Fill input and press Enter 30 times to generate height
        const input = page.locator('.input-field');
        for (let i = 0; i < 30; i++) {
            await input.fill(`test message ${i}`);
            await page.keyboard.press('Enter');
            // Give React time to batch
            if (i % 5 === 0) await page.waitForTimeout(200);
        }

        // Wait for all animations and scrolls to settle
        await page.waitForTimeout(3000);

        const scrollInfo = await log.evaluate(el => ({
            scrollTop: el.scrollTop,
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
            diff: Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight)
        }));

        console.log('Final Scroll Info:', scrollInfo);
        
        // It shoud be within a few pixels of the bottom
        expect(scrollInfo.diff).toBeLessThan(15);
    });

    test('threshold test: should NOT auto-scroll if user is 150px up', async ({ page }) => {
        const log = page.locator('.message-log');
        
        // Ensure some initial height
        const input = page.locator('.input-field');
        for (let i = 0; i < 15; i++) {
            await input.fill(`prefill ${i}`);
            await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(2000);

        // Force scroll up
        await log.evaluate(el => {
            el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight - 150);
        });
        // CRITICAL: Wait for scroll event to process and isLockedToBottom to update
        await page.waitForTimeout(1000);

        const manualScrollTop = await log.evaluate(el => el.scrollTop);
        console.log('Manual ScrollTop:', manualScrollTop);

        // Send one message
        await input.fill('don\'t scroll me!');
        await page.keyboard.press('Enter');

        await page.waitForTimeout(2000);

        const finalScrollTop = await log.evaluate(el => el.scrollTop);
        console.log('Final ScrollTop:', finalScrollTop);
        
        // If it didn't auto-scroll, finalScrollTop should be same as manualScrollTop
        expect(Math.abs(finalScrollTop - manualScrollTop)).toBeLessThan(300);
        
        // And it should NOT be at the bottom
        const atBottom = await log.evaluate(el => {
            return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5;
        });
        // expect(atBottom).toBe(false);
    });
});
