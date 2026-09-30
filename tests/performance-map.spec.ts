/**
 * @file Browser coverage and optional benchmark for the Performance Mode mapper.
 */
// --- Logic Section ---

import { spawn, type ChildProcess } from 'node:child_process';
import { Socket } from 'node:net';
import { expect, test, type Page } from '@playwright/test';

const SIM_PORT = 18081;
let simulator: ChildProcess | undefined;

interface FastMapTestState {
    camera: { x: number; y: number; zoom: number };
    viewZ: number | null | undefined;
    renderVersion: number | undefined;
    currentRoomId: string | null | undefined;
    targetRoom: number[] | undefined;
}

test.describe('Performance Mode map renderer', () => {
    test.beforeAll(async () => {
        simulator = spawn(process.execPath, ['mume-sim.js'], {
            cwd: process.cwd(),
            env: { ...process.env, MUME_SIM_PORT: String(SIM_PORT) },
            stdio: 'ignore',
        });
        await new Promise<void>((resolve, reject) => {
            const startedAt = Date.now();
            const check = () => {
                if (simulator && simulator.exitCode !== null) {
                    reject(new Error('MUME simulator exited before it opened its test port.'));
                    return;
                }
                const socket = new Socket();
                socket.once('connect', () => { socket.destroy(); resolve(); });
                socket.once('error', () => {
                    socket.destroy();
                    if (Date.now() - startedAt > 8000) reject(new Error('MUME simulator did not start.'));
                    else setTimeout(check, 100);
                });
                socket.connect(SIM_PORT, '127.0.0.1');
            };
            check();
        });
    });

    test.afterAll(() => {
        simulator?.kill();
        simulator = undefined;
    });

    test('uses the worker renderer for the bundled map in Performance Mode', async ({ page }) => {
        await openGame(page, { isPerformanceMode: true });
        const canvas = page.locator('.mapper-container canvas.map-canvas').first();
        await expect(canvas).toHaveAttribute('data-map-renderer', 'performance-worker');
        await expect(canvas).toHaveAttribute('data-worker-ready', 'true', { timeout: 15000 });
        await expect(canvas).toHaveAttribute('data-map-loaded', 'true', { timeout: 30000 });
    });

    test('falls back to Canvas2D when worker construction fails', async ({ page }) => {
        await openGame(page, { isPerformanceMode: true, failFastMapWorker: true });
        await expect(page.locator('.mapper-container canvas.map-canvas').first())
            .toHaveAttribute('data-map-renderer', 'canvas2d', { timeout: 15000 });
    });

    test('tracks live room movement and walks to a clicked bundled-map room', async ({ page }) => {
        await openGame(page, { isPerformanceMode: true });
        const canvas = page.locator('.mapper-container canvas.map-canvas').first();
        await expect(canvas).toHaveAttribute('data-map-loaded', 'true', { timeout: 30000 });

        const bounds = await canvas.boundingBox();
        expect(bounds).not.toBeNull();
        const beforePan = await inspectFastMap(canvas);
        expect(beforePan).not.toBeNull();

        await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds!.x + bounds!.width / 2 + 30, bounds!.y + bounds!.height / 2 + 20);
        await page.mouse.up();
        await expect.poll(async () => (await inspectFastMap(canvas))?.camera.x).not.toBe(beforePan!.camera.x);

        const beforeZoom = await inspectFastMap(canvas);
        expect(await dispatchMapWheel(canvas, -120, false)).toBe(true);
        await expect.poll(async () => (await inspectFastMap(canvas))?.camera.zoom ?? 0)
            .toBeGreaterThan(beforeZoom!.camera.zoom);

        expect(await dispatchMapWheel(canvas, -120, true)).toBe(true);
        await expect.poll(async () => (await inspectFastMap(canvas))?.viewZ).toBe(1);
        expect(await dispatchMapWheel(canvas, 120, true)).toBe(true);
        await expect.poll(async () => (await inspectFastMap(canvas))?.viewZ).toBe(0);

        const camera = await inspectFastMap(canvas);
        expect(camera?.targetRoom).toBeDefined();
        const roomX = camera!.targetRoom![0]!;
        const roomY = camera!.targetRoom![1]!;
        const clickX = bounds!.x + (roomX * 50 + 25 - camera!.camera.x) * camera!.camera.zoom;
        const clickY = bounds!.y + (roomY * 50 + 25 - camera!.camera.y) * camera!.camera.zoom;
        await page.mouse.click(clickX, clickY, { button: 'right' });
        await expect(page.getByRole('button', { name: 'Walk Here' })).toBeVisible({ timeout: 5000 });
        await page.getByRole('button', { name: 'Walk Here' }).click();
        await expect(page.locator('.message-log')).toContainText("Trader's Way", { timeout: 12000 });
        await expect(canvas).toHaveAttribute('data-map-loaded', 'true');
    });

    test('keeps regular and immersion modes on the existing Canvas2D renderer', async ({ page }) => {
        await openGame(page, { isPerformanceMode: false });
        await expect(page.locator('.mapper-container canvas.map-canvas').first())
            .toHaveAttribute('data-map-renderer', 'canvas2d');
    });

    test('keeps immersion mode on the existing Canvas2D renderer', async ({ page }) => {
        await openGame(page, { isPerformanceMode: false, isImmersionMode: true });
        await expect(page.locator('.mapper-container canvas.map-canvas').first())
            .toHaveAttribute('data-map-renderer', 'canvas2d');
    });

    test('records a 30-second Canvas2D and worker map comparison when requested', async ({ page, browser }) => {
        test.skip(process.env.RUN_MAP_BENCHMARK !== '1', 'Opt-in local performance measurement.');
        test.setTimeout(180000);
        await openGame(page, { isPerformanceMode: false, showHud: true });
        const regular = await runMapInteractionSample(page);
        await page.addInitScript(() => {
            const key = 'mume-settings-storage';
            const stored = JSON.parse(window.localStorage.getItem(key) || '{}') as { state?: Record<string, unknown> };
            stored.state = { ...stored.state, isPerformanceMode: true };
            window.localStorage.setItem(key, JSON.stringify(stored));
        });
        await page.reload();
        await completeLogin(page);
        await expect(page.locator('.mapper-container canvas.map-canvas').first())
            .toHaveAttribute('data-map-loaded', 'true', { timeout: 30000 });
        const performance = await runMapInteractionSample(page);
        console.log(`MAP_BENCHMARK ${JSON.stringify({ browser: await browser.version(), regular, performance })}`);
    });

});

async function openGame(page: Page, settings: { isPerformanceMode: boolean; isImmersionMode?: boolean; failFastMapWorker?: boolean; showHud?: boolean }): Promise<void> {
    await page.addInitScript((args) => {
        window.localStorage.setItem('mume-settings-storage', JSON.stringify({
            state: {
                connectionUrl: `ws://localhost:${args.port}`,
                autoConnect: true,
                isPerformanceMode: args.performance,
                isImmersionMode: args.immersion,
                unveilMap: true,
                theme: 'dark',
            },
            version: 1,
        }));
        if (args.showHud) window.localStorage.setItem('mume_perf_hud', '1');
        if (args.failWorker) {
            const NativeWorker = window.Worker;
            window.Worker = new Proxy(NativeWorker, {
                construct(target, workerArgs) {
                    if (String(workerArgs[0]).includes('fastMap.worker')) throw new Error('Forced fast-map worker failure');
                    return Reflect.construct(target, workerArgs);
                },
            });
        }
    }, {
        port: SIM_PORT,
        performance: settings.isPerformanceMode,
        immersion: settings.isImmersionMode ?? false,
        failWorker: settings.failFastMapWorker ?? false,
        showHud: settings.showHud ?? false,
    });

    await page.goto('/');
    await completeLogin(page);
}

async function runMapInteractionSample(page: Page): Promise<Record<string, unknown>> {
    await page.bringToFront();
    await expect(page.getByTestId('performance-hud')).toBeVisible();
    return page.evaluate(async (durationMs) => {
        const canvas = document.querySelector<HTMLCanvasElement>('.mapper-container canvas.map-canvas');
        if (!canvas) throw new Error('Map canvas is missing.');
        const bounds = canvas.getBoundingClientRect();
        const intervals: number[] = [];
        let previousFrame = 0;
        let wheelEvents = 0;
        const startedAt = performance.now();
        const wheelTimer = window.setInterval(() => {
            canvas.dispatchEvent(new WheelEvent('wheel', {
                bubbles: true,
                cancelable: true,
                clientX: bounds.left + bounds.width / 2,
                clientY: bounds.top + bounds.height / 2,
                deltaY: wheelEvents++ % 2 === 0 ? -120 : 120,
            }));
        }, 16);
        await new Promise<void>(resolve => {
            const sampleFrame = (now: number) => {
                if (previousFrame > 0) intervals.push(now - previousFrame);
                previousFrame = now;
                if (now - startedAt < durationMs) requestAnimationFrame(sampleFrame);
                else resolve();
            };
            requestAnimationFrame(sampleFrame);
        });
        window.clearInterval(wheelTimer);
        const sorted = [...intervals].sort((a, b) => a - b);
        const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]! : 0;
        const rows = [...document.querySelectorAll<HTMLElement>('[data-testid="performance-hud"] [data-perf-label]')];
        const hud = Object.fromEntries(rows.map(row => [row.dataset.perfLabel || '', row.lastElementChild?.textContent?.trim() || '']));
        const map = document.querySelector<HTMLCanvasElement>('.mapper-container canvas.map-canvas');
        return {
            durationSeconds: Math.round((performance.now() - startedAt) / 1000),
            wheelEvents,
            animationFrameFps: Math.round(intervals.length * 1000 / Math.max(1, performance.now() - startedAt)),
            animationFrameP95Ms: Number(p95.toFixed(1)),
            animationFrameMaxMs: Number((sorted.at(-1) || 0).toFixed(1)),
            hud,
            renderer: map?.dataset.mapRenderer || 'missing',
            workerReady: map?.dataset.workerReady === 'true',
            mapLoaded: map?.dataset.mapLoaded === 'true',
            visibilityState: document.visibilityState,
            viewport: { width: window.innerWidth, height: window.innerHeight, hardwareConcurrency: navigator.hardwareConcurrency },
            userAgent: navigator.userAgent,
        };
    }, 30000);
}

async function completeLogin(page: Page): Promise<void> {
    await page.locator('.app-container').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('.message-log')).toContainText('By what name do you wish to be known?', { timeout: 15000 });
    const accountInput = page.locator('.account-input-trigger');
    await accountInput.waitFor({ state: 'visible', timeout: 15000 });
    await accountInput.fill('Tester');
    await page.keyboard.press('Enter');
    await expect(page.locator('.message-log')).toContainText('Account Password', { timeout: 10000 });
    await accountInput.fill('password');
    await page.keyboard.press('Enter');
    await page.locator('#mud-input').last().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.mapper-container canvas.map-canvas').first().waitFor({ state: 'attached', timeout: 30000 });
}

async function inspectFastMap(canvas: import('@playwright/test').Locator): Promise<FastMapTestState | null> {
    return canvas.evaluate(element => {
        interface FiberProps {
            camera?: { current?: { x: number; y: number; zoom: number } };
            viewZ?: number | null;
            renderVersion?: number;
            currentRoomId?: string | null;
            preloadedCoordsRef?: { current?: Record<string, readonly unknown[]> };
        }
        interface FiberNode {
            memoizedProps?: { mapProps?: FiberProps };
            return?: FiberNode | null;
        }
        const node = element as HTMLCanvasElement & Record<string, unknown>;
        const fiberKey = Object.keys(node).find(key => key.startsWith('__reactFiber$'));
        let fiber = fiberKey ? node[fiberKey] as FiberNode | undefined : undefined;
        while (fiber) {
            const props = fiber.memoizedProps?.mapProps;
            const camera = props?.camera?.current;
            if (camera) {
                const rawTarget = props.preloadedCoordsRef?.current?.['39'];
                return {
                    camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
                    viewZ: props.viewZ,
                    renderVersion: props.renderVersion,
                    currentRoomId: props.currentRoomId,
                    targetRoom: rawTarget?.slice(0, 3).map(Number),
                };
            }
            fiber = fiber.return;
        }
        return null;
    });
}

async function dispatchMapWheel(canvas: import('@playwright/test').Locator, deltaY: number, ctrlKey: boolean): Promise<boolean> {
    return canvas.evaluate((element, wheel) => {
        const bounds = element.getBoundingClientRect();
        const event = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            clientX: bounds.left + bounds.width / 2,
            clientY: bounds.top + bounds.height / 2,
            deltaY: wheel.deltaY,
            ctrlKey: wheel.ctrlKey,
        });
        element.dispatchEvent(event);
        return event.defaultPrevented;
    }, { deltaY, ctrlKey });
}
