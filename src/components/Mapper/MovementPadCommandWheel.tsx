/**
 * @file MovementPadCommandWheel.tsx
 * @description Radial command wheel shown during a long map swipe.
 */

// --- Logic Section ---
import React from 'react';
import {
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ChevronsUp, ChevronsDown, DoorOpen, Map, Footprints
} from 'lucide-react';
import type { Direction } from '../../types';

interface MovementPadCommandWheelProps {
    currentDir: Direction | null;
}

const COMMANDS: {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    direction: Direction | null;
    position: string;
}[] = [
    { id: 'u', label: 'Up', icon: ChevronsUp, direction: 'nw', position: 'north-west' },
    { id: 'n', label: 'North', icon: ArrowUp, direction: 'n', position: 'north' },
    { id: 'map', label: 'Map', icon: Map, direction: 'ne', position: 'north-east' },
    { id: 'w', label: 'West', icon: ArrowLeft, direction: 'w', position: 'west' },
    { id: 'flee', label: 'Flee', icon: Footprints, direction: null, position: 'center' },
    { id: 'e', label: 'East', icon: ArrowRight, direction: 'e', position: 'east' },
    { id: 'exits', label: 'Exits', icon: DoorOpen, direction: 'sw', position: 'south-west' },
    { id: 's', label: 'South', icon: ArrowDown, direction: 's', position: 'south' },
    { id: 'd', label: 'Down', icon: ChevronsDown, direction: 'se', position: 'south-east' },
];

// --- UI Section ---
export const MovementPadCommandWheel: React.FC<MovementPadCommandWheelProps> = ({ currentDir }) => (
    <div className="movement-command-wheel" aria-label="Movement commands" aria-hidden="true">
        {COMMANDS.map(({ id, label, icon: Icon, direction, position }) => (
            <div
                key={id}
                className={`movement-command-wheel-item ${position}${(
                    direction === currentDir
                    || (direction === 'nw' && currentDir === 'u')
                    || (direction === 'se' && currentDir === 'd')
                    || (!direction && !currentDir)
                ) ? ' selected' : ''}`}
            >
                <Icon size={22} strokeWidth={2.3} />
                <span>{label}</span>
            </div>
        ))}
    </div>
);
