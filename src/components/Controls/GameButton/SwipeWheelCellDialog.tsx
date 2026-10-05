/** @file SwipeWheelCellDialog.tsx — Persistent form for adding a custom swipe action. */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { CreateSwipeWheelCell } from '../../../types';
import { useSwipeWheelCellDialogStore } from '../../../stores/useSwipeWheelCellDialogStore';
import './SwipeWheelCellControls.css';

// --- Types ---
interface Props {
    onCreateCell: CreateSwipeWheelCell;
    onClose: () => void;
}

// --- UI Section ---
export const SwipeWheelCellDialog: React.FC<Props> = ({ onCreateCell, onClose }) => {
    const [label, setLabel] = useState('');
    const [command, setCommand] = useState('');
    const [error, setError] = useState('');
    const stopPointerPropagation = (event: React.PointerEvent) => event.stopPropagation();
    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const cleanLabel = label.trim();
        const cleanCommand = command.trim();
        if (!cleanLabel || !cleanCommand) {
            setError('Enter both a label and a command.');
            return;
        }
        const result = onCreateCell(cleanLabel, cleanCommand);
        if (result) {
            setError(result);
            return;
        }
        onClose();
    };

    return createPortal(<div
        className="swipe-cell-dialog-backdrop"
        onPointerDown={stopPointerPropagation}
        onPointerUp={stopPointerPropagation}
        onClick={event => event.stopPropagation()}
    >
        <form
            className="swipe-cell-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="swipe-cell-dialog-title"
            onPointerDown={stopPointerPropagation}
            onPointerUp={stopPointerPropagation}
            onClick={event => event.stopPropagation()}
            onSubmit={submit}
        >
            <h2 id="swipe-cell-dialog-title">Add custom wheel cell</h2>
            <label>
                <span>Label</span>
                <input autoFocus value={label} maxLength={24} onChange={event => setLabel(event.target.value)} />
            </label>
            <label>
                <span>Command</span>
                <input value={command} maxLength={120} onChange={event => setCommand(event.target.value)} />
            </label>
            {error && <p className="swipe-cell-dialog-error" role="alert">{error}</p>}
            <div className="swipe-cell-dialog-actions">
                <button type="button" onClick={onClose}>Cancel</button>
                <button type="submit">Add cell</button>
            </div>
        </form>
    </div>, document.body);
};

// --- Persistent Host ---
export const SwipeWheelCellDialogHost: React.FC = () => {
    const onCreateCell = useSwipeWheelCellDialogStore(state => state.onCreateCell);
    const closeDialog = useSwipeWheelCellDialogStore(state => state.closeDialog);
    return onCreateCell ? <SwipeWheelCellDialog onCreateCell={onCreateCell} onClose={closeDialog} /> : null;
};
