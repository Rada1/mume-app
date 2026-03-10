import { test, expect } from '@playwright/test';

test('drag and drop inline button to inventory', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // We need to simulate the message log having an inline button.
    // Since we don't have a mock server yet, we might need to inject one or wait for the real game.
    // For debugging, let's inject an inline button manually into the DOM if it's not there.

    await page.evaluate(() => {
        const log = document.querySelector('.message-log-container');
        if (log) {
            const btn = document.createElement('span');
            btn.className = 'inline-btn';
            btn.setAttribute('draggable', 'true');
            btn.setAttribute('data-cmd', 'item');
            btn.setAttribute('data-context', 'a test item');
            btn.setAttribute('data-id', 'test-123');
            btn.innerText = '[Test Item]';
            log.appendChild(btn);
        }
    });

    const inlineBtn = page.locator('.inline-btn').first();
    const drawer = page.locator('.right-drawer');

    // Ensure drawer is peeking when dragging near it
    const box = await inlineBtn.boundingBox();
    if (!box) throw new Error('Could not find inline button');

    // Start dragging
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Move towards the right edge to trigger peek
    await page.mouse.move(page.viewportSize()!.width - 50, page.viewportSize()!.height / 2);

    // Wait for drawer to be visible/peeking
    await expect(drawer).toHaveClass(/peeking/);

    // Drop onto the drawer
    await page.mouse.move(page.viewportSize()!.width - 100, page.viewportSize()!.height / 2);
    await page.mouse.up();

    // Check console logs for our debug messages
    // We can't easily check 'executeCommand' call without mocking, 
    // but we can check if our debug logs were fired.
});
