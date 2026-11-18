/** @file MapChatHistoryResizeHandle.test.tsx — Keyboard resizing of the map history split. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MapChatHistoryResizeHandle } from './MapChatHistoryResizeHandle';

// --- Resize behavior ---
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('transfers height between history and the map with arrow keys', () => {
    const { container } = render(<div className="left-drawer-stack"><MapChatHistoryResizeHandle /><div className="desktop-map-chat-history-slot" /></div>);
    const stack = container.querySelector<HTMLElement>('.left-drawer-stack')!;
    const slot = container.querySelector<HTMLElement>('.desktop-map-chat-history-slot')!;
    vi.spyOn(stack, 'getBoundingClientRect').mockReturnValue({ height: 600 } as DOMRect);
    vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({ height: 200 } as DOMRect);
    const handle = screen.getByRole('separator', { name: 'Resize map and chat history' });
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(slot.style.getPropertyValue('--map-chat-history-height')).toBe('216px');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(slot.style.getPropertyValue('--map-chat-history-height')).toBe('184px');
});
