/** @file PanelDataEmpty.tsx — Distinguishes unloaded gear from an empty snapshot. */
import React from 'react';
import { usePanelData } from '../../hooks/usePanelData';

// --- Render Section ---
export const PanelDataEmpty: React.FC<{ kind: 'equipment' | 'inventory'; emptyLabel: string }> = ({ kind, emptyLabel }) => {
    const { status, request, enabled } = usePanelData();
    if (status[kind] === 'ready' || !enabled) return <span className="gear-empty">{emptyLabel}</span>;
    return <button type="button" className="command-action-target-empty" disabled={status[kind] === 'loading'}
        onClick={() => request(kind)}>{status[kind] === 'loading' ? `Loading ${kind}…` : `Load ${kind}`}</button>;
};
