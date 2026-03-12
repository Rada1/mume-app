import { test, expect } from '@playwright/test';

test.describe('Inline Button Desktop Interactions', () => {
    
    test.beforeEach(async ({ page }) => {
        // Listen to console to catch our specific TypeError
        page.on('pageerror', exception => {
            console.log(`Uncaught exception: "${exception}"`);
        });

        await page.goto('/');

        // Inject an inline button into the DOM for testing
        await page.evaluate(() => {
            const log = document.querySelector('.message-log-container');
            if (log) {
                const btn = document.createElement('span');
                btn.className = 'inline-btn';
                btn.setAttribute('draggable', 'true');
                btn.setAttribute('data-cmd', 'target');
                btn.setAttribute('data-context', 'test_target');
                btn.setAttribute('data-id', 'test-123');
                
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

    test('Hypothesis 1: Clicking text node throws TypeError', async ({ page }) => {
        let caughtError = false;
        
        page.on('pageerror', (error) => {
            if (error.message.includes('closest is not a function')) {
                caughtError = true;
            }
        });

        const btn = page.locator('.inline-btn').first();
        
        // Use evaluate to dispatch an event exactly on the Text Node itself, 
        // which mimics a precise user click on the text in a desktop browser.
        await btn.evaluate((node) => {
            const textNode = node.childNodes[0];
            const event = new MouseEvent('click', { bubbles: true, cancelable: true });
            // Dispatch on the text node directly
            textNode.dispatchEvent(event);
        });

        // If the bug exists, caughtError will be true. 
        // We expect this to equal true to PROVE the bug exists.
        expect(caughtError).toBe(true);
    });

    test('Hypothesis 2: Sloppy click (2px move) is swallowed by draggable', async ({ page }) => {
        const btn = page.locator('.inline-btn').first();
        const box = await btn.boundingBox();
        if (!box) throw new Error('Could not find button');

        // Reset our test flag
        await page.evaluate(() => { window['__TEST_CLICK_FIRED__'] = false; });

        // Simulate a "sloppy" click (move 2 pixels while holding mouse down)
        await page.mouse.move(box.x + 10, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + 12, box.y + 10); // Move 2px right
        await page.mouse.up();

        // Check if the click event actually fired
        const didClickFire = await page.evaluate(() => window['__TEST_CLICK_FIRED__']);
        
        // If draggable swallowed the click, didClickFire will be FALSE.
        // We expect this to be false to PROVE the drag interference exists.
        expect(didClickFire).toBe(false);
    });
});
