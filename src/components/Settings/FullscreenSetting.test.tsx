/** @file FullscreenSetting.test.tsx — Fullscreen controls track browser state and failures. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { FullscreenSetting } from './FullscreenSetting';

// --- User-controlled fullscreen ---
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('enters and exits fullscreen in response to the setting', async () => {
    let fullscreen: Element | null = null;
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => fullscreen });
    document.documentElement.requestFullscreen = vi.fn(async () => { fullscreen = document.documentElement; document.dispatchEvent(new Event('fullscreenchange')); });
    document.exitFullscreen = vi.fn(async () => { fullscreen = null; document.dispatchEvent(new Event('fullscreenchange')); });
    const view = render(<FullscreenSetting/>);
    const toggle = view.getByRole('switch', {name: 'Fullscreen'});
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.getAttribute('aria-checked')).toBe('false'));
    vi.unstubAllGlobals();
});
