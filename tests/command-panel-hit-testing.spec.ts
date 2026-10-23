/** @file command-panel-hit-testing.spec.ts — Reserved command dock space and command bar hit testing. */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// --- Actual Panel Styles ---
const css = [
    'src/styles/layout.css', 'src/styles/terminalPanels.css',
    'src/components/HUD/CommandGuidePanel.css', 'src/components/HUD/UnifiedCommandPanel.css',
    'src/components/HUD/LogDockedInput.css'
].map(path => readFileSync(path, 'utf8')).join('\n');

// --- Pointer Regression Scenarios ---
for (const mode of ['dark-mode', 'performance-mode immersion-mode']) {
    for (const longPanel of [false, true]) {
        test(`${mode}: ${longPanel ? 'long' : 'short'} columns leave the bar clickable`, async ({ page }) => {
            await page.setViewportSize({ width: 1400, height: 900 });
            await page.setContent(`<style>${css}</style><style>
                html, body { margin: 0; height: 100%; }
                :root { --z-hud-interactive: 7000; --command-actions-size: 260px; --command-targets-size: 220px; }
                .app-container { position: fixed; inset: 0; }
                .content-layer { position: fixed; inset: 0; padding: 0; width: auto; max-width: none; margin: 0; --terminal-panels-width: var(--desktop-command-panel-width); }
                .message-log-wrapper { position: absolute; inset: 52px 0 0; }
                .desktop-center-column { position: relative; flex: 1; width: 100%; min-height: 0; }
                .message-log-container { position: absolute; inset: 0; width: 100%; margin: 0; }
                .message-history { flex: 1; position: relative; min-height: 0; }
                #log-control { position: absolute; right: 30px; top: 400px; }
                .message-log-docked-input { height: 48px; min-height: 48px; box-sizing: border-box; justify-content: flex-end; }
                .message-log-docked-input button { width: 80px; height: 28px; margin: 0 3px; }
                .command-docked-panel { right: 0; }
                .fixture-target-content { min-height: ${longPanel ? '1400' : '60'}px; }
            </style>
            <div class="app-container ${mode}"><main class="content-layer has-docked-panels">
                <div class="message-log-wrapper chat-window-active"><div class="desktop-center-column" style="margin: 0 auto"><div class="message-log-container">
                    <div class="message-history"><button id="log-control">Log action</button></div>
                    <div class="message-log-docked-input">
                        <button id="target-chip">Target</button><button id="cancel">Cancel</button><button id="send">Send</button>
                    </div>
                </div></div></div>
                <aside class="docked-panel command-docked-panel">
                    <aside class="command-guide-panel unified-command-panel"><div class="unified-command-columns">
                        <section class="unified-command-column"><button id="panel-action">Panel action</button></section>
                        <section class="unified-command-column"><button id="target-action">Target action</button>
                            <div class="fixture-target-content"></div></section>
                    </div></aside>
                </aside>
            </main></div>`);
            await page.evaluate(() => {
                document.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
                    button.dataset.clicks = String(Number(button.dataset.clicks || 0) + 1);
                }));
            });
            for (const height of [48, 92]) {
                // Mirror the log geometry published by MainContentLayer's ResizeObserver.
                await page.evaluate(height => {
                    const bar = document.querySelector<HTMLElement>('.message-log-docked-input')!;
                    bar.style.height = `${height}px`;
                    bar.style.minHeight = `${height}px`;
                    const top = document.querySelector('.message-log-container')!.getBoundingClientRect().top;
                    document.documentElement.style.setProperty('--message-log-top', `${top}px`);
                    document.documentElement.style.setProperty('--message-log-action-area-height', `${bar.getBoundingClientRect().top - top}px`);
                }, height);
                for (const id of ['target-chip', 'cancel', 'send', 'panel-action', 'target-action']) {
                    await page.locator(`#${id}`).click({ timeout: 2000 });
                    await expect(page.locator(`#${id}`)).toHaveAttribute('data-clicks', height === 48 ? '1' : '2');
                }
                const panel = await page.locator('.command-docked-panel').boundingBox();
                const bar = await page.locator('.message-log-docked-input').boundingBox();
                expect(panel!.y + panel!.height).toBeLessThanOrEqual(bar!.y);
                const log = await page.locator('.message-log-container').boundingBox();
                expect(log!.x + log!.width).toBeLessThanOrEqual(panel!.x);
            }
            if (!longPanel) {
                await page.locator('#log-control').click({ timeout: 2000 });
                await expect(page.locator('#log-control')).toHaveAttribute('data-clicks', '1');
            }
            const dockedLog = (await page.locator('.message-log-container').boundingBox())!;
            const dockedWidth = dockedLog.width;
            await page.evaluate(() => {
                // Mirror useRetainedLogWidth's snapshot before releasing the dock lane.
                const width = document.querySelector('.message-log-container')!.getBoundingClientRect().width;
                document.documentElement.style.setProperty('--desktop-log-width', `${width / innerWidth * 100}vw`);
                document.querySelector('.command-docked-panel')!.remove();
                const content = document.querySelector<HTMLElement>('.content-layer')!;
                content.classList.remove('has-docked-panels');
                document.querySelector('.message-log-wrapper')!.classList.remove('chat-window-active');
                content.style.setProperty('--terminal-panels-width', '0px');
            });
            const expandedLog = (await page.locator('.message-log-container').boundingBox())!;
            expect(expandedLog.width).toBeCloseTo(dockedWidth);
            expect(expandedLog.x).toBe(dockedLog.x);
            // Manual resizing may use the space left by the closed dock.
            await page.evaluate(() => document.documentElement.style.setProperty('--desktop-log-width', '700px'));
            expect((await page.locator('.message-log-container').boundingBox())!.width).toBe(700);
        });
    }
}
