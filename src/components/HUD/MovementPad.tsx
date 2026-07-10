/**
 * @file MovementPad.tsx
 * @description Compact directional control docked at the bottom of the desktop
 * map drawer. Movement + look/exits/scan live here (next to the map) rather than
 * in the CommandDeck, since they go hand-in-hand with the map view.
 */

import React, { FC } from 'react';
import {
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ChevronsUp, ChevronsDown, Eye, DoorOpen, Radar
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import './MovementPad.css';

interface PadCell {
    cmd: string;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    className: string;
}

const CELLS: PadCell[] = [
    { cmd: 'exits', label: 'Exits', icon: DoorOpen, className: 'pad-exits' },
    { cmd: 'n', label: 'North', icon: ArrowUp, className: 'pad-n' },
    { cmd: 'u', label: 'Up', icon: ChevronsUp, className: 'pad-u' },
    { cmd: 'w', label: 'West', icon: ArrowLeft, className: 'pad-w' },
    { cmd: 'look', label: 'Look', icon: Eye, className: 'pad-look' },
    { cmd: 'e', label: 'East', icon: ArrowRight, className: 'pad-e' },
    { cmd: 'scan', label: 'Scan', icon: Radar, className: 'pad-scan' },
    { cmd: 's', label: 'South', icon: ArrowDown, className: 'pad-s' },
    { cmd: 'd', label: 'Down', icon: ChevronsDown, className: 'pad-d' }
];

export const MovementPad: FC = () => {
    const { executeCommand, triggerHaptic } = useGame() as {
        executeCommand: (cmd: string) => void;
        triggerHaptic?: (ms: number) => void;
    };

    const fire = (cmd: string) => {
        triggerHaptic?.(15);
        executeCommand(cmd);
    };

    return (
        <div className="movement-pad" aria-label="Movement" onClick={e => e.stopPropagation()}>
            {CELLS.map(cell => {
                const Icon = cell.icon;
                return (
                    <button
                        key={cell.cmd}
                        type="button"
                        className={`movement-pad-cell ${cell.className}`}
                        onClick={() => fire(cell.cmd)}
                        title={cell.label}
                        aria-label={cell.label}
                    >
                        <Icon size={16} strokeWidth={2.2} />
                    </button>
                );
            })}
        </div>
    );
};

export default MovementPad;
