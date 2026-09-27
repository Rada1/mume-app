/**
 * @file useDeckTargeting.ts
 * @description Hook managing hold-to-target gestures and room targeting for CommandDeck slots.
 */

// --- Logic Section ---
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { canCommandAcceptTarget, getCommandTargetMenuKind } from '../../utils/commandTargetUtils';
import {
    getRememberedCommandTarget,
    isCompatibleGlobalTarget,
    rememberCommandTarget,
} from '../../utils/commandTargetMemory';
import {
    getContainerTargetSuggestions,
    getGearTargetSuggestions,
    getInventoryAndWornTargetSuggestions,
    getRoomTargetSuggestions,
    getSelfTargetSuggestion,
    getWhoTargetSuggestions,
    getSocialTargetSuggestions,
    type CommandTargetSuggestion
} from '../../utils/commandSuggestionUtils';
import { isFluidContainer } from '../../utils/gameUtils';
import { getTraitsForName } from '../../utils/inlineActionModel';
import { useRoomStore } from '../../stores/useRoomStore';
import type { DrawerLine, GmcpOccupant } from '../../types';

export type DeckTargetKind =
    | 'room-objects'
    | 'inventory'
    | 'inventory-and-worn'
    | 'worn'
    | 'worn-sheaths'
    | 'worn-weapons'
    | 'inventory-recipient'
    | 'inventory-container'
    | 'room-object-container'
    | 'who'
    | 'social';

const ROOM_TARGET_VALUE = '__room__';
const ALL_ARGUMENT_SUGGESTION = { key: 'all-argument', label: 'All', value: 'all', meta: 'all' };

export interface DeckItem {
    label: string;
    cmd: string;
    needsTarget: boolean;
    targetKind?: DeckTargetKind;
    holdOpensMenuOnly?: boolean;
}

export interface UseDeckTargetingProps {
    target: string | null;
    /** @deprecated Global target changes are handled outside command menus. */
    setTarget?: (target: string | null) => void;
    executeCommand: (cmd: string) => void;
    triggerHaptic?: (ms: number) => void;
    flashPressed: (label: string) => void;
    fire: (item: DeckItem) => void;
    inventoryLines?: DrawerLine[];
    wornLines?: DrawerLine[];
    containerContents?: Record<string, DrawerLine[]>;
    requestContainerContents?: (source: CommandTargetSuggestion) => void;
    characterName?: string;
}

export interface UseDeckTargetingReturn {
    isTargetMenuOpen: boolean;
    isTargetMenuHeld: boolean;
    activeItem: DeckItem | null;
    pendingTarget: string | null;
    roomOccupants: GmcpOccupant[];
    roomItems: GmcpOccupant[];
    targetSuggestions: CommandTargetSuggestion[] | undefined;
    targetMenuTitle: string;
    isStagedTargetMenu: boolean;
    firstArgumentSuggestions: CommandTargetSuggestion[];
    secondArgumentSuggestions: CommandTargetSuggestion[];
    isLoadingFirstArgument: boolean;
    firstArgumentEmptyText: string;
    selectedFirstArgument: string | null;
    selectedSecondArgument: string | null;
    selectedFirstArgumentKey: string | null;
    selectedSecondArgumentKey: string | null;
    handlePointerDown: (item: DeckItem, e: React.PointerEvent<HTMLButtonElement>) => void;
    handlePointerUp: (item: DeckItem, e: React.PointerEvent<HTMLButtonElement>) => void;
    handlePointerCancel: () => void;
    handleClick: (item: DeckItem, e: React.MouseEvent<HTMLButtonElement>) => void;
    handleSelectTarget: (targetValue: string, preserveMenuOnPointerUp?: boolean, columnIndex?: number, suggestion?: CommandTargetSuggestion) => void;
    openTargetMenuFor: (item: DeckItem, pointerId?: number) => void;
    releaseHeldTargetMenu: (pointerId: number) => void;
    closeTargetMenu: () => void;
}

export const useDeckTargeting = ({
    target,
    executeCommand,
    triggerHaptic,
    flashPressed,
    fire,
    inventoryLines = [],
    wornLines = [],
    containerContents = {},
    requestContainerContents,
    characterName = ''
}: UseDeckTargetingProps): UseDeckTargetingReturn => {
    const [isTargetMenuOpen, setIsTargetMenuOpen] = useState(false);
    const [isTargetMenuHeld, setIsTargetMenuHeld] = useState(false);
    const [activeItem, setActiveItem] = useState<DeckItem | null>(null);
    const [pendingTarget, setPendingTarget] = useState<string | null>(null);
    const [isSecondArgumentStage, setIsSecondArgumentStage] = useState(false);
    const [selectedFirstArgument, setSelectedFirstArgument] = useState<string | null>(null);
    const [selectedSecondArgument, setSelectedSecondArgument] = useState<string | null>(null);
    const [selectedFirstArgumentKey, setSelectedFirstArgumentKey] = useState<string | null>(null);
    const [selectedSecondArgumentKey, setSelectedSecondArgumentKey] = useState<string | null>(null);
    const [loadingContainer, setLoadingContainer] = useState<{ id: string; previousContents: DrawerLine[] | undefined } | null>(null);

    const holdTimerRef = useRef<number | null>(null);
    const didHoldRef = useRef(false);
    const suppressNextClickRef = useRef(false);
    const heldPointerIdRef = useRef<number | null>(null);
    const preserveMenuOnNextPointerUpRef = useRef(false);
    const activeItemRef = useRef<DeckItem | null>(null);
    activeItemRef.current = activeItem;
    const pendingTargetRef = useRef<string | null>(null);
    pendingTargetRef.current = pendingTarget;
    const firstArgumentRef = useRef<string | null>(null);
    const secondArgumentRef = useRef<string | null>(null);

    const roomChars = useRoomStore(s => s.chars);
    const roomItemsObj = useRoomStore(s => s.items);
    const whoList = useRoomStore(s => s.whoList);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomItems = useMemo(() => Object.values(roomItemsObj), [roomItemsObj]);

    const activeVerb = activeItem?.cmd.trim().toLowerCase().split(/\s+/)[0];
    const isWhoTarget = activeVerb === 'tell' || activeVerb === 'whisper' || activeVerb === 'ask' || activeItem?.targetKind === 'who';
    const isSocialTarget = activeVerb === 'social' || activeItem?.targetKind === 'social';
    const isStagedTargetMenu = activeItem?.targetKind === 'inventory-recipient'
        || activeItem?.targetKind === 'inventory-container'
        || activeItem?.targetKind === 'room-object-container';

    const secondArgumentSuggestions = useMemo(() => {
        if (activeItem?.targetKind === 'inventory-recipient') {
            return getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName);
        }
        if (activeItem?.targetKind === 'inventory-container' || activeItem?.targetKind === 'room-object-container') {
            const containers = getContainerTargetSuggestions(roomItems, inventoryLines, wornLines)
                .filter(suggestion => suggestion.meta !== 'exit');
            const withAll = [ALL_ARGUMENT_SUGGESTION, ...containers];
            return activeItem.targetKind === 'room-object-container'
                ? [{ key: 'get-from-room', label: 'Room', value: ROOM_TARGET_VALUE, meta: 'room' }, ...withAll]
                : withAll;
        }
        return [];
    }, [activeItem?.targetKind, roomOccupants, roomItems, inventoryLines, wornLines, characterName]);

    const selectedGetSource = activeItem?.targetKind === 'room-object-container'
        ? secondArgumentSuggestions.find(suggestion => suggestion.key === selectedSecondArgumentKey)
            || secondArgumentSuggestions.find(suggestion => suggestion.value === selectedSecondArgument)
        : undefined;

    const firstArgumentSuggestions = useMemo(() => {
        if (activeItem?.targetKind === 'inventory-recipient') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
        if (activeItem?.targetKind === 'inventory-container') return [ALL_ARGUMENT_SUGGESTION, ...getGearTargetSuggestions(inventoryLines, 'inventory')];
        if (activeItem?.targetKind === 'room-object-container') {
            if (!selectedSecondArgument || selectedSecondArgument === ROOM_TARGET_VALUE) {
                return [ALL_ARGUMENT_SUGGESTION, ...getRoomTargetSuggestions([], roomItems, 'objects')];
            }
            const source = secondArgumentSuggestions.find(suggestion => suggestion.key === selectedSecondArgumentKey)
                || secondArgumentSuggestions.find(suggestion => suggestion.value === selectedSecondArgument);
            if (source?.containerId && loadingContainer?.id === source.containerId
                && containerContents[source.containerId] === loadingContainer.previousContents) return [];
            const contents = source?.containerId ? containerContents[source.containerId] ?? [] : [];
            return [ALL_ARGUMENT_SUGGESTION, ...getGearTargetSuggestions(contents, 'inventory').map(suggestion => ({ ...suggestion, meta: 'container' }))];
        }
        return [];
    }, [activeItem?.targetKind, inventoryLines, wornLines, roomItems, selectedSecondArgument, selectedSecondArgumentKey, secondArgumentSuggestions, containerContents, loadingContainer]);

    const isLoadingFirstArgument = Boolean(
        activeItem?.targetKind === 'room-object-container'
        && selectedSecondArgument !== ROOM_TARGET_VALUE
        && selectedGetSource?.containerId
        && loadingContainer?.id === selectedGetSource.containerId
        && containerContents[selectedGetSource.containerId] === loadingContainer.previousContents
    );
    const firstArgumentEmptyText = isLoadingFirstArgument
        ? 'Looking inside container…'
        : activeItem?.targetKind === 'room-object-container' && selectedSecondArgument !== ROOM_TARGET_VALUE
            ? 'Nothing inside'
            : 'No items available';

    useEffect(() => {
        if (loadingContainer && containerContents[loadingContainer.id] !== loadingContainer.previousContents) {
            setLoadingContainer(null);
        }
    }, [containerContents, loadingContainer]);

    const targetSuggestions = useMemo(() => {
        if (!activeItem) return undefined;
        if (isWhoTarget) return getWhoTargetSuggestions(whoList, characterName);
        if (isSocialTarget) return getSocialTargetSuggestions();
        if (!activeItem.targetKind) {
            const commandKind = getCommandTargetMenuKind(activeItem.cmd);
            if (commandKind === 'self-only') return [getSelfTargetSuggestion()];
            if (commandKind === 'self-inventory') return [
                getSelfTargetSuggestion(),
                ...getGearTargetSuggestions(inventoryLines, 'inventory')
            ];
            if (commandKind === 'gear') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
            if (commandKind === 'worn-weapons') {
                const wornWeapons = wornLines.filter(line => getTraitsForName(
                    `${line.text} ${line.rawText || ''} ${line.context || ''}`
                ).some(trait => trait.id === 'trait-weapon'));
                return getGearTargetSuggestions(wornWeapons, 'worn');
            }
            if (commandKind === 'fluid-containers') {
                const inventoryContainers = inventoryLines.filter(line => isFluidContainer(`${line.text} ${line.rawText || ''}`));
                const wornContainers = wornLines.filter(line => isFluidContainer(`${line.text} ${line.rawText || ''}`));
                return getInventoryAndWornTargetSuggestions(inventoryContainers, wornContainers);
            }
            if (commandKind === 'weather-options') return [
                { key: 'weather-clouds-less', label: 'Clouds less', value: 'clouds less', meta: 'weather' },
                { key: 'weather-clouds-more', label: 'Clouds more', value: 'clouds more', meta: 'weather' },
                { key: 'weather-fog-decrease', label: 'Fog decrease', value: 'fog decrease', meta: 'weather' },
                { key: 'weather-fog-increase', label: 'Fog increase', value: 'fog increase', meta: 'weather' },
                { key: 'weather-temperature-lower', label: 'Temperature lower', value: 'temperature lower', meta: 'weather' },
                { key: 'weather-temperature-higher', label: 'Temperature higher', value: 'temperature higher', meta: 'weather' }
            ];
            if (commandKind === 'room-spell' || commandKind === 'room-spell-with-extras' || commandKind === 'room') {
                const roomTargets = getRoomTargetSuggestions(roomOccupants, roomItems, 'characters', characterName);
                if (commandKind === 'room-spell-with-extras') return [
                    ...roomTargets,
                    { key: 'spell-web', label: 'Web', value: 'web', meta: 'object' },
                    { key: 'spell-exit', label: 'Exit', value: 'exit', meta: 'exit' }
                ];
                return roomTargets;
            }
            return undefined;
        }
        if (isSecondArgumentStage) {
            if (activeItem.targetKind === 'inventory-recipient') {
                return getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName);
            }
            const containers = getContainerTargetSuggestions(roomItems, inventoryLines, wornLines)
                .filter(suggestion => suggestion.meta !== 'exit');
            if (activeItem.targetKind === 'room-object-container') {
                return [{ key: 'get-from-room', label: 'Room', value: ROOM_TARGET_VALUE, meta: 'room' }, ALL_ARGUMENT_SUGGESTION, ...containers];
            }
            if (activeItem.targetKind === 'inventory-container') return [ALL_ARGUMENT_SUGGESTION, ...containers];
        }
        if (activeItem.targetKind === 'room-objects') return getRoomTargetSuggestions([], roomItems, 'objects');
        if (activeItem.targetKind === 'room-object-container') return [ALL_ARGUMENT_SUGGESTION, ...getRoomTargetSuggestions([], roomItems, 'objects')];
        if (activeItem.targetKind === 'worn') return getGearTargetSuggestions(wornLines, 'worn');
        if (activeItem.targetKind === 'worn-sheaths') {
            const sheaths = wornLines.filter(line => getTraitsForName(
                `${line.text} ${line.rawText || ''} ${line.context || ''}`
            ).some(trait => trait.id === 'trait-sheath'));
            return getGearTargetSuggestions(sheaths, 'worn');
        }
        if (activeItem.targetKind === 'worn-weapons') {
            const weapons = wornLines.filter(line => getTraitsForName(
                `${line.text} ${line.rawText || ''} ${line.context || ''}`
            ).some(trait => trait.id === 'trait-weapon'));
            return getGearTargetSuggestions(weapons, 'worn');
        }
        if (activeItem.targetKind === 'inventory-and-worn') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.targetKind === 'inventory-container') return [ALL_ARGUMENT_SUGGESTION, ...getGearTargetSuggestions(inventoryLines, 'inventory')];
        if (activeItem.targetKind === 'inventory-recipient') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
        const inventoryTargets = getGearTargetSuggestions(inventoryLines, 'inventory');
        if (activeItem.cmd.trim().toLowerCase() !== 'drink'
            || inventoryTargets.some(suggestion => suggestion.value.toLowerCase() === 'water')) return inventoryTargets;
        return [...inventoryTargets, { key: 'drink-water', label: 'water', value: 'water', meta: 'source' }];
    }, [activeItem, isWhoTarget, isSocialTarget, isSecondArgumentStage, roomOccupants, roomItems, characterName, wornLines, inventoryLines, whoList]);
    const targetMenuTitle = isStagedTargetMenu ? 'SELECT ARGUMENTS' : isWhoTarget ? 'WHO LIST' : isSocialTarget ? 'SOCIAL COMMANDS'
        : isSecondArgumentStage && activeItem?.targetKind === 'inventory-recipient' ? 'RECIPIENTS'
        : isSecondArgumentStage && activeItem?.targetKind === 'inventory-container' ? 'PUT INTO'
        : isSecondArgumentStage && activeItem?.targetKind === 'room-object-container' ? 'GET FROM'
        : activeItem?.targetKind === 'room-objects' || activeItem?.targetKind === 'room-object-container' ? 'ROOM ITEMS'
        : activeItem?.targetKind === 'worn' ? 'WORN ITEMS'
        : activeItem?.targetKind === 'worn-sheaths' ? 'WORN SHEATHS'
        : activeItem?.targetKind === 'worn-weapons' ? 'WORN WEAPONS'
        : activeItem?.targetKind === 'inventory-and-worn' ? 'INVENTORY AND WORN'
        : activeItem?.targetKind === 'inventory-recipient' || activeItem?.targetKind === 'inventory-container' ? 'INVENTORY ITEMS'
        : activeItem?.targetKind ? 'INVENTORY' : 'TARGETS';

    const clearHoldTimer = useCallback(() => {
        if (holdTimerRef.current !== null) {
            window.clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }, []);

    const closeTargetMenu = useCallback(() => {
        clearHoldTimer();
        setIsTargetMenuOpen(false);
        setIsTargetMenuHeld(false);
        setActiveItem(null);
        setPendingTarget(null);
        setIsSecondArgumentStage(false);
        setSelectedFirstArgument(null);
        setSelectedSecondArgument(null);
        setSelectedFirstArgumentKey(null);
        setSelectedSecondArgumentKey(null);
        setLoadingContainer(null);
        heldPointerIdRef.current = null;
        activeItemRef.current = null;
        pendingTargetRef.current = null;
        firstArgumentRef.current = null;
        secondArgumentRef.current = null;
        didHoldRef.current = false;
    }, [clearHoldTimer]);

    const openTargetMenuFor = useCallback((item: DeckItem, pointerId?: number) => {
        clearHoldTimer();
        activeItemRef.current = item;
        pendingTargetRef.current = null;
        heldPointerIdRef.current = pointerId ?? null;
        setIsTargetMenuHeld(pointerId !== undefined);
        preserveMenuOnNextPointerUpRef.current = false;
        didHoldRef.current = false;
        setActiveItem(item);
        setPendingTarget(null);
        setIsSecondArgumentStage(false);
        setSelectedFirstArgument(null);
        setSelectedFirstArgumentKey(null);
        setLoadingContainer(null);
        firstArgumentRef.current = null;
        const defaultSecondArgument = item.targetKind === 'room-object-container' ? ROOM_TARGET_VALUE : null;
        setSelectedSecondArgument(defaultSecondArgument);
        setSelectedSecondArgumentKey(item.targetKind === 'room-object-container' ? 'get-from-room' : null);
        secondArgumentRef.current = defaultSecondArgument;
        const initialSecondArgument = item.targetKind === 'room-object-container' ? ROOM_TARGET_VALUE : null;
        setPendingTarget(initialSecondArgument);
        pendingTargetRef.current = initialSecondArgument;
        setIsTargetMenuOpen(true);
        triggerHaptic?.(20);
    }, [clearHoldTimer, triggerHaptic]);

    const executeStagedCommand = useCallback((item: DeckItem, firstArgument: string, secondArgument: string) => {
        const targetPart = item.targetKind === 'room-object-container' && secondArgument === ROOM_TARGET_VALUE
            ? ''
            : ` ${secondArgument}`;
        flashPressed(item.label);
        triggerHaptic?.(15);
        executeCommand(`${item.cmd}${firstArgument}${targetPart}`.trim());
        closeTargetMenu();
    }, [closeTargetMenu, executeCommand, flashPressed, triggerHaptic]);

    const handlePointerDown = useCallback((item: DeckItem, e: React.PointerEvent<HTMLButtonElement>) => {
        if (e.buttons !== 1 && e.pointerType === 'mouse') return;
        clearHoldTimer();
        didHoldRef.current = false;
        suppressNextClickRef.current = false;
        heldPointerIdRef.current = null;
        const isTargetable = item.needsTarget || canCommandAcceptTarget(item.cmd);
        if (!isTargetable) return;

        activeItemRef.current = item;
        holdTimerRef.current = window.setTimeout(() => {
            holdTimerRef.current = null;
            didHoldRef.current = true;
            suppressNextClickRef.current = true;
            setActiveItem(item);
            setSelectedFirstArgument(null);
            setSelectedFirstArgumentKey(null);
            setLoadingContainer(null);
            firstArgumentRef.current = null;
            const defaultSecondArgument = item.targetKind === 'room-object-container' ? ROOM_TARGET_VALUE : null;
            setSelectedSecondArgument(defaultSecondArgument);
            setSelectedSecondArgumentKey(item.targetKind === 'room-object-container' ? 'get-from-room' : null);
            secondArgumentRef.current = defaultSecondArgument;
            setPendingTarget(defaultSecondArgument);
            pendingTargetRef.current = defaultSecondArgument;
            setIsSecondArgumentStage(false);
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
            if (item.targetKind === 'room-object-container' && isSecondArgumentStage && pendingTargetRef.current === ROOM_TARGET_VALUE) {
                const firstArgument = firstArgumentRef.current;
                if (firstArgument) executeStagedCommand(item, firstArgument, ROOM_TARGET_VALUE);
                else closeTargetMenu();
                return;
            }
            if (item.targetKind || item.holdOpensMenuOnly) {
                closeTargetMenu();
                return;
            }
            const effectiveTarget = pendingTargetRef.current || getRememberedCommandTarget(item.cmd)
                || (isCompatibleGlobalTarget(item.cmd, target) ? target : null);
            if (effectiveTarget) {
                rememberCommandTarget(item.cmd, effectiveTarget);
                if (pendingTargetRef.current) {
                    rememberCommandTarget(item.cmd, pendingTargetRef.current);
                }
                flashPressed(item.label);
                triggerHaptic?.(15);
                executeCommand(`${item.cmd}${effectiveTarget}`.trim());
                closeTargetMenu();
                return;
            }
            closeTargetMenu();
        }
    }, [clearHoldTimer, closeTargetMenu, executeCommand, executeStagedCommand, flashPressed, isSecondArgumentStage, pendingTargetRef, target, triggerHaptic]);

    const handlePointerCancel = useCallback(() => {
        closeTargetMenu();
    }, [closeTargetMenu]);

    const handleClick = useCallback((item: DeckItem, e: React.MouseEvent<HTMLButtonElement>) => {
        if (suppressNextClickRef.current) {
            // Was a hold gesture, consume click
            e.preventDefault();
            e.stopPropagation();
            suppressNextClickRef.current = false;
            return;
        }
        fire(item);
    }, [fire]);

    const handleSelectTarget = useCallback((targetValue: string, preserveMenuOnPointerUp = false, columnIndex?: number, suggestion?: CommandTargetSuggestion) => {
        const itemToFire = activeItemRef.current;
        triggerHaptic?.(15);

        if (itemToFire) {
            if (itemToFire.targetKind) {
                if (isStagedTargetMenu) {
                    preserveMenuOnNextPointerUpRef.current = preserveMenuOnPointerUp && heldPointerIdRef.current !== null;
                    const selectedColumn = columnIndex ?? (selectedFirstArgument ? 1 : 0);
                    if (selectedColumn === 0) {
                        firstArgumentRef.current = targetValue;
                        setSelectedFirstArgument(targetValue);
                        setSelectedFirstArgumentKey(suggestion?.key ?? null);
                    } else {
                        if (itemToFire.targetKind === 'room-object-container') {
                            firstArgumentRef.current = null;
                            setSelectedFirstArgument(null);
                            setSelectedFirstArgumentKey(null);
                            const source = suggestion || secondArgumentSuggestions.find(candidate => candidate.key === selectedSecondArgumentKey)
                                || secondArgumentSuggestions.find(candidate => candidate.value === targetValue);
                            if (targetValue === ROOM_TARGET_VALUE) {
                                setLoadingContainer(null);
                            } else if (source?.containerId && source.containerCommand) {
                                setLoadingContainer({ id: source.containerId, previousContents: containerContents[source.containerId] });
                                requestContainerContents?.(source);
                            }
                            setSelectedSecondArgumentKey(source?.key ?? null);
                        } else {
                            setSelectedSecondArgumentKey(suggestion?.key ?? null);
                        }
                        secondArgumentRef.current = targetValue;
                        setSelectedSecondArgument(targetValue);
                        setPendingTarget(targetValue);
                        pendingTargetRef.current = targetValue;
                    }
                    setIsSecondArgumentStage(true);
                    if (heldPointerIdRef.current !== null) return;
                    if (firstArgumentRef.current && secondArgumentRef.current) {
                        executeStagedCommand(itemToFire, firstArgumentRef.current, secondArgumentRef.current);
                    }
                    return;
                }
                if (heldPointerIdRef.current !== null) {
                    setPendingTarget(targetValue);
                    pendingTargetRef.current = targetValue;
                    return;
                }
                const command = (itemToFire.targetKind === 'social' || itemToFire.cmd.trim() === 'social')
                        ? (target ? `${targetValue} ${target}`.trim() : targetValue)
                        : `${itemToFire.cmd}${targetValue}`.trim();
                flashPressed(itemToFire.label);
                executeCommand(command);
                closeTargetMenu();
                return;
            }
            if (heldPointerIdRef.current !== null) {
                setPendingTarget(targetValue);
                pendingTargetRef.current = targetValue;
                rememberCommandTarget(itemToFire.cmd, targetValue);
                return;
            }
            setPendingTarget(targetValue);
            pendingTargetRef.current = targetValue;
            rememberCommandTarget(itemToFire.cmd, targetValue);
            flashPressed(itemToFire.label);
            executeCommand(`${itemToFire.cmd}${targetValue}`.trim());
            closeTargetMenu();
        }
    }, [closeTargetMenu, containerContents, executeCommand, executeStagedCommand, flashPressed, isStagedTargetMenu, selectedFirstArgument, selectedSecondArgumentKey, secondArgumentSuggestions, requestContainerContents, target, triggerHaptic]);

    const releaseHeldTargetMenu = useCallback((pointerId: number) => {
        if (heldPointerIdRef.current !== pointerId) return;
        heldPointerIdRef.current = null;
        setIsTargetMenuHeld(false);
        const item = activeItemRef.current;
        const selected = pendingTargetRef.current;
        if (!item) {
            closeTargetMenu();
            return;
        }

        if (isStagedTargetMenu) {
            if (firstArgumentRef.current && secondArgumentRef.current) {
                executeStagedCommand(item, firstArgumentRef.current, secondArgumentRef.current);
            }
            return;
        }
        if (!selected) return;

        const command = item.targetKind === 'social' || item.cmd.trim() === 'social'
            ? (target ? `${selected} ${target}`.trim() : selected)
            : `${item.cmd}${selected}`.trim();
        rememberCommandTarget(item.cmd, selected);
        flashPressed(item.label);
        triggerHaptic?.(15);
        executeCommand(command);
        closeTargetMenu();
    }, [closeTargetMenu, executeCommand, executeStagedCommand, flashPressed, isStagedTargetMenu, target, triggerHaptic]);

    useEffect(() => {
        if (!isTargetMenuOpen) return;
        const handleWindowPointerUp = (event: PointerEvent) => {
            // Category wheels manage their initiating pointer and menu dismissal
            // themselves. Do not let this global listener treat a tap/scroll on
            // the target popover as the end of that held wheel gesture.
            if (heldPointerIdRef.current === null) return;
            if (heldPointerIdRef.current !== null && event.pointerId !== heldPointerIdRef.current) return;
            if (preserveMenuOnNextPointerUpRef.current) {
                preserveMenuOnNextPointerUpRef.current = false;
                return;
            }
            const active = activeItemRef.current;
            if (active?.targetKind === 'room-object-container' && isSecondArgumentStage
                && pendingTargetRef.current === ROOM_TARGET_VALUE) {
                const firstArgument = firstArgumentRef.current;
                if (firstArgument) executeStagedCommand(active, firstArgument, ROOM_TARGET_VALUE);
                else closeTargetMenu();
                return;
            }
            closeTargetMenu();
        };
        window.addEventListener('pointerup', handleWindowPointerUp);
        return () => window.removeEventListener('pointerup', handleWindowPointerUp);
    }, [closeTargetMenu, executeStagedCommand, isSecondArgumentStage, isTargetMenuOpen]);

    useEffect(() => {
        return () => {
            clearHoldTimer();
        };
    }, [clearHoldTimer]);

    return {
        isTargetMenuOpen,
        isTargetMenuHeld,
        activeItem,
        pendingTarget,
        roomOccupants,
        roomItems,
        targetSuggestions,
        targetMenuTitle,
        handlePointerDown,
        handlePointerUp,
        handlePointerCancel,
        handleClick,
        handleSelectTarget,
        openTargetMenuFor,
        releaseHeldTargetMenu,
        closeTargetMenu,
        isStagedTargetMenu,
        firstArgumentSuggestions,
        secondArgumentSuggestions,
        isLoadingFirstArgument,
        firstArgumentEmptyText,
        selectedFirstArgument,
        selectedSecondArgument,
        selectedFirstArgumentKey,
        selectedSecondArgumentKey
    };
};
