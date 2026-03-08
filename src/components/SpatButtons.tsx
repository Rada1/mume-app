import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SpatButton, PopoverState } from '../types';

interface SpatButtonsProps {
    spatButtons: SpatButton[];
    isMobile: boolean;
    isKeyboardOpen?: boolean;
    setActiveSet: (setId: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean }) => void;
    setSpatButtons: React.Dispatch<React.SetStateAction<SpatButton[]>>;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
}

const SpatButtonItem: React.FC<{
    sb: SpatButton;
    activeDir: string | null;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
}> = ({ sb, activeDir, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }) => {
    const elRef = useRef<HTMLDivElement>(null);
    const [spitDistance, setSpitDistance] = useState(0);
    const [isFlying, setIsFlying] = useState(true);

    useLayoutEffect(() => {
        if (elRef.current) {
            const rect = elRef.current.getBoundingClientRect();
            const inputArea = document.querySelector('.input-area');
            const inputRect = inputArea?.getBoundingClientRect();
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
                pointerEvents: 'auto'
            } as any}
            onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e); }}
            onPointerMove={(e) => { e.stopPropagation(); onPointerMove(e); }}
            onPointerUp={(e) => { e.stopPropagation(); onPointerUp(e); }}
            onPointerCancel={(e) => { e.stopPropagation(); onPointerCancel(e); }}
            onTouchStart={(e) => { if (e.cancelable) e.preventDefault(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            {activeDir && createPortal(
                <div className="swipe-wheel-container" style={{ zIndex: 50000 }}>
                    {['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'].map((d, i) => {
                        const swipeCmd = sb.swipeCommands?.[d as any];
                        const label = swipeCmd || (d === 'up' ? sb.label : d.toUpperCase());
                        return (
                            <div
                                key={d}
                                className={`swipe-slice ${activeDir === d ? 'active' : ''}`}
                                style={{ transform: `rotate(${i * 45}deg)`, opacity: (swipeCmd || activeDir === d) ? 1 : 0.35 }}
                            >
                                <span className="swipe-slice-label" style={{ '--self-rotation': `${-i * 45}deg` } as any}>
                                    {label}
                                </span>
                            </div>
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
};

export const SpatButtons: React.FC<SpatButtonsProps> = ({
    spatButtons,
    isMobile,
    isKeyboardOpen,
    setActiveSet,
    executeCommand,
    setSpatButtons,
    setPopoverState
}) => {
    const [activeDirMap, setActiveDirMap] = useState<Record<string, string | null>>({});
    const interactionState = useRef<Record<string, { startX: number, startY: number, lastX: number, lastY: number, maxDist: number }>>({});

    const prevKeyboardOpen = useRef(isKeyboardOpen);
    useLayoutEffect(() => {
        if (prevKeyboardOpen.current && !isKeyboardOpen && isMobile) {
            setSpatButtons(prev => prev.filter(sb => !sb.offKeyboard));
        }
        prevKeyboardOpen.current = isKeyboardOpen;
    }, [isKeyboardOpen, isMobile, setSpatButtons]);

    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
        
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        interactionState.current[id] = {
            startX: e.clientX,
            startY: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            maxDist: 0
        };
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent, id: string) => {
        const state = interactionState.current[id];
        if (!state) return;

        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        state.lastX = e.clientX;
        state.lastY = e.clientY;
        state.maxDist = Math.max(state.maxDist, dist);

        const el = e.currentTarget as HTMLElement;

        if (dist > 20) {
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const index = (Math.round(angle / 45) + 8) % 8;
            const directions = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];
            const dir = directions[index];
            
            setActiveDirMap(prev => prev[id] === dir ? prev : { ...prev, [id]: dir });
            
            const snappedAngle = Math.round(angle / 45) * 45;
            el.style.setProperty('--ray-angle', `${snappedAngle}deg`);
            el.style.setProperty('--ray-length', `${dist + 50}px`);
            el.style.setProperty('--ray-opacity', dist > 30 ? '1' : '0.3');
            el.style.setProperty('--cancel-opacity', state.maxDist > 25 ? '1' : '0');
        } else {
            setActiveDirMap(prev => prev[id] === null ? prev : { ...prev, [id]: null });
            el.style.setProperty('--ray-opacity', '0');
            el.style.setProperty('--cancel-opacity', '0');
        }
    }, []);

    const handlePointerUp = useCallback((e: React.PointerEvent, sb: SpatButton) => {
        if (e.cancelable) e.preventDefault();
        const state = interactionState.current[sb.id];
        if (!state) return;

        const el = e.currentTarget as HTMLElement;
        const dir = activeDirMap[sb.id];
        
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

        if (state.maxDist > 25 && finalDist < 20) return;

        // Taps are very small movements.
        const isTap = state.maxDist < 40;

        if (isTap || (dir && state.maxDist >= 40)) {
            // Aggressively stop event from reaching any other elements
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
                    return; 
                }
            }

            if (action === 'nav') {
                setActiveSet(cmd);
            } else if (action === 'menu') {
                // IMPORTANT: Use setId: cmd because for menu actions, 
                // the command is the name of the button set to display.
                setPopoverState({
                    setId: cmd,
                    context: sb.label,
                    x: endX,
                    y: endY,
                    menuDisplay: sb.menuDisplay || 'list'
                });
            } else {
                executeCommand(cmd, false, false, false, false, { shouldFocus: false });
            }

            if (sb.closeKeyboard) {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (inputEl) inputEl.blur();
            }

            // Small delay to prevent browser 'click-through' onto elements behind 
            // the button (like the input field) after it's removed.
            setTimeout(() => {
                setSpatButtons(prev => prev.filter(x => x.id !== sb.id));
            }, 50);
        }
    }, [activeDirMap, setActiveSet, setPopoverState, executeCommand, setSpatButtons, isMobile]);

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
                    onPointerDown={(e) => handlePointerDown(e, sb.id)}
                    onPointerMove={(e) => handlePointerMove(e, sb.id)}
                    onPointerUp={(e) => handlePointerUp(e, sb)}
                    onPointerCancel={(e) => handlePointerCancel(e, sb.id)}
                />
            ))}
        </div>
    );
};
