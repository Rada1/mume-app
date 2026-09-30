/**
 * @file Browser integration for native MM2 import in Performance Mode.
 */
// --- Logic Section ---

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { Socket } from 'node:net';
import { expect, test, type Page } from '@playwright/test';

const SIM_PORT = 18082;
let simulator: ChildProcess | undefined;

test.describe('Performance Mode native MM2 import', () => {
  test.beforeAll(async () => {
    simulator = spawn(process.execPath, ['mume-sim.js'], {
      cwd: process.cwd(),
      env: { ...process.env, MUME_SIM_PORT: String(SIM_PORT) },
      stdio: 'ignore',
    });
    await waitForSimulator();
  });

  test.afterAll(() => {
    simulator?.kill();
    simulator = undefined;
  });

  test('imports the MMapper fixture into the worker renderer', async ({ page }) => {
    await openGame(page);
    const canvas = page.locator('.mapper-container canvas.map-canvas').first();
    await expect(canvas).toHaveAttribute('data-map-loaded', 'true', { timeout: 30000 });

    await page.getByRole('button', { name: 'More Actions' }).click();
    await page.locator('.header-dropdown-menu').getByText('Map', { exact: true }).click();
    await page.getByText('Import MM2', { exact: false }).waitFor({ state: 'visible' });
    const mapFile = await readFile(resolve(process.cwd(), 'data/arda.mm2'));
    await page.locator('input[type="file"][accept=".mm2"]').setInputFiles({
      name: 'arda.mm2',
      mimeType: 'application/octet-stream',
      buffer: mapFile,
    });

    await expect.poll(() => inspectImportedMap(canvas)).toMatchObject({
      canonicalRoomCount: expect.any(Number),
      tupleRoomCount: expect.any(Number),
    });
    const imported = await inspectImportedMap(canvas);
    expect(imported?.canonicalRoomCount).toBeGreaterThan(0);
    expect(imported?.tupleRoomCount).toBeGreaterThan(0);
    await expect(canvas).toHaveAttribute('data-map-loaded', 'true', { timeout: 30000 });
    await expect(canvas).toHaveAttribute('data-map-renderer', 'performance-worker');
  });
});

async function waitForSimulator(): Promise<void> {
  await new Promise<void>((resolveStart, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (simulator && simulator.exitCode !== null) {
        reject(new Error('MUME simulator exited before it opened its test port.'));
        return;
      }
      const socket = new Socket();
      socket.once('connect', () => { socket.destroy(); resolveStart(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt > 8000) reject(new Error('MUME simulator did not start.'));
        else setTimeout(check, 100);
      });
      socket.connect(SIM_PORT, '127.0.0.1');
    };
    check();
  });
}

async function openGame(page: Page): Promise<void> {
  await page.addInitScript(port => {
    window.localStorage.setItem('mume-settings-storage', JSON.stringify({
      state: {
        connectionUrl: `ws://localhost:${port}`,
        autoConnect: true,
        isPerformanceMode: true,
        isImmersionMode: false,
        unveilMap: true,
        theme: 'dark',
      },
      version: 1,
    }));
  }, SIM_PORT);

  await page.goto('/');
  await page.locator('.app-container').waitFor({ state: 'visible', timeout: 15000 });
  await expect(page.locator('.message-log')).toContainText('By what name do you wish to be known?', { timeout: 15000 });
  const accountInput = page.locator('.account-input-trigger');
  await accountInput.fill('Tester');
  await page.keyboard.press('Enter');
  await expect(page.locator('.message-log')).toContainText('Account Password', { timeout: 10000 });
  await accountInput.fill('password');
  await page.keyboard.press('Enter');
  await page.locator('#mud-input').last().waitFor({ state: 'visible', timeout: 10000 });
}

async function inspectImportedMap(canvas: import('@playwright/test').Locator): Promise<{
  canonicalRoomCount: number | null;
  tupleRoomCount: number;
} | null> {
  return canvas.evaluate(element => {
    interface FiberProps {
      performanceMapRef?: { current?: { roomCount?: number } | null };
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
      if (props?.preloadedCoordsRef) {
        return {
          canonicalRoomCount: props.performanceMapRef?.current?.roomCount ?? null,
          tupleRoomCount: Object.keys(props.preloadedCoordsRef.current ?? {}).length,
        };
      }
      fiber = fiber.return;
    }
    return null;
  });
}
