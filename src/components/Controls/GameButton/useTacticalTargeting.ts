/**
 * @file useTacticalTargeting.ts
 * @description Hook managing dwell hold detection and ad-hoc targeting override for tactical mobile buttons.
 */

// --- Logic Section ---
import { useState, useRef, useCallback, useEffect } from 'react';
import { canCommandAcceptTarget, applyTargetToCommand } from '../../../utils/commandTargetUtils';

export interface UseTacticalTargetingOptions {
    activeTarget: string | null;
    isMobile?: boolean;
    setCommandPreview: (cmd: string | null) => void;
    triggerHaptic?: (ms: number) => void;
}

export interface UseTacticalTargetingReturn {
    isTargetColumnOpen: boolean;
    pendingTarget: string | null;
    pendingTargetRef: React.RefObject<string | null>;
    startHoldTimer: (cmd: string) => void;
    cancelHoldTimer: () => void;
    handleSelectTarget: (targetVal: string, currentCmd: string) => void;
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
                setIsTargetColumnOpen(true);
                triggerHaptic?.(20);
            }
        }, 220);
    }, [cancelHoldTimer, isMobile, triggerHaptic]);

    const handleSelectTarget = useCallback((targetVal: string, currentCmd: string) => {
        pendingTargetRef.current = targetVal;
        setPendingTarget(targetVal);
        triggerHaptic?.(15);
        if (currentCmd) {
            const previewWithTarget = applyTargetToCommand(currentCmd, targetVal);
            setCommandPreview(previewWithTarget);
        }
    }, [setCommandPreview, triggerHaptic]);

    const updateCommandPreviewWithTarget = useCallback((baseCmd: string) => {
        currentCmdRef.current = baseCmd;
        if (!baseCmd) return;
        const targetToUse = pendingTargetRef.current || activeTarget;
        const preview = applyTargetToCommand(baseCmd, targetToUse);
        setCommandPreview(preview);
    }, [activeTarget, setCommandPreview]);

    const resolveCommandWithTarget = useCallback((baseCmd: string): string => {
        const targetToUse = pendingTargetRef.current || activeTarget;
        return applyTargetToCommand(baseCmd, targetToUse);
    }, [activeTarget]);

    const resetTargeting = useCallback(() => {
        cancelHoldTimer();
        setIsTargetColumnOpen(false);
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
        pendingTarget,
        pendingTargetRef,
        startHoldTimer,
        cancelHoldTimer,
        handleSelectTarget,
        resolveCommandWithTarget,
        resetTargeting,
        updateCommandPreviewWithTarget
    };
};
