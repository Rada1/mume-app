import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

test.describe('MUME Highlighting Integration Tests', () => {
    let simulator: ChildProcess;

    test.beforeAll(async () => {
        // Robust cleanup of port 8080 on Windows
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process');
                const output = execSync('netstat -ano | findstr :8081').toString();
                const lines = output.split('\n');
                for (const line of lines) {
                    const match = line.trim().match(/LISTENING\s+(\d+)$/);
                    if (match) {
                        const pid = match[1];
                        console.log(`[Test] Killing existing simulator on PID ${pid}...`);
                        execSync(`taskkill /F /PID ${pid}`);
                    }
                }
            } catch (e) {
                // Silently ignore errors if port is not in use
            }
        }

        // Start the MUME simulator if not already running
        try {
            simulator = spawn('node', ['mume-sim.js'], {
                stdio: 'inherit',
                shell: true
            });
            // Ignore startup errors (likely already running)
            simulator.on('error', () => {});
        } catch (e) {}
        // Give it a moment to start
        await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test.afterAll(async () => {
        if (simulator) {
            // Kill the simulator process tree
            if (process.platform === 'win32') {
                spawn('taskkill', ['/pid', simulator.pid?.toString() || '', '/f', '/t']);
            } else {
                simulator.kill();
            }
        }
    });

    test.beforeEach(async ({ page }) => {
        // Log console messages from the browser
        page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

        // Force the app to connect to our local simulator
        await page.addInitScript(() => {
            const settings = {
                state: {
                    connectionUrl: 'ws://localhost:8081',
                    autoConnect: true,
                    isHighlighterEnabled: true,
                    theme: 'dark'
                },
                version: 1
            };
            window.localStorage.setItem('mume-settings-storage', JSON.stringify(settings));
        });

        await page.goto('/');
        await page.waitForSelector('.app-container', { timeout: 15000 });

        // Automated Login via Simulator
        console.log('[Test] Waiting for account input...');
        const accountInput = page.locator('.account-input-trigger');
        await accountInput.waitFor({ state: 'visible', timeout: 10000 });
        
        console.log('[Test] Sending account name...');
        await accountInput.fill('Tester');
        await page.keyboard.press('Enter');
        
        // Enter password in the same input (it re-renders or updates)
        console.log('[Test] Sending password...');
        await page.waitForTimeout(500);
        await accountInput.fill('password');
        await page.keyboard.press('Enter');
        
        // Wait for game entry
        console.log('[Test] Waiting for login confirmation...');
        await expect(page.locator('.message-log')).toContainText('The Simulator Void', { timeout: 15000 });
        
        // Now wait for the main command bar to appear
        await page.locator('#mud-input').waitFor({ state: 'visible', timeout: 5000 });
        console.log('[Test] Login successful.');
    });

    test('WHO list should highlight player names (including God markers)', async ({ page }) => {
        const inputField = page.locator('#mud-input');
        await inputField.fill('who');
        await page.keyboard.press('Enter');

        // Check for the header first to ensure it's processed
        await expect(page.locator('.message-log')).toContainText('Players', { timeout: 5000 });

        // Verify Ellessar (with God marker *[Mw])
        const ellessarBtn = page.locator('.inline-btn.pc-highlighter', { hasText: 'Ellessar' });
        await expect(ellessarBtn).toBeVisible({ timeout: 5000 });
        await expect(ellessarBtn).toHaveAttribute('data-kind', 'player');

        // Verify Rogon (with marker *[ A])
        const rogonBtn = page.locator('.inline-btn.pc-highlighter', { hasText: 'Rogon' });
        await expect(rogonBtn).toBeVisible();

        // Verify Hoplite (with marker <E>)
        const hopliteBtn = page.locator('.inline-btn.pc-highlighter', { hasText: 'Hoplite' });
        await expect(hopliteBtn).toBeVisible();

        // Verify Sirgrög (with indentation)
        const sirgrogBtn = page.locator('.inline-btn.pc-highlighter', { hasText: 'Sirgrög' });
        await expect(sirgrogBtn).toBeVisible();
    });

    test('Room occupants and items should highlight correctly', async ({ page }) => {
        const inputField = page.locator('#mud-input');
        await inputField.fill('test_highlights');
        await page.keyboard.press('Enter');

        // Verify NPC (green orc -> keyword: orc)
        const orcBtn = page.locator('.inline-btn.npc-highlighter').filter({ hasText: 'orc' });
        await expect(orcBtn).toBeVisible({ timeout: 5000 });
        await expect(orcBtn).toHaveAttribute('data-kind', 'npc');

        // Verify Player in room (Ciltor -> keyword: ciltor)
        const ciltorBtn = page.locator('.inline-btn.player-highlighter').filter({ hasText: 'Ciltor' });
        await expect(ciltorBtn).toBeVisible();
        await expect(ciltorBtn).toHaveAttribute('data-kind', 'player');

        // Verify Object in room (heavy sword -> keyword: sword)
        const swordBtn = page.locator('.inline-btn.object-highlighter').filter({ hasText: 'sword' });
        await expect(swordBtn).toBeVisible();
        await expect(swordBtn).toHaveAttribute('data-kind', 'object-room');
    });

    test('Minions list (God feature) should highlight correctly', async ({ page }) => {
        const inputField = page.locator('#mud-input');
        await inputField.fill('minions');
        await page.keyboard.press('Enter');

        // Verify Mozgus (with specialized name/desc)
        const mozgusBtn = page.locator('.inline-btn.player-highlighter').filter({ hasText: 'Mozgus' });
        await expect(mozgusBtn).toBeVisible({ timeout: 5000 });
    });
});
