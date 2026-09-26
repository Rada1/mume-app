/**
 * @file useDeckTargeting.ts
 * @description Hook managing hold-to-target gestures and room targeting for CommandDeck slots.
 */

// --- Logic Section ---
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { canCommandAcceptTarget } from '../../utils/commandTargetUtils';
import { useRoomStore } from '../../stores/useRoomStore';
import type { GmcpOccupant } from '../../types';

export interface DeckItem {
    label: string;
    cmd: string;
    needsTarget: boolean;
}

export interface UseDeckTargetingProps {
    target: string | null;
    setTarget: (target: string | null) => void;
    executeCommand: (cmd: string) => void;
    triggerHaptic?: (ms: number) => void;
    flashPressed: (label: string) => void;
    fire: (item: DeckItem) => void;
}

export interface UseDeckTargetingReturn {
    isTargetMenuOpen: boolean;
    activeItem: DeckItem | null;
    pendingTarget: string | null;
    roomOccupants: GmcpOccupant[];
    roomItems: GmcpOccupant[];
    handlePointerDown: (item: DeckItem, e: React.PointerEvent<HTMLButtonElement>) => void;
    handlePointerUp: (item: DeckItem, e: React.PointerEvent<HTMLButtonElement>) => void;
    handlePointerCancel: () => void;
    handleClick: (item: DeckItem, e: React.MouseEvent<HTMLButtonElement>) => void;
    handleSelectTarget: (targetValue: string) => void;
    closeTargetMenu: () => void;
}

export const useDeckTargeting = ({
    target,
    setTarget,
    executeCommand,
    triggerHaptic,
    flashPressed,
    fire
}: UseDeckTargetingProps): UseDeckTargetingReturn => {
    const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<DeckItem | null>(null);
    const [pendingTarget, setPendingTarget] = useState<string | null>(null);

    const holdTimerRef = useRef<number | null>(null);
    const didHoldRef = useRef(false);
    const activeItemRef = useRef<DeckItem | null>(null);
    activeItemRef.current = activeItem;
    const pendingTargetRef = useRef<string | null>(null);
    pendingTargetRef.current = pendingTarget;

    const roomChars = useRoomStore(s => s.chars);
    const roomItemsObj = useRoomStore(s => s.items);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomItems = useMemo(() => Object.values(roomItemsObj), [roomItemsObj]);

    const clearHoldTimer = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const closeTargetMenu = useCallback(() => {
        clearHoldTimer();
        setIsTargetMenuOpen(false);
        setActiveItem(null);
        setPendingTarget(null);
        activeItemRef.current = null;
        pendingTargetRef.current = null;
        didHoldRef.current = false;
    }, [clearHoldTimer]);

    const handlePointerDown = useCallback((item: DeckItem, e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.buttons !== 1 && e.pointerType === 'mouse') return;
        clearHoldTimer();
        didHoldRef.current = false;

        const isTargetable = item.needsTarget || canCommandAcceptTarget(item.cmd);
        if (!isTargetable) return;

        activeItemRef.current = item;
        holdTimerRef.current = window.setTimeout(() => {
            holdTimerRef.current = null;
            didHoldRef.current = true;
            setActiveItem(item);
            setIsTargetMenuOpen(true);
            triggerHaptic?.(20);
        }, 220);
    }, [clearHoldTimer, triggerHaptic]);

    const handlePointerUp = useCallback((item: DeckItem, _e: React.PointerEvent<HTMLButtonElement>) => {
        if (holdTimerRef.current !== null) {
            // Released before 220ms -> standard tap handled by handleClick
            clearHoldTimer();
            return;
        }

        if (didHoldRef.current) {
            const effectiveTarget = pendingTargetRef.current || target;
            if (effectiveTarget) {
                if (pendingTargetRef.current) {
                    setTarget(pendingTargetRef.current);
                }
                flashPressed(item.label);
                triggerHaptic?.(15);
                executeCommand(`${item.cmd}${effectiveTarget}`.trim());
                closeTargetMenu();
            }
            // If no target exists, keep target menu open for selection
        }
    }, [clearHoldTimer, closeTargetMenu, executeCommand, flashPressed, setTarget, target, triggerHaptic]);

    const handlePointerCancel = useCallback(() => {
        closeTargetMenu();
    }, [closeTargetMenu]);

    const handleClick = useCallback((item: DeckItem, e: React.MouseEvent<HTMLButtonElement>) => {
        if (didHoldRef.current) {
            // Was a hold gesture, consume click
            e.preventDefault();
            e.stopPropagation();
            didHoldRef.current = false;
            return;
        }
        fire(item);
    }, [fire]);

    const handleSelectTarget = useCallback((targetValue: string) => {
        const itemToFire = activeItemRef.current;
        setPendingTarget(targetValue);
        pendingTargetRef.current = targetValue;
        setTarget(targetValue);
        triggerHaptic?.(15);

        if (itemToFire) {
            flashPressed(itemToFire.label);
            executeCommand(`${itemToFire.cmd}${targetValue}`.trim());
            closeTargetMenu();
        }
    }, [closeTargetMenu, executeCommand, flashPressed, setTarget, triggerHaptic]);

    useEffect(() => {
        return () => {
            clearHoldTimer();
        };
    }, [clearHoldTimer]);

    return {
        isTargetMenuOpen,
        activeItem,
        pendingTarget,
        roomOccupants,
        roomItems,
        handlePointerDown,
        handlePointerUp,
        handlePointerCancel,
        handleClick,
        handleSelectTarget,
        closeTargetMenu
    };
};
