/**
 * @file SpatButtons.tsx
 * Tactical "spit" buttons that support swipe-wheel gestures.
 * Pointer events are unified for both touch and mouse — same drag-to-wheel behavior.
 */
import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SpatButton, PopoverState } from '../../types';
import { triggerRingAnimation, getPressedColor } from '../../hooks/interactions/pointerUtils';
import { useVitalsStore } from '../../stores/useVitalsStore';

interface SpatButtonsProps {
    spatButtons: SpatButton[];
    isMobile: boolean;
    isKeyboardOpen?: boolean;
    setActiveSet: (setId: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    setSpatButtons: React.Dispatch<React.SetStateAction<SpatButton[]>>;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    playClickSound?: () => void;
    triggerHaptic: (ms: number) => void;
    initAudio?: () => void;
    isSoundEnabled?: boolean;
}

const colorToRgb = (colorVal: string | undefined, defaultVal: string) => {
    if (!colorVal || colorVal.startsWith('var(')) return defaultVal;
    const rgbMatch = colorVal.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbMatch) return `${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}`;

    const hex = colorVal.replace('#', '').trim();
    const fullHex = hex.length === 3
        ? hex.split('').map(ch => ch + ch).join('')
        : hex;
    if (fullHex.length < 6) return defaultVal;

    const r = parseInt(fullHex.substring(0, 2), 16);
    const g = parseInt(fullHex.substring(2, 4), 16);
    const b = parseInt(fullHex.substring(4, 6), 16);
    return !isNaN(r) && !isNaN(g) && !isNaN(b) ? `${r}, ${g}, ${b}` : defaultVal;
};

// --- SpatButtonItem ---
const SpatButtonItem = React.memo(({ sb, activeDir, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }: {
    sb: SpatButton;
    activeDir: string | null;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
    onPointerMove: (e: React.PointerEvent, id: string) => void;
    onPointerUp: (e: React.PointerEvent, sb: SpatButton) => void;
    onPointerCancel: (e: React.PointerEvent, id: string) => void;
}) => {
    const elRef = useRef<HTMLDivElement>(null);
    const [spitDistance, setSpitDistance] = useState(0);
    const [isFlying, setIsFlying] = useState(true);

    useLayoutEffect(() => {
        if (elRef.current) {
            const rect = elRef.current.getBoundingClientRect();
            const inputMain = document.querySelector('.input-main-container');
            const inputRect = inputMain?.getBoundingClientRect();
            if (inputRect) {
                setSpitDistance(inputRect.left - rect.left);
            }
            // Transition is ~800ms
            const timer = setTimeout(() => setIsFlying(false), 850);
            return () => clearTimeout(timer);
        }
    }, [sb.id]);

    return (
        <div
            ref={elRef}
            className={`spat-button ${activeDir ? 'is-swiping' : ''} ${isFlying ? 'is-flying' : ''}`}
            style={{
                '--spit-distance': `${spitDistance}px`,
                borderColor: sb.color,
                boxShadow: isFlying ? 'none' : `0 4px 15px rgba(0, 0, 0, 0.5), 0 0 10px ${sb.color}`,
                '--accent': sb.color,
                pointerEvents: 'auto',
                touchAction: 'none'
            } as any}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, sb.id); }}
            onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e, sb.id); }}
            onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e, sb); }}
            onPointerCancel={(e) => { e.stopPropagation(); onPointerCancel(e, sb.id); }}
            onDragStart={(e) => e.preventDefault()}
            onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            {activeDir && createPortal(
                <div
                    className="swipe-wheel-container"
                    style={{
                        zIndex: 50000,
                        '--set-accent': sb.color || 'var(--accent)',
                        '--set-accent-rgb': colorToRgb(sb.color, 'var(--accent-rgb)')
                    } as React.CSSProperties}
                >
                    {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d, i) => (
                        <div
                            key={d}
                            className={`swipe-slice ${activeDir === d ? 'active' : ''}`}
                            style={{ transform: `rotate(${i * 45}deg)`, opacity: 1 }}
                        >
                            <div className="slice-separator" />
                        </div>
                    ))}
                    {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d) => {
                        const swipeCmd = sb.swipeCommands?.[d as any];
                        const label = swipeCmd || (d === 'up' ? sb.label : d.toUpperCase());
                        return (
                            <span
                                key={`label-${d}`}
                                className={`swipe-sq-label ${activeDir === d ? 'active' : ''}`}
                                data-dir={d}
                            >
                                {label}
                            </span>
                        );
                    })}
                </div>,
                document.body
            )}
            <div className="swipe-ray" />
            <div className="cancel-indicator">Cancel</div>
            {sb.icon ? (
                <img src={sb.icon} className="button-icon" alt="" />
            ) : (
                <div className="button-label">{sb.label}</div>
            )}
        </div>
    );
});

// --- SpatButtons ---
export const SpatButtons: React.FC<SpatButtonsProps> = React.memo(({
    spatButtons,
    isMobile,
    isKeyboardOpen,
    setActiveSet,
    executeCommand,
    setSpatButtons,
    setPopoverState,
    playClickSound,
    triggerHaptic,
    initAudio,
    isSoundEnabled
}) => {
    const [activeDirMap, setActiveDirMap] = useState<Record<string, string | null>>({});
    const interactionState = useRef<Record<string, { startX: number, startY: number, lastX: number, lastY: number, maxDist: number, dir: string | null }>>({});

    // --- Keyboard open/close handling ---
    const prevKeyboardOpen = useRef(isKeyboardOpen);
    useLayoutEffect(() => {
        if (prevKeyboardOpen.current && !isKeyboardOpen && isMobile) {
            setSpatButtons(prev => prev.filter(sb => !sb.offKeyboard));
        }
        prevKeyboardOpen.current = isKeyboardOpen;
    }, [isKeyboardOpen, isMobile, setSpatButtons]);

    // --- Pointer Down: identical for mouse and touch ---
    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        // Only trigger on primary button (left click / primary touch)
        if (e.buttons !== 1) return;
        
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();

        initAudio?.();
        if (isSoundEnabled) playClickSound?.();
        triggerHaptic(20);

        const el = e.currentTarget as HTMLElement;
        try {
            el.setPointerCapture(e.pointerId);
        } catch (err) {
            // Some environments might not support capture on some elements/states
        }
        
        interactionState.current[id] = {
            startX: e.clientX,
            startY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            maxDist: 0,
            dir: null
        };
    }, []);

    // --- Pointer Move: show swipe wheel when dragged > 20px ---
    const handlePointerMove = useCallback((e: React.PointerEvent, id: string) => {
        const state = interactionState.current[id];
        if (!state) return;

        // On desktop, if the mouse is moving but NO button is pressed, 
        // the state is stuck. Clean it up and return.
        if (e.buttons === 0) {
            delete interactionState.current[id];
            setActiveDirMap(prev => {
                if (!prev[id]) return prev;
                const next = { ...prev };
                delete next[id];
                return next;
            });
            const el = e.currentTarget as HTMLElement;
            el.style.setProperty('--ray-opacity', '0');
            el.style.setProperty('--cancel-opacity', '0');
            return;
        }

        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.maxDist = Math.max(state.maxDist, dist);

        const el = e.currentTarget as HTMLElement;

        if (dist > 40) {
            // Unambiguous swipe — show the wheel and highlight the active direction
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const index = (Math.round(angle / 45) + 8) % 8;
            const directions = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];
            const dir = directions[index];

            state.dir = dir;
            setActiveDirMap(prev => prev[id] === dir ? prev : { ...prev, [id]: dir });

            const snappedAngle = Math.round(angle / 45) * 45;
            el.style.setProperty('--ray-angle', `${snappedAngle}deg`);
            el.style.setProperty('--ray-length', `${dist + 50}px`);
            el.style.setProperty('--ray-opacity', '1');
            el.style.setProperty('--cancel-opacity', '1');
        } else if (dist > 20) {
            // Building up — show the ray indicator but don't lock a direction yet
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const snappedAngle = Math.round(angle / 45) * 45;
            el.style.setProperty('--ray-angle', `${snappedAngle}deg`);
            el.style.setProperty('--ray-length', `${dist + 50}px`);
            el.style.setProperty('--ray-opacity', '0.4');
            el.style.setProperty('--cancel-opacity', '0');
            // Clear wheel if it was previously shown (finger returned near center)
            state.dir = null;
            setActiveDirMap(prev => prev[id] === null ? prev : { ...prev, [id]: null });
        } else {
            // Near center — clear everything
            state.dir = null;
            setActiveDirMap(prev => prev[id] === null ? prev : { ...prev, [id]: null });
            el.style.setProperty('--ray-opacity', '0');
            el.style.setProperty('--cancel-opacity', '0');
        }
    }, []);

    // --- Pointer Up: fire tap or swipe command ---
    const handlePointerUp = useCallback((e: React.PointerEvent, sb: SpatButton) => {
        if (e.cancelable) e.preventDefault();
        const state = interactionState.current[sb.id];
        if (!state) return;

        const el = e.currentTarget as HTMLElement;
        const dir = state.dir;

        const endX = e.clientX || state.lastX;
        const endY = e.clientY || state.lastY;
        const finalDist = Math.sqrt(Math.pow(endX - state.startX, 2) + Math.pow(endY - state.startY, 2));

        delete interactionState.current[sb.id];
        setActiveDirMap(prev => {
            const next = { ...prev };
            delete next[sb.id];
            return next;
        });
        el.releasePointerCapture(e.pointerId);
        el.style.setProperty('--ray-opacity', '0');
        el.style.setProperty('--cancel-opacity', '0');

        // Cancel gesture: dragged far then returned to center
        if (state.maxDist > 25 && finalDist < 20) return;

        // Tap = small movement in any direction
        const isTap = state.maxDist < 40;

        if (isTap || (dir && state.maxDist >= 40)) {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();

            let cmd = sb.command;
            let action = sb.action;

            if (!isTap && dir) {
                const swipeCmd = sb.swipeCommands?.[dir as any];
                const swipeAction = sb.swipeActionTypes?.[dir as any];
                if (swipeCmd) {
                    cmd = swipeCmd;
                    action = swipeAction || 'command';
                } else if (dir !== 'up') {
                    // Swiped in a direction with no command (and not 'up')
                    return;
                }
            }

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const color = getPressedColor(el);
            triggerRingAnimation(cx, cy, color);

            if (action === 'nav') {
                setActiveSet(cmd);
            } else if (action === 'menu') {
                setPopoverState({
                    setId: cmd,
                    context: sb.label,
                    x: endX,
                    y: endY,
                    menuDisplay: sb.menuDisplay || 'list',
                    accentColor: sb.color
                });
            } else {
                if (cmd.includes('%n')) {
                    const target = useVitalsStore.getState().target;
                    cmd = target ? cmd.replace(/%n/g, target) : cmd.replace(/ %n/g, '').replace(/%n/g, '');
                }
                executeCommand(cmd, false, false, false, false, { shouldFocus: false, fromUi: true });
            }

            if (sb.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }

            // Small delay to prevent click-through onto elements behind after removal
            setTimeout(() => {
                setSpatButtons(prev => prev.filter(x => x.id !== sb.id));
            }, 50);
        }
    }, [setActiveSet, setPopoverState, executeCommand, setSpatButtons, isMobile]);

    // --- Pointer Cancel ---
    const handlePointerCancel = useCallback((e: React.PointerEvent, id: string) => {
        delete interactionState.current[id];
        setActiveDirMap(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }, []);

    return (
        <div className="spat-container">
            {[...spatButtons].reverse().map((sb) => (
                <SpatButtonItem
                    key={sb.id}
                    sb={sb}
                    activeDir={activeDirMap[sb.id] || null}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                />
            ))}
        </div>
    );
});
