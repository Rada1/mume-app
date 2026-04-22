import { test, expect } from '@playwright/test';

test.describe('Inline Button Desktop Interactions', () => {
    
    test.beforeEach(async ({ page }) => {
        // Listen to console to catch our specific TypeError
        page.on('pageerror', exception => {
            console.log(`Uncaught exception: "${exception}"`);
        });

        await page.goto('/');
        
        await page.waitForSelector('.app-container', { timeout: 15000 });
        await page.waitForSelector('.message-log-container', { timeout: 15000 });

        // Inject an inline button into the DOM for testing
        await page.evaluate(() => {
            const log = document.querySelector('.message-log-container');
            if (log) {
                const btn = document.createElement('span');
                btn.className = 'inline-btn';
                btn.setAttribute('data-cmd', 'target');
                btn.setAttribute('data-context', 'test_target');
                btn.setAttribute('data-id', 'test-123');
                btn.setAttribute('data-action', 'menu');
                
                // Set draggable to what it is now, to prove it no longer swallows the click because it's false or undefined
                // Wait, our actual buttons now get rendered with `draggable="false"` or omitted? 
                // `renderInlineSpan` sets `draggable="true"` IF p.draggable !== false. 
                // We passed `draggable: false`, so it will omit `draggable="true"`.
                
                // Explicitly add a text node to test the closest() crash
                const textNode = document.createTextNode('Test Button');
                btn.appendChild(textNode);
                
                log.appendChild(btn);

                // Add a global click listener to prove whether a click actually registered
                window.addEventListener('click', () => {
                    window['__TEST_CLICK_FIRED__'] = true;
                });
            }
        });
    });

    test('Clicking text node inside inline button does not throw TypeError', async ({ page }) => {
        let caughtError = false;
        
        page.on('pageerror', (error) => {
            if (error.message.includes('closest is not a function')) {
                caughtError = true;
            }
        });

        const btn = page.locator('.inline-btn').first();
        
        await btn.evaluate((node) => {
            const textNode = node.childNodes[0];
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            textNode.dispatchEvent(event);
        });

        expect(caughtError).toBe(false);
    });

    test('Sloppy click (2px move) should NOT be swallowed and must fire click', async ({ page }) => {
        const btn = page.locator('.inline-btn').first();
        const box = await btn.boundingBox();
        if (!box) throw new Error('Could not find button');

        await page.evaluate(() => { window['__TEST_CLICK_FIRED__'] = false; });

        await page.mouse.move(box.x + 10, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + 12, box.y + 10); // Move 2px right
        await page.mouse.up();

        const didClickFire = await page.evaluate(() => window['__TEST_CLICK_FIRED__']);
        
        expect(didClickFire).toBe(true);
    });
});
