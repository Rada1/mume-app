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
import { useActiveRoomExits } from '../../stores/useActiveGameState';
import './MovementPad.css';

interface PadCell {
    cmd: string;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    className: string;
    hotkey?: string;
}

const MOVEMENT_DIRS = new Set(['u', 'n', 'w', 'e', 's', 'd']);

const normalizeDir = (d: string): string => {
    const lower = d.toLowerCase();
    const map: Record<string, string> = {
        north: 'n', n: 'n',
        south: 's', s: 's',
        east: 'e', e: 'e',
        west: 'w', w: 'w',
        up: 'u', u: 'u',
        down: 'd', d: 'd',
    };
    return map[lower] || lower;
};

const CELLS: PadCell[] = [
    { cmd: 'u', label: 'Up', icon: ChevronsUp, className: 'pad-u', hotkey: 'Num 7' },
    { cmd: 'n', label: 'North', icon: ArrowUp, className: 'pad-n', hotkey: 'Num 8' },
    { cmd: 'exits', label: 'Exits', icon: DoorOpen, className: 'pad-exits' },
    { cmd: 'w', label: 'West', icon: ArrowLeft, className: 'pad-w', hotkey: 'Num 4' },
    { cmd: 'look', label: 'Look', icon: Eye, className: 'pad-look', hotkey: 'Num 5' },
    { cmd: 'e', label: 'East', icon: ArrowRight, className: 'pad-e', hotkey: 'Num 6' },
    { cmd: 'scan', label: 'Scan', icon: Radar, className: 'pad-scan' },
    { cmd: 's', label: 'South', icon: ArrowDown, className: 'pad-s', hotkey: 'Num 2' },
    { cmd: 'd', label: 'Down', icon: ChevronsDown, className: 'pad-d', hotkey: 'Num 3' }
];

export const MovementPad: FC = () => {
    const { executeCommand, triggerHaptic } = useGame() as {
        executeCommand: (cmd: string) => void;
        triggerHaptic?: (ms: number) => void;
    };
    const { exits, rawExits } = useActiveRoomExits();
    const [pressedCmd, setPressedCmd] = React.useState<string | null>(null);
    const pressTimerRef = React.useRef<number | undefined>(undefined);

    const normalizedExitSet = React.useMemo(() => {
        const set = new Set<string>();
        if (Array.isArray(exits)) {
            exits.forEach(e => set.add(normalizeDir(e)));
        }
        return set;
    }, [exits]);

    const isExitClosed = React.useCallback((cmd: string): boolean => {
        const rawExit = rawExits?.[cmd] || rawExits?.[normalizeDir(cmd)];
        if (!rawExit || typeof rawExit !== 'object') return false;
        if (rawExit.closed === true) return true;
        if (Array.isArray(rawExit.flags)) {
            return rawExit.flags.some((f: unknown) => {
                const lf = String(f).toLowerCase();
                return lf === 'closed' || lf === 'locked';
            });
        }
        return false;
    }, [rawExits]);

    const flashPressed = React.useCallback((cmd: string) => {
        window.clearTimeout(pressTimerRef.current);
        setPressedCmd(cmd);
        pressTimerRef.current = window.setTimeout(() => setPressedCmd(null), 140);
    }, []);

    React.useEffect(() => {
        const onCommandPress = (event: Event) => {
            const cmd = (event as CustomEvent<{ cmd?: string }>).detail?.cmd;
            if (cmd) flashPressed(cmd);
        };

        window.addEventListener('mume:numpad-command-press', onCommandPress);
        window.addEventListener('mume:movement-command-press', onCommandPress);
        return () => {
            window.removeEventListener('mume:numpad-command-press', onCommandPress);
            window.removeEventListener('mume:movement-command-press', onCommandPress);
            window.clearTimeout(pressTimerRef.current);
        };
    }, [flashPressed]);

    const fire = (cmd: string) => {
        flashPressed(cmd);
        triggerHaptic?.(15);
        executeCommand(cmd);
    };

    return (
        <div className="movement-pad" aria-label="Movement" onClick={e => e.stopPropagation()}>
            {CELLS.map(cell => {
                const Icon = cell.icon;
                const isMovement = MOVEMENT_DIRS.has(cell.cmd);
                const hasExit = isMovement ? normalizedExitSet.has(cell.cmd) : true;
                const isClosed = isMovement && hasExit && isExitClosed(cell.cmd);
                const isValid = isMovement ? (hasExit && !isClosed) : true;

                let stateClass = '';
                let statusLabel = '';
                if (isMovement) {
                    if (!hasExit) {
                        stateClass = ' is-dimmed is-no-exit';
                        statusLabel = ' (No exit)';
                    } else if (isClosed) {
                        stateClass = ' is-dimmed is-closed-door';
                        statusLabel = ' (Closed door)';
                    } else {
                        stateClass = ' is-valid-exit';
                    }
                }

                const hotkeyLabel = cell.hotkey ? ` [${cell.hotkey}]` : '';
                const title = `${cell.label}${statusLabel}${hotkeyLabel}`;
                const isPressed = pressedCmd === cell.cmd;

                return (
                    <button
                        key={cell.cmd}
                        type="button"
                        className={`movement-pad-cell ${cell.className}${stateClass}${isPressed ? ' is-key-pressed' : ''}`}
                        onClick={() => fire(cell.cmd)}
                        title={title}
                        aria-label={title}
                        aria-disabled={isMovement && !isValid ? true : undefined}
                    >
                        {cell.hotkey && <span className="movement-pad-key">{cell.hotkey}</span>}
                        <Icon size={16} strokeWidth={2.2} />
                        <span className="movement-pad-label">{cell.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default MovementPad;
