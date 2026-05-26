/**
 * @file useObjectDragCommands.ts
 * @description Long-press object drag command helpers for inventory, worn, and room chips.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { ObjectDragSource, ObjectDropTarget, ExecuteCommand } from '../types';
import { useUIStore } from '../stores/useUIStore';

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
    lastX: number;
    lastY: number;
    frame: number | null;
    targetKey: string;
}

interface UseObjectDragCommandsProps {
    executeCommand: ExecuteCommand;
    triggerHaptic?: (ms: number) => void;
}

const getDatasetTarget = (el: Element | null): ObjectDropTarget | null => {
    const node = el as HTMLElement | null;
    const rowEl = node?.closest<HTMLElement>('[data-object-drop-row]');
    const entityEl = node?.closest<HTMLElement>('[data-object-drop-entity]');

    if (entityEl) {
        const noun = entityEl.dataset.objectDropNoun;
        const entityId = entityEl.dataset.objectDropEntity;
        if (!noun || !entityId) return null;
        return {
            type: 'entity',
            entityId,
            noun,
            label: entityEl.dataset.objectDropLabel || noun
        };
    }

    const row = rowEl?.dataset.objectDropRow;
    if (row === 'inventory' || row === 'worn' || row === 'room') {
        return { type: 'row', row, slot: rowEl.dataset.objectDropSlot };
    }

    return null;
};

const isSameRow = (source: ObjectDragSource, target: ObjectDropTarget): boolean => (
    target.type === 'row' && source.row === target.row
);

const getTargetKey = (target: ObjectDropTarget | null): string => {
    if (!target) return '';
    if (target.type === 'entity') return `entity:${target.entityId}`;
    return `row:${target.row}:${target.slot || ''}`;
};

const isValidTarget = (source: ObjectDragSource, target: ObjectDropTarget | null): target is ObjectDropTarget => {
    if (!target || isSameRow(source, target)) return false;
    if (target.type === 'entity') return source.row === 'inventory';
    if (source.row === 'inventory') return target.row === 'worn' || target.row === 'room';
    if (source.row === 'worn') return target.row === 'inventory';
    if (source.row === 'room') return target.row === 'inventory';
    return false;
};

const buildDropCommand = (source: ObjectDragSource, target: ObjectDropTarget): string | null => {
    if (target.type === 'entity') return `give ${source.noun} ${target.noun}`;
    if (source.row === 'inventory' && target.row === 'worn' && target.slot === 'wielded') {
        return `wield ${source.noun}`;
    }
    if (source.row === 'inventory' && target.row === 'worn') return `wear ${source.noun}`;
    if (source.row === 'worn' && target.row === 'inventory') return `remove ${source.noun}`;
    if (source.row === 'inventory' && target.row === 'room') return `drop ${source.noun}`;
    if (source.row === 'room' && target.row === 'inventory') return `get ${source.noun}`;
    return null;
};

export const getObjectDragCommand = buildDropCommand;

export const useObjectDragCommands = ({ executeCommand, triggerHaptic }: UseObjectDragCommandsProps) => {
    const pendingRef = useRef<PendingDrag | null>(null);
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

        const target = getDatasetTarget(document.elementFromPoint(pending.lastX, pending.lastY));
        const validTarget = isValidTarget(pending.source, target) ? target : null;
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
    }, [setObjectDragState]);

    const updateActiveDrag = useCallback((event: PointerEvent) => {
        const pending = pendingRef.current;
        if (!pending) return;

        const dx = event.clientX - pending.startX;
        const dy = event.clientY - pending.startY;
        if (!pending.active && Math.hypot(dx, dy) > MOVE_TOLERANCE_PX) {
            clearPending(false);
            return;
        }

        if (!pending.active) return;
        event.preventDefault();
        pending.lastX = event.clientX;
        pending.lastY = event.clientY;
        if (pending.frame === null) {
            pending.frame = requestAnimationFrame(updateDragFrame);
        }
    }, [clearPending, updateDragFrame]);

    const finishDrag = useCallback((event: PointerEvent) => {
        const pending = pendingRef.current;
        if (!pending) return;

        if (pending.active) {
            event.preventDefault();
            const target = getDatasetTarget(document.elementFromPoint(event.clientX, event.clientY));
            if (isValidTarget(pending.source, target)) {
                const command = buildDropCommand(pending.source, target);
                if (command) {
                    triggerHaptic?.(35);
                    executeCommand(command, false, false, false, false, { fromUi: true });
                }
            }
            clearPending(true);
            return;
        }

        clearPending(false);
    }, [clearPending, executeCommand, triggerHaptic]);

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
        document.addEventListener('pointercancel', finishDrag, { passive: false });
        return () => {
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('pointermove', updateActiveDrag);
            document.removeEventListener('pointerup', finishDrag);
            document.removeEventListener('pointercancel', finishDrag);
            clearPending(false);
        };
    }, [clearPending, finishDrag, updateActiveDrag]);

    return useCallback((event: React.PointerEvent<HTMLElement>, source: ObjectDragSource) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (!source.noun.trim()) return;

        const pointerId = event.pointerId;
        const startX = event.clientX;
        const startY = event.clientY;
        const timer = setTimeout(() => {
            const pending = pendingRef.current;
            if (!pending || pending.pointerId !== pointerId) return;
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
            lastX: startX,
            lastY: startY,
            frame: null,
            targetKey: ''
        };
    }, [setObjectDragState, triggerHaptic]);
};
