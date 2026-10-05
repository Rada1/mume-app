/** @file GameButton.tsx — Renders a game button and connects gesture, targeting, and tactical controls. */

import React, { useRef, useEffect, useMemo, useCallback, useState, useId } from 'react';
import { CustomButton, DrawerLine, PopoverState, ExecuteCommand, SwipeDirection, TacticalArgumentChip } from '../../../types';

import { getButtonCommand } from '../../../utils/buttonUtils';
import { useGame, useVitals } from '../../../context/GameContext';
import { useInputStore } from '../../../stores/useInputStore';
import { useButtonGestures } from './useButtonGestures';
import { ButtonLabel } from './ButtonLabel';
import { CircularVitals } from './CircularVitals';
import { useTacticalTargeting } from './useTacticalTargeting';
import { TacticalCommandPanel } from './TacticalCommandPanel';
import { ThisIsYouConsole } from '../../HUD/ThisIsYouConsole';
import { ShopTargetMenu } from '../../Shop/ShopTargetMenu';
import { RightActionPanel } from '../../HUD/RightActionPanel';
import { useGameButtonTargetSuggestions } from './useGameButtonTargetSuggestions';
import { useRoomStore } from '../../../stores/useRoomStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useAutomaticTargetForRoom, useAutomaticTargetStore } from '../../../stores/useAutomaticTargetStore';
import { getRoomIdentityKey } from '../../../utils/roomIdentityUtils';
import { useWhoListRefresh } from '../../../hooks/useWhoListRefresh';
import { getAutoRoomTarget, isAutoTargetChipDisabledZone } from '../../../utils/commandAutoTarget';
import { getClassKeyFromSetId, getSkillPresentation } from '../../../utils/skillPresentation';
import type { PracticeClassKey } from '../../../utils/practiceClassCatalog';
import { getRoomTargetSuggestions, isTargetSuggestionMatch, MUME_SOCIAL_COMMANDS, prioritizeTargetSuggestion, type CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import type { WheelReplacementMode } from './TacticalCommandPanel';
import type { DeckTargetKind } from '../../HUD/useDeckTargeting';
import { assignPinnedWheelCell, normalizePinnedWheelCommands, swapPinnedWheelCells } from './pinnedWheelAssignments';
import type { TacticalPaletteCommand, TacticalSwapCell } from './TacticalCommandPalette';
import { fillEmptyWheelCells, getClassCommandLearnedState, getClassPalette } from './tacticalCommandPaletteUtils';
import { BLANK_TARGET_VALUE, LOOK_IN_TARGET_VALUE, canCommandAcceptTarget, getDefaultCommandTarget, isOffensiveSingleTargetCommand, usesChipPriorityOffensiveTarget } from '../../../utils/commandTargetUtils';
import { getTargetClassificationColor } from '../../../utils/targetClassificationColor';
import type { EntityColorMap } from '../../../utils/inlineActionModel';
import { useTacticalArgumentChipStore } from '../../../stores/useTacticalArgumentChipStore';
import { getSwipeCommandTextColor } from '../../../utils/swipeCommandColors';
import { useOffensiveCityActionConfirmation } from '../../../hooks/useOffensiveCityActionConfirmation';
import { useSwipeLetterBlink } from './useSwipeLetterBlink';
import { useCurrentRoomHasDoor } from '../../../hooks/useCurrentRoomHasDoor';
import { isDoorPresenceSpellCommand } from '../../../utils/doorCommandUtils';
import { getNonGroupmateRoomTargetSuggestions } from '../../../utils/groupTargetSuggestions';

// --- Logic Section ---
const SHOW_ALLY_COMMAND_TARGET_GLOW = false;
const getCommandInitial = (command: string): string => command.trim()
    .replace(/^(?:cast|c|commune)\s+/i, '')
    .replace(/^['"]+/, '')
    .trim()
    .charAt(0)
    .toUpperCase();
const CARDINAL_SWIPE_DIRECTIONS: Record<string, SwipeDirection> = {
    north: 'up',
    east: 'right',
    south: 'down',
    west: 'left'
};
const CLASS_PICKER_SET_IDS: Record<PracticeClassKey, string> = {
    mage: 'magespelllist',
    cleric: 'clericspelllist',
    ranger: 'rangerskilllist',
    warrior: 'warriorskilllist',
    thief: 'thiefskilllist'
};
const TACTICAL_CLASS_SET_IDS: Partial<Record<string, string>> = {
    ranger: CLASS_PICKER_SET_IDS.ranger,
    cleric: CLASS_PICKER_SET_IDS.cleric,
    thief: CLASS_PICKER_SET_IDS.thief,
    warrior: CLASS_PICKER_SET_IDS.warrior,
    mage: CLASS_PICKER_SET_IDS.mage
};
const BLANK_TARGET_SUGGESTION: CommandTargetSuggestion = {
    key: 'blank-target', label: 'Blank Target', value: BLANK_TARGET_VALUE, meta: 'source'
};
type StagedArgumentSelection = { value: string; key: string } | null;
const withVisibleWheelLayout = (existing: CustomButton, wheelButton: CustomButton): CustomButton => ({
    ...existing,
    command: wheelButton.command,
    actionType: wheelButton.actionType,
    swipeCommands: wheelButton.swipeCommands,
    swipeActionTypes: wheelButton.swipeActionTypes,
    longSwipeCommands: wheelButton.longSwipeCommands,
    longSwipeActionTypes: wheelButton.longSwipeActionTypes,
    rebindCenterSetId: wheelButton.rebindCenterSetId,
    rebindSets: wheelButton.rebindSets
});
const getDefaultStagedArguments = (
    kind: string | null,
    recentSocialCommand: string | undefined,
    firstSuggestions: CommandTargetSuggestion[],
    secondSuggestions: CommandTargetSuggestion[]
) => {
    const args: StagedArgumentSelection[] = [null, null];
    if (kind === 'social') {
        const recent = firstSuggestions.find(suggestion => suggestion.value === recentSocialCommand);
        if (recent) args[0] = { value: recent.value, key: recent.key };
        args[1] = { value: BLANK_TARGET_VALUE, key: 'social-no-target' };
    }
    if (kind === 'room-object-container') {
        args[0] = { value: 'all', key: 'all-argument' };
        args[1] = { value: '__room__', key: 'get-from-room' };
    }
    if (kind === 'inventory-container' || kind === 'inventory-recipient') {
        const allArgument = firstSuggestions.find(suggestion => suggestion.value === 'all');
        if (allArgument) args[0] = { value: allArgument.value, key: allArgument.key };
        const secondArgument = secondSuggestions.find(suggestion => suggestion.meta !== 'all');
        if (secondArgument) args[1] = { value: secondArgument.value, key: secondArgument.key };
    }
    return args;
};
const lastSocialCommandByButton = new Map<string, string>();

const getClassPickerSetId = (command: string, buttonSetId: string): string | null => {
    const classKey = getSkillPresentation(command, '', getClassKeyFromSetId(buttonSetId)).classKey;
    return classKey ? CLASS_PICKER_SET_IDS[classKey] : null;
};

export interface GameButtonProps {
    button: CustomButton;
    isEditMode: boolean;
    isGridEnabled: boolean;
    gridSize: number;
    isSelected: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent | React.PointerEvent) => void;
    wasDraggingRef: React.RefObject<boolean>;
    triggerHaptic: (ms: number) => void;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setEditButton: (button: CustomButton) => void;
    activePrompt: string | null;
    executeCommand: ExecuteCommand;
    onCommandAction?: (command: string) => boolean;
    setCommandPreview: (cmd: string | null) => void;
    setHeldButton: React.Dispatch<React.SetStateAction<{ id: string, baseCommand: string, modifiers: string[], commandPrefixes?: string[], dx?: number, dy?: number, didFire?: boolean, lastTargetFireAt?: number, initialX?: number, initialY?: number } | null>>;
    heldButton: { id: string, baseCommand: string, modifiers: string[], commandPrefixes?: string[], dx?: number, dy?: number, didFire?: boolean, lastTargetFireAt?: number, initialX?: number, initialY?: number } | null;
    joystick: { isActive: boolean, currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void };
    target: string | null;
    setActiveSet: (setId: string) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    className?: string;
    useDefaultPositioning?: boolean;
    isMobile?: boolean;
    hpRatio?: number;
    manaRatio?: number;
    moveRatio?: number;
    variant?: 'default' | 'diamond';
    /** Optional content rendered inside the button in place of the text/image label
     *  (e.g. a lucide icon for the tactical deck-slot buttons). */
    iconNode?: React.ReactNode;
    ariaLabel?: string;
    onSwapWheel?: (activeDir: import('../../../types').SwipeDirection | 'center' | null, centerCommand?: string) => void;
    onMovePinnedCells?: (source: SwipeDirection | 'center', destination: SwipeDirection | 'center', centerCommand: string) => boolean | string | void;
    onAssignPinnedCommand?: (command: string, actionType: import('../../../types').ActionType, destination: SwipeDirection | 'center', setId?: string) => string | void;
    commandPalette?: TacticalPaletteCommand[];
    onTap?: () => void;
    openDecisionPanelOnHold?: boolean;
    targetKindByCommand?: Partial<Record<string, DeckTargetKind>>;
    wheelReplacementMode?: WheelReplacementMode | null;
    containerContents?: Record<string, DrawerLine[]>;
    requestContainerContents?: (source: CommandTargetSuggestion) => void;
}

export const GameButton: React.FC<GameButtonProps> = ({
    button,
    isEditMode,
    isGridEnabled,
    gridSize,
    isSelected,
    dragState,
    handleDragStart,
    handleButtonClick,
    wasDraggingRef,
    triggerHaptic,
    setPopoverState,
    setEditButton,
    executeCommand,
    onCommandAction,
    setCommandPreview,
    setHeldButton,
    heldButton,
    joystick,
    target,
    setActiveSet,
    setButtons,
    className = '',
    useDefaultPositioning = true,
    isMobile = false,
    hpRatio,
    manaRatio,
    moveRatio,
    variant = 'default',
    iconNode,
    ariaLabel,
    onSwapWheel,
    onMovePinnedCells,
    onAssignPinnedCommand,
    commandPalette,
    onTap,
    openDecisionPanelOnHold,
    targetKindByCommand,
    wheelReplacementMode,
    containerContents = {},
    requestContainerContents
}) => {
    const [activeDir, setActiveDir] = React.useState<SwipeDirection | null>(null);
    const feedbackDirection = useSwipeLetterBlink(activeDir);
    const isTacticalMapButton = button.setId.toLowerCase() === 'tactical'
        || button.id.startsWith('tactical-')
        || button.id.startsWith('map-action-')
        || className.includes('deck-category-button')
        || className.includes('line-btn')
        || className.includes('map-action-button');
    const visualSwipeDirection = isTacticalMapButton ? null : activeDir || feedbackDirection;
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [isPanelPinned, setIsPanelPinned] = React.useState(false);
    const [swapSource, setSwapSource] = React.useState<TacticalSwapCell | null>(null);
    const swapSourceRef = useRef<TacticalSwapCell | null>(null);
    const panelHoverCellRef = useRef<TacticalSwapCell | null>(null);
    const [wheelPos, setWheelPos] = React.useState({ x: 0, y: 0 });
    const [rayParams, setRayParams] = React.useState<{ angle: number, length: number, opacity: number, color?: string }>({ angle: 0, length: 0, opacity: 0, color: 'var(--accent)' });
    const buttonRef = useRef<HTMLDivElement>(null);
    const { playClickSound, isSoundEnabled, initAudio, characterName, btn, practice, abilities = {}, setTarget, setParley } = useGame();
    const { groupMembers } = useVitals();
    const hasRoomDoor = useCurrentRoomHasDoor();
    const tacticalArgumentOwnerId = useId();
    const setTacticalArguments = useTacticalArgumentChipStore(state => state.setArguments);
    const clearTacticalArguments = useTacticalArgumentChipStore(state => state.clearArguments);
    const setAutomaticTarget = useAutomaticTargetStore(state => state.setTarget);
    const inlineCategories = useSettingsStore(state => state.inlineCategories);
    const objectColor = useSettingsStore(state => state.objectColor);
    const playerColor = useSettingsStore(state => state.playerColor);
    const npcColor = useSettingsStore(state => state.npcColor);
    const enemyColor = useSettingsStore(state => state.enemyColor);
    const neutralColor = useSettingsStore(state => state.neutralColor);
    const theme = useSettingsStore(state => state.theme);
    const roomChars = useRoomStore(state => state.chars);
    const roomItemsById = useRoomStore(state => state.items);
    const whoList = useRoomStore(state => state.whoList);
    const roomNum = useRoomStore(state => state.roomNum);
    const roomName = useRoomStore(state => state.roomName);
    const roomDesc = useRoomStore(state => state.roomDesc);
    const roomZone = useRoomStore(state => state.roomZone);
    const confirmOffensiveCityAction = useOffensiveCityActionConfirmation(roomZone);
    const runButtonCommand = useCallback<ExecuteCommand>((command, ...options) => {
        if (!confirmOffensiveCityAction(command)) return;
        if (onCommandAction?.(command)) return;
        const commandParts = command.trim().split(/\s+/).filter(Boolean);
        const channel = commandParts[0]?.toLowerCase() || '';
        if (MUME_SOCIAL_COMMANDS.includes(channel)) lastSocialCommandByButton.set(button.id, channel);
        const commChannels = ['tell', 'whisper', 'ask', 'say', 'narrate', 'shout', 'yell', 'sing', 'emote'] as const;
        const requiresTarget = ['tell', 'whisper', 'ask'].includes(channel);
        if (commChannels.includes(channel as typeof commChannels[number]) && (requiresTarget || commandParts.length === 1)) {
            useInputStore.getState().setInput('');
            setParley(previous => ({
                ...previous,
                active: true,
                mode: 'parley',
                command: channel as typeof commChannels[number],
                target: requiresTarget ? commandParts.slice(1).join(' ') || null : null,
                message: ''
            }));
            document.getElementById('mud-input')?.focus();
            return;
        }
        useInputStore.getState().setInput('');
        executeCommand(command, ...options);
    }, [button.id, confirmOffensiveCityAction, executeCommand, onCommandAction, setParley]);
    const automaticTargetRoomKey = getRoomIdentityKey({ roomNum, roomName, roomZone, roomDesc });
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomItems = useMemo(() => Object.values(roomItemsById), [roomItemsById]);
    const roomEntitySuggestions = useMemo(() => [
        ...getNonGroupmateRoomTargetSuggestions(roomOccupants, groupMembers, characterName || ''),
        ...getRoomTargetSuggestions([], roomItems, 'objects')
    ], [characterName, groupMembers, roomItems, roomOccupants]);
    const roomEntityTargets = useMemo(() => new Set(
        roomEntitySuggestions.map(suggestion => suggestion.value.trim().toLowerCase())
    ), [roomEntitySuggestions]);
    const automaticTarget = useAutomaticTargetForRoom(automaticTargetRoomKey, roomEntitySuggestions);
    const autoTargetChipDisabled = isAutoTargetChipDisabledZone(roomZone);
    const availableButtons = btn.buttons;
    const tacticalClassKey = button.id.match(/^tactical-(ranger|cleric|thief|warrior|mage)$/i)?.[1].toLowerCase();
    const classPaletteSetId = TACTICAL_CLASS_SET_IDS[tacticalClassKey || ''] || getClassPickerSetId(button.command, button.setId);
    const classPaletteKey = classPaletteSetId ? getClassKeyFromSetId(classPaletteSetId) : null;
    const getCommandLearnedState = useCallback((command: string) => classPaletteKey
        ? getClassCommandLearnedState(command, classPaletteKey, practice?.practiceData, abilities)
        : undefined, [abilities, classPaletteKey, practice?.practiceData]);
    const hasLearnedRescue = (abilities.rescue || 0) > 0
        || Boolean(practice?.practiceData?.skills.some(skill =>
            skill.name.trim().toLowerCase() === 'rescue' && skill.proficiency > 0
        ));
    const isLegacyMageMissileDefault = button.id === 'tactical-mage'
        && /^cast\s+'magic missile'$/i.test(button.command.trim());
    const paletteButton = useMemo(() => isLegacyMageMissileDefault
        ? { ...button, command: '' }
        : button, [button, isLegacyMageMissileDefault]);
    const paletteCommands = useMemo<TacticalPaletteCommand[]>(() => {
        const source = commandPalette || (classPaletteSetId && classPaletteKey
            ? getClassPalette(classPaletteKey, classPaletteSetId, practice?.practiceData, abilities, paletteButton, availableButtons)
            : []);
        const withWarriorProtect = button.id === 'tactical-warrior' && hasLearnedRescue
            ? [...source, { key: 'tactical-warrior-protect', label: 'Protect', command: 'protect', actionType: 'command' as const, setId: 'warriorskilllist' }]
            : source;
        const seen = new Set<string>();
        const uniqueCommands = withWarriorProtect.filter(item => {
            const key = item.command.trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        return [
            ...uniqueCommands.filter(item => item.isLearned !== false),
            ...uniqueCommands.filter(item => item.isLearned === false)
        ];
    }, [abilities, availableButtons, button, classPaletteKey, classPaletteSetId, commandPalette, hasLearnedRescue, paletteButton, practice?.practiceData]);
    const assignedClassCommands = [
        button.command,
        ...Object.values(button.swipeCommands || {}),
        ...Object.values(button.longSwipeCommands || {})
    ];
    const hasLearnedClassCommand = paletteCommands.some(item => item.isLearned === true)
        || assignedClassCommands.some(command => getCommandLearnedState(command) === true);
    const isTacticalClassUnlearned = Boolean(tacticalClassKey && !hasLearnedClassCommand);
    const wheelButton = useMemo(() => {
        const normalizedButton = normalizePinnedWheelCommands(button);
        if (button.id !== 'tactical-mage') return fillEmptyWheelCells(normalizedButton, paletteCommands);
        const missile = paletteCommands.find(item => /^cast\s+'magic missile'$/i.test(item.command.trim()));
        const shouldChooseLearnedCenter = !normalizedButton.command.trim()
            || (isLegacyMageMissileDefault && missile?.isLearned === false);
        const centerCommand = shouldChooseLearnedCenter
            ? paletteCommands.find(item => item.isLearned !== false)?.command || ''
            : normalizedButton.command;
        return fillEmptyWheelCells({ ...normalizedButton, command: centerCommand }, paletteCommands);
    }, [button, isLegacyMageMissileDefault, paletteCommands]);
    const wheelPaletteCommands = useMemo(() => {
        const assigned = new Set([
            wheelButton.command,
            ...Object.values(wheelButton.swipeCommands || {}),
            ...Object.values(wheelButton.longSwipeCommands || {})
        ].map(command => command.trim().toLowerCase()).filter(Boolean));
        return paletteCommands.filter(item => !assigned.has(item.command.trim().toLowerCase()));
    }, [paletteCommands, wheelButton]);
    const [inlineAssignment, setInlineAssignment] = React.useState<{
        direction: import('../../../types').SwipeDirection | 'center' | null;
        setId: string;
        sourceCommand: string;
    } | null>(null);
    const isRebindingGestureRef = useRef(false);
    const [stagedArguments, setStagedArguments] = React.useState<StagedArgumentSelection[]>([null, null]);
    const stagedArgumentsRef = useRef<StagedArgumentSelection[]>([null, null]);
    const [loadingContainer, setLoadingContainer] = React.useState<{ id: string; previousContents: DrawerLine[] | undefined } | null>(null);
    const isStagedTargetMenuRef = useRef(false);
    const onSelectStagedTargetRef = useRef<(value: string, columnIndex: number) => boolean>(() => false);
    const onCommitStagedTargetRef = useRef<() => boolean>(() => false);
    const isWheelReplacementModeRef = useRef(false);
    const onSelectWheelReplacementRef = useRef<((targetValue: string) => string | void) | null>(null);
    const handleSwapRef = useRef<(direction?: SwipeDirection | 'center' | null) => void>(() => undefined);
    const gestureDefaultTargetRef = useRef<(command: string) => string | null>(() => null);
    const gestureDefaultCommandRef = useRef<(command: string) => string | null>(() => null);

    const [renderParams, setRenderParams] = React.useState({
        w: button.style.w,
        h: button.style.h,
        radius: button.style.borderRadius || 8
    });

    const tacticalTargeting = useTacticalTargeting({
        activeTarget: target || (!autoTargetChipDisabled ? automaticTarget : null),
        autoTargetForCommand: command => getAutoRoomTarget(command, roomOccupants, characterName || '', roomZone, groupMembers),
        isMobile,
        openOnHoldWithoutTarget: openDecisionPanelOnHold ?? isMobile,
        setCommandPreview,
        triggerHaptic,
        onTargetMenuOpened: command => {
            const verb = command.trim().split(/\s+/, 1)[0]?.toLowerCase();
            if (verb === 'remove') runButtonCommand('equipment', true, true, false, true);
            if (verb === 'wear' || verb === 'drop') runButtonCommand('inventory', true, true, false, true);
        }
    });
    const toggleTargetLock = useCallback((targetValue: string) => {
        const normalize = (value: string | null) => value?.replace(/[*']/g, '').trim().toLowerCase() || '';
        setTarget(normalize(target) === normalize(targetValue) ? null : targetValue);
        setAutomaticTarget(null);
        tacticalTargeting.clearSelection();
    }, [setAutomaticTarget, setTarget, target, tacticalTargeting.clearSelection]);
    const updateAutomaticTarget = useCallback((targetValue: string) => {
        if (target || autoTargetChipDisabled) return;
        const value = targetValue.trim();
        if (!value || !roomEntityTargets.has(value.toLowerCase())) return;
        setAutomaticTarget(value, automaticTargetRoomKey);
    }, [autoTargetChipDisabled, automaticTargetRoomKey, roomEntityTargets, setAutomaticTarget, target]);

    useEffect(() => {
        if (!tacticalTargeting.isTargetColumnOpen) {
            setIsPanelPinned(false);
            setSwapSource(null);
            swapSourceRef.current = null;
            panelHoverCellRef.current = null;
        }
    }, [tacticalTargeting.isTargetColumnOpen]);

    const handleTacticalButtonClick = (clickedButton: CustomButton, event: React.MouseEvent | React.PointerEvent) => {
        if (onTap && !wheelButton.command.trim()) {
            onTap();
            return;
        }
        handleButtonClick(clickedButton, event);
    };

    const cancelDecisionPanel = React.useCallback(() => {
        isRebindingGestureRef.current = false;
        isWheelReplacementModeRef.current = false;
        onSelectWheelReplacementRef.current = null;
        setInlineAssignment(null);
        setHeldButton(previous => previous?.id === button.id ? null : previous);
        setCommandPreview(null);
        setActiveDir(null);
        setIsCancelling(false);
        setIsPanelPinned(false);
        setSwapSource(null);
        swapSourceRef.current = null;
        setRayParams({ angle: 0, length: 0, opacity: 0, color: 'var(--accent)' });
        wheelReplacementMode?.onCancel?.();
        tacticalTargeting.resetTargeting();
    }, [button.id, setHeldButton, setCommandPreview, setActiveDir, setIsCancelling, setRayParams, tacticalTargeting, wheelReplacementMode]);

    const rebindFromPanel = React.useCallback((direction?: SwipeDirection | 'center' | null) => {
        handleSwapRef.current(direction);
    }, []);
    const movePinnedWheelCell = React.useCallback((source: SwipeDirection | 'center', destination: SwipeDirection | 'center') => {
        if (onMovePinnedCells) {
            const result = onMovePinnedCells(source, destination, wheelButton.command);
            if (result === false) return;
        } else {
            setButtons(previous => previous.map(existing => existing.id === button.id
                ? swapPinnedWheelCells(
                    withVisibleWheelLayout(existing, wheelButton),
                    source,
                    destination
                )
                : existing));
        }
        triggerHaptic(30);
    }, [button.id, onMovePinnedCells, setButtons, triggerHaptic, wheelButton]);
    const assignPinnedCommand = React.useCallback((command: string, actionType: import('../../../types').ActionType, destination: SwipeDirection | 'center', setId?: string) => {
        const normalized = command.trim().toLowerCase();
        const isUnlearned = paletteCommands.some(item => item.command.trim().toLowerCase() === normalized && item.isLearned === false)
            || availableButtons.some(candidate => candidate.command.trim().toLowerCase() === normalized && candidate.isDimmed);
        if (isUnlearned) return;
        if (onAssignPinnedCommand) {
            onAssignPinnedCommand(command, actionType, destination, setId);
        } else {
            setButtons(previous => previous.map(existing => existing.id === button.id
                ? assignPinnedWheelCell(withVisibleWheelLayout(existing, wheelButton), destination, command, actionType, setId || classPaletteSetId || undefined)
                : existing));
        }
        triggerHaptic(30);
    }, [availableButtons, button.id, classPaletteSetId, onAssignPinnedCommand, paletteCommands, setButtons, triggerHaptic]);

    const gestures = useButtonGestures({
        button: wheelButton, isEditMode, handleDragStart, wasDraggingRef, triggerHaptic, setHeldButton, heldButton,
        joystick, target, setCommandPreview, setActiveDir, activeDir, setIsCancelling, isCancelling,
        setPopoverState, executeCommand: runButtonCommand, setActiveSet, handleButtonClick: handleTacticalButtonClick, setButtons, setEditButton,
        setWheelPos, playClickSound, isSoundEnabled, initAudio, setRayParams, isMobile,
        tacticalTargeting,
        gestureDefaultTargetRef,
        gestureDefaultCommandRef,
        isStagedTargetMenuRef,
        onSelectStagedTargetRef,
        onCommitStagedTargetRef,
        isWheelReplacementModeRef,
        isRebindingGestureRef,
        onSelectWheelReplacementRef,
        onCancelPanel: cancelDecisionPanel,
        onRebindPanel: rebindFromPanel,
        isPanelPinned,
        onMovePinnedCell: movePinnedWheelCell,
        onAssignPinnedCommand: assignPinnedCommand,
        panelHoverCellRef,
        swapSourceRef
    });

    const targetCommand = tacticalTargeting.isTargetColumnOpen || heldButton?.id === button.id
        ? gestures.currentCommandRef?.current ?? wheelButton.command
        : wheelButton.command;
    const targetChipTarget = target || (!autoTargetChipDisabled
        ? automaticTarget || getAutoRoomTarget(targetCommand, roomOccupants, characterName || '', roomZone, groupMembers)
        : null);
    const wheelTargetChipTarget = target || (!autoTargetChipDisabled
        ? automaticTarget || getAutoRoomTarget(wheelButton.command, roomOccupants, characterName || '', roomZone, groupMembers)
        : null);
    const commandKey = (targetCommand || '').trim().toLowerCase().split(/\s+/)[0];
    const targetMenu = useGameButtonTargetSuggestions(
        targetCommand || '',
        characterName || '',
        commandKey ? targetKindByCommand?.[commandKey] : undefined,
        containerContents,
        stagedArguments[1]?.value || null,
        loadingContainer?.id || null
    );
    const requestWhoList = useWhoListRefresh(whoList, runButtonCommand);
    useEffect(() => {
        const needsWhoList = targetMenu.kind === 'who' || targetMenu.kind === 'who-or-blank';
        if (tacticalTargeting.isTargetColumnOpen && needsWhoList) requestWhoList();
    }, [requestWhoList, targetMenu.kind, tacticalTargeting.isTargetColumnOpen]);
    const stagedSuggestionsRef = useRef({
        first: targetMenu.firstArgumentSuggestions,
        second: targetMenu.secondArgumentSuggestions,
    });
    stagedSuggestionsRef.current = {
        first: targetMenu.firstArgumentSuggestions,
        second: targetMenu.secondArgumentSuggestions,
    };
    useEffect(() => {
        if (loadingContainer && containerContents[loadingContainer.id] !== loadingContainer.previousContents) {
            setLoadingContainer(null);
        }
    }, [containerContents, loadingContainer]);
    const displayedSelectedTarget = targetMenu.kind === 'door-direction' ? 'exit' : tacticalTargeting.pendingTarget;
    isStagedTargetMenuRef.current = Boolean(targetMenu.stagedTargetKind && !wheelReplacementMode);
    const canCompleteStagedCommandOnTap = (columnIndex: number): boolean => {
        const args = stagedArguments;
        if (targetMenu.stagedTargetKind === 'look-container') {
            return columnIndex === 0
                ? args[0]?.value !== LOOK_IN_TARGET_VALUE || Boolean(args[1])
                : args[0]?.value === LOOK_IN_TARGET_VALUE;
        }
        if (targetMenu.stagedTargetKind === 'examine-targets') return true;
        const otherArgument = args[columnIndex === 0 ? 1 : 0];
        if (!otherArgument) return false;
        return !(columnIndex === 1 && targetMenu.stagedTargetKind === 'room-object-container');
    };
    const directionPadMode: 'below' | 'side' | 'wheel' | null = targetMenu.kind === 'movement-wheel'
        ? 'wheel'
        : targetMenu.kind !== 'look-containers' && /^(?:look|examine)(?:\s|$)/i.test(targetCommand.trim())
        ? 'below'
        : targetMenu.kind === 'pick' && hasRoomDoor ? 'side'
        : targetMenu.kind === 'door-direction' || tacticalTargeting.pendingTarget?.toLowerCase() === 'exit' ? 'side' : null;
    const effectiveTarget = tacticalTargeting.getEffectiveTarget(targetCommand);
    const targetSuggestions = targetMenu.kind
        ? isOffensiveSingleTargetCommand(targetCommand)
            ? prioritizeTargetSuggestion(
                targetMenu.suggestions || [],
                usesChipPriorityOffensiveTarget(targetCommand)
                    ? targetChipTarget || tacticalTargeting.pendingTarget || effectiveTarget
                    : target || tacticalTargeting.pendingTarget || effectiveTarget
            )
            : targetMenu.suggestions
        : canCommandAcceptTarget(targetCommand) ? [] : [BLANK_TARGET_SUGGESTION];

    gestureDefaultTargetRef.current = command => {
        const commandRoot = command.trim().toLowerCase().split(/\s+/, 1)[0];
        const menuRoot = targetCommand.trim().toLowerCase().split(/\s+/, 1)[0];
        if (!canCommandAcceptTarget(command)) return null;
        if (commandRoot !== menuRoot) return getDefaultCommandTarget(command);
        if (targetMenu.stagedTargetKind || targetMenu.kind === 'movement-wheel' || targetMenu.showsShopPanel) return null;

        const suggestions = targetSuggestions || [];
        const isAvailable = (value: string | null | undefined) => Boolean(value
            && suggestions.some(suggestion => isTargetSuggestionMatch(suggestion, value)));
        const requestedDefault = targetMenu.defaultTarget || getDefaultCommandTarget(command);
        if (isAvailable(requestedDefault)) return requestedDefault;
        const firstPriorityTarget = suggestions.find(suggestion => suggestion.value !== BLANK_TARGET_VALUE);
        const blankTarget = suggestions.find(suggestion => suggestion.value === BLANK_TARGET_VALUE);
        return firstPriorityTarget?.value || blankTarget?.value || requestedDefault || null;
    };

    gestureDefaultCommandRef.current = command => {
        const commandRoot = command.trim().toLowerCase().split(/\s+/, 1)[0];
        const menuRoot = targetCommand.trim().toLowerCase().split(/\s+/, 1)[0];
        if (commandRoot !== menuRoot || !targetMenu.stagedTargetKind) return null;
        const kind = targetMenu.stagedTargetKind;
        const args = getDefaultStagedArguments(
            kind,
            lastSocialCommandByButton.get(button.id),
            targetMenu.firstArgumentSuggestions,
            targetMenu.secondArgumentSuggestions
        );
        const first = args[0]?.value;
        const second = args[1]?.value;
        if (!first) return null;
        if (kind === 'room-object-container' && second === '__room__') {
            return `${command.trim()} ${first}`.trim();
        }
        if (kind === 'inventory-container' || kind === 'inventory-recipient') {
            if (!second) return null;
            const secondPart = second === BLANK_TARGET_VALUE || second === '__social_no_target__' || second === '__room__'
                ? ''
                : ` ${second}`;
            return `${command.trim()} ${first}${secondPart}`.trim();
        }
        if (kind === 'social') {
            const secondPart = second === BLANK_TARGET_VALUE || second === '__social_no_target__' || second === '__room__'
                ? ''
                : second ? ` ${second}` : '';
            return `${first}${secondPart}`.trim();
        }
        return null;
    };

    useEffect(() => {
        if (!tacticalTargeting.isTargetColumnOpen || targetMenu.stagedTargetKind || targetMenu.kind === 'movement-wheel') return;
        if (targetMenu.showsShopPanel) return;
        const suggestions = targetSuggestions || [];
        const isAvailable = (value: string | null | undefined) => Boolean(value
            && suggestions.some(suggestion => isTargetSuggestionMatch(suggestion, value)));
        if (tacticalTargeting.hasManuallySelectedTarget && isAvailable(tacticalTargeting.pendingTarget)) return;

        const requestedDefault = targetMenu.defaultTarget;
        const firstPriorityTarget = suggestions.find(suggestion => suggestion.value !== BLANK_TARGET_VALUE);
        const blankTarget = suggestions.find(suggestion => suggestion.value === BLANK_TARGET_VALUE);
        const defaultTarget = isAvailable(requestedDefault)
            ? requestedDefault
            : firstPriorityTarget?.value || blankTarget?.value || null;
        tacticalTargeting.handleSelectTarget(defaultTarget, targetCommand, false, false);
    }, [
        targetCommand,
        targetMenu.kind,
        targetMenu.stagedTargetKind,
        targetMenu.showsShopPanel,
        targetSuggestions,
        tacticalTargeting.handleSelectTarget,
        tacticalTargeting.hasManuallySelectedTarget,
        tacticalTargeting.isTargetColumnOpen,
        tacticalTargeting.pendingTarget
    ]);
    const doorSpellUnavailable = isDoorPresenceSpellCommand(wheelButton.command) && !hasRoomDoor;
    const isTargetReady = Boolean(!doorSpellUnavailable && effectiveTarget && targetSuggestions?.some(suggestion => isTargetSuggestionMatch(suggestion, effectiveTarget)));
    const normalizeTarget = (value: string | null | undefined) => value?.replace(/[*']/g, '').trim().toLowerCase() || '';
    const isAutoTargetReady = Boolean(!autoTargetChipDisabled && isTargetReady && !target && wheelTargetChipTarget && effectiveTarget
        && normalizeTarget(wheelTargetChipTarget) === normalizeTarget(effectiveTarget));
    const centerCommandIsAssist = /^assist(?:\s|$)/i.test(wheelButton.command.trim());
    const centerDefaultTarget = centerCommandIsAssist
        ? getDefaultCommandTarget(wheelButton.command)
        : target
            || getDefaultCommandTarget(wheelButton.command)
            || (!autoTargetChipDisabled ? automaticTarget : null)
            || getAutoRoomTarget(wheelButton.command, roomOccupants, characterName || '', roomZone, groupMembers)
            || tacticalTargeting.getEffectiveTarget(wheelButton.command, true);
    const centerTargetMeta = targetMenu.suggestions?.find(suggestion => isTargetSuggestionMatch(suggestion, centerDefaultTarget || ''))?.meta;
    const isCenterTargetAlly = Boolean(centerDefaultTarget && (
        normalizeTarget(centerDefaultTarget) === 'self'
        || normalizeTarget(centerDefaultTarget).endsWith('.ally')
        || centerTargetMeta === 'self'
        || centerTargetMeta === 'ally'
        || centerTargetMeta === 'allies'
    ));
    const hasCenterTarget = Boolean(centerDefaultTarget && centerDefaultTarget !== BLANK_TARGET_VALUE);
    const isCenterOffensive = Boolean(hasCenterTarget && isOffensiveSingleTargetCommand(wheelButton.command));
    const entityColors: EntityColorMap = { object: objectColor, player: playerColor, npc: npcColor, enemy: enemyColor, neutral: neutralColor };
    const centerCommandIconColor = button.id === 'tactical-doors'
        ? '#f97316'
        : getSwipeCommandTextColor(wheelButton.command);
    const centerTargetGlowColor = centerCommandIconColor
        || (SHOW_ALLY_COMMAND_TARGET_GLOW && isCenterTargetAlly
            ? getTargetClassificationColor('ally', inlineCategories, entityColors, theme) || '#61c290'
            : isCenterOffensive ? '#f87171' : null);
    const showTargetReadyGlow = isTargetReady && (!isCenterTargetAlly || SHOW_ALLY_COMMAND_TARGET_GLOW);
    const stagedColumns = targetMenu.stagedTargetKind && !wheelReplacementMode ? [
        {
            title: targetMenu.stagedTargetKind === 'social' ? 'Social'
                : targetMenu.stagedTargetKind === 'room-object-container' ? 'Item'
                : targetMenu.stagedTargetKind === 'look-container' ? 'Target'
                : targetMenu.stagedTargetKind === 'examine-targets' ? 'Characters' : 'Object',
            suggestions: targetMenu.firstArgumentSuggestions,
            selectedTarget: stagedArguments[0]?.value || null,
            selectedKey: stagedArguments[0]?.key || null,
            showSendIndicator: canCompleteStagedCommandOnTap(0),
            emptyText: loadingContainer && stagedArguments[1]?.value !== '__room__'
                ? 'Looking inside container…'
                : targetMenu.stagedTargetKind === 'room-object-container' && stagedArguments[1]?.value !== '__room__'
                    ? 'Nothing inside'
                    : 'No first argument available'
        },
        {
            title: targetMenu.stagedTargetKind === 'social' ? 'Room Target' : targetMenu.stagedTargetKind === 'inventory-recipient' ? 'Recipient'
                : targetMenu.stagedTargetKind === 'inventory-container' || targetMenu.stagedTargetKind === 'look-container' ? 'Container'
                : targetMenu.stagedTargetKind === 'examine-targets' ? 'Room Objects' : 'Get From',
            suggestions: targetMenu.secondArgumentSuggestions,
            selectedTarget: stagedArguments[1]?.value || null,
            selectedKey: stagedArguments[1]?.key || null,
            showSendIndicator: canCompleteStagedCommandOnTap(1),
            emptyText: 'No second argument available'
        }
    ] : undefined;
    useEffect(() => {
        const stagedSuggestions = stagedSuggestionsRef.current;
        const next = getDefaultStagedArguments(
            targetMenu.stagedTargetKind || null,
            lastSocialCommandByButton.get(button.id),
            stagedSuggestions.first,
            stagedSuggestions.second
        );
        stagedArgumentsRef.current = next;
        setStagedArguments(next);
        setLoadingContainer(null);
    }, [button.id, targetCommand, targetMenu.stagedTargetKind, tacticalTargeting.isTargetColumnOpen]);
    useEffect(() => {
        if (!tacticalTargeting.isTargetColumnOpen) {
            setInlineAssignment(null);
        }
    }, [tacticalTargeting.isTargetColumnOpen]);
    const resetStagedArguments = () => {
        const next = getDefaultStagedArguments(
            targetMenu.stagedTargetKind || null,
            lastSocialCommandByButton.get(button.id),
            targetMenu.firstArgumentSuggestions,
            targetMenu.secondArgumentSuggestions
        );
        stagedArgumentsRef.current = next;
        setStagedArguments(next);
        setLoadingContainer(null);
        tacticalTargeting.clearSelection();
        tacticalTargeting.releaseTargetMenu();
    };
    const buildStagedCommand = (args: Array<{ value: string; key: string } | null>, includeSecond: boolean) => {
        const kind = targetMenu.stagedTargetKind;
        const first = args[0]?.value;
        if (!kind) return '';
        if (kind === 'examine-targets') {
            const target = args[0]?.value || args[1]?.value;
            return target ? `examine ${target}` : '';
        }
        if (!first) return '';
        const second = includeSecond ? args[1]?.value : undefined;
        if (kind === 'look-container') {
            if (first === LOOK_IN_TARGET_VALUE) return second ? `look in ${second}` : '';
            return first === BLANK_TARGET_VALUE ? 'look' : `look ${first}`;
        }
        const secondPart = second === '__blank_target__' || second === '__social_no_target__' || second === '__room__'
            ? ''
            : second ? ` ${second}` : '';
        return kind === 'social'
            ? `${first}${secondPart}`.trim()
            : `${targetCommand.trim()} ${first}${secondPart}`.trim();
    };
    onSelectStagedTargetRef.current = (value, columnIndex) => {
        const suggestion = (columnIndex === 0 ? targetMenu.firstArgumentSuggestions : targetMenu.secondArgumentSuggestions)
            .find(candidate => candidate.value === value);
        if (!suggestion || !targetMenu.stagedTargetKind) return false;
        const shouldRefreshLookContainers = targetMenu.stagedTargetKind === 'look-container'
            && columnIndex === 0
            && value === LOOK_IN_TARGET_VALUE
            && stagedArgumentsRef.current[0]?.value !== LOOK_IN_TARGET_VALUE;
        const next = [...stagedArgumentsRef.current];
        if (columnIndex === 1 && targetMenu.stagedTargetKind === 'room-object-container') {
            if (next[1]?.value !== value) {
                next[0] = value === '__room__' ? { value: 'all', key: 'all-argument' } : null;
            }
            setLoadingContainer(null);
            if (value !== '__room__' && suggestion.containerId && suggestion.containerCommand) {
                setLoadingContainer({ id: suggestion.containerId, previousContents: containerContents[suggestion.containerId] });
                requestContainerContents?.(suggestion);
            }
        }
        if (targetMenu.stagedTargetKind === 'examine-targets') next[columnIndex === 0 ? 1 : 0] = null;
        next[columnIndex] = { value, key: suggestion.key };
        stagedArgumentsRef.current = next;
        setStagedArguments(next);
        if (targetMenu.stagedTargetKind === 'look-container') {
            if (shouldRefreshLookContainers) {
                executeCommand('inventory', true, true, false, true);
                executeCommand('equipment', true, true, false, true);
            }
            const isInSelection = next[0]?.value === LOOK_IN_TARGET_VALUE;
            const hasCompleteLook = Boolean(next[0] && (!isInSelection || next[1]));
            if (hasCompleteLook && tacticalTargeting.fireOnTargetTap) {
                const command = buildStagedCommand(next, isInSelection);
                if (command) runButtonCommand(command, false, false);
                resetStagedArguments();
                return false;
            }
            return isInSelection ? !next[1] : columnIndex === 1;
        }
        if (targetMenu.stagedTargetKind === 'examine-targets' && tacticalTargeting.fireOnTargetTap) {
            const command = buildStagedCommand(next, true);
            if (command) runButtonCommand(command, false, false);
            resetStagedArguments();
            return false;
        }
        const hasBothArguments = Boolean(next[0] && next[1]);
        const isReady = hasBothArguments;
        if (isReady && tacticalTargeting.fireOnTargetTap) {
            const command = buildStagedCommand(next, hasBothArguments);
            if (command) runButtonCommand(command, false, false);
            resetStagedArguments();
        }
        return false;
    };
    onCommitStagedTargetRef.current = () => {
        if (tacticalTargeting.fireOnTargetTap) return false;
        const args = stagedArgumentsRef.current;
        if ((targetMenu.stagedTargetKind === 'look-container' || targetMenu.stagedTargetKind === 'examine-targets')
            && tacticalTargeting.pendingDirection) {
            const command = tacticalTargeting.resolveCommandWithTarget(targetCommand);
            if (!command) return false;
            runButtonCommand(command, false, false);
            resetStagedArguments();
            return true;
        }
        if (targetMenu.stagedTargetKind === 'look-container' && args[0]?.value !== LOOK_IN_TARGET_VALUE) {
            const command = buildStagedCommand(args, false);
            if (!command) return false;
            runButtonCommand(command, false, false);
            resetStagedArguments();
            return true;
        }
        if (targetMenu.stagedTargetKind === 'examine-targets') {
            const command = buildStagedCommand(args, true);
            if (!command) return false;
            runButtonCommand(command, false, false);
            resetStagedArguments();
            return true;
        }
        const hasBothArguments = Boolean(args[0] && args[1]);
        if (!hasBothArguments) return false;
        const command = buildStagedCommand(args, hasBothArguments);
        if (!command) return false;
        runButtonCommand(command, false, false);
        resetStagedArguments();
        return true;
    };
    const chooseArgumentChipTarget = useCallback((value: string, columnIndex: number) => {
        if (targetMenu.stagedTargetKind) {
            const suggestions = columnIndex === 0
                ? targetMenu.firstArgumentSuggestions
                : targetMenu.secondArgumentSuggestions;
            const suggestion = suggestions.find(candidate => candidate.value === value);
            if (!suggestion) return;
            if (columnIndex === 1 && suggestion.meta !== 'social') updateAutomaticTarget(value);
            onSelectStagedTargetRef.current(value, columnIndex);
            return;
        }

        const suggestion = targetMenu.suggestions?.find(candidate => candidate.value === value);
        if (!suggestion) return;
        if (value.toLowerCase() !== 'exit') updateAutomaticTarget(value);
        tacticalTargeting.handleSelectTarget(value, targetCommand);
        if (tacticalTargeting.fireOnTargetTap && value.toLowerCase() !== 'exit') {
            runButtonCommand(tacticalTargeting.resolveCommandWithTarget(targetCommand), false, false);
            tacticalTargeting.clearSelection();
        }
    }, [runButtonCommand, targetCommand, targetMenu.firstArgumentSuggestions, targetMenu.secondArgumentSuggestions,
        targetMenu.stagedTargetKind, targetMenu.suggestions, tacticalTargeting, updateAutomaticTarget]);
    const tacticalArgumentChips = useMemo<TacticalArgumentChip[]>(() => {
        const makeChip = (id: string, title: string, suggestions: CommandTargetSuggestion[], selectedValue: string | null) => {
            const selectedSuggestion = suggestions.find(suggestion => isTargetSuggestionMatch(suggestion, selectedValue));
            return {
                id,
                title,
                displayLabel: (selectedSuggestion || suggestions[0])?.label || 'No option',
                selectedValue,
                suggestions,
                onChoose: (value: string) => chooseArgumentChipTarget(value, id === 'second' ? 1 : 0)
            };
        };
        if (!tacticalTargeting.isTargetColumnOpen || wheelReplacementMode) return [];
        if (targetMenu.stagedTargetKind) {
            const firstTitle = stagedColumns?.[0]?.title || 'Target 1';
            const secondTitle = stagedColumns?.[1]?.title || 'Target 2';
            return [
                makeChip('first', firstTitle, targetMenu.firstArgumentSuggestions, stagedArguments[0]?.value || null),
                makeChip('second', secondTitle, targetMenu.secondArgumentSuggestions, stagedArguments[1]?.value || null)
            ];
        }
        const suggestions = targetMenu.suggestions || [];
        if (!targetMenu.kind || !suggestions.length) return [];
        return [makeChip('first', targetMenu.title, suggestions, displayedSelectedTarget || targetMenu.defaultTarget)];
    }, [chooseArgumentChipTarget, displayedSelectedTarget, stagedArguments, stagedColumns, targetMenu.defaultTarget,
        targetMenu.firstArgumentSuggestions, targetMenu.kind, targetMenu.secondArgumentSuggestions, targetMenu.stagedTargetKind,
        targetMenu.suggestions, targetMenu.title, tacticalTargeting.isTargetColumnOpen, wheelReplacementMode]);
    const commandBeforeArguments = useMemo(() => {
        const placeholderIndex = targetCommand.search(/%n/);
        let command = (placeholderIndex >= 0 ? targetCommand.slice(0, placeholderIndex) : targetCommand).trim();
        if (placeholderIndex >= 0) return command;

        const argumentValues = targetMenu.stagedTargetKind
            ? [stagedArguments[1]?.value, stagedArguments[0]?.value]
            : [displayedSelectedTarget || targetMenu.defaultTarget, targetMenu.suggestions?.[0]?.value];
        for (const value of argumentValues) {
            const argument = value?.trim();
            if (!argument || argument.startsWith('__')) continue;
            const suffix = ` ${argument}`;
            if (command.toLowerCase().endsWith(suffix.toLowerCase())) {
                command = command.slice(0, -suffix.length).trim();
            }
        }
        return command;
    }, [displayedSelectedTarget, stagedArguments, targetCommand, targetMenu.defaultTarget,
        targetMenu.stagedTargetKind, targetMenu.suggestions]);
    useEffect(() => {
        if (!tacticalTargeting.isTargetColumnOpen || !tacticalArgumentChips.length || !commandBeforeArguments) {
            clearTacticalArguments(tacticalArgumentOwnerId);
            return;
        }
        setTacticalArguments(tacticalArgumentOwnerId, commandBeforeArguments, tacticalArgumentChips);
        return () => clearTacticalArguments(tacticalArgumentOwnerId);
    }, [clearTacticalArguments, commandBeforeArguments, setTacticalArguments, tacticalArgumentChips,
        tacticalArgumentOwnerId, tacticalTargeting.isTargetColumnOpen]);
    const inlineAssignmentButtons = inlineAssignment
        ? availableButtons.filter(candidate => candidate.setId.toLowerCase() === inlineAssignment.setId.toLowerCase()
            && !candidate.isDimmed
            && candidate.command.trim().toLowerCase() !== inlineAssignment.sourceCommand.toLowerCase())
        : [];
    const assignmentMode: WheelReplacementMode | null = wheelReplacementMode || (inlineAssignment ? {
        title: inlineAssignment.direction === null
            ? 'SELECT A WHEEL SLOT'
            : `CHOOSE ${(inlineAssignment.setId.replace(/spelllist$/i, ' spells').replace(/skilllist$/i, ' skills').replace(/[-_]/g, ' ')).toUpperCase()}`,
        selectedDirection: inlineAssignment.direction,
        awaitingSlotSelection: inlineAssignment.direction === null,
        executeOnSelect: true,
        suggestions: inlineAssignmentButtons.map((candidate): CommandTargetSuggestion => ({
            key: candidate.id,
            label: candidate.label,
            value: candidate.command,
            meta: 'command'
        })),
        onSelect: value => {
            const selected = inlineAssignmentButtons.find(candidate => candidate.command === value);
            if (selected && inlineAssignment?.direction) {
                setButtons(previous => previous.map(existing => {
                    if (existing.id !== button.id) return existing;
                    if (inlineAssignment.direction === 'center') {
                        return {
                            ...existing,
                            command: selected.command,
                            actionType: selected.actionType || 'command',
                            longCommand: selected.command,
                            longActionType: selected.actionType || 'command',
                            rebindCenterSetId: inlineAssignment.setId
                        };
                    }

                    return {
                        ...existing,
                        swipeCommands: { ...(existing.swipeCommands || {}), [inlineAssignment.direction]: selected.command },
                        swipeActionTypes: { ...(existing.swipeActionTypes || {}), [inlineAssignment.direction]: selected.actionType || 'command' },
                        longSwipeCommands: { ...(existing.longSwipeCommands || {}), [inlineAssignment.direction]: selected.command },
                        longSwipeActionTypes: { ...(existing.longSwipeActionTypes || {}), [inlineAssignment.direction]: selected.actionType || 'command' },
                        rebindSets: { ...(existing.rebindSets || {}), [inlineAssignment.direction]: inlineAssignment.setId }
                    };
                }));
                isWheelReplacementModeRef.current = false;
                setInlineAssignment(null);
                return selected.command;
            }
            return;
        },
        onCancel: () => {
            isWheelReplacementModeRef.current = false;
            setInlineAssignment(null);
        }
    } : null);
    isWheelReplacementModeRef.current = Boolean(assignmentMode);
    onSelectWheelReplacementRef.current = assignmentMode?.onSelect
        ? value => {
            const replacementCommand = assignmentMode.onSelect(value);
            return replacementCommand;
        }
        : null;
    const needsCircularVitals = (hpRatio !== undefined || manaRatio !== undefined || moveRatio !== undefined) && variant === 'default';
    const needsDiamondVitals = (hpRatio !== undefined || manaRatio !== undefined || moveRatio !== undefined) && variant === 'diamond';

    useEffect(() => {
        if (tacticalTargeting.isTargetColumnOpen || tacticalTargeting.isTargetMenuPending) return;
        if (heldButton?.id === button.id && heldButton.dx !== undefined && heldButton.dy !== undefined) {
            const activeGestureCommand = gestures.currentCommandRef.current.trim().toLowerCase();
            const baseCommand = wheelButton.command.trim().toLowerCase();
            // Category wheel hover owns its preview after leaving the center action.
            if (button.id.startsWith('deck-category-') && activeGestureCommand && activeGestureCommand !== baseCommand) return;
            const effectiveTarget = tacticalTargeting.getEffectiveTarget(heldButton.baseCommand || wheelButton.command);
            const preview = getButtonCommand(wheelButton, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, effectiveTarget, joystick.isActive, heldButton.commandPrefixes);
            setCommandPreview(preview?.cmd || null);
        }
    }, [joystick.isActive, heldButton?.id, button.id, joystick.currentDir, joystick.isTargetModifierActive, target, tacticalTargeting.isTargetColumnOpen, tacticalTargeting.isTargetMenuPending, tacticalTargeting.pendingTarget, setCommandPreview, wheelButton, gestures.currentCommandRef]);

    const handleSwap = React.useCallback((displayedCell?: SwipeDirection | 'center' | null) => {
        const currentCommand = (gestures.currentCommandRef.current || '').trim().toLowerCase();
        const centerCommand = (wheelButton.command || '').trim().toLowerCase();
        const mappedDirection = Object.entries({ ...(wheelButton.longSwipeCommands || {}), ...(wheelButton.swipeCommands || {}) })
            .find(([, command]) => {
                const mappedCommand = command?.trim().toLowerCase() || '';
                return mappedCommand && (currentCommand === mappedCommand || currentCommand.startsWith(`${mappedCommand} `));
            })?.[0] as import('../../../types').SwipeDirection | undefined;
        const isClassPickerSet = ['magespelllist', 'clericspelllist', 'rangerskilllist', 'warriorskilllist', 'thiefskilllist'].includes(button.setId.toLowerCase());
        const canRebindCenter = Boolean(button.rebindCenterSetId?.trim() || button.longCommand?.trim())
            || button.actionType === 'menu'
            || button.actionType === 'assign'
            || isClassPickerSet;
        const selectedCell = displayedCell
            ?? activeDir
            ?? (centerCommand && (currentCommand === centerCommand || currentCommand.startsWith(`${centerCommand} `))
                ? 'center'
                : mappedDirection)
            ?? (onSwapWheel || canRebindCenter ? 'center' : null);
        if (!selectedCell) return;

        const beginPicker = (setId: string) => {
            const hasAlternatives = availableButtons.some(candidate =>
                candidate.setId.toLowerCase() === setId.toLowerCase()
                && !candidate.isDimmed
                && candidate.command.trim().toLowerCase() !== currentCommand
            );
            if (!setId.trim() || !hasAlternatives) return false;
            triggerHaptic(40);
            tacticalTargeting.clearSelection();
            tacticalTargeting.releaseTargetMenu();
            isWheelReplacementModeRef.current = true;
            isRebindingGestureRef.current = true;
            setHeldButton(null);
            setInlineAssignment({ direction: null, setId, sourceCommand: currentCommand });
            return true;
        };

        if (onSwapWheel) {
            triggerHaptic(40);
            tacticalTargeting.clearSelection();
            tacticalTargeting.releaseTargetMenu();
            isWheelReplacementModeRef.current = true;
            isRebindingGestureRef.current = true;
            setHeldButton(null);
            onSwapWheel(selectedCell, wheelButton.command);
            return;
        }

        const isCenter = selectedCell === 'center';
        const cellCommand = isCenter
            ? (wheelButton.longCommand || wheelButton.command)
            : (wheelButton.longSwipeCommands?.[selectedCell] || wheelButton.swipeCommands?.[selectedCell] || currentCommand);
        const actionType = isCenter
            ? (button.longActionType || button.actionType || 'command')
            : (wheelButton.longSwipeActionTypes?.[selectedCell] || wheelButton.swipeActionTypes?.[selectedCell] || 'command');
        const explicitSetId = isCenter
            ? button.rebindCenterSetId || (['menu', 'assign'].includes(actionType) ? cellCommand : '')
            : button.rebindSets?.[selectedCell] || (['menu', 'assign'].includes(actionType) ? cellCommand : '');
        const classPickerSetId = getClassPickerSetId(cellCommand, button.setId);
        const rebindSetId = explicitSetId || (classPickerSetId && availableButtons.some(candidate =>
            candidate.setId.toLowerCase() === classPickerSetId.toLowerCase()
            && candidate.command.trim().toLowerCase() !== currentCommand
        ) ? classPickerSetId : '');

        if (selectedCell === 'center') {
            beginPicker(rebindSetId);
            return;
        }
        beginPicker(rebindSetId);
    }, [activeDir, button, wheelButton, availableButtons, triggerHaptic, setHeldButton, tacticalTargeting,
        setInlineAssignment, onSwapWheel, gestures.currentCommandRef, isWheelReplacementModeRef, isRebindingGestureRef]);
    handleSwapRef.current = handleSwap;

    const handlePanelCellSwap = React.useCallback(() => {
        const hoveredCell = panelHoverCellRef.current;
        const selectedSource = swapSourceRef.current;
        if (!hoveredCell) return;

        if (!selectedSource) {
            swapSourceRef.current = { ...hoveredCell };
            setSwapSource({ ...hoveredCell });
            triggerHaptic(25);
            return;
        }

        const wheelCommand = (direction: SwipeDirection | 'center') => direction === 'center'
            ? wheelButton.command
            : wheelButton.swipeCommands?.[direction] || wheelButton.longSwipeCommands?.[direction] || '';
        let assignedCommand = '';
        if (selectedSource.kind === 'wheel' && hoveredCell.kind === 'wheel') {
            assignedCommand = wheelCommand(selectedSource.direction);
            if (selectedSource.direction !== hoveredCell.direction) {
                movePinnedWheelCell(selectedSource.direction, hoveredCell.direction);
            }
        } else if (selectedSource.kind === 'palette' && hoveredCell.kind === 'wheel') {
            assignedCommand = selectedSource.command;
            assignPinnedCommand(selectedSource.command, selectedSource.actionType, hoveredCell.direction, selectedSource.setId);
        } else if (selectedSource.kind === 'wheel' && hoveredCell.kind === 'palette') {
            assignedCommand = hoveredCell.command;
            assignPinnedCommand(hoveredCell.command, hoveredCell.actionType, selectedSource.direction, hoveredCell.setId);
        } else {
            return;
        }

        if (assignedCommand) {
            gestures.currentCommandRef.current = assignedCommand;
            tacticalTargeting.clearSelection();
            setCommandPreview(assignedCommand);
        }

        swapSourceRef.current = null;
        setSwapSource(null);
    }, [assignPinnedCommand, button, gestures.currentCommandRef, movePinnedWheelCell, panelHoverCellRef, setCommandPreview, tacticalTargeting, triggerHaptic]);

    React.useEffect(() => {
        if (buttonRef.current && needsCircularVitals) {
            const el = buttonRef.current;
            const update = () => {
                const styles = window.getComputedStyle(el);
                setRenderParams({
                    w: el.offsetWidth,
                    h: el.offsetHeight,
                    radius: parseFloat(styles.borderRadius) || 0
                });
            };
            const observer = new ResizeObserver(update);
            observer.observe(el);
            return () => observer.disconnect();
        }
    }, [needsCircularVitals, button.isVisible]);

    if (button.display === 'inline') return null;
    if (!button.isVisible && !isEditMode && button.setId !== 'Tactical') return null;

    const isFloating = button.display === 'floating';
    const isBorderlessActionButton = button.setId.toLowerCase() === 'tactical'
        || button.id.startsWith('tactical-')
        || className.includes('deck-category-button');
    const cardinalSwipeCommands = button.setId.toLowerCase() === 'tactical' || button.id.startsWith('tactical-')
        ? [
            { direction: 'north', command: (wheelButton.swipeCommands?.up || wheelButton.longSwipeCommands?.up || '').trim() },
            { direction: 'east', command: (wheelButton.swipeCommands?.right || wheelButton.longSwipeCommands?.right || '').trim() },
            { direction: 'south', command: (wheelButton.swipeCommands?.down || wheelButton.longSwipeCommands?.down || '').trim() },
            { direction: 'west', command: (wheelButton.swipeCommands?.left || wheelButton.longSwipeCommands?.left || '').trim() }
        ].filter(item => Boolean(item.command) && getCommandLearnedState(item.command) !== false)
        : [];

    const getGlowColorInternal = () => (button.trigger?.enabled && button.isVisible) ? (button.style.borderColor || button.style.backgroundColor || 'var(--accent)') : 'transparent';
    const getRgb = (colorVal: string | undefined, defaultVal: string) => {
        if (!colorVal) return defaultVal;
        const hex = colorVal.replace('#', '');
        if (hex.length < 6) return defaultVal;
        const r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
        return !isNaN(r) ? `${r}, ${g}, ${b}` : defaultVal;
    };

    // --- UI Section ---
    return (
        <div
            ref={buttonRef}
            className={`custom-btn ${isFloating ? 'floating' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''} ${showTargetReadyGlow ? 'target-ready' : ''} ${isAutoTargetReady ? 'auto-target-ready' : ''} ${SHOW_ALLY_COMMAND_TARGET_GLOW && isCenterTargetAlly ? 'tactical-defense-ready' : ''} ${isCenterOffensive ? 'tactical-offense-ready' : ''} ${isTacticalClassUnlearned ? 'tactical-class-unlearned' : ''} ${button.trigger?.enabled && button.isVisible ? 'triggered' : ''} ${activeDir ? 'is-swiping' : ''} ${cardinalSwipeCommands.length ? 'has-cardinal-command-dashes' : ''} ${variant === 'diamond' ? 'is-diamond' : ''} ${className}`}
            data-id={button.id}
            data-variant={variant}
            role="button"
            aria-label={ariaLabel || button.label}
            tabIndex={0}
            style={{
                left: useDefaultPositioning ? `${button.style.x}%` : undefined, top: useDefaultPositioning ? `${button.style.y}%` : undefined,
                width: useDefaultPositioning ? `${button.style.w}px` : undefined, height: useDefaultPositioning ? `${button.style.h}px` : undefined,
                backgroundColor: button.style.transparent ? 'transparent' : (button.style.backgroundColor || 'rgba(255,255,255,0.05)'),
                borderColor: isBorderlessActionButton ? 'transparent' : (button.style.borderColor || 'rgba(255,255,255,0.2)'),
                borderWidth: isBorderlessActionButton ? '0px' : `${button.style.borderWidth !== undefined ? button.style.borderWidth : 1}px`,
                borderStyle: isBorderlessActionButton ? 'none' : 'solid',
                '--btn-theme-rgb': getRgb(button.style.borderColor, '255, 255, 255'),
                color: button.style.color || '#fff',
                fontSize: `${button.style.fontSize || 0.8}rem`,
                borderRadius: variant === 'diamond' ? '0' : `${button.style.borderRadius || 8}px`,
                '--set-accent': button.style.borderColor || 'var(--accent)',
                '--set-accent-rgb': getRgb(button.style.borderColor, '255, 255, 255'),
                '--target-glow-color': centerTargetGlowColor || undefined,
                '--ray-angle': `${rayParams.angle}deg`,
                '--ray-length': `${rayParams.length}px`,
                '--ray-opacity': rayParams.opacity,
                '--ray-color': rayParams.color,
                opacity: (button.isVisible || isEditMode || button.setId === 'Tactical') ? (button.isDimmed ? 0.35 : isTacticalClassUnlearned ? 0.45 : 1) : 0,
                pointerEvents: (button.isVisible || isEditMode || button.setId === 'Tactical') ? (button.isDimmed && !isEditMode ? 'none' : 'auto') : 'none',
                boxShadow: button.style.transparent ? 'none' : ((button.trigger?.enabled && button.isVisible) ? `0 0 20px ${getGlowColorInternal()}` : 'none'),
                backdropFilter: button.style.transparent ? 'none' : undefined,
                WebkitBackdropFilter: button.style.transparent ? 'none' : undefined,
                zIndex: activeDir ? 60000 : (isSelected ? 1001 : (isFloating ? 1000 : 100)),
                overflow: 'visible'
            } as any}
            {...gestures}
        >
            {needsDiamondVitals && (
                <div className="diamond-vitals">
                    {hpRatio !== undefined && <div className="vitals-bar hp" style={{ height: `${hpRatio * 100}%` }} />}
                    {manaRatio !== undefined && <div className="vitals-bar mana" style={{ height: `${manaRatio * 100}%` }} />}
                    {moveRatio !== undefined && <div className="vitals-bar move" style={{ height: `${moveRatio * 100}%` }} />}
                </div>
            )}
            {needsCircularVitals && <CircularVitals hpRatio={hpRatio} manaRatio={manaRatio} moveRatio={moveRatio} w={renderParams.w} h={renderParams.h} borderRadius={renderParams.radius} isOuter={true} />}
            <TacticalCommandPanel
                button={wheelButton} activeDir={activeDir} isCancelling={isCancelling}
                swapSource={swapSource} onSwapCells={handlePanelCellSwap}
                isPinned={isPanelPinned} onClose={cancelDecisionPanel}
                paletteCommands={wheelPaletteCommands}
                getCommandLearnedState={getCommandLearnedState}
                buttonRect={buttonRef.current?.getBoundingClientRect()} rayParams={rayParams}
                isMobile={isMobile}
                isTargetMenuOpen={tacticalTargeting.isTargetColumnOpen}
                isTargetMenuHeld={tacticalTargeting.isTargetMenuHeld}
                command={targetCommand} currentCommandRef={gestures.currentCommandRef}
                activeTarget={/^assist(?:\s|$)/i.test(targetCommand.trim()) ? null : target} targetChipTarget={wheelTargetChipTarget} selectedTarget={displayedSelectedTarget}
                selectedDirection={tacticalTargeting.pendingDirection}
                directionPadMode={directionPadMode} suggestions={targetSuggestions}
                title={targetMenu.showsStatusPanel || targetMenu.kind || targetMenu.title !== 'TARGETS' ? targetMenu.title : 'NO TARGET REQUIRED'} characterName={characterName || ''}
                customContent={targetMenu.showsPracticePanel
                    ? <RightActionPanel skillsOnly embedded />
                    : targetMenu.showsStatusPanel ? <ThisIsYouConsole alwaysExpanded />
                    : targetMenu.showsShopPanel ? <ShopTargetMenu
                        executeCommand={runButtonCommand}
                        selectedTarget={displayedSelectedTarget}
                        onSelectTarget={value => {
                            tacticalTargeting.handleSelectTarget(value, targetCommand);
                            if (tacticalTargeting.fireOnTargetTap) {
                                runButtonCommand(tacticalTargeting.resolveCommandWithTarget(targetCommand), false, false);
                                tacticalTargeting.clearSelection();
                            }
                        }}
                    /> : undefined}
                customContentInteractive={Boolean(targetMenu.showsPracticePanel || targetMenu.showsStatusPanel || targetMenu.showsShopPanel)}
                targeting={tacticalTargeting}
                executeCommand={runButtonCommand}
                isChoosingRebindSlot={Boolean(assignmentMode?.awaitingSlotSelection || inlineAssignment?.direction === null)}
                rebindDirection={inlineAssignment?.direction || null}
                onSelectRebindSlot={direction => {
                    if (inlineAssignment?.direction === null) {
                        setInlineAssignment(current => current ? { ...current, direction } : current);
                    } else if (wheelReplacementMode?.awaitingSlotSelection) {
                        onSwapWheel?.(direction);
                    }
                }}
                onPinnedPointerDown={gestures.onPointerDown as React.PointerEventHandler<HTMLElement>}
                onPinnedPointerMove={gestures.onPointerMove as React.PointerEventHandler<HTMLElement>}
                onPinnedPointerUp={gestures.onPointerUp as React.PointerEventHandler<HTMLElement>}
                onPinnedPointerCancel={gestures.onPointerCancel as React.PointerEventHandler<HTMLElement>}
                onPalettePointerDown={gestures.onPointerDown as React.PointerEventHandler<HTMLElement>}
                onPalettePointerMove={gestures.onPointerMove as React.PointerEventHandler<HTMLElement>}
                onPalettePointerUp={gestures.onPointerUp as React.PointerEventHandler<HTMLElement>}
                onPalettePointerCancel={gestures.onPointerCancel as React.PointerEventHandler<HTMLElement>}
                hidePreviewWheel={tacticalTargeting.isTargetMenuPending}
                wheelReplacementMode={assignmentMode}
                columns={stagedColumns}
                onSelectColumnTarget={(value, columnIndex, suggestion) => {
                    if (columnIndex === 1 && suggestion.meta !== 'social') updateAutomaticTarget(value);
                    onSelectStagedTargetRef.current(value, columnIndex);
                }}
                onToggleTargetLock={toggleTargetLock}
                onTargetSelected={updateAutomaticTarget}
            />
            {cardinalSwipeCommands.map(({ direction, command }) => (
                <span
                    key={direction}
                    className={`tactical-command-initial is-${direction}${visualSwipeDirection === CARDINAL_SWIPE_DIRECTIONS[direction] ? ' is-blinking' : ''}`}
                    style={{ color: getSwipeCommandTextColor(command) || '#b0a080' }}
                    aria-hidden="true"
                >{getCommandInitial(command)}</span>
            ))}
            {iconNode
                ? <span className="custom-btn-icon-node">{iconNode}</span>
                : <ButtonLabel button={button} />}

            {isEditMode && button.setId !== 'Tactical' && (
                <div
                    className="resize-handle"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, button.id, 'resize');
                    }}
                />
            )}

            {isEditMode && isGridEnabled && (
                <div className="grid-info" style={{ position: 'absolute', bottom: '-15px', left: 0, fontSize: '10px', opacity: 0.5, whiteSpace: 'nowrap' }}>
                    {Math.round(button.style.x)}%, {Math.round(button.style.y)}%
                </div>
            )}
        </div>
    );
};
