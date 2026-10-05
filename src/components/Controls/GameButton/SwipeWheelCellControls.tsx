/** @file SwipeWheelCellControls.tsx — Side controls for the fixed swipe wheel. */

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import './SwipeWheelCellControls.css';

// --- Types ---
interface Props {
    children: ReactNode;
    isDeleteMode: boolean;
    onDeleteModeChange: (active: boolean) => void;
    onStartCreatingCell: () => void;
    onToolTap: () => void;
    hoveredPanelTool?: 'add' | 'delete' | 'swap' | null;
}

// --- UI Section ---
export const SwipeWheelCellControls: React.FC<Props> = ({ children, isDeleteMode, onDeleteModeChange, onStartCreatingCell, onToolTap, hoveredPanelTool }) => {
    const stopPointerPropagation = (event: React.PointerEvent) => event.stopPropagation();
    const openForm = (event: React.SyntheticEvent) => {
        event.stopPropagation();
        onToolTap();
        onStartCreatingCell();
        onDeleteModeChange(false);
    };
    const toggleDeleteMode = (event: React.SyntheticEvent) => {
        event.stopPropagation();
        onToolTap();
        onDeleteModeChange(!isDeleteMode);
    };
    return <div className="swipe-wheel-with-tools">
            <div className="swipe-wheel-side-tools">
                <button
                    type="button"
                    className={`swipe-wheel-tool-button is-add${hoveredPanelTool === 'add' ? ' is-pointer-selected' : ''}`}
                    data-panel-tool="add"
                    aria-label="Add custom swipe cell"
                    title="Add custom cell"
                    onPointerDown={stopPointerPropagation}
                    onPointerUp={event => {
                        event.stopPropagation();
                        openForm(event);
                    }}
                    onClick={event => {
                        event.stopPropagation();
                        if (event.detail === 0) openForm(event);
                    }}
                ><Plus size={20} strokeWidth={2.5} aria-hidden="true" /></button>
            </div>
            {children}
            <div className="swipe-wheel-side-tools">
                <button
                    type="button"
                    className={`swipe-wheel-tool-button is-remove${isDeleteMode ? ' is-active' : ''}${hoveredPanelTool === 'delete' ? ' is-pointer-selected' : ''}`}
                    data-panel-tool="delete"
                    aria-label={isDeleteMode ? 'Cancel custom cell deletion' : 'Delete a custom swipe cell'}
                    title={isDeleteMode ? 'Cancel delete mode' : 'Delete a custom cell'}
                    aria-pressed={isDeleteMode}
                    onPointerDown={stopPointerPropagation}
                    onPointerUp={event => {
                        event.stopPropagation();
                        toggleDeleteMode(event);
                    }}
                    onClick={event => {
                        event.stopPropagation();
                        if (event.detail === 0) toggleDeleteMode(event);
                    }}
                ><Minus size={20} strokeWidth={2.5} aria-hidden="true" /></button>
            </div>
    </div>;
};
