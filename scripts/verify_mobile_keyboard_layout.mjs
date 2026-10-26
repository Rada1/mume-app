/** @file verify_mobile_keyboard_layout.mjs — Guards the mobile split when typing in readability mode. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// --- Browser Geometry Section ---
const css = [
    'src/styles/base.css', 'src/styles/layout.css',
    'src/components/HUD/LogDockedInput.css',
    'src/components/HUD/CommandDockStrip.css',
    'src/components/HUD/CommandDockStripMobile.css',
    'src/components/Layout/ReadabilityMode.css',
    'src/components/Layout/MobileLogCommandResizeHandle.css',
].map(path => readFileSync(path, 'utf8')).join('\n');
const browser = await chromium.launch({ headless: true });
try {
    const page = await browser.newPage();
    for (const savedSize of [null, '280px']) {
        await page.setViewportSize({ width: 412, height: 800 });
        await page.setContent(`<style>${css}</style>
            <div class="app-container is-mobile readability-mode" ${savedSize ? `style="--mobile-command-area-size:${savedSize}"` : ''}>
              <div class="content-layer">
                <header style="flex:0 0 40px">Header</header>
                <div class="message-log-wrapper" style="display:flex;flex:1;min-height:0;position:relative">
                  <div class="mobile-log-command-split">
                    <div class="desktop-center-column" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
                      <div class="message-log-container" style="flex:1;min-height:0">Log</div>
                    </div>
                    <div class="mobile-log-command-resize-handle"></div>
                    <div class="mobile-command-column">
                      <div class="command-tree-v2 command-dock-shell command-dock-shell-mobile">
                        <div class="command-dock-input-main"><input aria-label="Command" /></div>
                        <div class="command-dock-actions">Actions</div>
                        <div class="command-dock-controls">Controls</div>
                        <div class="command-dock-summary">Summary</div>
                        <div class="command-dock-menu"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>`);
        const geometry = () => page.evaluate(() => {
            const rect = selector => document.querySelector(selector).getBoundingClientRect();
            const input = rect('.command-dock-input-main');
            const log = rect('.message-log-container');
            const column = rect('.mobile-command-column');
            return { inputBottom: input.bottom, inputTop: input.top, logBottom: log.bottom,
                logHeight: log.height, columnHeight: column.height, bottom: rect('.app-container').bottom };
        });
        const closed = await geometry();
        assert(closed.columnHeight > 100, 'Closed keyboard must retain the command workspace');
        // A resized layout viewport models Android resizes-content; no physical keyboard is emulated.
        for (const height of [500, 350]) {
            await page.setViewportSize({ width: 412, height });
            await page.locator('.app-container').evaluate(node => node.classList.add('kb-open'));
            const open = await geometry();
            assert(Math.abs(open.inputBottom - open.bottom) < 1, JSON.stringify(open));
            assert(Math.abs(open.logBottom - open.inputTop) < 1, JSON.stringify(open));
            assert(open.logHeight > 100, JSON.stringify(open));
            assert(open.columnHeight < 80, `Command workspace must collapse: ${JSON.stringify(open)}`);
        }
        await page.setViewportSize({ width: 412, height: 800 });
        await page.locator('.app-container').evaluate(node => node.classList.remove('kb-open'));
        const restored = await geometry();
        assert(Math.abs(restored.columnHeight - closed.columnHeight) < 1, 'Restore saved split after keyboard closes');
        console.log(`Readability keyboard geometry passes with ${savedSize ?? 'default'} split, including short viewports and restore.`);
    }
} finally {
    await browser.close();
}
