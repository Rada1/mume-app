import { test, expect } from '@playwright/test';

test.describe('Message Log Scroll Behavior', () => {
    test('should stay locked to bottom when new messages arrive', async ({ page }) => {
        await page.goto('http://localhost:3002/');
        
        // Wait for message log
        const log = page.locator('.message-log');
        await page.waitForSelector('.message-log');

        // Helper to check if scrolled to bottom
        const isAtBottom = async () => {
            return await log.evaluate((el) => {
                const threshold = 10;
                const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                return distance < threshold;
            });
        };

        // 1. Initially it might not have content, so it's at bottom
        expect(await isAtBottom()).toBe(true);

        // 2. Inject some dummy messages to create scroll
        await page.evaluate(() => {
            const container = document.querySelector('.message-log > div > div');
            if (container) {
                for (let i = 0; i < 100; i++) {
                    const msg = document.createElement('div');
                    msg.className = 'message game';
                    msg.style.height = '30px';
                    msg.textContent = `Dummy Message ${i}`;
                    container.appendChild(msg);
                }
            }
        });

        // Trigger layout effect simulation by forcing a scroll to bottom if needed
        await log.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(100);
        expect(await isAtBottom()).toBe(true);

        // 3. Simulate wheeling DOWN small amount - should NOT unlock
        await page.mouse.move(500, 500); // move over log
        await page.mouse.wheel(0, 50);
        await page.waitForTimeout(100);
        
        // Even if we wheel down, if we were at bottom, we should stay locked or near it
        // The bug is likely that ANY wheel event unlocks.
        
        // Let's test manual drift: Inject more messages and see if it follows
        await page.evaluate(() => {
            const container = document.querySelector('.message-log > div > div');
            if (container) {
                for (let i = 100; i < 110; i++) {
                    const msg = document.createElement('div');
                    msg.className = 'message game';
                    msg.style.height = '30px';
                    msg.textContent = `New Message ${i}`;
                    container.appendChild(msg);
                }
            }
        });
        
        // If locked, it should have scrolled. 
        // We wait a bit for any requestAnimationFrame/ResizeObserver
        await page.waitForTimeout(200);
        
        // NOTE: In the real app, React state update for 'messages' triggers the scrollToBottom.
        // Direct DOM injection won't trigger the React effect.
        // We need to trigger the bug by interacting with the scroll logic.
    });

    test('reproduce wheel drift', async ({ page }) => {
        await page.goto('http://localhost:3002/');
        await page.waitForSelector('.message-log');
        const log = page.locator('.message-log');

        // Fill with some content
        await page.evaluate(() => {
            const container = document.querySelector('.message-log > div > div');
            if (container) {
                for (let i = 0; i < 50; i++) {
                    const msg = document.createElement('div');
                    msg.className = 'message game';
                    msg.style.height = '40px';
                    msg.style.border = '1px solid red';
                    msg.textContent = `Line ${i}`;
                    container.appendChild(msg);
                }
            }
        });

        // Ensure at bottom
        await log.evaluate(el => el.scrollTop = el.scrollHeight);
        await page.waitForTimeout(500);

        // Helper to check if "Locked" UI ( scrubber hidden )
        const isUiLocked = async () => {
            return await page.locator('.timeline-scrubber-overlay').isHidden();
        };

        // Initially should be locked
        // expect(await isUiLocked()).toBe(true); // Might fail if no messages in state

        // Simulate Wheel DOWN
        await page.mouse.move(400, 400);
        await page.mouse.wheel(0, 100);
        await page.waitForTimeout(200);

        // If it drifts, isNearBottom logic should have kept it locked if < 40px,
        // BUT wheel handler currently sets it to false UNCONDITIONALLY.
    });
});
