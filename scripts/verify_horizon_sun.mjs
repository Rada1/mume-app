/** @file verify_horizon_sun.mjs -- Verify visible sunrise pixels with the real sky masks. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

// --- Screenshot Reproduction: Wedmath Dawn 4 AM, Sunrise 5 AM ---
export const verifyHorizonSun = async (page, cdp, PNG, initialClock, performanceMode) => {
    let clock = initialClock;
    await page.setViewportSize({ width: 2048, height: 840 });
    for (const lighting of ['sun', 'artificial']) {
        await page.evaluate(source => window.setSky(source, 'clear'), lighting);
        await page.evaluate(time => window.step(time), clock += 1000);
        for (const minute of [-1, 0, 19]) {
            await page.evaluate(value => {
                window.setSunTime(5, value, 'Wedmath');
                window.setTwilight('dawn', 60 + value);
            }, minute);
            await page.waitForTimeout(1200);
            const sun = await page.locator('.client-sun-disc').evaluate(element => {
                const rect = element.getBoundingClientRect();
                return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2),
                    opacity: Number(getComputedStyle(element).opacity), masked: getComputedStyle(element.parentElement).maskImage };
            });
            assert.equal(sun.opacity, minute < 0 ? 0 : 1);
            assert.equal(sun.masked, 'none', 'The sun must not inherit the sky mask that erases the horizon');
            if (minute < 0) continue;
            const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const screenshot = Buffer.from(data, 'base64'), pixels = PNG.sync.read(screenshot);
            const brightness = x => {
                const offset = (sun.y * pixels.width + x) * 4;
                return (pixels.data[offset] + pixels.data[offset + 1] + pixels.data[offset + 2]) / 3;
            };
            assert.ok(brightness(sun.x) > brightness(sun.x - 80) + 25,
                `${lighting} at 5:${minute}: the horizon sun must be visibly brighter than its surroundings`);
            mkdirSync('test-results', { recursive: true });
            writeFileSync(`test-results/horizon-${lighting}-5-${minute}-${performanceMode ? 'performance' : 'normal'}.png`, screenshot);
        }
    }
    return clock;
};
