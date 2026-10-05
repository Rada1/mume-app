/** @file TacticalDirectionPad.tsx — Tap targets for command directions. */

import React from 'react';
import './TacticalDirectionPad.css';

// --- Data Section ---
interface DirectionOption {
    value: string;
    label: string;
    initial: string;
    arrow: string;
    row: number;
    column: number;
    axis?: boolean;
}

const DIRECTION_OPTIONS: DirectionOption[] = [
    { value: 'up', label: 'Up', initial: 'U', arrow: '↑', row: 1, column: 1, axis: true },
    { value: 'n', label: 'North', initial: 'N', arrow: '↑', row: 1, column: 2 },
    { value: 'w', label: 'West', initial: 'W', arrow: '←', row: 2, column: 1 },
    { value: 'e', label: 'East', initial: 'E', arrow: '→', row: 2, column: 3 },
    { value: 's', label: 'South', initial: 'S', arrow: '↓', row: 3, column: 2 },
    { value: 'down', label: 'Down', initial: 'D', arrow: '↓', row: 3, column: 3, axis: true }
];

const MOVEMENT_WHEEL_OPTIONS: DirectionOption[] = [
    { value: 'u', label: 'Up', initial: 'U', arrow: '↑', row: 1, column: 1, axis: true },
    { value: 'n', label: 'North', initial: 'N', arrow: '↑', row: 1, column: 2 },
    { value: 'w', label: 'West', initial: 'W', arrow: '←', row: 2, column: 1 },
    { value: 'e', label: 'East', initial: 'E', arrow: '→', row: 2, column: 3 },
    { value: 's', label: 'South', initial: 'S', arrow: '↓', row: 3, column: 2 },
    { value: 'd', label: 'Down', initial: 'D', arrow: '↓', row: 3, column: 3, axis: true }
];

interface Props {
    layout: 'below' | 'side' | 'wheel';
    selectedDirection: string | null;
    onSelectDirection: (direction: string) => void;
    availableDoorDirections?: string[];
}

// --- UI Section ---
export const TacticalDirectionPad: React.FC<Props> = ({ layout, selectedDirection, onSelectDirection, availableDoorDirections }) => {
    const directions = layout === 'wheel' ? MOVEMENT_WHEEL_OPTIONS : DIRECTION_OPTIONS;

    return (
        <section
            className={`tactical-target-direction tactical-target-direction-${layout}`}
            aria-label={layout === 'wheel' ? 'Choose movement direction' : 'Choose direction'}
        >
            <div className="tactical-target-direction-compass">
                {directions.map(({ value, label, initial, arrow, row, column, axis }) => {
                    const exitDirection = value === 'up' || value === 'u' ? 'u'
                        : value === 'down' || value === 'd' ? 'd'
                            : value;
                    const unavailableDoor = availableDoorDirections !== undefined
                        && !availableDoorDirections.includes(exitDirection);
                    return (
                        <button
                            key={value}
                            type="button"
                            className={`tactical-target-direction-button${axis ? ' is-axis-direction' : ''}${layout === 'wheel' ? ' is-movement-direction' : ''}${selectedDirection === value ? ' is-selected' : ''}`}
                            style={{ gridRow: row, gridColumn: column }}
                            aria-label={unavailableDoor ? `${label}, no door in this direction` : label}
                            aria-pressed={selectedDirection === value}
                            data-direction-value={value}
                            disabled={unavailableDoor}
                            title={unavailableDoor ? 'No door in this direction' : undefined}
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
                        ><span>{arrow}</span><small>{initial}</small></button>
                    );
                })}
            </div>
        </section>
    );
};
