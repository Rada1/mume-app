/** @file GearSelectionCheckbox.tsx — Compact right-aligned gear selection control. */

import React from 'react';
import type { GearSelectionCheckboxProps } from '../types';
import './GearSelectionCheckbox.css';

// --- Render Section ---
export const GearSelectionCheckbox: React.FC<GearSelectionCheckboxProps> = ({
    checked, mixed = false, disabled = false, label, visibleLabel, size = 'normal', onChange
}) => <button className={`gear-selection-control${size === 'large' ? ' is-large' : ''}${checked ? ' is-checked' : ''}${mixed ? ' is-mixed' : ''}`}
    type="button" role="checkbox" aria-checked={mixed ? 'mixed' : checked}
    disabled={disabled} aria-label={label} title={label}
    onClick={event => { event.stopPropagation(); onChange(); }}>
    <span className="gear-selection-box" aria-hidden="true" />
    {visibleLabel && <span className="gear-selection-label">{visibleLabel}</span>}
</button>;

export default GearSelectionCheckbox;
