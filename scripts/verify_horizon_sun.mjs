/** @file verify_horizon_sun.mjs -- Verify visible sunrise pixels with the real sky masks. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

// --- Screenshot Reproduction: Wedmath Sunrise 4 AM ---
export const verifyHorizonSun = async (page, cdp, PNG, initialClock, performanceMode) => {
    let clock = initialClock;
    await page.setViewportSize({ width: 2048, height: 840 });
    await page.evaluate(() => window.setSky('artificial', 'clear'));
    await page.evaluate(time => window.step(time), clock += 1000);
    await page.evaluate(() => {
        window.setSunTime(5, 0, 'Wedmath');
        window.setTwilight('dawn', 120);
    });
    assert.equal(await page.locator('.client-sun-disc').count(), 0, 'Artificial lighting must not render the sun');
    await page.evaluate(() => window.setSky('sun', 'clear'));
    await page.evaluate(time => window.step(time), clock += 1000);
    for (const [hour, minute] of [[4, -1], [4, 0], [5, 19]]) {
        await page.evaluate(([h, m]) => {
            window.setSunTime(h, m, 'Wedmath');
            window.setTwilight('dawn', 120);
        }, [hour, minute]);
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
            `sun at ${hour}:${minute}: the horizon sun must be visibly brighter than its surroundings`);
        mkdirSync('test-results', { recursive: true });
        writeFileSync(`test-results/horizon-sun-${hour}-${minute}-${performanceMode ? 'performance' : 'normal'}.png`, screenshot);
    }
    return clock;
};
