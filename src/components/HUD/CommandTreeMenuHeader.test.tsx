// @vitest-environment jsdom
/** @file CommandTreeMenuHeader.test.tsx — Hover previews never activate explicit skill sync. */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommandTreeMenuHeader } from './CommandTreeMenuHeader';

// --- Snapshot Request Stub ---
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../../hooks/usePanelData', () => ({ usePanelData: () => ({
    status: { skills: 'idle' }, request: mocks.request, enabled: true
}) }));
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

// --- Explicit Activation Checks ---
it('does not sync on hover or focus; clicking syncs once', () => {
    render(<CommandTreeMenuHeader root showSkills helpMode={false} pinned={false}
        cancelPreview={vi.fn()} onHelp={vi.fn()} onPin={vi.fn()} />);
    const sync = screen.getByRole('button', { name: 'Sync abilities' });
    fireEvent.pointerOver(sync, { pointerType: 'mouse' });
    fireEvent.mouseOver(sync);
    fireEvent.focus(sync);
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(sync);
    expect(mocks.request).toHaveBeenCalledExactlyOnceWith('skills', false);
});

it('cancels a pending Practice hover before it can request a snapshot', () => {
    vi.useFakeTimers();
    const previewPractice = vi.fn();
    const timer = setTimeout(previewPractice, 180);
    render(<CommandTreeMenuHeader root showSkills helpMode={false} pinned={false}
        cancelPreview={() => clearTimeout(timer)} onHelp={vi.fn()} onPin={vi.fn()} />);
    fireEvent.pointerOver(screen.getByRole('button', { name: 'Sync abilities' }), { pointerType: 'mouse' });
    vi.advanceTimersByTime(300);
    expect(previewPractice).not.toHaveBeenCalled();
    expect(mocks.request).not.toHaveBeenCalled();
});
