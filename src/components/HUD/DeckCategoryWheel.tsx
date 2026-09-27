/**
 * @file DeckCategoryWheel.tsx
 * @description Mobile category trigger with tactical-style command swipe wheel.
 */

// --- Logic Section ---
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DeckItem } from './useDeckTargeting';
import './CommandDeck.css';

const DIRECTIONS = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'] as const;
type WheelDirection = typeof DIRECTIONS[number];

interface DeckCategoryWheelProps {
    label: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    active: boolean;
    actions: DeckItem[];
    onTap: () => void;
    onChoose: (action: DeckItem) => void;
    onHoldAction: (action: DeckItem, pointerId: number) => void;
    onSelectTarget: (target: string, preserveMenuOnPointerUp?: boolean, columnIndex?: number) => void;
    onReleaseTargetMenu: (pointerId: number) => void;
    onCancelTargetMenu: () => void;
}

interface GestureState {
    pointerId: number;
    startX: number;
    startY: number;
    direction: WheelDirection | null;
    moved: boolean;
}

const getDirection = (dx: number, dy: number): WheelDirection => {
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    return DIRECTIONS[(Math.round(angle / 45) + 8) % 8];
};

// --- UI Section ---
export const DeckCategoryWheel: React.FC<DeckCategoryWheelProps> = ({
    label, icon: Icon, active, actions, onTap, onChoose, onHoldAction, onSelectTarget, onReleaseTargetMenu, onCancelTargetMenu
}) => {
    const gestureRef = useRef<GestureState | null>(null);
    const suppressClickRef = useRef(false);
    const holdTimerRef = useRef<number | null>(null);
    const targetMenuOpenedRef = useRef(false);
    const targetMenuOpenedAtRef = useRef<{ x: number; y: number } | null>(null);
    const latestPointerPointRef = useRef<{ x: number; y: number } | null>(null);
    const [wheel, setWheel] = useState<{ direction: WheelDirection | null } | null>(null);
    const [targetMenuVisible, setTargetMenuVisible] = useState(false);
    const [wheelOverTargetMenu, setWheelOverTargetMenu] = useState(false);
    const [isPressing, setIsPressing] = useState(false);
    const wheelOverTargetMenuRef = useRef(false);

    useEffect(() => () => {
        if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    }, []);

    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 && event.pointerType === 'mouse') return;
        setIsPressing(true);
        gestureRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            direction: null,
            moved: false,
        };
        targetMenuOpenedRef.current = false;
        targetMenuOpenedAtRef.current = null;
        latestPointerPointRef.current = { x: event.clientX, y: event.clientY };
        wheelOverTargetMenuRef.current = false;
        setWheelOverTargetMenu(false);
        setTargetMenuVisible(false);
        if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement> | PointerEvent) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        latestPointerPointRef.current = { x: event.clientX, y: event.clientY };
        const dx = event.clientX - gesture.startX;
        const dy = event.clientY - gesture.startY;
        const distance = Math.hypot(dx, dy);
        if (targetMenuOpenedRef.current && !wheelOverTargetMenuRef.current && targetMenuOpenedAtRef.current) {
            const menuDx = event.clientX - targetMenuOpenedAtRef.current.x;
            const menuDy = event.clientY - targetMenuOpenedAtRef.current.y;
            if (Math.hypot(menuDx, menuDy) > 24) {
                wheelOverTargetMenuRef.current = true;
                setWheelOverTargetMenu(true);
            }
        }
        if (distance < 14) return;
        gesture.moved = true;
        const direction = distance >= 36 ? getDirection(dx, dy) : null;
        if (gesture.direction !== direction) {
            if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
            if (direction) {
                const action = actions[DIRECTIONS.indexOf(direction)];
                if (action && (action.needsTarget || action.targetKind || action.holdOpensMenuOnly)) {
                    const pointerId = gesture.pointerId;
                    holdTimerRef.current = window.setTimeout(() => {
                        holdTimerRef.current = null;
                        targetMenuOpenedRef.current = true;
                        targetMenuOpenedAtRef.current = latestPointerPointRef.current;
                        wheelOverTargetMenuRef.current = false;
                        setWheelOverTargetMenu(false);
                        setTargetMenuVisible(true);
                        onHoldAction(action, pointerId);
                    }, 220);
                }
            }
        }
        gesture.direction = direction;
        setWheel({ direction });
    };

    const finishPointer = (event: React.PointerEvent<HTMLButtonElement> | PointerEvent, cancelled = false) => {
        const gesture = gestureRef.current;
        if (!gesture || gesture.pointerId !== event.pointerId) return;
        gestureRef.current = null;
        setIsPressing(false);
        const swipedAcrossTargetMenu = wheelOverTargetMenuRef.current;
        if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
        setWheel(null);
        setTargetMenuVisible(false);
        setWheelOverTargetMenu(false);
        wheelOverTargetMenuRef.current = false;
        suppressClickRef.current = !cancelled;
        if (targetMenuOpenedRef.current) {
            targetMenuOpenedRef.current = false;
            targetMenuOpenedAtRef.current = null;
            const action = gesture.direction ? actions[DIRECTIONS.indexOf(gesture.direction)] : null;
            if (cancelled) onCancelTargetMenu();
            else if (swipedAcrossTargetMenu && action && !action.needsTarget && !action.targetKind && !action.holdOpensMenuOnly) {
                onCancelTargetMenu();
                onChoose(action);
            } else onReleaseTargetMenu(event.pointerId);
            return;
        }
        if (!cancelled && gesture.direction) {
            const action = actions[DIRECTIONS.indexOf(gesture.direction)];
            if (action) {
                onChoose(action);
                return;
            }
        }
        if (!cancelled && !gesture.moved) onTap();
    };

    useEffect(() => {
        const onWindowMove = (event: PointerEvent) => handlePointerMove(event);
        const onWindowUp = (event: PointerEvent) => finishPointer(event);
        const onWindowCancel = (event: PointerEvent) => finishPointer(event, true);
        // Keep tracking outside the tab, but do not capture the pointer: the
        // target popover must receive its own touch, scroll, and click events.
        window.addEventListener('pointermove', onWindowMove, true);
        window.addEventListener('pointerup', onWindowUp, true);
        window.addEventListener('pointercancel', onWindowCancel, true);
        return () => {
            window.removeEventListener('pointermove', onWindowMove, true);
            window.removeEventListener('pointerup', onWindowUp, true);
            window.removeEventListener('pointercancel', onWindowCancel, true);
        };
    });

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        if (suppressClickRef.current) {
            suppressClickRef.current = false;
            event.preventDefault();
            return;
        }
        onTap();
    };

    return <div className="deck-category-control">
        <button
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`${label} actions; swipe to choose an action`}
            className={`deck-tab deck-category-button${isPressing ? ' is-pressed' : ''}`}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
        >
            <Icon size={17} strokeWidth={2.2} />
        </button>
        <span className={`deck-category-label${isPressing ? ' is-pressed' : ''}`}>{label}</span>
        {wheel && typeof document !== 'undefined' && createPortal(
            <div
                className={`deck-category-swipe-overlay${targetMenuVisible ? ' is-target-menu-visible' : ''}${wheelOverTargetMenu ? ' is-over-target-menu' : ''}`}
                style={{
                    '--wheel-center-x': '50%',
                    '--wheel-center-y': '33%',
                } as React.CSSProperties}
                aria-hidden="true"
            >
                <div className="swipe-wheel-container">
                    {DIRECTIONS.map((direction, index) => (
                        <div
                            key={`slice-${direction}`}
                            className={`swipe-slice ${wheel.direction === direction ? 'active' : ''}`}
                            style={{ transform: `rotate(${index * 45}deg)`, opacity: 1 }}
                        >
                            <div className="slice-separator" />
                        </div>
                    ))}
                    {actions.slice(0, 8).map((action, index) => {
                        const direction = DIRECTIONS[index];
                        return <span
                            key={`${direction}-${action.label}`}
                            className={`swipe-sq-label ${wheel.direction === direction ? 'active' : ''}`}
                            data-dir={direction}
                        >
                            <span className="swipe-action-card">
                                <span className="swipe-action-text">{action.label}</span>
                            </span>
                        </span>;
                    })}
                    <div className={`swipe-center ${wheel.direction ? 'active' : ''}`}>
                        <span className="swipe-center-label">{label}</span>
                    </div>
                </div>
            </div>,
            document.body
        )}
    </div>;
};
