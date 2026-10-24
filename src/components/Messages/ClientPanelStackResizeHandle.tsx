/** @file ClientPanelStackResizeHandle.tsx — Transfers height between adjacent panels or resizes single panels. */

import React, { useRef, useState } from 'react';
import type { ClientPanelStackId } from '../../types/clientPanelStack';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';

// --- Logic Section ---
type ResizeStart = {
    pointerId: number;
    startY: number;
    firstHeight: number;
    pairHeight: number;
    pairWeight: number;
    stackHeight: number;
    isSingle: boolean;
};

const MIN_PANEL_HEIGHT = 80;

export const ClientPanelStackResizeHandle: React.FC<{
    firstPanel: ClientPanelStackId;
    secondPanel?: ClientPanelStackId;
}> = ({ firstPanel, secondPanel }) => {
    const drag = useRef<ResizeStart | null>(null);
    const [isActive, setIsActive] = useState(false);

    const resizeTo = (firstHeight: number, pairHeight: number, pairWeight: number) => {
        const minimum = Math.min(MIN_PANEL_HEIGHT, Math.max(1, pairHeight / 2 - 1));
        const nextFirstHeight = Math.max(minimum, Math.min(pairHeight - minimum, firstHeight));
        const firstWeight = pairWeight * nextFirstHeight / pairHeight;
        useClientPanelStackStore.getState().resizePair(firstPanel, secondPanel!, firstWeight, pairWeight - firstWeight);
    };

    const resizeSingleTo = (nextHeight: number, stackHeight: number) => {
        const available = Math.max(MIN_PANEL_HEIGHT, stackHeight - 12);
        const clamped = Math.max(MIN_PANEL_HEIGHT, Math.min(available, nextHeight));
        const ratio = clamped >= available - 4 ? 1 : clamped / available;
        useClientPanelStackStore.getState().setSingleHeight(firstPanel, ratio);
    };

    const pairGeometry = (handle: HTMLElement) => {
        const stack = handle.closest('.client-panels-stack');
        const first = stack?.querySelector<HTMLElement>(`[data-client-panel-id="${firstPanel}"]`);
        if (!first || !stack) return null;
        const stackHeight = stack.getBoundingClientRect().height;
        const firstHeight = first.getBoundingClientRect().height;
        if (!secondPanel) {
            return { firstHeight, pairHeight: 0, pairWeight: 0, stackHeight, isSingle: true };
        }
        const second = stack.querySelector<HTMLElement>(`[data-client-panel-id="${secondPanel}"]`);
        if (!second) return null;
        const pairHeight = firstHeight + second.getBoundingClientRect().height;
        if (pairHeight <= 0) return null;
        const weights = useClientPanelStackStore.getState().weights;
        return { firstHeight, pairHeight, pairWeight: weights[firstPanel] + weights[secondPanel], stackHeight, isSingle: false };
    };

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const geometry = pairGeometry(event.currentTarget);
        if (!geometry) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsActive(true);
        drag.current = { pointerId: event.pointerId, startY: event.clientY, ...geometry };
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        if (active.isSingle) {
            resizeSingleTo(active.firstHeight + event.clientY - active.startY, active.stackHeight);
        } else {
            resizeTo(active.firstHeight + event.clientY - active.startY, active.pairHeight, active.pairWeight);
        }
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
        const geometry = pairGeometry(event.currentTarget);
        if (!geometry) return;
        event.preventDefault();
        const change = event.key === 'ArrowDown' ? 16 : -16;
        if (geometry.isSingle) {
            resizeSingleTo(geometry.firstHeight + change, geometry.stackHeight);
        } else {
            resizeTo(geometry.firstHeight + change, geometry.pairHeight, geometry.pairWeight);
        }
    };

    const endResize = () => {
        drag.current = null;
        setIsActive(false);
    };

    // --- Render Section ---
    const label = secondPanel
        ? `Resize ${firstPanel} and ${secondPanel} panels`
        : `Resize ${firstPanel} panel height`;
    const valueText = secondPanel
        ? 'Drag to transfer height between panels'
        : 'Drag to adjust panel height';

    return (
        <div
            className={`client-panel-stack-resize-handle${isActive ? ' is-active' : ''}`}
            role="separator"
            aria-orientation="horizontal"
            aria-label={label}
            aria-valuetext={valueText}
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

