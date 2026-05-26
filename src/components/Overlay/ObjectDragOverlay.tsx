/**
 * @file ObjectDragOverlay.tsx
 * @description Floating feedback for long-press object drag commands.
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { useUIStore } from '../../stores/useUIStore';
import { getObjectDragCommand } from '../../hooks/useObjectDragCommands';
import './ObjectDragOverlay.css';

export const ObjectDragOverlay: React.FC = () => {
    const dragState = useUIStore(s => s.objectDragState);
    if (!dragState || typeof document === 'undefined') return null;

    const command = dragState.target ? getObjectDragCommand(dragState.source, dragState.target) : null;
    const label = command || `move ${dragState.source.label}`;

    return createPortal(
        <div
            className={`object-drag-overlay${command ? ' is-valid' : ''}`}
        >
            <span className="object-drag-chip">{dragState.source.label}</span>
            <span className="object-drag-command">{label}</span>
        </div>,
        document.body
    );
};

export default ObjectDragOverlay;
