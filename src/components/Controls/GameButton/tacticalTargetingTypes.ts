/**
 * @file tacticalTargetingTypes.ts
 * @description Public types for the tactical targeting hook.
 */

// --- Logic Section ---
import type { Dispatch, RefObject, SetStateAction } from 'react';

export interface UseTacticalTargetingOptions {
    activeTarget: string | null;
    autoTargetEnabled?: boolean;
    autoTargetForCommand?: (command: string) => string | null;
    isMobile?: boolean;
    openOnHoldWithoutTarget?: boolean;
    setCommandPreview: (cmd: string | null) => void;
    triggerHaptic?: (ms: number) => void;
    onTargetMenuOpened?: (command: string) => void;
}

export interface UseTacticalTargetingReturn {
    isTargetColumnOpen: boolean;
    isTargetMenuHeld: boolean;
    isTargetMenuPending: boolean;
    fireOnTargetTap: boolean;
    setFireOnTargetTap: Dispatch<SetStateAction<boolean>>;
    pendingTarget: string | null;
    pendingDirection: string | null;
    hasSelectedTarget: boolean;
    hasSelectedTargetRef: RefObject<boolean>;
    hasManuallySelectedTarget: boolean;
    pendingTargetRef: RefObject<string | null>;
    startHoldTimer: (cmd: string) => void;
    cancelHoldTimer: () => void;
    releaseTargetMenu: () => void;
    openTargetMenu: (command: string) => void;
    handleSelectTarget: (targetVal: string | null, currentCmd: string, shouldTriggerHaptic?: boolean, isManualSelection?: boolean) => void;
    handleSelectDirection: (direction: string, currentCmd: string) => void;
    getEffectiveTarget: (command: string, ignorePendingSelection?: boolean) => string | null;
    resolveCommandWithTarget: (baseCmd: string) => string;
    resetTargeting: () => void;
    clearSelection: () => void;
    updateCommandPreviewWithTarget: (baseCmd: string) => void;
}
