/** @file ClientPanelStackResizeHandle.tsx — Transfers height between adjacent panels. */

import React, { useRef } from 'react';
import type { ClientPanelStackId } from '../../types/clientPanelStack';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';

// --- Logic Section ---
type ResizeStart = {
    pointerId: number;
    startY: number;
    firstHeight: number;
    pairHeight: number;
    pairWeight: number;
};

const MIN_PANEL_HEIGHT = 80;

export const ClientPanelStackResizeHandle: React.FC<{
    firstPanel: ClientPanelStackId;
    secondPanel: ClientPanelStackId;
}> = ({ firstPanel, secondPanel }) => {
    const drag = useRef<ResizeStart | null>(null);

    const resizeTo = (firstHeight: number, pairHeight: number, pairWeight: number) => {
        const minimum = Math.min(MIN_PANEL_HEIGHT, Math.max(1, pairHeight / 2 - 1));
        const nextFirstHeight = Math.max(minimum, Math.min(pairHeight - minimum, firstHeight));
        const firstWeight = pairWeight * nextFirstHeight / pairHeight;
        useClientPanelStackStore.getState().resizePair(firstPanel, secondPanel, firstWeight, pairWeight - firstWeight);
    };

    const pairGeometry = (handle: HTMLElement) => {
        const stack = handle.closest('.client-panels-stack');
        const first = stack?.querySelector<HTMLElement>(`[data-client-panel-id="${firstPanel}"]`);
        const second = stack?.querySelector<HTMLElement>(`[data-client-panel-id="${secondPanel}"]`);
        if (!first || !second) return null;
        const firstHeight = first.getBoundingClientRect().height;
        const pairHeight = firstHeight + second.getBoundingClientRect().height;
        if (pairHeight <= 0) return null;
        const weights = useClientPanelStackStore.getState().weights;
        return { firstHeight, pairHeight, pairWeight: weights[firstPanel] + weights[secondPanel] };
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const geometry = pairGeometry(event.currentTarget);
        if (!geometry) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, startY: event.clientY, ...geometry };
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        resizeTo(active.firstHeight + event.clientY - active.startY, active.pairHeight, active.pairWeight);
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        const geometry = pairGeometry(event.currentTarget);
        if (!geometry) return;
        event.preventDefault();
        const change = event.key === 'ArrowDown' ? 16 : -16;
        resizeTo(geometry.firstHeight + change, geometry.pairHeight, geometry.pairWeight);
    };

    const endResize = () => { drag.current = null; };

    // --- Render Section ---
    return (
        <div
            className="client-panel-stack-resize-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label={`Resize ${firstPanel} and ${secondPanel} panels`}
            aria-valuetext="Drag to transfer height between panels"
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
