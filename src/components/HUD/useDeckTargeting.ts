/**
 * @file useDeckTargeting.ts
 * @description Hook managing hold-to-target gestures and room targeting for CommandDeck slots.
 */

// --- Logic Section ---
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { BLANK_TARGET_VALUE, canCommandAcceptTarget, getCommandTargetMenuKind, getDefaultCommandTarget } from '../../utils/commandTargetUtils';
import { getAutoRoomTarget } from '../../utils/commandAutoTarget';
import {
    getRememberedCommandTarget,
    isCompatibleGlobalTarget,
    rememberCommandTarget,
} from '../../utils/commandTargetMemory';
import {
    getContainerTargetSuggestions,
    getDrinkTargetSuggestions,
    getDrawTargetSuggestions,
    getFluidContainerTargetSuggestions,
    getGearTargetSuggestions,
    getFillTargetSuggestions,
    getInventoryAndWornTargetSuggestions,
    getLanternTargetSuggestions,
    getMountTargetSuggestions,
    getPipeTargetSuggestions,
    getMeatTargetSuggestions,
    getGiveRecipientSuggestions,
    getRoomTargetSuggestions,
    getRescueTargetSuggestions,
    getRoomCorpseTargetSuggestions,
    getSheathTargetSuggestions,
    getSelfTargetSuggestion,
    getSelfAndRoomAlliesTargetSuggestions,
    getSelfAndRoomTargetSuggestions,
    getWhoTargetSuggestions,
    getSocialTargetSuggestions,
    type CommandTargetSuggestion
} from '../../utils/commandSuggestionUtils';
import { getGroupSelectionSuggestions } from '../../utils/groupTargetSuggestions';
import { useVitals } from '../../context/GameContext';
import { hasObjectTrait } from '../../objects/objectTargetModel';
import { useRoomStore } from '../../stores/useRoomStore';
import { useRoomDrinkWater } from '../../hooks/useRoomDrinkWater';
import { useUIStore } from '../../stores/useUIStore';
import { useWhoListRefresh } from '../../hooks/useWhoListRefresh';
import type { DrawerLine, GmcpOccupant, GroupMember } from '../../types';

export type DeckTargetKind =
    | 'room-objects'
    | 'room-corpses'
    | 'inventory'
    | 'inventory-weapons'
    | 'worn-mixing-tools'
    | 'inventory-meat'
    | 'inventory-and-worn'
    | 'throwables'
    | 'scrolls'
    | 'worn'
    | 'worn-sheaths'
    | 'draw-targets'
    | 'worn-weapons'
    | 'lanterns'
    | 'inventory-recipient'
    | 'inventory-container'
    | 'fluid-containers'
    | 'pipes'
    | 'pour'
    | 'room-object-container'
    | 'mounts'
    | 'who'
    | 'social'
    | 'group'
    | 'shop'
    | 'status-panel';

const ROOM_TARGET_VALUE = '__room__';
const SOCIAL_NO_TARGET_VALUE = '__blank_target__';
const ALL_ARGUMENT_SUGGESTION: CommandTargetSuggestion = { key: 'all-argument', label: 'All', value: 'all', meta: 'all' };
const STAGED_TARGET_KINDS = new Set(['inventory-recipient', 'inventory-container', 'pour', 'room-object-container', 'social']);
const getDefaultSecondArgument = (kind?: string): string | null => (
    kind === 'room-object-container' ? ROOM_TARGET_VALUE
        : kind === 'social' ? SOCIAL_NO_TARGET_VALUE
            : null
);
const getDefaultSecondArgumentKey = (kind?: string): string | null => (
    kind === 'room-object-container' ? 'get-from-room'
        : kind === 'social' ? 'social-no-target'
            : null
);

const getInitialTarget = (item: DeckItem, target: string | null, roomOccupants: GmcpOccupant[], characterName: string, groupMembers: GroupMember[] = []): string | null => {
    if (item.targetKind && (STAGED_TARGET_KINDS.has(item.targetKind) || item.targetKind === 'shop' || item.targetKind === 'draw-targets' || item.targetKind === 'pipes' || item.targetKind === 'inventory-meat')) return null;
    return (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
        || getRememberedCommandTarget(item.cmd)
        || getAutoRoomTarget(item.cmd, roomOccupants, characterName, groupMembers)
        || getDefaultCommandTarget(item.cmd);
};

export interface DeckItem {
    label: string;
    cmd: string;
    needsTarget: boolean;
    targetKind?: DeckTargetKind;
    holdOpensMenuOnly?: boolean;
    targetReady?: boolean;
    requirement?: { raceOrSubrace: string[] };
}

export interface UseDeckTargetingProps {
    target: string | null;
    /** @deprecated Global target changes are handled outside command menus. */
    setTarget?: (target: string | null) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
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
    handleSelectTarget: (targetValue: string, preserveMenuOnPointerUp?: boolean, columnIndex?: number, suggestion?: CommandTargetSuggestion, keepOpenAfterFire?: boolean) => void;
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
    characterName = '',
}: UseDeckTargetingProps): UseDeckTargetingReturn => {
    const roomWaterAvailable = useRoomDrinkWater();
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
    const lastSocialCommandRef = useRef<string | null>(null);

    const refreshGearTargets = useCallback((item: DeckItem) => {
        const verb = item.cmd.trim().split(/\s+/, 1)[0]?.toLowerCase();
        if (verb === 'remove') executeCommand('equipment', true, true, false, true);
        if (verb === 'wear' || verb === 'wield') executeCommand('inventory', true, true, false, true);
    }, [executeCommand]);

    const roomChars = useRoomStore(s => s.chars);
    const roomItemsObj = useRoomStore(s => s.items);
    const whoList = useRoomStore(s => s.whoList);
    const shopItems = useUIStore(s => s.shopItems);
    const { groupMembers } = useVitals();
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const roomItems = useMemo(() => Object.values(roomItemsObj), [roomItemsObj]);

    const activeVerb = activeItem?.cmd.trim().toLowerCase().split(/\s+/)[0];
    const isWhoTarget = activeVerb === 'tell' || activeVerb === 'whisper' || activeVerb === 'ask' || activeItem?.targetKind === 'who';
    const requestWhoList = useWhoListRefresh(whoList, executeCommand);
    const isSocialTarget = activeVerb === 'social' || activeItem?.targetKind === 'social';
    const isStagedTargetMenu = activeItem?.targetKind === 'social'
        || activeItem?.targetKind === 'inventory-recipient'
        || activeItem?.targetKind === 'inventory-container'
        || activeItem?.targetKind === 'pour'
        || activeItem?.targetKind === 'room-object-container';

    const secondArgumentSuggestions = useMemo(() => {
        if (activeItem?.targetKind === 'social') {
            return [
                { key: 'social-no-target', label: 'Blank Target', value: SOCIAL_NO_TARGET_VALUE, meta: 'source' },
                ...getRoomTargetSuggestions(roomOccupants, [], 'characters', characterName),
            ];
        }
        if (activeItem?.targetKind === 'inventory-recipient') {
            return getGiveRecipientSuggestions(roomOccupants, characterName);
        }
        if (activeItem?.targetKind === 'pour') {
            return getFluidContainerTargetSuggestions(inventoryLines, wornLines, selectedFirstArgument);
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
    }, [activeItem?.targetKind, roomOccupants, roomItems, inventoryLines, wornLines, characterName, selectedFirstArgument]);

    const selectedGetSource = activeItem?.targetKind === 'room-object-container'
        ? secondArgumentSuggestions.find(suggestion => suggestion.key === selectedSecondArgumentKey)
            || secondArgumentSuggestions.find(suggestion => suggestion.value === selectedSecondArgument)
        : undefined;

    const firstArgumentSuggestions = useMemo(() => {
        if (activeItem?.targetKind === 'social') return getSocialTargetSuggestions();
        if (activeItem?.targetKind === 'inventory-recipient') return [
            ALL_ARGUMENT_SUGGESTION,
            ...getInventoryAndWornTargetSuggestions(inventoryLines, wornLines)
        ];
        if (activeItem?.targetKind === 'pour') return getDrinkTargetSuggestions(inventoryLines, wornLines);
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
            return [ALL_ARGUMENT_SUGGESTION, ...getGearTargetSuggestions(contents, 'inventory').map(suggestion => ({
                ...suggestion,
                meta: 'container',
                objectLocation: 'container' as const
            }))];
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

    useEffect(() => {
        if (isTargetMenuOpen && isWhoTarget) requestWhoList();
    }, [isTargetMenuOpen, isWhoTarget, requestWhoList]);

    const targetSuggestions = useMemo(() => {
        if (!activeItem) return undefined;
        if (/^butcher(?:\s|$)/i.test(activeItem.cmd.trim())) return getRoomCorpseTargetSuggestions(roomItems);
        if (isWhoTarget) return getWhoTargetSuggestions(whoList, characterName);
        if (isSocialTarget) return getSocialTargetSuggestions();
        if (activeItem.targetKind === 'mounts') {
            return getMountTargetSuggestions(roomOccupants, activeVerb === 'unsaddle');
        }
        if (activeItem.targetKind === 'lanterns') return /^fill\b/i.test(activeItem.cmd.trim())
            ? getFillTargetSuggestions(inventoryLines, wornLines)
            : getLanternTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.targetKind === 'group') {
            return getGroupSelectionSuggestions(groupMembers, roomOccupants, roomItems, characterName);
        }
        if (activeItem.targetKind === 'shop') {
            return shopItems.map(item => ({ key: `shop-item-${item.num}`, label: item.name, value: String(item.num), meta: 'shop-item' }));
        }
        if (activeItem.targetKind === 'room-corpses') return getRoomCorpseTargetSuggestions(roomItems);
        if (activeItem.targetKind === 'throwables') {
            const throwable = (line: DrawerLine) => hasObjectTrait(line, 'trait-throwable');
            const inventoryThrowables = inventoryLines.filter(line => throwable(line) && /twisted rock fragment/i.test(`${line.text} ${line.context || ''}`));
            const wornThrowables = wornLines.filter(line => throwable(line)
                && /(?:twisted rock fragment|glass flask)/i.test(`${line.text} ${line.context || ''}`));
            return getInventoryAndWornTargetSuggestions(inventoryThrowables, wornThrowables);
        }
        if (activeItem.targetKind === 'scrolls') {
            return getGearTargetSuggestions(
                inventoryLines.filter(line => hasObjectTrait(line, 'trait-reciteable')),
                'inventory'
            );
        }
        if (activeItem.targetKind === 'worn-mixing-tools') {
            return getGearTargetSuggestions(
                wornLines.filter(line => line.isItem && /(?:\bkit\b|\bfragment smelling bag\b)/i.test(`${line.text} ${line.context || ''}`)),
                'worn'
            );
        }
        if (activeItem.targetKind === 'inventory-meat') {
            return getMeatTargetSuggestions(inventoryLines);
        }
        if (!activeItem.targetKind) {
            const commandKind = getCommandTargetMenuKind(activeItem.cmd);
            if (commandKind === 'self-only') return [getSelfTargetSuggestion()];
            if (commandKind === 'self-allies') return getSelfAndRoomAlliesTargetSuggestions(roomOccupants, characterName);
            if (commandKind === 'self-room') return getSelfAndRoomTargetSuggestions(roomOccupants, roomItems, characterName);
            if (commandKind === 'self-inventory') return [
                getSelfTargetSuggestion(),
                ...getGearTargetSuggestions(inventoryLines, 'inventory')
            ];
            if (commandKind === 'gear') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
            if (commandKind === 'worn-weapons') {
                const wornWeapons = wornLines.filter(line => hasObjectTrait(line, 'trait-weapon'));
                return getGearTargetSuggestions(wornWeapons, 'worn');
            }
            if (commandKind === 'lanterns') return /^fill\b/i.test(activeItem.cmd.trim())
                ? getFillTargetSuggestions(inventoryLines, wornLines)
                : getLanternTargetSuggestions(inventoryLines, wornLines);
            if (commandKind === 'weather-options') return [
                { key: 'weather-clouds-less', label: 'Clouds less', value: 'clouds less', meta: 'weather' },
                { key: 'weather-clouds-more', label: 'Clouds more', value: 'clouds more', meta: 'weather' },
                { key: 'weather-fog-decrease', label: 'Fog decrease', value: 'fog decrease', meta: 'weather' },
                { key: 'weather-fog-increase', label: 'Fog increase', value: 'fog increase', meta: 'weather' },
                { key: 'weather-temperature-lower', label: 'Temperature lower', value: 'temperature lower', meta: 'weather' },
                { key: 'weather-temperature-higher', label: 'Temperature higher', value: 'temperature higher', meta: 'weather' }
            ];
            if (commandKind === 'room-spell' || commandKind === 'room-spell-with-extras' || commandKind === 'room') {
                if (/^rescue(?:\s|$)/i.test(activeItem.cmd.trim())) {
                    return getRescueTargetSuggestions(roomOccupants, characterName, groupMembers);
                }
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
                return getGiveRecipientSuggestions(roomOccupants, characterName);
            }
            if (activeItem.targetKind === 'pour') return secondArgumentSuggestions;
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
            const sheaths = wornLines.filter(line => hasObjectTrait(line, 'trait-sheath'));
            return [
                { key: 'draw-no-target', label: 'No target', value: BLANK_TARGET_VALUE, meta: 'blank' },
                ...getGearTargetSuggestions(sheaths, 'worn')
            ];
        }
        if (activeItem.targetKind === 'draw-targets') return getDrawTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.targetKind === 'fluid-containers') return getFluidContainerTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.targetKind === 'pipes') return getPipeTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.targetKind === 'worn-weapons') {
            if (/^sheath\b/i.test(activeItem.cmd.trim())) return getSheathTargetSuggestions(wornLines);
            const weapons = wornLines.filter(line => hasObjectTrait(line, 'trait-weapon'));
            return getGearTargetSuggestions(weapons, 'worn');
        }
        if (activeItem.targetKind === 'inventory-weapons') {
            const weapons = inventoryLines.filter(line => hasObjectTrait(line, 'trait-weapon'));
            return getGearTargetSuggestions(weapons, 'inventory');
        }
        if (activeItem.targetKind === 'inventory-and-worn') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.targetKind === 'inventory-container') return [ALL_ARGUMENT_SUGGESTION, ...getGearTargetSuggestions(inventoryLines, 'inventory')];
        if (activeItem.targetKind === 'inventory-recipient') return getInventoryAndWornTargetSuggestions(inventoryLines, wornLines);
        if (activeItem.cmd.trim().toLowerCase() === 'drink') return getDrinkTargetSuggestions(inventoryLines, wornLines, roomWaterAvailable);
        const inventoryTargets = getGearTargetSuggestions(inventoryLines, 'inventory');
        return inventoryTargets;
    }, [activeItem, activeVerb, isWhoTarget, isSocialTarget, isSecondArgumentStage, roomOccupants, roomItems, characterName, wornLines, inventoryLines, whoList, groupMembers, shopItems, roomWaterAvailable]);
    const targetMenuTitle = isSecondArgumentStage && activeItem?.targetKind === 'pour' ? 'POUR INTO'
        : isStagedTargetMenu ? 'SELECT ARGUMENTS' : isWhoTarget ? 'WHO LIST' : isSocialTarget ? 'SOCIAL COMMANDS'
        : isSecondArgumentStage && activeItem?.targetKind === 'inventory-recipient' ? 'RECIPIENTS'
        : isSecondArgumentStage && activeItem?.targetKind === 'inventory-container' ? 'PUT INTO'
        : isSecondArgumentStage && activeItem?.targetKind === 'room-object-container' ? 'GET FROM'
        : activeItem?.targetKind === 'room-objects' || activeItem?.targetKind === 'room-object-container' ? 'ROOM ITEMS'
        : activeItem?.targetKind === 'room-corpses' ? 'CORPSES'
        : activeItem?.targetKind === 'worn' ? 'WORN ITEMS'
        : activeItem?.targetKind === 'worn-sheaths' ? 'WORN SHEATHS'
        : activeItem?.targetKind === 'draw-targets' ? 'DRAW TARGETS'
        : activeItem?.targetKind === 'worn-weapons' ? 'WORN WEAPONS'
        : activeItem?.targetKind === 'inventory-weapons' ? 'INVENTORY WEAPONS'
        : activeItem?.targetKind === 'fluid-containers' ? 'FLUID CONTAINERS'
        : activeItem?.targetKind === 'pipes' ? 'PIPES'
        : activeItem?.targetKind === 'worn-mixing-tools' ? 'MIXING TOOLS'
        : activeItem?.targetKind === 'inventory-meat' ? 'MEAT'
        : activeItem?.targetKind === 'lanterns' ? 'LANTERNS'
        : activeItem?.targetKind === 'inventory-and-worn' ? 'INVENTORY AND WORN'
        : activeItem?.targetKind === 'throwables' ? 'THROWABLES'
        : activeItem?.targetKind === 'scrolls' ? 'SCROLLS'
        : activeItem?.targetKind === 'mounts' ? 'MOUNTS'
        : activeItem?.targetKind === 'group' ? 'GROUP'
        : activeItem?.targetKind === 'shop' ? 'SHOP'
        : activeItem?.targetKind === 'status-panel' ? 'THIS IS YOU'
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
        const recentSocialCommand = item.targetKind === 'social'
            ? getSocialTargetSuggestions().find(suggestion => suggestion.value === lastSocialCommandRef.current)
            : undefined;
        setSelectedFirstArgument(recentSocialCommand?.value ?? null);
        setSelectedFirstArgumentKey(recentSocialCommand?.key ?? null);
        setLoadingContainer(null);
        firstArgumentRef.current = recentSocialCommand?.value ?? null;
        const defaultSecondArgument = getDefaultSecondArgument(item.targetKind);
        setSelectedSecondArgument(defaultSecondArgument);
        setSelectedSecondArgumentKey(getDefaultSecondArgumentKey(item.targetKind));
        secondArgumentRef.current = defaultSecondArgument;
        const initialSecondArgument = defaultSecondArgument;
        const initialTarget = item.targetKind === 'room-object-container'
            ? initialSecondArgument
            : getInitialTarget(item, target, roomOccupants, characterName, groupMembers);
        setPendingTarget(initialTarget);
        pendingTargetRef.current = initialTarget;
        setIsTargetMenuOpen(true);
        triggerHaptic?.(20);
    }, [characterName, clearHoldTimer, groupMembers, roomOccupants, target, triggerHaptic]);

    const executeStagedCommand = useCallback((item: DeckItem, firstArgument: string, secondArgument: string, keepOpenAfterFire = false) => {
        const targetPart = (item.targetKind === 'room-object-container' && secondArgument === ROOM_TARGET_VALUE)
            || (item.targetKind === 'social' && secondArgument === SOCIAL_NO_TARGET_VALUE)
            ? ''
            : ` ${secondArgument}`;
        flashPressed(item.label);
        triggerHaptic?.(15);
        const command = item.targetKind === 'social'
            ? `${firstArgument}${targetPart}`.trim()
            : `${item.cmd}${firstArgument}${targetPart}`.trim();
        if (item.targetKind === 'social') lastSocialCommandRef.current = firstArgument;
        executeCommand(command);
        if (keepOpenAfterFire) {
            const defaultFirstArgument = item.targetKind === 'social' ? firstArgument : null;
            const defaultSuggestion = defaultFirstArgument
                ? getSocialTargetSuggestions().find(suggestion => suggestion.value === defaultFirstArgument)
                : undefined;
            const defaultSecondArgument = getDefaultSecondArgument(item.targetKind);
            firstArgumentRef.current = defaultFirstArgument;
            secondArgumentRef.current = defaultSecondArgument;
            pendingTargetRef.current = defaultSecondArgument;
            setPendingTarget(defaultSecondArgument);
            setIsSecondArgumentStage(false);
            setSelectedFirstArgument(defaultFirstArgument);
            setSelectedFirstArgumentKey(defaultSuggestion?.key ?? null);
            setSelectedSecondArgument(defaultSecondArgument);
            setSelectedSecondArgumentKey(getDefaultSecondArgumentKey(item.targetKind));
            setLoadingContainer(null);
        } else {
            closeTargetMenu();
        }
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
            const recentSocialCommand = item.targetKind === 'social'
                ? getSocialTargetSuggestions().find(suggestion => suggestion.value === lastSocialCommandRef.current)
                : undefined;
            setSelectedFirstArgument(recentSocialCommand?.value ?? null);
            setSelectedFirstArgumentKey(recentSocialCommand?.key ?? null);
            setLoadingContainer(null);
            firstArgumentRef.current = recentSocialCommand?.value ?? null;
            const defaultSecondArgument = getDefaultSecondArgument(item.targetKind);
            setSelectedSecondArgument(defaultSecondArgument);
            setSelectedSecondArgumentKey(getDefaultSecondArgumentKey(item.targetKind));
            secondArgumentRef.current = defaultSecondArgument;
            const initialTarget = item.targetKind === 'room-object-container'
                ? defaultSecondArgument
                : getInitialTarget(item, target, roomOccupants, characterName, groupMembers);
            setPendingTarget(initialTarget);
            pendingTargetRef.current = initialTarget;
            setIsSecondArgumentStage(false);
            setIsTargetMenuOpen(true);
            refreshGearTargets(item);
            triggerHaptic?.(20);
        }, 220);
    }, [characterName, clearHoldTimer, groupMembers, refreshGearTargets, roomOccupants, target, triggerHaptic]);

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
            if (item.targetKind && STAGED_TARGET_KINDS.has(item.targetKind)) {
                const firstArgument = firstArgumentRef.current;
                const secondArgument = secondArgumentRef.current;
                if (firstArgument && secondArgument) executeStagedCommand(item, firstArgument, secondArgument);
                else closeTargetMenu();
                return;
            }
            if (item.targetKind === 'group' || item.targetKind === 'shop' || item.targetKind === 'status-panel') {
                heldPointerIdRef.current = null;
                setIsTargetMenuHeld(false);
                return;
            }
            if (item.targetKind || item.holdOpensMenuOnly) {
                closeTargetMenu();
                return;
            }
            const effectiveTarget = pendingTargetRef.current
                || (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
                || getRememberedCommandTarget(item.cmd);
            if (effectiveTarget) {
                flashPressed(item.label);
                triggerHaptic?.(15);
                executeCommand(`${item.cmd}${effectiveTarget}`.trim());
                closeTargetMenu();
                return;
            }
            closeTargetMenu();
        }
    }, [clearHoldTimer, closeTargetMenu, executeCommand, executeStagedCommand, flashPressed, isSecondArgumentStage, target, triggerHaptic]);

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
        if (item.targetKind === 'group' || item.targetKind === 'shop' || item.targetKind === 'status-panel') {
            openTargetMenuFor(item);
            return;
        }
        fire(item);
    }, [fire, openTargetMenuFor]);

    const handleSelectTarget = useCallback((targetValue: string, preserveMenuOnPointerUp = false, columnIndex?: number, suggestion?: CommandTargetSuggestion, keepOpenAfterFire = false) => {
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
                        if (itemToFire.targetKind === 'inventory-recipient' && !secondArgumentRef.current) {
                            const defaultRecipient = secondArgumentSuggestions[0];
                            if (defaultRecipient) {
                                secondArgumentRef.current = defaultRecipient.value;
                                setSelectedSecondArgument(defaultRecipient.value);
                                setSelectedSecondArgumentKey(defaultRecipient.key);
                            }
                        }
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
                    if (firstArgumentRef.current && secondArgumentRef.current
                        && !(itemToFire.targetKind === 'inventory-recipient' && selectedColumn === 0)) {
                        executeStagedCommand(itemToFire, firstArgumentRef.current, secondArgumentRef.current, keepOpenAfterFire);
                    }
                    return;
                }
                if (heldPointerIdRef.current !== null) {
                    setPendingTarget(targetValue);
                    pendingTargetRef.current = targetValue;
                    return;
                }
                const command = targetValue === BLANK_TARGET_VALUE
                    ? itemToFire.cmd.trim()
                    : (itemToFire.targetKind === 'social' || itemToFire.cmd.trim() === 'social')
                        ? (target ? `${targetValue} ${target}`.trim() : targetValue)
                        : `${itemToFire.cmd}${targetValue}`.trim();
                if (itemToFire.targetKind === 'mounts' && targetValue !== BLANK_TARGET_VALUE) {
                    rememberCommandTarget(itemToFire.cmd, targetValue);
                }
                setPendingTarget(targetValue);
                pendingTargetRef.current = targetValue;
                flashPressed(itemToFire.label);
                executeCommand(command);
                if (!keepOpenAfterFire) closeTargetMenu();
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
            if (!keepOpenAfterFire) closeTargetMenu();
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
            } else closeTargetMenu();
            return;
        }
        if (!selected) {
            closeTargetMenu();
            return;
        }

        const command = selected === BLANK_TARGET_VALUE
            ? item.cmd.trim()
            : item.targetKind === 'social' || item.cmd.trim() === 'social'
            ? (target ? `${selected} ${target}`.trim() : selected)
            : `${item.cmd}${selected}`.trim();
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
