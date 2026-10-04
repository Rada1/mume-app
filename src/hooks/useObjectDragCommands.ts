/**
 * @file useObjectDragCommands.ts
 * @description Long-press object drag command helpers for inventory, worn, and room chips.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import type { ObjectDragSource, ObjectDropTarget, ExecuteCommand } from '../types';
import { useUIStore } from '../stores/useUIStore';
import { getObjectDragCommand, getObjectDragCommands, getValidObjectDropTarget } from '../utils/objectDragUtils';

export { getObjectDragCommand, getObjectDragCommands, getObjectDropTarget, getValidObjectDropTarget, isValidObjectDragTarget } from '../utils/objectDragUtils';

const LONG_PRESS_MS = 360;
const MOVE_TOLERANCE_PX = 8;
const SUPPRESS_CLICK_MS = 450;

interface PendingDrag {
    pointerId: number;
    startX: number;
    startY: number;
    source: ObjectDragSource;
    timer: ReturnType<typeof setTimeout>;
    active: boolean;
    scrolling: boolean;
    scrollElement: HTMLElement | null;
    lastX: number;
    lastY: number;
    frame: number | null;
    targetKey: string;
    dragOnMove: boolean;
    touchDragOnMove: boolean;
    touchDragOnHorizontalMove: boolean;
}

interface UseObjectDragCommandsProps {
    executeCommand: ExecuteCommand;
    triggerHaptic?: (ms: number) => void;
    mouseDragOnMove?: boolean;
    touchDragOnMove?: boolean;
    touchDragOnHorizontalMove?: boolean;
    onDrop?: (source: ObjectDragSource, target: ObjectDropTarget) => void;
}

const getTargetKey = (target: ObjectDropTarget | null): string => {
    if (!target) return '';
    if (target.type === 'entity') return `entity:${target.entityId}`;
    if (target.type === 'container') return `container:${target.containerId}`;
    return `row:${target.row}:${target.slot || ''}`;
};

export const useObjectDragCommands = ({ executeCommand, triggerHaptic, mouseDragOnMove = false, touchDragOnMove = false, touchDragOnHorizontalMove = true, onDrop }: UseObjectDragCommandsProps) => {
    const pendingRef = useRef<PendingDrag | null>(null);
    const onDropRef = useRef(onDrop);
    onDropRef.current = onDrop;
    const suppressClickUntilRef = useRef(0);
    const setObjectDragState = useUIStore(s => s.setObjectDragState);

    const clearPending = useCallback((suppressClick: boolean) => {
        const pending = pendingRef.current;
        if (pending) {
            clearTimeout(pending.timer);
            if (pending.frame !== null) cancelAnimationFrame(pending.frame);
        }
        pendingRef.current = null;
        document.body.classList.remove('object-chip-dragging');
        setObjectDragState(null);
        if (suppressClick) suppressClickUntilRef.current = Date.now() + SUPPRESS_CLICK_MS;
    }, [setObjectDragState]);

    const updateDragFrame = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending || !pending.active) return;

        pending.frame = null;
        document.documentElement.style.setProperty('--object-drag-x', `${pending.lastX}px`);
        document.documentElement.style.setProperty('--object-drag-y', `${pending.lastY}px`);

        const pointerElement = document.elementFromPoint(pending.lastX, pending.lastY);
        const validTarget = getValidObjectDropTarget(pending.source, pointerElement);
        const targetKey = getTargetKey(validTarget);

        if (targetKey !== pending.targetKey) {
            pending.targetKey = targetKey;
            setObjectDragState({
                source: pending.source,
                x: pending.lastX,
                y: pending.lastY,
                target: validTarget
            });
        }

        const scrollElement = pointerElement?.closest<HTMLElement>('.gear-section-body') ?? pending.scrollElement;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const maxScroll = scrollElement ? scrollElement.scrollHeight - scrollElement.clientHeight : 0;
        const edgeSize = Math.min(76, Math.max(48, viewportHeight * 0.08));
        const distanceFromBottom = viewportHeight - pending.lastY;
        if (scrollElement && maxScroll > 1 && distanceFromBottom < edgeSize && scrollElement.scrollTop < maxScroll) {
            const proximity = Math.max(0, Math.min(1, (edgeSize - distanceFromBottom) / edgeSize));
            const step = Math.min(20, 5 + proximity * 14);
            scrollElement.scrollTop = Math.min(maxScroll, scrollElement.scrollTop + step);
            pending.frame = requestAnimationFrame(updateDragFrame);
        }
    }, [setObjectDragState]);

    const updateActiveDrag = useCallback((event: PointerEvent) => {
        const pending = pendingRef.current;
        if (!pending || event.pointerId !== pending.pointerId) return;

        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        if (pending.scrolling) {
            event.preventDefault();
            if (pending.scrollElement) pending.scrollElement.scrollTop += pending.lastY - event.clientY;
            pending.lastY = event.clientY;
            return;
        }
        if (!pending.active && pending.touchDragOnMove && pending.scrollElement &&
            Math.abs(dy) > MOVE_TOLERANCE_PX && Math.abs(dy) > Math.abs(dx) * 1.2) {
            clearTimeout(pending.timer);
            pending.scrolling = true;
            event.preventDefault();
            pending.scrollElement.scrollTop += pending.lastY - event.clientY;
            pending.lastY = event.clientY;
            return;
        }
        if (!pending.active && pending.touchDragOnMove && !pending.touchDragOnHorizontalMove &&
            Math.abs(dx) > MOVE_TOLERANCE_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
            clearPending(false);
            return;
        }
        if (!pending.active && Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) {
            if (!pending.dragOnMove) {
                clearPending(false);
                return;
            }
            clearTimeout(pending.timer);
            pending.active = true;
            document.body.classList.add('object-chip-dragging');
            triggerHaptic?.(22);
            setObjectDragState({ source: pending.source, x: event.clientX, y: event.clientY, target: null });
        }

        if (!pending.active) return;
        event.preventDefault();
        pending.lastX = event.clientX;
        pending.lastY = event.clientY;
        if (pending.frame === null) {
            pending.frame = requestAnimationFrame(updateDragFrame);
        }
    }, [clearPending, setObjectDragState, triggerHaptic, updateDragFrame]);

    const finishDrag = useCallback((event: PointerEvent) => {
        const pending = pendingRef.current;
        if (!pending || event.pointerId !== pending.pointerId) return;

        if (pending.scrolling) {
            clearPending(true);
            return;
        }

        if (pending.active) {
            event.preventDefault();
            const target = getValidObjectDropTarget(pending.source, document.elementFromPoint(event.clientX, event.clientY));
            if (target) {
                const commands = getObjectDragCommands(pending.source, target);
                if (commands?.length) {
                    triggerHaptic?.(35);
                    executeCommand(commands.join('; '), false, false, false, false, { fromUi: true });
                    onDropRef.current?.(pending.source, target);
                }
            }
            clearPending(true);
            return;
        }

        clearPending(false);
    }, [clearPending, executeCommand, triggerHaptic]);

    const cancelDrag = useCallback((event: PointerEvent) => {
        if (pendingRef.current?.pointerId === event.pointerId) clearPending(true);
    }, [clearPending]);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (Date.now() > suppressClickUntilRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClickUntilRef.current = 0;
        };

        document.addEventListener('click', handleClick, true);
        document.addEventListener('pointermove', updateActiveDrag, { passive: false });
        document.addEventListener('pointerup', finishDrag, { passive: false });
        document.addEventListener('pointercancel', cancelDrag, { passive: false });
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('pointermove', updateActiveDrag);
            document.removeEventListener('pointerup', finishDrag);
            document.removeEventListener('pointercancel', cancelDrag);
            clearPending(false);
        };
    }, [cancelDrag, clearPending, finishDrag, updateActiveDrag]);

    return useCallback((event: React.PointerEvent<HTMLElement>, source: ObjectDragSource) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (!source.noun.trim()) return;

        if (pendingRef.current) clearPending(false);
        if (event.pointerType === 'touch') event.currentTarget.setPointerCapture(event.pointerId);

        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        const timer = setTimeout(() => {
            const pending = pendingRef.current;
            if (!pending || pending.pointerId !== pointerId || pending.scrolling) return;
            pending.active = true;
            document.body.classList.add('object-chip-dragging');
            document.documentElement.style.setProperty('--object-drag-x', `${startX}px`);
            document.documentElement.style.setProperty('--object-drag-y', `${startY}px`);
            triggerHaptic?.(22);
            setObjectDragState({ source, x: startX, y: startY, target: null });
        }, LONG_PRESS_MS);

        pendingRef.current = {
            pointerId,
            startX,
            startY,
            source,
            timer,
            active: false,
            scrolling: false,
            scrollElement: event.currentTarget.closest<HTMLElement>('.gear-section-body'),
            lastX: startX,
            lastY: startY,
            frame: null,
            targetKey: '',
            dragOnMove: (mouseDragOnMove && event.pointerType === 'mouse') ||
                (touchDragOnMove && event.pointerType === 'touch'),
            touchDragOnMove: touchDragOnMove && event.pointerType === 'touch',
            touchDragOnHorizontalMove: touchDragOnHorizontalMove && event.pointerType === 'touch'
        };
    }, [clearPending, mouseDragOnMove, setObjectDragState, touchDragOnHorizontalMove, touchDragOnMove, triggerHaptic]);
};
