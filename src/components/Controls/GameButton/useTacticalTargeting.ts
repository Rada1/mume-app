/**
 * @file useTacticalTargeting.ts
 * @description Hook managing dwell hold detection and ad-hoc targeting override for tactical mobile buttons.
 */

// --- Logic Section ---
import { useState, useRef, useCallback, useEffect } from 'react';
import {
    applyTargetToCommand,
    BLANK_TARGET_VALUE,
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
    autoTargetForCommand?: (command: string) => string | null;
    isMobile?: boolean;
    openOnHoldWithoutTarget?: boolean;
    setCommandPreview: (cmd: string | null) => void;
    triggerHaptic?: (ms: number) => void;
}

export interface UseTacticalTargetingReturn {
    isTargetColumnOpen: boolean;
    isTargetMenuHeld: boolean;
    isTargetMenuPending: boolean;
    fireOnTargetTap: boolean;
    setFireOnTargetTap: React.Dispatch<React.SetStateAction<boolean>>;
    pendingTarget: string | null;
    pendingDirection: string | null;
    hasSelectedTarget: boolean;
    pendingTargetRef: React.RefObject<string | null>;
    startHoldTimer: (cmd: string) => void;
    cancelHoldTimer: () => void;
    releaseTargetMenu: () => void;
    handleSelectTarget: (targetVal: string | null, currentCmd: string, shouldTriggerHaptic?: boolean) => void;
    handleSelectDirection: (direction: string, currentCmd: string) => void;
    getEffectiveTarget: (command: string) => string | null;
    resolveCommandWithTarget: (baseCmd: string) => string;
    resetTargeting: () => void;
    clearSelection: () => void;
    updateCommandPreviewWithTarget: (baseCmd: string) => void;
}

export const useTacticalTargeting = ({
    activeTarget,
    autoTargetForCommand,
    isMobile = false,
    openOnHoldWithoutTarget = false,
    setCommandPreview,
    triggerHaptic
}: UseTacticalTargetingOptions): UseTacticalTargetingReturn => {
    const [isTargetColumnOpen, setIsTargetColumnOpen] = useState(false);
    const [isTargetMenuHeld, setIsTargetMenuHeld] = useState(false);
    const [isTargetMenuPending, setIsTargetMenuPending] = useState(false);
    const [fireOnTargetTap, setFireOnTargetTap] = useState(false);
    const [pendingTarget, setPendingTarget] = useState<string | null>(null);
    const [pendingDirection, setPendingDirection] = useState<string | null>(null);
    const [hasSelectedTarget, setHasSelectedTarget] = useState(false);

    const isTargetColumnOpenRef = useRef(false);
    isTargetColumnOpenRef.current = isTargetColumnOpen;

    const holdTimerRef = useRef<number | null>(null);
    const currentCmdRef = useRef<string>('');
    const pendingTargetRef = useRef<string | null>(null);
    pendingTargetRef.current = pendingTarget;
    const pendingDirectionRef = useRef<string | null>(null);
    pendingDirectionRef.current = pendingDirection;

    const cancelHoldTimer = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setIsTargetMenuPending(false);
    }, []);

    const startHoldTimer = useCallback((cmd: string) => {
        currentCmdRef.current = cmd;

        // If target menu is already open, do not restart timer or wipe target
        if (isTargetColumnOpenRef.current) {
            return;
        }

        // Keep one dwell timer for the whole held swipe. Direction changes
        // update currentCmdRef, so the timer opens for the command under the
        // finger when the original hold threshold is reached.
        if (holdTimerRef.current !== null) return;

        // Target column only opens on mobile holds when command is targetable
        if (!isMobile || (!canCommandAcceptTarget(cmd) && !openOnHoldWithoutTarget)) return;
        setIsTargetMenuPending(true);

        holdTimerRef.current = window.setTimeout(() => {
            setIsTargetMenuPending(false);
            const activeCmd = currentCmdRef.current;
            if (canCommandAcceptTarget(activeCmd) || openOnHoldWithoutTarget) {
                const menuKind = getCommandTargetMenuKind(activeCmd);
                const commandVerb = activeCmd.trim().split(/\s+/, 1)[0].toLowerCase();
                const isForcedDefaultCommand = ['look', 'assist', 'rescue'].includes(commandVerb);
                const acceptsTarget = canCommandAcceptTarget(activeCmd);
                const defaultTarget = menuKind === 'social'
                    ? null
                    : isForcedDefaultCommand
                    ? getDefaultCommandTarget(activeCmd)
                    : acceptsTarget
                    ? menuKind === 'door-direction'
                    ? 'exit'
                    : getRememberedCommandTarget(activeCmd)
                    || (isCompatibleGlobalTarget(activeCmd, activeTarget) ? activeTarget : null)
                    || autoTargetForCommand?.(activeCmd)
                    || getDefaultCommandTarget(activeCmd)
                    : openOnHoldWithoutTarget ? BLANK_TARGET_VALUE : null;
                setHasSelectedTarget(false);
                pendingTargetRef.current = defaultTarget;
                setPendingTarget(defaultTarget);
                setIsTargetColumnOpen(true);
                setIsTargetMenuHeld(true);
                triggerHaptic?.(20);
            }
        }, 220);
    }, [activeTarget, autoTargetForCommand, cancelHoldTimer, isMobile, openOnHoldWithoutTarget, triggerHaptic]);

    const releaseTargetMenu = useCallback(() => {
        cancelHoldTimer();
        setIsTargetMenuHeld(false);
    }, [cancelHoldTimer]);

    const handleSelectTarget = useCallback((targetVal: string | null, currentCmd: string, shouldTriggerHaptic = true) => {
        if (getCommandTargetMenuKind(currentCmd) === 'door-direction' && targetVal?.toLowerCase() !== 'exit') return;
        setHasSelectedTarget(true);
        if (pendingTargetRef.current === targetVal) {
            if (targetVal && shouldTriggerHaptic) triggerHaptic?.(15);
            return;
        }
        pendingTargetRef.current = targetVal;
        pendingDirectionRef.current = null;
        setPendingTarget(targetVal);
        setPendingDirection(null);
        const isSocialMenu = getCommandTargetMenuKind(currentCmd) === 'social';
        if (targetVal && targetVal !== BLANK_TARGET_VALUE && !isSocialMenu) rememberCommandTarget(currentCmd, targetVal);
        if (targetVal && shouldTriggerHaptic) triggerHaptic?.(15);
        if (currentCmd) {
            const preview = targetVal === BLANK_TARGET_VALUE
                ? currentCmd.trim()
                : isSocialMenu
                ? `${targetVal || ''}${targetVal && activeTarget ? ` ${activeTarget}` : ''}`.trim()
                : applyTargetToCommand(currentCmd, targetVal);
            setCommandPreview(preview);
        }
    }, [activeTarget, setCommandPreview, triggerHaptic]);

    const handleSelectDirection = useCallback((direction: string, currentCmd: string) => {
        const target = pendingTargetRef.current;
        const keepsExitTarget = target?.toLowerCase() === 'exit';
        if (!keepsExitTarget) {
            pendingTargetRef.current = null;
            setPendingTarget(null);
        }
        pendingDirectionRef.current = direction;
        setPendingDirection(direction);
        if (currentCmd) {
            const commandWithDirection = keepsExitTarget
                ? `${applyTargetToCommand(currentCmd, target)} ${direction}`.trim()
                : applyTargetToCommand(currentCmd, direction);
            setCommandPreview(commandWithDirection);
        }
        triggerHaptic?.(15);
    }, [setCommandPreview, triggerHaptic]);

    const getEffectiveTarget = useCallback((command: string): string | null => {
        const kind = getCommandTargetMenuKind(command);
        if (kind === 'door-direction') return 'exit';
        if (kind === 'self-only') return 'self';
        if (pendingDirectionRef.current) return pendingTargetRef.current || pendingDirectionRef.current;
        if (pendingTargetRef.current) return pendingTargetRef.current;
        if (isTargetColumnOpenRef.current) return null;
        const commandVerb = command.trim().split(/\s+/, 1)[0].toLowerCase();
        if (commandVerb === 'look') return null;
        if (['assist', 'rescue'].includes(commandVerb)) return getDefaultCommandTarget(command);
        const rememberedTarget = getRememberedCommandTarget(command);
        if (rememberedTarget) return rememberedTarget;
        if (kind === 'gear' || kind === 'room-corpses' || kind === 'mounts' || kind === 'mage-spells' || kind === 'magic-keys' || kind === 'social') return null;
        if (isCompatibleGlobalTarget(command, activeTarget)) return activeTarget;
        return autoTargetForCommand?.(command) || null;
    }, [activeTarget, autoTargetForCommand]);

    const updateCommandPreviewWithTarget = useCallback((baseCmd: string) => {
        currentCmdRef.current = baseCmd;
        if (!baseCmd) return;
        const targetToUse = getEffectiveTarget(baseCmd);
        const preview = applyTargetToCommand(baseCmd, targetToUse);
        setCommandPreview(preview);
    }, [getEffectiveTarget, setCommandPreview]);

    const resolveCommandWithTarget = useCallback((baseCmd: string): string => {
        const direction = pendingDirectionRef.current;
        const target = pendingTargetRef.current;
        if (target === BLANK_TARGET_VALUE) return baseCmd.trim();
        if (getCommandTargetMenuKind(baseCmd) === 'social') {
            return target
                ? `${target}${activeTarget ? ` ${activeTarget}` : ''}`.trim()
                : '';
        }
        if (direction) {
            if (target?.toLowerCase() === 'exit') {
                return `${applyTargetToCommand(baseCmd, target)} ${direction}`.trim();
            }
            return applyTargetToCommand(baseCmd, direction);
        }
        const targetToUse = getEffectiveTarget(baseCmd);
        return applyTargetToCommand(baseCmd, targetToUse);
    }, [activeTarget, getEffectiveTarget]);

    const resetTargeting = useCallback(() => {
        cancelHoldTimer();
        isTargetColumnOpenRef.current = false;
        setIsTargetColumnOpen(false);
        setIsTargetMenuHeld(false);
        setPendingTarget(null);
        setHasSelectedTarget(false);
        pendingTargetRef.current = null;
        setPendingDirection(null);
        pendingDirectionRef.current = null;
        currentCmdRef.current = '';
    }, [cancelHoldTimer]);

    const clearSelection = useCallback(() => {
        pendingTargetRef.current = null;
        pendingDirectionRef.current = null;
        setPendingTarget(null);
        setPendingDirection(null);
        setHasSelectedTarget(false);
        setCommandPreview(null);
    }, [setCommandPreview]);

    useEffect(() => {
        return () => {
            cancelHoldTimer();
        };
    }, [cancelHoldTimer]);

    return {
        isTargetColumnOpen,
        isTargetMenuHeld,
        isTargetMenuPending,
        fireOnTargetTap,
        setFireOnTargetTap,
        pendingTarget,
        pendingDirection,
        hasSelectedTarget,
        pendingTargetRef,
        startHoldTimer,
        cancelHoldTimer,
        releaseTargetMenu,
        handleSelectTarget,
        handleSelectDirection,
        getEffectiveTarget,
        resolveCommandWithTarget,
        resetTargeting,
        clearSelection,
        updateCommandPreviewWithTarget
    };
};
