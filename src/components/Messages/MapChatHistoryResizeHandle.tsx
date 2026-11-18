/** @file MapChatHistoryResizeHandle.tsx — Resize the history beneath the desktop map. */
import React, { useRef, useState } from 'react';

// --- Resize Section ---
export const MapChatHistoryResizeHandle: React.FC = () => {
    const drag = useRef<{ pointerId: number; y: number; height: number } | null>(null);
    const [active, setActive] = useState(false);
    const resize = (handle: HTMLElement, height: number) => {
        const stack = handle.closest<HTMLElement>('.left-drawer-stack');
        const slot = stack?.querySelector<HTMLElement>('.desktop-map-chat-history-slot');
        if (!stack || !slot) return;
        const available = stack.getBoundingClientRect().height;
        const max = Math.max(1, available - 92);
        slot.style.setProperty('--map-chat-history-height', `${Math.max(Math.min(80, max), Math.min(max, height))}px`);
    };
    const height = (handle: HTMLElement) => handle.nextElementSibling?.getBoundingClientRect().height ?? 0;
    const end = () => { drag.current = null; setActive(false); };

    // --- Render Section ---
    return <div className={`map-chat-history-resize-handle${active ? ' is-active' : ''}`}
        role="separator" aria-orientation="horizontal" aria-label="Resize map and chat history" tabIndex={0}
        onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { pointerId: event.pointerId, y: event.clientY, height: height(event.currentTarget) };
            setActive(true);
        }}
        onPointerMove={event => {
            if (drag.current?.pointerId === event.pointerId) resize(event.currentTarget, drag.current.height + drag.current.y - event.clientY);
        }}
        onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
        onKeyDown={event => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            resize(event.currentTarget, height(event.currentTarget) + (event.key === 'ArrowUp' ? 16 : -16));
        }} />;
};
