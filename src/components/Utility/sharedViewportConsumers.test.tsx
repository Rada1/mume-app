/** @file sharedViewportConsumers.test.tsx — Hidden replay/help UI must not own viewport listeners. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { ReplayHUD } from '../Layout/HUD/ReplayHUD';
import { HelpCard } from './HelpCard';
import { useViewport } from '../../hooks/useViewport';

// --- Shared Viewport Checks ---
vi.mock('../../context/GameContext', () => ({
    useMessageLogShell: () => ({viewport: {isMobile: true, isLandscape: false}}),
    useUI: () => ({replayer: {state: {duration: 0, isVisible: false}, log: null}})
}));
vi.mock('../../hooks/useViewport', () => ({useViewport: vi.fn(() => {throw new Error('Duplicate viewport owner');})}));

it('uses shared viewport state for hidden replay controls and the help overlay', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<><ReplayHUD/><HelpCard helpData="Help text" onClose={() => undefined}/></>));
        expect(host.textContent).toContain('Help text');
        expect(useViewport).not.toHaveBeenCalled();
    } finally {await act(async () => root.unmount());}
});
