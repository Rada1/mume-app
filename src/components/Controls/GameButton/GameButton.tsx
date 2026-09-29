/** @file GameButton.tsx — Renders a game button and connects gesture, targeting, and tactical controls. */

import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { CustomButton, DrawerLine, PopoverState, ExecuteCommand, SwipeDirection } from '../../../types';

import { getButtonCommand } from '../../../utils/buttonUtils';
import { useGame } from '../../../context/GameContext';
import { useButtonGestures } from './useButtonGestures';
import { ButtonLabel } from './ButtonLabel';
import { CircularVitals } from './CircularVitals';
import { useTacticalTargeting } from './useTacticalTargeting';
import { TacticalCommandPanel } from './TacticalCommandPanel';
import { useGameButtonTargetSuggestions } from './useGameButtonTargetSuggestions';
import { useRoomStore } from '../../../stores/useRoomStore';
import { useAutomaticTargetStore } from '../../../stores/useAutomaticTargetStore';
import { getAutoRoomTarget } from '../../../utils/commandAutoTarget';
import { getClassKeyFromSetId, getSkillPresentation } from '../../../utils/skillPresentation';
import type { PracticeClassKey } from '../../../utils/practiceClassCatalog';
import { getRoomTargetSuggestions, isTargetSuggestionMatch, prioritizeTargetSuggestion, type CommandTargetSuggestion } from '../../../utils/commandSuggestionUtils';
import type { WheelReplacementMode } from './TacticalCommandPanel';
import type { DeckTargetKind } from '../../HUD/useDeckTargeting';
import { assignPinnedWheelCell, swapPinnedWheelCells } from './pinnedWheelAssignments';
import type { TacticalPaletteCommand, TacticalSwapCell } from './TacticalCommandPalette';
import { getLearnedClassPalette } from './tacticalCommandPaletteUtils';
import { BLANK_TARGET_VALUE, canCommandAcceptTarget, isOffensiveSingleTargetCommand } from '../../../utils/commandTargetUtils';

// --- Logic Section ---
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
const lastExecutedCommandByButton = new Map<string, string>();

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
    onSwapWheel?: (activeDir: import('../../../types').SwipeDirection | 'center' | null) => void;
    onMovePinnedCells?: (source: SwipeDirection | 'center', destination: SwipeDirection | 'center') => boolean | void;
    onAssignPinnedCommand?: (command: string, actionType: import('../../../types').ActionType, destination: SwipeDirection | 'center', setId?: string) => void;
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
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [isPanelPinned, setIsPanelPinned] = React.useState(false);
    const [swapSource, setSwapSource] = React.useState<TacticalSwapCell | null>(null);
    const swapSourceRef = useRef<TacticalSwapCell | null>(null);
    const panelHoverCellRef = useRef<TacticalSwapCell | null>(null);
    const [wheelPos, setWheelPos] = React.useState({ x: 0, y: 0 });
    const [rayParams, setRayParams] = React.useState<{ angle: number, length: number, opacity: number, color?: string }>({ angle: 0, length: 0, opacity: 0, color: 'var(--accent)' });
    const buttonRef = useRef<HTMLDivElement>(null);
    const { playClickSound, isSoundEnabled, initAudio, characterName, btn, practice, abilities = {}, setTarget } = useGame();
    const [lastExecutedButtonCommand, setLastExecutedButtonCommand] = useState(() => lastExecutedCommandByButton.get(button.id) || '');
    const repeatCenterEnabled = button.setId === 'Tactical'
        || button.id.startsWith('tactical-')
        || className.includes('deck-category-button');
    const rememberButtonCommand = useCallback((command: string) => {
        const normalizedCommand = command.trim();
        if (repeatCenterEnabled && normalizedCommand) {
            lastExecutedCommandByButton.set(button.id, normalizedCommand);
            setLastExecutedButtonCommand(normalizedCommand);
        }
    }, [button.id, repeatCenterEnabled]);
    const runButtonCommand = useCallback<ExecuteCommand>((command, ...options) => {
        rememberButtonCommand(command);
        executeCommand(command, ...options);
    }, [executeCommand, rememberButtonCommand]);
    const automaticTarget = useAutomaticTargetStore(state => state.target);
    const setAutomaticTarget = useAutomaticTargetStore(state => state.setTarget);
    const roomChars = useRoomStore(state => state.chars);
    const roomItemsById = useRoomStore(state => state.items);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomItems = useMemo(() => Object.values(roomItemsById), [roomItemsById]);
    const roomEntityTargets = useMemo(() => new Set([
        ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName || ''),
        ...getRoomTargetSuggestions([], roomItems, 'objects')
    ].map(suggestion => suggestion.value.trim().toLowerCase())), [characterName, roomItems, roomOccupants]);
    const targetChipTarget = target || automaticTarget || getAutoRoomTarget('hit', roomOccupants, characterName || '');
    const availableButtons = btn.buttons;
    const tacticalClassKey = button.id.match(/^tactical-(ranger|cleric|thief|warrior|mage)$/i)?.[1].toLowerCase();
    const classPaletteSetId = TACTICAL_CLASS_SET_IDS[tacticalClassKey || ''] || getClassPickerSetId(button.command, button.setId);
    const classPaletteKey = classPaletteSetId ? getClassKeyFromSetId(classPaletteSetId) : null;
    const paletteCommands = useMemo<TacticalPaletteCommand[]>(() => {
        const source = commandPalette || (classPaletteSetId && classPaletteKey
            ? getLearnedClassPalette(classPaletteKey, classPaletteSetId, practice.practiceData, abilities, button, availableButtons)
            : []);
        const seen = new Set<string>();
        return source.filter(item => {
            const key = item.command.trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [abilities, availableButtons, button, classPaletteKey, classPaletteSetId, commandPalette, practice.practiceData]);
    const [inlineAssignment, setInlineAssignment] = React.useState<{
        direction: import('../../../types').SwipeDirection | 'center' | null;
        setId: string;
        sourceCommand: string;
    } | null>(null);
    const isRebindingGestureRef = useRef(false);
    const [stagedArguments, setStagedArguments] = React.useState<Array<{ value: string; key: string } | null>>([null, null]);
    const stagedArgumentsRef = useRef<Array<{ value: string; key: string } | null>>([null, null]);
    const [loadingContainer, setLoadingContainer] = React.useState<{ id: string; previousContents: DrawerLine[] | undefined } | null>(null);
    const isStagedTargetMenuRef = useRef(false);
    const onSelectStagedTargetRef = useRef<(value: string, columnIndex: number) => void>(() => undefined);
    const onCommitStagedTargetRef = useRef<() => boolean>(() => false);
    const isWheelReplacementModeRef = useRef(false);
    const onSelectWheelReplacementRef = useRef<((targetValue: string) => string | void) | null>(null);
    const handleSwapRef = useRef<(direction?: SwipeDirection | 'center' | null) => void>(() => undefined);

    const [renderParams, setRenderParams] = React.useState({
        w: button.style.w,
        h: button.style.h,
        radius: button.style.borderRadius || 8
    });

    const tacticalTargeting = useTacticalTargeting({
        activeTarget: target || automaticTarget,
        autoTargetForCommand: command => getAutoRoomTarget(command, roomOccupants, characterName || ''),
        isMobile,
        openOnHoldWithoutTarget: openDecisionPanelOnHold ?? isMobile,
        setCommandPreview,
        triggerHaptic
    });
    const toggleTargetLock = useCallback((targetValue: string) => {
        const normalize = (value: string | null) => value?.replace(/[*']/g, '').trim().toLowerCase() || '';
        setTarget(normalize(target) === normalize(targetValue) ? null : targetValue);
        setAutomaticTarget(null);
        tacticalTargeting.clearSelection();
    }, [setAutomaticTarget, setTarget, target, tacticalTargeting.clearSelection]);
    const updateAutomaticTarget = useCallback((targetValue: string) => {
        if (target) return;
        const value = targetValue.trim();
        if (!value || !roomEntityTargets.has(value.toLowerCase())) return;
        setAutomaticTarget(value);
    }, [roomEntityTargets, setAutomaticTarget, target]);

    useEffect(() => {
        if (!tacticalTargeting.isTargetColumnOpen) {
            setIsPanelPinned(false);
            setSwapSource(null);
            swapSourceRef.current = null;
            panelHoverCellRef.current = null;
        }
    }, [tacticalTargeting.isTargetColumnOpen]);

    const handleTacticalButtonClick = (clickedButton: CustomButton, event: React.MouseEvent | React.PointerEvent) => {
        if (onTap && !button.command.trim()) {
            onTap();
            return;
        }
        const isPrimaryTap = !clickedButton._skipJoystick && clickedButton.command === button.command;
        if (repeatCenterEnabled && isPrimaryTap && clickedButton.command.trim()) {
            if (lastExecutedButtonCommand) {
                handleButtonClick({ ...clickedButton, command: lastExecutedButtonCommand }, event);
                return;
            }
            rememberButtonCommand(clickedButton.command);
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
            if (onMovePinnedCells(source, destination) !== false) triggerHaptic(30);
            return;
        }
        setButtons(previous => previous.map(existing => existing.id === button.id
            ? swapPinnedWheelCells(existing, source, destination)
            : existing));
        triggerHaptic(30);
    }, [button.id, onMovePinnedCells, setButtons, triggerHaptic]);
    const assignPinnedCommand = React.useCallback((command: string, actionType: import('../../../types').ActionType, destination: SwipeDirection | 'center', setId?: string) => {
        if (onAssignPinnedCommand) onAssignPinnedCommand(command, actionType, destination, setId);
        else setButtons(previous => previous.map(existing => existing.id === button.id
            ? assignPinnedWheelCell(existing, destination, command, actionType, setId || classPaletteSetId || undefined)
            : existing));
        triggerHaptic(30);
    }, [button.id, classPaletteSetId, onAssignPinnedCommand, setButtons, triggerHaptic]);

    const gestures = useButtonGestures({
        button, isEditMode, handleDragStart, wasDraggingRef, triggerHaptic, setHeldButton, heldButton,
        joystick, target, setCommandPreview, setActiveDir, activeDir, setIsCancelling, isCancelling,
        setPopoverState, executeCommand: runButtonCommand, setActiveSet, handleButtonClick: handleTacticalButtonClick, setButtons, setEditButton,
        onCommandExecuted: rememberButtonCommand,
        repeatTapCommand: repeatCenterEnabled ? lastExecutedButtonCommand : '',
        setWheelPos, playClickSound, isSoundEnabled, initAudio, setRayParams, isMobile,
        tacticalTargeting,
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

    const targetCommand = tacticalTargeting.isTargetColumnOpen
        ? gestures.currentCommandRef?.current || button.command
        : button.command;
    const commandKey = (targetCommand || '').trim().toLowerCase().split(/\s+/)[0];
    const targetMenu = useGameButtonTargetSuggestions(
        targetCommand || '',
        characterName || '',
        commandKey ? targetKindByCommand?.[commandKey] : undefined,
        containerContents,
        stagedArguments[1]?.value || null,
        loadingContainer?.id || null
    );
    useEffect(() => {
        if (loadingContainer && containerContents[loadingContainer.id] !== loadingContainer.previousContents) {
            setLoadingContainer(null);
        }
    }, [containerContents, loadingContainer]);
    const displayedSelectedTarget = targetMenu.kind === 'door-direction' ? 'exit' : tacticalTargeting.pendingTarget;
    isStagedTargetMenuRef.current = Boolean(targetMenu.stagedTargetKind && !wheelReplacementMode);
    const canCompleteStagedCommandOnTap = (columnIndex: number): boolean => {
        const args = stagedArguments;
        const otherArgument = args[columnIndex === 0 ? 1 : 0];
        if (!otherArgument) return false;
        return !(columnIndex === 1 && targetMenu.stagedTargetKind === 'room-object-container');
    };
    const directionPadMode: 'below' | 'side' | 'wheel' | null = targetMenu.kind === 'movement-wheel'
        ? 'wheel'
        : /^look(?:\s|$)/i.test(targetCommand.trim())
        ? 'side'
        : targetMenu.kind === 'door-direction' || tacticalTargeting.pendingTarget?.toLowerCase() === 'exit' ? 'side' : null;
    const effectiveTarget = tacticalTargeting.getEffectiveTarget(targetCommand);
    const targetSuggestions = targetMenu.kind
        ? isOffensiveSingleTargetCommand(targetCommand)
            ? prioritizeTargetSuggestion(targetMenu.suggestions || [], target || tacticalTargeting.pendingTarget || effectiveTarget)
            : targetMenu.suggestions
        : canCommandAcceptTarget(targetCommand) ? [] : [BLANK_TARGET_SUGGESTION];
    const isTargetReady = Boolean(effectiveTarget && targetSuggestions?.some(suggestion => isTargetSuggestionMatch(suggestion, effectiveTarget)));
    const stagedColumns = targetMenu.stagedTargetKind && !wheelReplacementMode ? [
        {
            title: targetMenu.stagedTargetKind === 'social' ? 'Social' : targetMenu.stagedTargetKind === 'room-object-container' ? 'Item' : 'Object',
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
                : targetMenu.stagedTargetKind === 'inventory-container' ? 'Container' : 'Get From',
            suggestions: targetMenu.secondArgumentSuggestions,
            selectedTarget: stagedArguments[1]?.value || null,
            selectedKey: stagedArguments[1]?.key || null,
            showSendIndicator: canCompleteStagedCommandOnTap(1),
            emptyText: 'No second argument available'
        }
    ] : undefined;
    useEffect(() => {
        const next: Array<{ value: string; key: string } | null> = [null, null];
        if (targetMenu.stagedTargetKind === 'room-object-container') next[1] = { value: '__room__', key: 'get-from-room' };
        stagedArgumentsRef.current = next;
        setStagedArguments(next);
        setLoadingContainer(null);
    }, [button.id, targetCommand, targetMenu.stagedTargetKind]);
    useEffect(() => {
        if (!tacticalTargeting.isTargetColumnOpen) {
            setInlineAssignment(null);
        }
    }, [tacticalTargeting.isTargetColumnOpen]);
    const resetStagedArguments = () => {
        const next: Array<{ value: string; key: string } | null> = [null, null];
        if (targetMenu.stagedTargetKind === 'room-object-container') next[1] = { value: '__room__', key: 'get-from-room' };
        stagedArgumentsRef.current = next;
        setStagedArguments(next);
        setLoadingContainer(null);
        tacticalTargeting.clearSelection();
        tacticalTargeting.releaseTargetMenu();
    };
    const buildStagedCommand = (args: Array<{ value: string; key: string } | null>, includeSecond: boolean) => {
        const kind = targetMenu.stagedTargetKind;
        const first = args[0]?.value;
        if (!kind || !first) return '';
        const second = includeSecond ? args[1]?.value : undefined;
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
        if (!suggestion || !targetMenu.stagedTargetKind) return;
        const next = [...stagedArgumentsRef.current];
        if (columnIndex === 1 && targetMenu.stagedTargetKind === 'room-object-container') {
            next[0] = null;
            setLoadingContainer(null);
            if (value !== '__room__' && suggestion.containerId && suggestion.containerCommand) {
                setLoadingContainer({ id: suggestion.containerId, previousContents: containerContents[suggestion.containerId] });
                requestContainerContents?.(suggestion);
            }
        }
        next[columnIndex] = { value, key: suggestion.key };
        stagedArgumentsRef.current = next;
        setStagedArguments(next);
        const hasBothArguments = Boolean(next[0] && next[1]);
        const isReady = hasBothArguments;
        if (isReady && tacticalTargeting.fireOnTargetTap) {
            const command = buildStagedCommand(next, hasBothArguments);
            if (command) runButtonCommand(command, false, false);
            resetStagedArguments();
        }
    };
    onCommitStagedTargetRef.current = () => {
        if (tacticalTargeting.fireOnTargetTap) return false;
        const args = stagedArgumentsRef.current;
        const hasBothArguments = Boolean(args[0] && args[1]);
        if (!hasBothArguments) return false;
        const command = buildStagedCommand(args, hasBothArguments);
        if (!command) return false;
        runButtonCommand(command, false, false);
        resetStagedArguments();
        return true;
    };
    const inlineAssignmentButtons = inlineAssignment
        ? availableButtons.filter(candidate => candidate.setId.toLowerCase() === inlineAssignment.setId.toLowerCase()
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
    onSelectWheelReplacementRef.current = assignmentMode?.onSelect || null;
    const needsCircularVitals = (hpRatio !== undefined || manaRatio !== undefined || moveRatio !== undefined) && variant === 'default';
    const needsDiamondVitals = (hpRatio !== undefined || manaRatio !== undefined || moveRatio !== undefined) && variant === 'diamond';

    useEffect(() => {
        if (heldButton?.id === button.id && heldButton.dx !== undefined && heldButton.dy !== undefined) {
            const effectiveTarget = tacticalTargeting.getEffectiveTarget(heldButton.baseCommand || button.command);
            const preview = getButtonCommand(button, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, effectiveTarget, joystick.isActive, heldButton.commandPrefixes);
            setCommandPreview(preview?.cmd || null);
        }
    }, [joystick.isActive, heldButton?.id, button.id, joystick.currentDir, joystick.isTargetModifierActive, target, tacticalTargeting.pendingTarget, setCommandPreview]);

    const handleSwap = React.useCallback((displayedCell?: SwipeDirection | 'center' | null) => {
        const currentCommand = (gestures.currentCommandRef.current || '').trim().toLowerCase();
        const centerCommand = (button.command || '').trim().toLowerCase();
        const mappedDirection = Object.entries({ ...(button.longSwipeCommands || {}), ...(button.swipeCommands || {}) })
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
            onSwapWheel(selectedCell);
            return;
        }

        const isCenter = selectedCell === 'center';
        const cellCommand = isCenter
            ? (button.longCommand || button.command)
            : (button.longSwipeCommands?.[selectedCell] || button.swipeCommands?.[selectedCell] || currentCommand);
        const actionType = isCenter
            ? (button.longActionType || button.actionType || 'command')
            : (button.longSwipeActionTypes?.[selectedCell] || button.swipeActionTypes?.[selectedCell] || 'command');
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
    }, [activeDir, button, availableButtons, triggerHaptic, setHeldButton, tacticalTargeting,
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
            ? button.command
            : button.swipeCommands?.[direction] || button.longSwipeCommands?.[direction] || '';
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
            className={`custom-btn ${isFloating ? 'floating' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''} ${isTargetReady ? 'target-ready' : ''} ${button.trigger?.enabled && button.isVisible ? 'triggered' : ''} ${activeDir ? 'is-swiping' : ''} ${variant === 'diamond' ? 'is-diamond' : ''} ${className}`}
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
                '--ray-angle': `${rayParams.angle}deg`,
                '--ray-length': `${rayParams.length}px`,
                '--ray-opacity': rayParams.opacity,
                '--ray-color': rayParams.color,
                opacity: (button.isVisible || isEditMode || button.setId === 'Tactical') ? (button.isDimmed ? 0.35 : 1) : 0,
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
                button={button} buttonIconNode={iconNode} activeDir={activeDir} isCancelling={isCancelling}
                swapSource={swapSource} onSwapCells={handlePanelCellSwap}
                isPinned={isPanelPinned} onClose={cancelDecisionPanel}
                paletteCommands={paletteCommands}
                buttonRect={buttonRef.current?.getBoundingClientRect()} rayParams={rayParams}
                isMobile={isMobile}
                isTargetMenuOpen={tacticalTargeting.isTargetColumnOpen}
                isTargetMenuHeld={tacticalTargeting.isTargetMenuHeld}
                command={targetCommand} currentCommandRef={gestures.currentCommandRef}
                activeTarget={target} targetChipTarget={targetChipTarget} selectedTarget={displayedSelectedTarget}
                selectedDirection={tacticalTargeting.pendingDirection}
                directionPadMode={directionPadMode} suggestions={targetSuggestions}
                title={targetMenu.kind ? targetMenu.title : 'NO TARGET REQUIRED'} characterName={characterName || ''}
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
