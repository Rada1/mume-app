/**
 * @file command-visibility.spec.ts
 * @description Regression test for user command visibility in the message log.
 * Ensures that user-sent commands are rendered with the 'user-command-bubble' class.
 */

import { test, expect } from '@playwright/test';

test.describe('MUME Command Visibility', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('.app-container', { timeout: 15000 });
    });

    test('should render user commands in the message log', async ({ page }) => {
        const inputArea = page.locator('.input-field');
        const testCommand = 'look';

        // Wait for the message log to be present
        await page.waitForSelector('.message-log-container', { timeout: 15000 });

        // Type and send a command
        await inputArea.fill(testCommand);
        await page.keyboard.press('Enter');

        // Check for the user-command-bubble in the message log
        const commandBubble = page.locator('.user-command-bubble');
        
        // Ensure at least one bubble matches our command
        await expect(commandBubble.last()).toBeVisible({ timeout: 5000 });
        await expect(commandBubble.last()).toContainText(testCommand);
    });

    test('should NOT hide commands during the account phase (regression fix)', async ({ page }) => {
        const inputArea = page.locator('.input-field');
        
        // In the 'account' phase (login), user input should still be visible if not a password.
        // We'll enter a dummy account name.
        const accountName = 'TestUser' + Math.floor(Math.random() * 1000);
        
        await inputArea.fill(accountName);
        await page.keyboard.press('Enter');

        // The account name itself should be visible in the log as a user command
        const commandBubble = page.locator('.user-command-bubble');
        await expect(commandBubble.last()).toBeVisible({ timeout: 5000 });
        await expect(commandBubble.last()).toContainText(accountName);
    });
});
