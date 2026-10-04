/** @file TacticalCommandPanel.tsx — Combines swipe mappings, target choices, and direction input. */

import React, { ReactNode, useCallback, useMemo } from 'react';
import type { CustomButton, ExecuteCommand, SwipeDirection } from '../../../types';
import { getRoomTargetSuggestions, getSelfTargetSuggestion, isTargetSuggestionMatch, type CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import { BLANK_TARGET_VALUE, canCommandAcceptTarget, getDefaultCommandTarget, isOffensiveSingleTargetCommand, LOOK_IN_TARGET_VALUE } from '../../../utils/commandTargetUtils';
import type { EntityColorMap } from '../../../utils/inlineActionModel';
import { getTargetClassificationColor } from '../../../utils/targetClassificationColor';
import { useCurrentRoomHasDoor } from '../../../hooks/useCurrentRoomHasDoor';
import { isDoorPresenceSpellCommand } from '../../../utils/doorCommandUtils';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useRoomStore } from '../../../stores/useRoomStore';
import { ButtonSwipeOverlay } from './ButtonSwipeOverlay';
import { TacticalTargetBar, type TacticalTargetColumn } from './TacticalTargetBar';
import type { UseTacticalTargetingReturn } from './tacticalTargetingTypes';
import type { TacticalPaletteCommand, TacticalSwapCell } from './TacticalCommandPalette';
import './TacticalSwipeWheel.css';
import './TacticalCommandPanel.css';

// --- Logic Section ---
const SELF_BUFF_GLOW_SPELLS = new Set(['armour', 'armor', 'shield', 'breath of briskness']);
const SHOW_ALLY_COMMAND_TARGET_GLOW = false;

const getSelfBuffGlowSpell = (command: string): string | null => {
    const spell = command.trim().match(/^(?:(?:cast|c|commune)\s+)?['"]?([^'"]+?)['"]?(?:\s+.*)?$/i)?.[1];
    const normalized = spell?.trim().toLowerCase();
    return normalized && SELF_BUFF_GLOW_SPELLS.has(normalized) ? normalized : null;
};

const usesFullWidthTargetMenu = (command: string): boolean => {
    const normalized = command.trim().replace(/^(?:cast|c|commune)\s+(['"])(.*?)\1.*$/i, '$2').toLowerCase();
    return /^(?:scry|teleport|portal|remove|wear|group)(?:\s|$)/.test(normalized) || /^watch\s+room(?:\s|$)/.test(normalized);
};

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
    getCommandLearnedState?: (command: string) => boolean | undefined;
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
    customContent?: ReactNode;
    customContentInteractive?: boolean;
}

export const TacticalCommandPanel: React.FC<Props> = ({
    button, activeDir, isCancelling, isPinned, swapSource, onSwapCells, onClose, buttonRect, rayParams, isMobile,
    isTargetMenuOpen, isTargetMenuHeld, command, currentCommandRef, activeTarget, targetChipTarget,
    selectedTarget, selectedDirection, directionPadMode, suggestions, title,
    characterName, targeting, executeCommand, isChoosingRebindSlot, rebindDirection, onSelectRebindSlot, onPinnedPointerDown, onPinnedPointerMove, onPinnedPointerUp, onPinnedPointerCancel, paletteCommands, getCommandLearnedState, onPalettePointerDown, onPalettePointerMove, onPalettePointerUp, onPalettePointerCancel, hidePreviewWheel,
    wheelReplacementMode, columns, onSelectColumnTarget, onToggleTargetLock, onTargetSelected, customContent, customContentInteractive
}) => {
    const inlineCategories = useSettingsStore(state => state.inlineCategories);
    const objectColor = useSettingsStore(state => state.objectColor);
    const playerColor = useSettingsStore(state => state.playerColor);
    const npcColor = useSettingsStore(state => state.npcColor);
    const enemyColor = useSettingsStore(state => state.enemyColor);
    const neutralColor = useSettingsStore(state => state.neutralColor);
    const theme = useSettingsStore(state => state.theme);
    const entityColors: EntityColorMap = { object: objectColor, player: playerColor, npc: npcColor, enemy: enemyColor, neutral: neutralColor };
    const roomChars = useRoomStore(state => state.chars);
    const hasRoomDoor = useCurrentRoomHasDoor();
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const classificationSuggestions = useMemo(() => [
        getSelfTargetSuggestion(),
        ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName)
    ], [characterName, roomOccupants]);
    const handleTargetHover = useCallback((targetValue: string | null) => {
        const currentCommand = currentCommandRef.current || button.command;
        if (currentCommand.trim().toLowerCase() === 'look' && targetValue === LOOK_IN_TARGET_VALUE) return;
        if (targetValue && !wheelReplacementMode && !columns?.length) {
            targeting.handleSelectTarget(targetValue, currentCommand, false, false);
        }
    }, [button.command, currentCommandRef, targeting, wheelReplacementMode, columns]);
    const getCommandTargetGlowColor = useCallback((swipeCommand: string) => {
        // Retain the caster-targeted buff highlight behind a feature flag for
        // possible later use; ally command highlighting is currently disabled.
        if (getSelfBuffGlowSpell(swipeCommand)) {
            return SHOW_ALLY_COMMAND_TARGET_GLOW
                ? getTargetClassificationColor('ally', inlineCategories, entityColors, theme) || '#61c290'
                : null;
        }
        if (!swipeCommand.trim() || !canCommandAcceptTarget(swipeCommand)) return null;
        if (isDoorPresenceSpellCommand(swipeCommand) && !hasRoomDoor) return null;
        // Keep wheel target glows tied to each command's own default target.
        // The hovered command's pending selection is transient and must not
        // suppress the chip glow on other commands in the wheel.
        const selected = targeting.getEffectiveTarget(swipeCommand, true) || getDefaultCommandTarget(swipeCommand);
        if (!selected || selected === BLANK_TARGET_VALUE) return null;
        const normalize = (value: string) => value.replace(/[*']/g, '').trim().toLowerCase();
        const selectedValue = normalize(selected);
        const selectedSuggestion = [...classificationSuggestions, ...(suggestions || [])]
            .find(suggestion => isTargetSuggestionMatch(suggestion, selected));
        const selectedMeta = selectedSuggestion?.meta || (selectedValue === 'self' || selectedValue.endsWith('.ally') ? 'ally' : '');

        if (isOffensiveSingleTargetCommand(swipeCommand)) return '#f87171';
        if (selectedMeta === 'self' || selectedMeta === 'ally' || selectedMeta === 'allies') {
            return SHOW_ALLY_COMMAND_TARGET_GLOW
                ? getTargetClassificationColor(selectedMeta, inlineCategories, entityColors, theme) || '#61c290'
                : null;
        }

        if (!targetChipTarget) return null;
        const chipValue = normalize(targetChipTarget);
        const selectedOrdinal = selectedValue.match(/^(\d+)\.(.+)$/);
        const chipOrdinal = chipValue.match(/^(\d+)\.(.+)$/);
        const targetsChip = selectedValue === chipValue
            || (selectedOrdinal && selectedOrdinal[1] === '1' && selectedOrdinal[2] === chipValue)
            || (chipOrdinal && chipOrdinal[1] === '1' && chipOrdinal[2] === selectedValue);
        if (!targetsChip) return null;

        const lockedTargetValue = activeTarget ? normalize(activeTarget) : '';
        if (!lockedTargetValue || lockedTargetValue !== chipValue) return '#f87171';
        return getTargetClassificationColor(selectedMeta, inlineCategories, entityColors, theme) || '#f87171';
    }, [activeTarget, classificationSuggestions, entityColors, hasRoomDoor, inlineCategories, suggestions, targetChipTarget, targeting.getEffectiveTarget, theme]);

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
        if (/^look$/i.test(currentCommand.trim()) && value === LOOK_IN_TARGET_VALUE) {
            currentCommandRef.current = 'look in';
            targeting.openTargetMenu('look in');
            return;
        }
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
        fullWidthTargetList={usesFullWidthTargetMenu(currentCommandRef.current || command || button.command)}
        showWornLocation={/^remove\b/i.test(currentCommandRef.current || command || button.command)}
        customContentInteractive={customContentInteractive && !wheelReplacementMode}
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
        customContent={wheelReplacementMode ? undefined : customContent}
        columns={wheelReplacementMode ? undefined : columns}
        onSelectColumnTarget={onSelectColumnTarget}
        onToggleTargetLock={wheelReplacementMode ? undefined : onToggleTargetLock}
        fireOnTargetTap={targeting.fireOnTargetTap}
        onFireModeChange={wheelReplacementMode || customContent ? undefined : targeting.setFireOnTargetTap}
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
        getCommandTargetGlowColor={getCommandTargetGlowColor}
        getCommandLearnedState={getCommandLearnedState}
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
