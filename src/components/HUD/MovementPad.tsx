/**
 * @file MovementPad.tsx
 * @description Directional controls for map overlays and the mobile command guide.
 */

import React, { FC } from 'react';
import { heldTargetPreviewRef } from '../../utils/heldTargetPreview';
import {
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ChevronsUp, ChevronsDown, Eye, DoorOpen, Map, CircleAlert, UserRound
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveRoomExits } from '../../stores/useActiveGameState';
import { useWimpyThresholdControl } from '../../hooks/useWimpyThresholdControl';
import { usePressAndHold } from '../../hooks/usePressAndHold';
import { useMovementPadExits } from '../../hooks/useMovementPadExits';
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
    onDirectionHover?: (command: string, element: HTMLElement) => void;
    onFollowHover?: (element: HTMLElement) => void;
    doorNamesByDirection?: Record<string, string>;
    disabled?: boolean;
    hideFlee?: boolean;
    doorSelectionOnly?: boolean;
    ariaLabel?: string;
    onDirectionHold?: (direction: string) => void;
    onDirectionRelease?: (direction: string) => void;
    heldDirection?: string | null;
    onFollowClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onFollowHold?: () => void;
    onFollowRelease?: () => void;
    followTargetsOpen?: boolean;
}> = ({ layout = 'panel', onCommand, onPreviewDirection, onDirectionHover, onFollowHover, doorNamesByDirection, disabled = false, hideFlee = false, doorSelectionOnly = false, ariaLabel = 'Movement controls', onDirectionHold, onDirectionRelease, heldDirection, onFollowClick, onFollowHold, onFollowRelease, followTargetsOpen = false }) => {
    const { executeCommand, triggerHaptic } = useGame() as {
        executeCommand: (cmd: string) => void;
        triggerHaptic?: (ms: number) => void;
    };
    const { exits, rawExits } = useActiveRoomExits();
    const { value: wimpyValue, canChange: canChangeWimpy, changeThreshold } = useWimpyThresholdControl();
    const [pressedCmd, setPressedCmd] = React.useState<string | null>(null);
    const pressTimerRef = React.useRef<number | undefined>(undefined);
    const beginDirectionHold = React.useCallback((direction: string) => onDirectionHold?.(direction), [onDirectionHold]);
    const endDirectionHold = React.useCallback((direction: string) => onDirectionRelease?.(direction), [onDirectionRelease]);
    const directionHold = usePressAndHold(beginDirectionHold, endDirectionHold, layout === 'menu' && Boolean(onDirectionHold && onDirectionRelease));
    const followHold = usePressAndHold(() => onFollowHold?.(), () => onFollowRelease?.(),
        layout === 'menu' && Boolean(onFollowHold), 220);
    const { normalizedExitSet, getDoorState, isExitClosed } = useMovementPadExits(exits, rawExits);

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
            onPointerLeave={event => { if (event.pointerType === 'mouse') onPreviewDirection?.(null); }}
        >
            {visibleCells.map(cell => {
                const Icon = cell.icon;
                const isMovement = MOVEMENT_DIRS.has(cell.cmd);
                const hasExit = isMovement ? normalizedExitSet.has(cell.cmd) : true;
                const isClosed = isMovement && hasExit && isExitClosed(cell.cmd);
                const doorState = isMovement && hasExit ? getDoorState(cell.cmd) : null;
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
                        stateClass = ' is-closed-door';
                        statusLabel = ' (Closed door)';
                    } else {
                        stateClass = ' is-valid-exit';
                    }
                    if (layout === 'menu' && hasDoor) stateClass += ' has-door';
                    if (doorSelectionOnly && hasDoor) stateClass += ' is-door-target';
                    if (isOpenDoor) stateClass += ' is-open-door';
                }

                const hotkeyLabel = cell.hotkey ? ` [${cell.hotkey}]` : '';
                const titleLabel = doorSelectionOnly && hasDoor ? `${doorName || 'Door'} (${cell.label})` : cell.label;
                const title = `${titleLabel}${statusLabel}${hotkeyLabel}`;
                const isPressed = pressedCmd === cell.cmd;

                const directionButton = <button
                    ref={heldTargetPreviewRef(() => { if (!doorSelectionOnly || hasDoor) onPreviewDirection?.(cell.cmd); })}
                    type="button"
                    className={`movement-pad-cell ${cell.className}${stateClass}${isPressed ? ' is-key-pressed' : ''}${heldDirection === cell.cmd ? ' is-gesture-held' : ''}${layout === 'menu' && onDirectionHold ? ' is-holdable-direction' : ''}`}
                    onPointerDown={event => { event.stopPropagation(); if (isMovement) directionHold.onPointerDown(cell.cmd,event); }}
                    onPointerMove={directionHold.onPointerMove}
                    onPointerUp={directionHold.onPointerUp}
                    onPointerCancel={directionHold.onPointerCancel}
                    onPointerEnter={event => { if (event.pointerType === 'mouse' && (!doorSelectionOnly || hasDoor)) { onPreviewDirection?.(cell.cmd); if (isMovement) onDirectionHover?.(cell.cmd, event.currentTarget); } }}
                    onFocus={event => { if (event.currentTarget.matches(':focus-visible') && (!doorSelectionOnly || hasDoor)) { onPreviewDirection?.(cell.cmd); if (isMovement) onDirectionHover?.(cell.cmd, event.currentTarget); } }}
                    onClick={event => {
                        if (directionHold.shouldSuppressClick(cell.cmd)) { event.preventDefault(); event.stopPropagation(); return; }
                        fire(cell.cmd, event);
                    }}
                    title={title}
                    aria-label={title}
                    aria-pressed={heldDirection === cell.cmd}
                    disabled={layout === 'menu' && (disabled || (doorSelectionOnly && !hasDoor))}
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
                            onClick={event => fire(`${command} exit ${cell.cmd}`, event)}>
                            {command}
                        </button>)}
                    </div>}
                </div>;
            })}
            {layout === 'menu' && onFollowClick && <button
                type="button"
                className={`movement-pad-cell pad-follow${followTargetsOpen ? ' is-follow-targets-open is-gesture-held' : ''}${onFollowHold ? ' is-holdable-direction' : ''}`}
                onPointerDown={event => { event.stopPropagation(); followHold.onPointerDown('follow', event); }}
                onPointerMove={followHold.onPointerMove}
                onPointerUp={followHold.onPointerUp}
                onPointerCancel={followHold.onPointerCancel}
                onPointerEnter={event => { if (event.pointerType === 'mouse') onFollowHover?.(event.currentTarget); }}
                onFocus={event => { if (event.currentTarget.matches(':focus-visible')) onFollowHover?.(event.currentTarget); }}
                onClick={event => {
                    if (followHold.shouldSuppressClick('follow')) { event.preventDefault(); event.stopPropagation(); return; }
                    onFollowClick(event);
                }}
                title="Follow a room entity. Hold to choose."
                aria-label="Follow a room entity. Hold to choose."
                aria-haspopup="true"
                aria-expanded={followTargetsOpen}
                aria-pressed={followTargetsOpen}
                disabled={disabled}
            >
                <UserRound size={16} strokeWidth={2.2} />
                <span className="movement-pad-label">Follow</span>
            </button>}
            {layout === 'map' && <div className="movement-pad-flee-group">
                <button
                    type="button"
                    className={`movement-pad-cell movement-pad-flee${pressedCmd === 'flee' ? ' is-key-pressed' : ''}`}
                    onPointerDown={event => event.stopPropagation()}
                    onClick={event => fire('flee', event)}
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
