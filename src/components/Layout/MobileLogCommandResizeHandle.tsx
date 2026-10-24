/** @file MobileLogCommandResizeHandle.tsx — Resizable mobile log and command split. */

import React, { useEffect, useRef, useState } from 'react';
import './MobileLogCommandResizeHandle.css';

// --- Logic Section ---
type SplitAxis = 'horizontal' | 'vertical';

type ResizeStart = {
    pointerId: number;
    coordinate: number;
    commandSize: number;
    totalSize: number;
    minimumCommandSize: number;
    minimumLogSize: number;
};

const HANDLE_SIZE = 12;

const syncMobileCommandBounds = (split: HTMLElement) => {
    const command = split.querySelector<HTMLElement>('.mobile-command-column');
    const app = split.closest<HTMLElement>('.app-container');
    if (!command || !app) return;
    const rect = command.getBoundingClientRect();
    app.style.setProperty('--mobile-command-panel-top', `${rect.top}px`);
    app.style.setProperty('--mobile-command-panel-right', `${Math.max(0, window.innerWidth - rect.right)}px`);
    app.style.setProperty('--mobile-command-panel-bottom', `${Math.max(0, window.innerHeight - rect.bottom)}px`);
    app.style.setProperty('--mobile-command-panel-left', `${rect.left}px`);
    app.style.setProperty('--mobile-command-panel-width', `${rect.width}px`);
};

export const MobileLogCommandResizeHandle: React.FC<{ axis: SplitAxis }> = ({ axis }) => {
    const drag = useRef<ResizeStart | null>(null);
    const [isActive, setIsActive] = useState(false);
    const storageKey = axis === 'horizontal'
        ? 'mume-mobile-log-command-split-portrait-v2'
        : 'mume-mobile-log-command-split-vertical';

    useEffect(() => {
        const split = document.querySelector<HTMLElement>('.mobile-log-command-split');
        if (!split) return;
        try {
            const savedSize = Number(window.localStorage.getItem(storageKey));
            if (Number.isFinite(savedSize) && savedSize > 0 && savedSize < 1) {
                split.style.setProperty('--mobile-command-area-size', `${savedSize * 100}%`);
            }
        } catch {
            // Keep the CSS default when local storage is unavailable.
        }
        const updateCommandBounds = () => syncMobileCommandBounds(split);
        updateCommandBounds();
        const observer = new ResizeObserver(updateCommandBounds);
        observer.observe(split);
        const command = split.querySelector<HTMLElement>('.mobile-command-column');
        if (command) observer.observe(command);
        window.addEventListener('resize', updateCommandBounds);
        window.visualViewport?.addEventListener('resize', updateCommandBounds);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateCommandBounds);
            window.visualViewport?.removeEventListener('resize', updateCommandBounds);
            split.style.removeProperty('--mobile-command-area-size');
            const app = split.closest<HTMLElement>('.app-container');
            app?.style.removeProperty('--mobile-command-panel-top');
            app?.style.removeProperty('--mobile-command-panel-right');
            app?.style.removeProperty('--mobile-command-panel-bottom');
            app?.style.removeProperty('--mobile-command-panel-left');
            app?.style.removeProperty('--mobile-command-panel-width');
        };
    }, [axis, storageKey]);

    const getGeometry = (handle: HTMLElement) => {
        const split = handle.closest<HTMLElement>('.mobile-log-command-split');
        const command = split?.querySelector<HTMLElement>('.mobile-command-column');
        if (!split || !command) return null;
        const splitRect = split.getBoundingClientRect();
        const commandRect = command.getBoundingClientRect();
        const totalSize = axis === 'horizontal' ? splitRect.height : splitRect.width;
        const commandSize = axis === 'horizontal' ? commandRect.height : commandRect.width;
        const minimumCommandSize = axis === 'horizontal' ? 140 : 160;
        const minimumLogSize = axis === 'horizontal' ? 120 : 160;
        if (totalSize <= HANDLE_SIZE + minimumCommandSize + minimumLogSize) return null;
        return { totalSize, commandSize, minimumCommandSize, minimumLogSize };
    };

    const resizeTo = (handle: HTMLElement, commandSize: number, totalSize: number, minimumCommandSize: number, minimumLogSize: number) => {
        const availableSize = totalSize - HANDLE_SIZE;
        const nextSize = Math.max(minimumCommandSize, Math.min(availableSize - minimumLogSize, commandSize));
        const ratio = nextSize / totalSize;
        const split = handle.closest<HTMLElement>('.mobile-log-command-split');
        if (!split) return;
        split.style.setProperty('--mobile-command-area-size', `${ratio * 100}%`);
        syncMobileCommandBounds(split);
        try {
            window.localStorage.setItem(storageKey, String(ratio));
        } catch {
            // Resizing remains available for this session when local storage is unavailable.
        }
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const geometry = getGeometry(event.currentTarget);
        if (!geometry) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
            pointerId: event.pointerId,
            coordinate: axis === 'horizontal' ? event.clientY : event.clientX,
            ...geometry
        };
        setIsActive(true);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        const coordinate = axis === 'horizontal' ? event.clientY : event.clientX;
        resizeTo(event.currentTarget, active.commandSize + active.coordinate - coordinate, active.totalSize, active.minimumCommandSize, active.minimumLogSize);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const growsCommand = axis === 'horizontal' ? event.key === 'ArrowUp' : event.key === 'ArrowLeft';
        const shrinksCommand = axis === 'horizontal' ? event.key === 'ArrowDown' : event.key === 'ArrowRight';
        if (!growsCommand && !shrinksCommand) return;
        const geometry = getGeometry(event.currentTarget);
        if (!geometry) return;
        event.preventDefault();
        const change = growsCommand ? 16 : -16;
        resizeTo(event.currentTarget, geometry.commandSize + change, geometry.totalSize, geometry.minimumCommandSize, geometry.minimumLogSize);
    };

    const endResize = () => {
        drag.current = null;
        setIsActive(false);
    };

    // --- Render Section ---
    return (
        <div
            className={`mobile-log-command-resize-handle${isActive ? ' is-active' : ''}`}
            role="separator"
            aria-orientation={axis}
            aria-label="Resize log and command areas"
            aria-valuetext="Drag to resize the log and command areas"
            tabIndex={0}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            onLostPointerCapture={endResize}
            onKeyDown={onKeyDown}
        />
    );
};
