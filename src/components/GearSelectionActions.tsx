/** @file GearSelectionActions.tsx — Contextual commands for a scoped item selection. */

import React, { useState } from 'react';
import type { GearSelectionActionsProps } from '../types';
import { getGearSelectionLabel } from '../utils/gearSelectionUtils';

// --- Render Section ---
export const GearSelectionActions: React.FC<GearSelectionActionsProps> = ({ selection, containers, onRun, onClear }) => {
    const [showContainers, setShowContainers] = useState(false);
    const canGet = Boolean(selection.parentNoun) || selection.section === 'room';
    const canCarry = selection.section === 'carried' && !selection.parentNoun;
    return <div className="gear-actions gear-selection-actions" aria-label="Selected item actions">
        <div className="gear-actions-label-row">
            <span className="gear-actions-label">{selection.items.length} selected · {getGearSelectionLabel(selection)}</span>
            <button className="gear-selection-clear" type="button" onClick={onClear}>Clear</button>
        </div>
        <div className="gear-action-buttons">
            {canGet && <button type="button" onClick={() => onRun('get')}>Get</button>}
            {canCarry && <>
                <button type="button" onClick={() => onRun('wear')}>Wear</button>
                <button type="button" onClick={() => onRun('drop')}>Drop</button>
                {containers.length > 0 && <button type="button" onClick={() => setShowContainers(value => !value)}>
                    {showContainers ? 'Cancel put' : 'Put in…'}
                </button>}
            </>}
            {selection.section === 'worn' && <button type="button" onClick={() => onRun('remove')}>Remove</button>}
        </div>
        {showContainers && <div className="gear-action-buttons gear-selection-destinations" aria-label="Choose destination container">
            {containers.map(container => <button key={container.line.id} type="button"
                onClick={() => { onRun('put', container.noun); setShowContainers(false); }}>
                {container.name}
            </button>)}
        </div>}
    </div>;
};

export default GearSelectionActions;
