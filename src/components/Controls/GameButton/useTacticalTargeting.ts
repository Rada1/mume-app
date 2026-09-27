/**
 * @file useTacticalTargeting.ts
 * @description Hook managing dwell hold detection and ad-hoc targeting override for tactical mobile buttons.
 */

// --- Logic Section ---
import { useState, useRef, useCallback, useEffect } from 'react';
import {
    applyTargetToCommand,
    canCommandAcceptTarget,
    getCommandTargetMenuKind,
    getDefaultCommandTarget
} from '../../../utils/commandTargetUtils';
import {
    getRememberedCommandTarget,
    isCompatibleGlobalTarget,
    rememberCommandTarget,
} from '../../../utils/commandTargetMemory';

export interface UseTacticalTargetingOptions {
    activeTarget: string | null;
    isMobile?: boolean;
    setCommandPreview: (cmd: string | null) => void;
    triggerHaptic?: (ms: number) => void;
}

export interface UseTacticalTargetingReturn {
    isTargetColumnOpen: boolean;
    isTargetMenuHeld: boolean;
    pendingTarget: string | null;
    pendingTargetRef: React.RefObject<string | null>;
    startHoldTimer: (cmd: string) => void;
    cancelHoldTimer: () => void;
    releaseTargetMenu: () => void;
    handleSelectTarget: (targetVal: string | null, currentCmd: string) => void;
    getEffectiveTarget: (command: string) => string | null;
    resolveCommandWithTarget: (baseCmd: string) => string;
    resetTargeting: () => void;
    updateCommandPreviewWithTarget: (baseCmd: string) => void;
}

export const useTacticalTargeting = ({
    activeTarget,
    isMobile = false,
    setCommandPreview,
    triggerHaptic
}: UseTacticalTargetingOptions): UseTacticalTargetingReturn => {
    const [isTargetColumnOpen, setIsTargetColumnOpen] = useState(false);
    const [isTargetMenuHeld, setIsTargetMenuHeld] = useState(false);
    const [pendingTarget, setPendingTarget] = useState<string | null>(null);

    const isTargetColumnOpenRef = useRef(false);
    isTargetColumnOpenRef.current = isTargetColumnOpen;

    const holdTimerRef = useRef<number | null>(null);
    const currentCmdRef = useRef<string>('');
    const pendingTargetRef = useRef<string | null>(null);
    pendingTargetRef.current = pendingTarget;

    const cancelHoldTimer = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const startHoldTimer = useCallback((cmd: string) => {
        currentCmdRef.current = cmd;

        // If target menu is already open, do not restart timer or wipe target
        if (isTargetColumnOpenRef.current) {
            return;
        }

        cancelHoldTimer();

        // Target column only opens on mobile holds when command is targetable
        if (!isMobile) return;

        holdTimerRef.current = window.setTimeout(() => {
            const activeCmd = currentCmdRef.current;
            if (canCommandAcceptTarget(activeCmd)) {
                const defaultTarget = getRememberedCommandTarget(activeCmd) || getDefaultCommandTarget(activeCmd);
                if (defaultTarget) {
                    pendingTargetRef.current = defaultTarget;
                    setPendingTarget(defaultTarget);
                }
                setIsTargetColumnOpen(true);
                setIsTargetMenuHeld(true);
                triggerHaptic?.(20);
            }
        }, 220);
    }, [cancelHoldTimer, isMobile, triggerHaptic]);

    const releaseTargetMenu = useCallback(() => {
        cancelHoldTimer();
        setIsTargetMenuHeld(false);
    }, [cancelHoldTimer]);

    const handleSelectTarget = useCallback((targetVal: string | null, currentCmd: string) => {
        if (pendingTargetRef.current === targetVal) return;
        pendingTargetRef.current = targetVal;
        setPendingTarget(targetVal);
        if (targetVal) rememberCommandTarget(currentCmd, targetVal);
        if (targetVal) triggerHaptic?.(15);
        if (currentCmd) setCommandPreview(applyTargetToCommand(currentCmd, targetVal));
    }, [setCommandPreview, triggerHaptic]);

    const getEffectiveTarget = useCallback((command: string): string | null => {
        if (getCommandTargetMenuKind(command) === 'self-only') return 'self';
        if (pendingTargetRef.current) return pendingTargetRef.current;
        if (isTargetColumnOpenRef.current) return null;
        const rememberedTarget = getRememberedCommandTarget(command);
        if (rememberedTarget) return rememberedTarget;
        const kind = getCommandTargetMenuKind(command);
        if (kind === 'gear' || kind === 'room-corpses' || kind === 'mounts' || kind === 'mage-spells' || kind === 'magic-keys' || kind === 'social') return null;
        return isCompatibleGlobalTarget(command, activeTarget) ? activeTarget : null;
    }, [activeTarget]);

    const updateCommandPreviewWithTarget = useCallback((baseCmd: string) => {
        currentCmdRef.current = baseCmd;
        if (!baseCmd) return;
        const targetToUse = getEffectiveTarget(baseCmd);
        const preview = applyTargetToCommand(baseCmd, targetToUse);
        setCommandPreview(preview);
    }, [getEffectiveTarget, setCommandPreview]);

    const resolveCommandWithTarget = useCallback((baseCmd: string): string => {
        const targetToUse = getEffectiveTarget(baseCmd);
        return applyTargetToCommand(baseCmd, targetToUse);
    }, [getEffectiveTarget]);

    const resetTargeting = useCallback(() => {
        cancelHoldTimer();
        setIsTargetColumnOpen(false);
        setIsTargetMenuHeld(false);
        setPendingTarget(null);
        pendingTargetRef.current = null;
        currentCmdRef.current = '';
    }, [cancelHoldTimer]);

    useEffect(() => {
        return () => {
            cancelHoldTimer();
        };
    }, [cancelHoldTimer]);

    return {
        isTargetColumnOpen,
        isTargetMenuHeld,
        pendingTarget,
        pendingTargetRef,
        startHoldTimer,
        cancelHoldTimer,
        releaseTargetMenu,
        handleSelectTarget,
        getEffectiveTarget,
        resolveCommandWithTarget,
        resetTargeting,
        updateCommandPreviewWithTarget
    };
};
