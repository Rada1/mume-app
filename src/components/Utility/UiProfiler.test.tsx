/** @file UiProfiler.test.tsx — Profiling toggles must not reset game UI state. */
// @vitest-environment jsdom
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { withUiProfiler } from './UiProfiler';
import { uiPerformance } from '../../utils/uiPerformance';

// --- Boundary Checks ---
it('attributes React work and retains mounted state while collection is toggled', async () => {
    const Counter = withUiProfiler('Counter', () => {
        const [count, setCount] = useState(0);
        return <button onClick={() => setCount(previous => previous + 1)}>{count}</button>;
    });
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        uiPerformance.enabled = true;
        await act(async () => root.render(<Counter/>));
        await act(async () => host.querySelector('button')!.click());
        expect(host.textContent).toBe('1');
        expect(uiPerformance.getSnapshot().renders.find(entry => entry.name === 'Counter')?.count).toBeGreaterThan(0);
        uiPerformance.enabled = false;
        await act(async () => root.render(<Counter/>));
        expect(host.textContent).toBe('1');
        uiPerformance.enabled = true;
        await act(async () => root.render(<Counter/>));
        expect(host.textContent).toBe('1');
    } finally {
        await act(async () => root.unmount());
        uiPerformance.enabled = false;
        uiPerformance.reset();
    }
});
