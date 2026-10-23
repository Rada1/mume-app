/** @file verify_solar_sky.mjs -- Browser continuity checks for complete twilight skies. */
import assert from 'node:assert/strict';

// --- Day/Night Endpoints and Cutoff Packet Continuity ---
export const verifySolarSky = async (page, sample, initialClock) => {
    let clock = initialClock;
    for (const phase of ['dawn', 'dusk']) {
        const start = phase === 'dawn' ? 'dark' : 'sun';
        const end = phase === 'dawn' ? 'sun' : 'dark';
        for (const offset of [-30, -15, 0, 15, 30]) {
            await page.evaluate(({ phase, offset, source }) => {
                window.setSunTime(phase === 'dawn' ? 9 : 19, offset);
                window.setTwilight(phase, offset + 60);
                window.setSky(source, 'clear');
            }, { phase, offset, source: offset <= 0 ? start : end });
            await page.evaluate(time => window.step(time), clock += 1000);
            await page.waitForTimeout(1100);
            const progress = (offset + 30) / 60;
            const eased = progress ** 2 * (3 - 2 * progress);
            const night = phase === 'dusk' ? eased : 1 - eased;
            const stars = await page.locator('.client-star-veil').evaluate(element => Number(getComputedStyle(element).opacity));
            assert.ok(Math.abs(stars - night * 0.96) < 0.00001, 'Stars must follow the full twilight sky blend');
            if (offset === 0) {
                const before = await sample();
                await page.evaluate(source => window.setSky(source, 'clear'), end);
                assert.deepEqual(await sample(), before, 'The cutoff lighting packet must not change visible sky pixels');
            }
            if (offset === 30) {
                await page.waitForFunction(() => {
                    const tint = document.querySelector('.environment-twilight-vignette');
                    return Number(getComputedStyle(tint).opacity) === 0;
                }, null, { polling: 50, timeout: 5000 });
                const endpoint = await sample();
                await page.evaluate(time => window.step(time), clock += 1000);
                await page.waitForTimeout(1100);
                const settled = await sample();
                // Texture drift and GPU rounding can move a channel by one RGB level.
                assert.ok(settled.every((value, index) => Math.abs(value - endpoint[index]) <= 1),
                    'The finished sky must not have a second settling fade');
            }
        }
    }
    return clock;
};
