/** @file TacticalCommandPanel.tsx — Combines swipe mappings, target choices, and direction input. */

import React, { useCallback } from 'react';
import type { CustomButton, ExecuteCommand, SwipeDirection } from '../../../types';
import type { CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import { BLANK_TARGET_VALUE, canCommandAcceptTarget } from '../../../utils/commandTargetUtils';
import { ButtonSwipeOverlay } from './ButtonSwipeOverlay';
import { TacticalTargetBar, type TacticalTargetColumn } from './TacticalTargetBar';
import type { UseTacticalTargetingReturn } from './useTacticalTargeting';
import type { TacticalPaletteCommand, TacticalSwapCell } from './TacticalCommandPalette';
import './TacticalSwipeWheel.css';
import './TacticalCommandPanel.css';

// --- Logic Section ---
export interface WheelReplacementMode {
    title: string;
    suggestions: CommandTargetSuggestion[];
    selectedValue?: string | null;
    selectedDirection?: SwipeDirection | 'center' | null;
    awaitingSlotSelection?: boolean;
    executeOnSelect?: boolean;
    onSelect: (value: string) => string | void;
    onCancel?: () => void;
}

interface Props {
    button: CustomButton;
    buttonIconNode?: React.ReactNode;
    activeDir: SwipeDirection | 'center' | null;
    isCancelling: boolean;
    isPinned: boolean;
    swapSource?: TacticalSwapCell | null;
    onSwapCells?: () => void;
    onClose: () => void;
    buttonRect?: DOMRect;
    rayParams: { angle: number; length: number; opacity: number; color?: string };
    isMobile: boolean;
    isTargetMenuOpen: boolean;
    isTargetMenuHeld: boolean;
    command: string;
    currentCommandRef: React.MutableRefObject<string>;
    activeTarget: string | null;
    targetChipTarget: string | null;
    selectedTarget: string | null;
    selectedDirection: string | null;
    directionPadMode: 'below' | 'side' | 'wheel' | null;
    suggestions?: CommandTargetSuggestion[];
    title?: string;
    characterName: string;
    targeting: UseTacticalTargetingReturn;
    executeCommand: ExecuteCommand;
    isChoosingRebindSlot: boolean;
    rebindDirection: SwipeDirection | 'center' | null;
    onSelectRebindSlot: (direction: SwipeDirection | 'center') => void;
    onPinnedPointerDown?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerMove?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerUp?: React.PointerEventHandler<HTMLElement>;
    onPinnedPointerCancel?: React.PointerEventHandler<HTMLElement>;
    paletteCommands?: TacticalPaletteCommand[];
    onPalettePointerDown?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerMove?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerUp?: React.PointerEventHandler<HTMLElement>;
    onPalettePointerCancel?: React.PointerEventHandler<HTMLElement>;
    hidePreviewWheel?: boolean;
    wheelReplacementMode?: WheelReplacementMode | null;
    columns?: TacticalTargetColumn[];
    onSelectColumnTarget?: (targetValue: string, columnIndex: number, suggestion: CommandTargetSuggestion, keepOpenAfterFire?: boolean) => void;
    onToggleTargetLock?: (targetValue: string) => void;
    onTargetSelected?: (targetValue: string) => void;
}

export const TacticalCommandPanel: React.FC<Props> = ({
    button, buttonIconNode, activeDir, isCancelling, isPinned, swapSource, onSwapCells, onClose, buttonRect, rayParams, isMobile,
    isTargetMenuOpen, isTargetMenuHeld, command, currentCommandRef, activeTarget, targetChipTarget,
    selectedTarget, selectedDirection, directionPadMode, suggestions, title,
    characterName, targeting, executeCommand, isChoosingRebindSlot, rebindDirection, onSelectRebindSlot, onPinnedPointerDown, onPinnedPointerMove, onPinnedPointerUp, onPinnedPointerCancel, paletteCommands, onPalettePointerDown, onPalettePointerMove, onPalettePointerUp, onPalettePointerCancel, hidePreviewWheel,
    wheelReplacementMode, columns, onSelectColumnTarget, onToggleTargetLock, onTargetSelected
}) => {
    const handleTargetHover = useCallback((targetValue: string | null) => {
        if (targetValue && !wheelReplacementMode && !columns?.length) {
            onTargetSelected?.(targetValue);
            targeting.handleSelectTarget(targetValue, currentCommandRef.current || button.command, false);
        }
    }, [button.command, currentCommandRef, onTargetSelected, targeting, wheelReplacementMode, columns]);
    const isCommandTargetReady = useCallback((swipeCommand: string) => {
        if (!swipeCommand.trim() || !canCommandAcceptTarget(swipeCommand)) return false;
        const selected = targeting.pendingTarget || targeting.getEffectiveTarget(swipeCommand);
        if (!selected || !targetChipTarget || selected === BLANK_TARGET_VALUE) return false;
        const normalize = (value: string) => value.replace(/[*']/g, '').trim().toLowerCase();
        const selectedValue = normalize(selected);
        const chipValue = normalize(targetChipTarget);
        if (selectedValue === chipValue) return true;

        const selectedOrdinal = selectedValue.match(/^(\d+)\.(.+)$/);
        const chipOrdinal = chipValue.match(/^(\d+)\.(.+)$/);
        if (selectedOrdinal && chipOrdinal) return false;
        if (selectedOrdinal) return selectedOrdinal[1] === '1' && selectedOrdinal[2] === chipValue;
        if (chipOrdinal) return chipOrdinal[1] === '1' && chipOrdinal[2] === selectedValue;
        return false;
    }, [targetChipTarget, targeting.getEffectiveTarget, targeting.pendingTarget]);

    const handleSelectTarget = (value: string, _keepOpenAfterFire = false) => {
        if (wheelReplacementMode) {
            const replacementCommand = wheelReplacementMode.onSelect(value);
            if (replacementCommand) currentCommandRef.current = replacementCommand;
            targeting.clearSelection();
            targeting.releaseTargetMenu();
            if (wheelReplacementMode.executeOnSelect && replacementCommand) {
                targeting.resetTargeting();
                executeCommand(targeting.resolveCommandWithTarget(replacementCommand), false, false);
            }
            return;
        }
        const currentCommand = currentCommandRef.current || button.command;
        if (value.toLowerCase() !== 'exit') onTargetSelected?.(value);
        targeting.handleSelectTarget(value, currentCommand);
        if (targeting.fireOnTargetTap && value.toLowerCase() !== 'exit') {
            executeCommand(targeting.resolveCommandWithTarget(currentCommand), false, false);
            targeting.clearSelection();
        }
    };
    const handleSelectDirection = (direction: string, _keepOpenAfterFire = false) => {
        const currentCommand = currentCommandRef.current || button.command;
        targeting.handleSelectDirection(direction, currentCommand);
        if (targeting.fireOnTargetTap) {
            executeCommand(targeting.resolveCommandWithTarget(currentCommand), false, false);
            targeting.clearSelection();
        }
    };
    const targetMenu = <TacticalTargetBar
        isOpen={isTargetMenuOpen}
        embedded
        currentTarget={activeTarget}
        selectedTarget={wheelReplacementMode?.selectedValue ?? selectedTarget}
        selectionFeedbackValue={wheelReplacementMode?.selectedValue ?? null}
        onSelectTarget={handleSelectTarget}
        onSelectDirection={handleSelectDirection}
        directionPadMode={wheelReplacementMode ? null : directionPadMode}
        selectedDirection={selectedDirection}
        roomOccupants={[]}
        roomItems={[]}
        characterName={characterName}
        suggestions={wheelReplacementMode?.suggestions || suggestions}
        title={wheelReplacementMode?.title || title}
        columns={wheelReplacementMode ? undefined : columns}
        onSelectColumnTarget={onSelectColumnTarget}
        onToggleTargetLock={wheelReplacementMode ? undefined : onToggleTargetLock}
        fireOnTargetTap={targeting.fireOnTargetTap}
        onFireModeChange={wheelReplacementMode ? undefined : targeting.setFireOnTargetTap}
        isInteractive={!isChoosingRebindSlot}
        isSwipeTargeting={isTargetMenuHeld}
        onHoverTarget={wheelReplacementMode ? undefined : handleTargetHover}
        onDismiss={() => {
            wheelReplacementMode?.onCancel?.();
            targeting.resetTargeting();
        }}
    />;

    return <ButtonSwipeOverlay
        button={button}
        buttonIconNode={buttonIconNode}
        activeDir={activeDir}
        activeCommand={command}
        isCancelling={isCancelling}
        isPinned={isPinned}
        swapSource={swapSource}
        onSwapCells={onSwapCells}
        onClose={onClose}
        buttonRect={buttonRect}
        rayParams={rayParams}
        isMobile={isMobile}
        isTargetMenuVisible={isTargetMenuOpen}
        isCommandTargetReady={isCommandTargetReady}
        targetMenu={targetMenu}
        paletteCommands={paletteCommands}
        onPinnedPointerDown={onPinnedPointerDown}
        onPinnedPointerMove={onPinnedPointerMove}
        onPinnedPointerUp={onPinnedPointerUp}
        onPinnedPointerCancel={onPinnedPointerCancel}
        onPalettePointerDown={onPalettePointerDown}
        onPalettePointerMove={onPalettePointerMove}
        onPalettePointerUp={onPalettePointerUp}
        onPalettePointerCancel={onPalettePointerCancel}
        isChoosingRebindSlot={isChoosingRebindSlot}
        rebindDirection={wheelReplacementMode?.selectedDirection ?? rebindDirection}
        onSelectRebindSlot={onSelectRebindSlot}
        hidePreviewWheel={hidePreviewWheel}
    />;
};
