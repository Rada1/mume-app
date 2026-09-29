/** @file TacticalDirectionPad.tsx — Tap targets for command directions. */

import React from 'react';
import './TacticalDirectionPad.css';

// --- Data Section ---
interface DirectionOption {
    value: string;
    label: string;
    arrow: string;
    row: number;
    column: number;
    axis?: boolean;
}

const DIRECTION_OPTIONS: DirectionOption[] = [
    { value: 'up', label: 'Up', arrow: '↑', row: 1, column: 1, axis: true },
    { value: 'n', label: 'North', arrow: '↑', row: 1, column: 2 },
    { value: 'w', label: 'West', arrow: '←', row: 2, column: 1 },
    { value: 'e', label: 'East', arrow: '→', row: 2, column: 3 },
    { value: 's', label: 'South', arrow: '↓', row: 3, column: 2 },
    { value: 'down', label: 'Down', arrow: '↓', row: 3, column: 3, axis: true }
];

const MOVEMENT_WHEEL_OPTIONS: DirectionOption[] = [
    { value: 'u', label: 'Up', arrow: '↑', row: 1, column: 1, axis: true },
    { value: 'n', label: 'North', arrow: '↑', row: 1, column: 2 },
    { value: 'w', label: 'West', arrow: '←', row: 2, column: 1 },
    { value: 'e', label: 'East', arrow: '→', row: 2, column: 3 },
    { value: 's', label: 'South', arrow: '↓', row: 3, column: 2 },
    { value: 'd', label: 'Down', arrow: '↓', row: 3, column: 3, axis: true }
];

interface Props {
    layout: 'below' | 'side' | 'wheel';
    selectedDirection: string | null;
    onSelectDirection: (direction: string) => void;
}

// --- UI Section ---
export const TacticalDirectionPad: React.FC<Props> = ({ layout, selectedDirection, onSelectDirection }) => {
    const directions = layout === 'wheel' ? MOVEMENT_WHEEL_OPTIONS : DIRECTION_OPTIONS;

    return (
        <section
            className={`tactical-target-direction tactical-target-direction-${layout}`}
            aria-label={layout === 'wheel' ? 'Choose movement direction' : 'Choose direction'}
        >
            <div className="tactical-target-direction-compass">
                {directions.map(({ value, label, arrow, row, column, axis }) => (
                    <button
                        key={value}
                        type="button"
                        className={`tactical-target-direction-button${axis ? ' is-axis-direction' : ''}${layout === 'wheel' ? ' is-movement-direction' : ''}${selectedDirection === value ? ' is-selected' : ''}`}
                        style={{ gridRow: row, gridColumn: column }}
                        aria-label={label}
                        aria-pressed={selectedDirection === value}
                        data-direction-value={value}
                        onPointerDown={event => event.stopPropagation()}
                        onPointerUp={event => {
                            event.preventDefault();
                            event.stopPropagation();
                            onSelectDirection(value);
                        }}
                        onClick={event => {
                            event.stopPropagation();
                            if (event.detail === 0) onSelectDirection(value);
                        }}
                    >{axis ? <><span>{arrow}</span><small>{label}</small></> : arrow}</button>
                ))}
            </div>
        </section>
    );
};
