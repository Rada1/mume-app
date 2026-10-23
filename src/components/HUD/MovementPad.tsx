/**
 * @file MovementPad.tsx
 * @description Directional controls for map overlays and the mobile command guide.
 */

import React, { FC } from 'react';
import {
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ChevronsUp, ChevronsDown, Eye, DoorOpen, Map, CircleAlert
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveRoomExits } from '../../stores/useActiveGameState';
import { useWimpyThresholdControl } from '../../hooks/useWimpyThresholdControl';
import './MovementPad.css';
import './MovementPadMap.css';

interface PadCell {
    cmd: string;
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    className: string;
    hotkey?: string;
}

type MovementPadLayout = 'panel' | 'map' | 'menu';

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
    { cmd: 'map', label: 'Map', icon: Map, className: 'pad-map' },
    { cmd: 's', label: 'South', icon: ArrowDown, className: 'pad-s', hotkey: 'Num 2' },
    { cmd: 'd', label: 'Down', icon: ChevronsDown, className: 'pad-d', hotkey: 'Num 3' }
];
const FLEE_CELL: PadCell = { cmd: 'flee', label: 'Flee', icon: CircleAlert, className: 'pad-flee' };

const MAP_LABELS: Record<string, string> = {
    u: 'Up', n: 'North', w: 'West', e: 'East', s: 'South', d: 'Down'
};

export const MovementPad: FC<{
    layout?: MovementPadLayout;
    onCommand?: (command: string, event: React.MouseEvent<HTMLButtonElement>) => void;
    onPreviewDirection?: (command: string | null) => void;
    doorNamesByDirection?: Record<string, string>;
    disabled?: boolean;
    hideFlee?: boolean;
    doorSelectionOnly?: boolean;
    ariaLabel?: string;
}> = ({ layout = 'panel', onCommand, onPreviewDirection, doorNamesByDirection, disabled = false, hideFlee = false, doorSelectionOnly = false, ariaLabel = 'Movement controls' }) => {
    const { executeCommand, triggerHaptic } = useGame() as {
        executeCommand: (cmd: string) => void;
        triggerHaptic?: (ms: number) => void;
    };
    const { exits, rawExits } = useActiveRoomExits();
    const { value: wimpyValue, canChange: canChangeWimpy, changeThreshold } = useWimpyThresholdControl();
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

    const getDoorState = (cmd: string) => {
        const rawExit = rawExits?.[cmd] || rawExits?.[normalizeDir(cmd)];
        if (!rawExit || typeof rawExit !== 'object') return null;
        const flags = Array.isArray(rawExit.flags) ? rawExit.flags.map((flag: unknown) => String(flag).toLowerCase()) : [];
        const hasDoor = rawExit.hasDoor === true || rawExit.door === true
            || (typeof rawExit.door === 'number' && rawExit.door > 0)
            || Boolean(rawExit.doorName || rawExit.name)
            || rawExit.closed === true
            || flags.some((flag: string) => /door|gate|portcullis|closed|locked/i.test(flag));
        const isLocked = rawExit.locked === true || flags.includes('locked');
        const isClosed = rawExit.closed === true || flags.includes('closed') || isLocked;
        return { hasDoor, isLocked, isClosed };
    };

    const getDoorActions = (cmd: string): Array<{ command: string; isApplicable: boolean }> => {
        const doorState = getDoorState(cmd);
        if (!doorState?.hasDoor) return [];
        const { isLocked, isClosed } = doorState;
        return [
            { command: 'open', isApplicable: isClosed && !isLocked },
            { command: 'close', isApplicable: !isClosed },
            { command: 'lock', isApplicable: isClosed && !isLocked },
            { command: 'unlock', isApplicable: isLocked }
        ];
    };

    const flashPressed = React.useCallback((cmd: string) => {
        window.clearTimeout(pressTimerRef.current);
        setPressedCmd(cmd);
        pressTimerRef.current = window.setTimeout(() => setPressedCmd(null), 140);
    }, []);

    React.useEffect(() => {
        if (layout === 'map') return;

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
    }, [flashPressed, layout]);

    const fire = (cmd: string, event?: React.MouseEvent<HTMLButtonElement>) => {
        flashPressed(cmd);
        triggerHaptic?.(15);
        if (onCommand && event) onCommand(cmd, event);
        else executeCommand(cmd);
    };

    const visibleCells = layout === 'menu'
        ? [...CELLS.filter(cell => MOVEMENT_DIRS.has(cell.cmd)), ...(hideFlee ? [] : [FLEE_CELL])]
        : layout === 'map' ? CELLS.filter(cell => MOVEMENT_DIRS.has(cell.cmd)) : CELLS;
    const wimpyText = wimpyValue !== null && wimpyValue !== undefined && wimpyValue > 0 ? String(wimpyValue) : 'off';

    return (
        <div
            className={`movement-pad${layout === 'map' ? ' movement-pad-map' : layout === 'menu' ? ' movement-pad-menu' : ''}${doorSelectionOnly ? ' movement-pad-door-selector' : ''}`}
            style={layout === 'map' ? { '--movement-pad-dock-inset': '16px' } as React.CSSProperties : undefined}
            role="group"
            aria-label={ariaLabel}
            onClick={e => e.stopPropagation()}
            onPointerLeave={() => doorSelectionOnly && onPreviewDirection?.(null)}
        >
            {visibleCells.map(cell => {
                const Icon = cell.icon;
                const isMovement = MOVEMENT_DIRS.has(cell.cmd);
                const hasExit = isMovement ? normalizedExitSet.has(cell.cmd) : true;
                const isClosed = isMovement && hasExit && isExitClosed(cell.cmd);
                const doorState = (layout === 'map' || layout === 'menu') && hasExit ? getDoorState(cell.cmd) : null;
                const doorName = doorNamesByDirection?.[cell.cmd];
                const hasDoor = Boolean(doorState?.hasDoor || doorName);
                const label = layout === 'map' ? MAP_LABELS[cell.cmd]
                    : doorSelectionOnly && hasDoor && doorName ? doorName : cell.label;
                const isOpenDoor = Boolean(doorState?.hasDoor && !doorState.isClosed);
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
                    if (layout === 'menu' && hasDoor) stateClass += ' has-door';
                    if (doorSelectionOnly && hasDoor) stateClass += ' is-door-target';
                    if (layout === 'map' && isOpenDoor) stateClass += ' is-open-door';
                }

                const hotkeyLabel = cell.hotkey ? ` [${cell.hotkey}]` : '';
                const titleLabel = doorSelectionOnly && hasDoor ? `${doorName || 'Door'} (${cell.label})` : cell.label;
                const title = `${titleLabel}${statusLabel}${hotkeyLabel}`;
                const isPressed = pressedCmd === cell.cmd;

                const directionButton = <button
                    type="button"
                    className={`movement-pad-cell ${cell.className}${stateClass}${isPressed ? ' is-key-pressed' : ''}`}
                    onPointerDown={event => event.stopPropagation()}
                    onPointerEnter={() => doorSelectionOnly && hasDoor && onPreviewDirection?.(cell.cmd)}
                    onFocus={() => doorSelectionOnly && hasDoor && onPreviewDirection?.(cell.cmd)}
                    onClick={event => fire(cell.cmd, event)}
                    title={title}
                    aria-label={title}
                    disabled={layout === 'menu' && (disabled || (doorSelectionOnly ? !hasDoor : !isValid))}
                    aria-disabled={isMovement && !isValid && !(doorSelectionOnly && hasDoor) ? true : undefined}
                >
                    {layout === 'panel' && cell.hotkey && <span className="movement-pad-key">{cell.hotkey}</span>}
                    <Icon size={layout === 'map' ? 28 : 16} strokeWidth={2.2} />
                    <span className="movement-pad-label">{label}</span>
                </button>;

                if (layout !== 'map') return <React.Fragment key={cell.cmd}>{directionButton}</React.Fragment>;
                const doorActions = getDoorActions(cell.cmd);
                return <div key={cell.cmd} className={`movement-pad-map-item ${cell.className}`}>
                    {directionButton}
                    {doorActions.length > 0 && <div className="movement-pad-door-actions" role="group" aria-label={`${cell.label} door actions`}>
                        {doorActions.map(({ command, isApplicable }) => <button key={command} type="button"
                            className={`movement-pad-door-action movement-pad-door-action-${command}`}
                            disabled={!isApplicable}
                            aria-label={`${command} ${cell.label.toLowerCase()} exit`} title={`${command} ${cell.label.toLowerCase()} exit`}
                            onPointerDown={event => event.stopPropagation()}
                            onClick={() => { triggerHaptic?.(15); executeCommand(`${command} exit ${cell.cmd}`); }}>
                            {command}
                        </button>)}
                    </div>}
                </div>;
            })}
            {layout === 'map' && <div className="movement-pad-flee-group">
                <button
                    type="button"
                    className={`movement-pad-cell movement-pad-flee${pressedCmd === 'flee' ? ' is-key-pressed' : ''}`}
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => fire('flee')}
                    title="Flee"
                    aria-label="Flee"
                >
                    <CircleAlert size={28} strokeWidth={2.2} />
                    <span className="movement-pad-label">Flee</span>
                </button>
                <button
                    type="button"
                    className="movement-pad-wimpy"
                    onPointerDown={event => event.stopPropagation()}
                    onClick={changeThreshold}
                    disabled={!canChangeWimpy}
                    title={`Automatic flee threshold: ${wimpyText === 'off' ? 'off' : `${wimpyText} HP`}. Click to change.`}
                    aria-label={`Automatic flee threshold: ${wimpyText === 'off' ? 'off' : `${wimpyText} HP`}. Activate to change.`}
                >
                    W:{wimpyText}
                </button>
            </div>}
        </div>
    );
};

export default MovementPad;
