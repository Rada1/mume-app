/**
 * @file CommandDeck.tsx
 * @description Desktop tactical action deck — a WoW/LoL-style ability bar in the
 * action box below the log. Loadout tabs page a uniform grid of action slots
 * (combat, social, utility). Movement lives on the MovementPad (under the map)
 * and class skills live on the SkillsDeck (under the character drawer). Mobile
 * can reuse this deck in the map gutter for the center action buttons.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { useGame, useVitals } from '../../context/GameContext';
import { useUI } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { doesCommandMatchDeckItem } from '../../utils/commandFeedbackUtils';
import { getRememberedCommandTarget, isCompatibleGlobalTarget, rememberCommandTarget } from '../../utils/commandTargetMemory';
import { useDeckTargeting, DeckItem } from './useDeckTargeting';
import { TacticalTargetBar } from '../Controls/GameButton/TacticalTargetBar';
import { RightPanelTargetBar } from './RightPanelTargetBar';
import { DeckCategoryWheel } from './DeckCategoryWheel';
import { ThisIsYouConsole } from './ThisIsYouConsole';
import { RightActionPanel } from './RightActionPanel';
import { ShopTargetMenu } from '../Shop/ShopTargetMenu';
import type { GameButtonProps } from '../Controls/GameButton/GameButton';
import { DECK_ACTIONS, DECK_TABS, DECK_LABEL_ICONS, DEFAULT_DECK_ICON, isDeckActionAvailable, type TabKey } from './commandDeckData';
import { useRoomStore } from '../../stores/useRoomStore';
import { getAutoRoomTarget, getCombatRoomTarget, getViableRoomCharacterTargets } from '../../utils/commandAutoTarget';
import type { CustomButton, DrawerLine, SwipeDirection } from '../../types';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import './CommandDeck.css';

const DECK_WHEEL_STORAGE_KEY = 'mud-deck-wheel-actions';
const WHEEL_DIRECTIONS = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'] as const;
type DeckWheelAssignments = Partial<Record<TabKey, Array<string | null>>>;

const getWheelActionKey = (item: DeckItem): string => `${item.label.trim()}::${item.cmd.trim()}`;

const getWheelActionForCommand = (actions: DeckItem[], command: string): DeckItem | undefined => {
    const normalized = command.trim().toLowerCase();
    return [...actions]
        .sort((left, right) => right.cmd.trim().length - left.cmd.trim().length)
        .find(action => {
            const baseCommand = action.cmd.trim().toLowerCase();
            return normalized === baseCommand || normalized.startsWith(`${baseCommand} `);
        });
};

const WHEEL_DIRECTION_MAP: SwipeDirection[] = ['right', 'se', 'down', 'sw', 'left', 'nw', 'up', 'ne'];

const makeDeckItem = (item: DeckItem): DeckItem => ({
    ...item,
    needsTarget: item.needsTarget ?? item.cmd.endsWith(' '),
});

const readDeckWheelAssignments = (): DeckWheelAssignments => {
    try {
        const stored = localStorage.getItem(DECK_WHEEL_STORAGE_KEY);
        return stored ? JSON.parse(stored) as DeckWheelAssignments : {};
    } catch {
        return {};
    }
};

interface CommandDeckProps {
    tactical?: Pick<GameButtonProps, 'isEditMode' | 'dragState' | 'handleDragStart' | 'wasDraggingRef' | 'heldButton' | 'setHeldButton' | 'setCommandPreview'>;
}

export const CommandDeck: FC<CommandDeckProps> = ({ tactical }) => {
    const game = useGame() as {
        executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
        triggerHaptic?: (ms: number) => void;
        setTarget: (target: string | null) => void;
        characterName?: string;
        opponentId?: string | number | null;
        opponentName?: string | null;
        viewport?: { isMobile: boolean };
        btn: { setActiveSet: (setId: string) => void; setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>> };
        handleButtonClick: (button: CustomButton, event: React.MouseEvent | React.PointerEvent) => void;
        joystick: { joystickActive: boolean; currentDir: string | null; isTargetModifierActive: boolean; setIsJoystickConsumed: (value: boolean) => void };
        parser?: {
            setPendingFlags: (silent: boolean, fromDrawer: boolean, command?: string) => void;
            setLastRequestedContainerId?: (containerId: string | null) => void;
        };
        containerContents?: Record<string, DrawerLine[]>;
    };
    const { executeCommand, triggerHaptic, setTarget, characterName, opponentId, opponentName, viewport, parser, containerContents } = game;
    const combatOpponent = useMemo(() => ({ id: opponentId ?? null, name: opponentName ?? null }), [opponentId, opponentName]);
    const { target } = useActiveVitals() as { target: string | null };
    const { characterInfo } = useVitals();
    const race = characterInfo.race || '';
    const subrace = characterInfo.subrace || '';
    const roomChars = useRoomStore(state => state.chars);
    const roomZone = useRoomStore(state => state.roomZone);
    const roomOccupants = useMemo(() => Object.values(roomChars), [roomChars]);
    const { displayInventoryLines, displayEqLines, setPopoverState } = useUI();
    const setInput = useInputStore(s => s.setInput);
    const requestTargetPicker = useInputStore(s => s.requestTargetPicker);
    const localHeldButton = useState<GameButtonProps['heldButton']>(null);
    const localCommandPreview = useState<string | null>(null);
    const localWasDragging = useRef(false);
    const heldButton = tactical?.heldButton ?? localHeldButton[0];
    const setHeldButton = tactical?.setHeldButton ?? localHeldButton[1];
    const setCommandPreview = tactical?.setCommandPreview ?? localCommandPreview[1];
    const wasDraggingRef = tactical?.wasDraggingRef ?? localWasDragging;

    const [activeTab, setActiveTab] = useState<TabKey | null>(() => {
        const saved = localStorage.getItem('mud-deck-tab');
        const isKnownTab = DECK_TABS.some(tab => tab.key === saved);
        const isMobileOnlyTab = saved === 'consume';
        return isKnownTab && (viewport?.isMobile || !isMobileOnlyTab) ? (saved as TabKey) : 'combat';
    });
    const [deckWheelAssignments, setDeckWheelAssignments] = useState<DeckWheelAssignments>(readDeckWheelAssignments);

    useEffect(() => {
        localStorage.setItem(DECK_WHEEL_STORAGE_KEY, JSON.stringify(deckWheelAssignments));
    }, [deckWheelAssignments]);

    const deckWheelCatalog = useMemo(() => Object.values(DECK_ACTIONS).flatMap(category => category.map(makeDeckItem)), []);

    useEffect(() => {
        const isAvailableTab = DECK_TABS.some(tab => tab.key === activeTab)
            && (viewport?.isMobile || activeTab !== 'consume');
        if (activeTab && !isAvailableTab) {
            setActiveTab('combat');
            localStorage.setItem('mud-deck-tab', 'combat');
        }
    }, [activeTab, viewport?.isMobile]);

    const selectTab = (key: TabKey) => {
        setActiveTab(key);
        localStorage.setItem('mud-deck-tab', key);
        triggerHaptic?.(10);
    };

    // Transient "pick a target" hint shown when a target-required action is
    // fired with nothing selected.
    const [needsTargetHint, setNeedsTargetHint] = useState<string | null>(null);
    const hintTimerRef = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(hintTimerRef.current), []);

    const [pressedLabel, setPressedLabel] = useState<string | null>(null);
    const pressTimerRef = useRef<number | undefined>(undefined);

    const flashPressed = useCallback((label: string) => {
        window.clearTimeout(pressTimerRef.current);
        setPressedLabel(label);
        pressTimerRef.current = window.setTimeout(() => setPressedLabel(null), 140);
    }, []);

    const items = useMemo<DeckItem[]>(() => (
        (activeTab ? DECK_ACTIONS[activeTab].filter(item => isDeckActionAvailable(item, race, subrace)) : []).map(item => ({
            label: item.label,
            cmd: item.cmd,
            needsTarget: item.needsTarget ?? item.cmd.endsWith(' '),
            targetKind: item.targetKind,
            holdOpensMenuOnly: item.holdOpensMenuOnly,
        }))
    ), [activeTab, race, subrace]);

    const itemsRef = useRef(items);
    useEffect(() => { itemsRef.current = items; }, [items]);

    useEffect(() => {
        const onCommandSent = (event: Event) => {
            const cmd = (event as CustomEvent<{ cmd?: string }>).detail?.cmd;
            if (!cmd) return;
            const matched = itemsRef.current.find(item => doesCommandMatchDeckItem(cmd, item));
            if (matched) {
                flashPressed(matched.label);
            }
        };

        window.addEventListener('mume-command-sent', onCommandSent);
        return () => {
            window.removeEventListener('mume-command-sent', onCommandSent);
            window.clearTimeout(pressTimerRef.current);
        };
    }, [flashPressed]);

    const fire = (item: DeckItem) => {
        if (item.targetKind === 'mounts') {
            const rememberedMount = getRememberedCommandTarget(item.cmd);
            if (rememberedMount) {
                flashPressed(item.label);
                triggerHaptic?.(15);
                executeCommand(`${item.cmd}${rememberedMount}`.trim());
                return;
            }
        }
        if (item.targetKind) {
            flashPressed(item.label);
            triggerHaptic?.(10);
            setInput(item.cmd);
            document.getElementById('mud-input')?.focus();
            return;
        }
        const effectiveTarget = (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
            || getCombatRoomTarget(item.cmd, roomOccupants, characterName || '', combatOpponent)
            || getRememberedCommandTarget(item.cmd)
            || getAutoRoomTarget(item.cmd, roomOccupants, characterName || '', roomZone, combatOpponent);
        if (item.needsTarget && !effectiveTarget) {
            // No target selected — make it obvious one is required rather than
            // silently priming the input (which read as "nothing happened").
            triggerHaptic?.(30);
            setNeedsTargetHint(item.label);
            window.clearTimeout(hintTimerRef.current);
            hintTimerRef.current = window.setTimeout(() => setNeedsTargetHint(null), 3200);
            // Still prime the input so typing a target name also works.
            setInput(item.cmd);
            requestTargetPicker();
            setTimeout(() => {
                const el = document.getElementById('mud-input') as HTMLTextAreaElement | null;
                if (el) { el.focus(); el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
            }, 50);
            return;
        }
        flashPressed(item.label);
        triggerHaptic?.(15);
        if (item.needsTarget && effectiveTarget) {
            rememberCommandTarget(item.cmd, effectiveTarget);
        }
        executeCommand(item.needsTarget && effectiveTarget ? `${item.cmd}${effectiveTarget}`.trim() : item.cmd.trim());
    };

    const requestContainerContents = useCallback((source: CommandTargetSuggestion) => {
        if (!parser || !source.containerId || !source.containerCommand) return;
        parser.setPendingFlags(true, true, source.containerCommand);
        parser.setLastRequestedContainerId?.(source.containerId);
        executeCommand(source.containerCommand, true, true, false, true);
    }, [executeCommand, parser]);

    const deckTargeting = useDeckTargeting({
        target,
        executeCommand,
        triggerHaptic,
        flashPressed,
        fire,
        inventoryLines: displayInventoryLines,
        wornLines: displayEqLines,
        containerContents,
        requestContainerContents,
        characterName,
        roomZone,
        combatOpponent,
    });

    // The visible number badges are command-line shortcuts, not instant-cast
    // hotkeys. Keep the action editable (and require Enter to send it), just
    // like choosing a command from the input's suggestion list.
    const primeCommand = (item: DeckItem) => {
        triggerHaptic?.(10);
        setInput(item.cmd);
        requestAnimationFrame(() => {
            const input = document.getElementById('mud-input') as HTMLTextAreaElement | null;
            if (!input) return;
            input.focus();
            input.style.height = 'auto';
            input.style.height = `${input.scrollHeight}px`;
        });
    };

    // Number-row hotkeys (1-9, 0) populate the matching action in the command
    // bar. They intentionally work while that bar is focused as well; otherwise
    // its normal focused state would make the visible shortcuts unusable.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.code.startsWith('Numpad') || e.location === 3) return;
            if (e.defaultPrevented) return;
            const active = document.activeElement as HTMLElement | null;
            const isCommandBar = active?.id === 'mud-input';
            if (active && !isCommandBar && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            // Once a deck command has opened the input's suggestion list, its
            // number badges take precedence (for example: 1 = the first kill
            // target). Never let the deck consume that follow-up key.
            if (document.querySelector('.command-suggestion-popup')) return;
            if (!/^[0-9]$/.test(e.key)) return;

            // Only trigger number shortcuts when the command bar is empty.
            // If the player has already typed anything (e.g. "go 2"),
            // let the number be typed into the input instead of hijacking it.
            const mudInputEl = document.getElementById('mud-input') as HTMLTextAreaElement | null;
            const currentText = isCommandBar
                ? ((active as HTMLTextAreaElement).value ?? '')
                : (mudInputEl?.value ?? useInputStore.getState().input ?? '');

            if (currentText.length > 0) return;

            const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
            if (idx < items.length) {
                e.preventDefault();
                primeCommand(items[idx]);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [items, triggerHaptic, setInput]);

    const iconFor = (item: DeckItem): React.ComponentType<{ size?: number; strokeWidth?: number }> => {
        return DECK_LABEL_ICONS[item.label] || DEFAULT_DECK_ICON;
    };

    const getWheelTargetReady = (item: DeckItem): boolean => {
        if (!item.needsTarget || item.targetKind) return false;
        const chipTarget = target || getCombatRoomTarget('hit', roomOccupants, characterName || '', combatOpponent)
            || getAutoRoomTarget('hit', roomOccupants, characterName || '', roomZone, combatOpponent);
        if (!chipTarget) return false;
        const viableTargets = getViableRoomCharacterTargets(item.cmd, roomOccupants, characterName || '', combatOpponent);
        if (!viableTargets.some(value => value.toLowerCase() === chipTarget.toLowerCase())) return false;
        const commandTarget = (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
            || getCombatRoomTarget(item.cmd, roomOccupants, characterName || '', combatOpponent)
            || getRememberedCommandTarget(item.cmd)
            || getAutoRoomTarget(item.cmd, roomOccupants, characterName || '', roomZone, combatOpponent);
        return commandTarget?.toLowerCase() === chipTarget.toLowerCase();
    };

    return (
        <div className="command-deck" onClick={e => e.stopPropagation()}>
            {needsTargetHint && (
                <div className="deck-target-hint" role="status">
                    <Target size={12} strokeWidth={2.4} />
                    <span>Pick a target for <strong>{needsTargetHint}</strong> — tap a name in the room or log</span>
                </div>
            )}
            <div className="deck-tab-rail" role={viewport?.isMobile ? 'toolbar' : 'tablist'} aria-label={viewport?.isMobile ? 'Action controls' : 'Action loadouts'}>
                {DECK_TABS.filter(tab => viewport?.isMobile || (tab.key !== 'personal' && tab.key !== 'consume')).map(tab => {
                    const Icon = tab.icon;
                    const defaults = DECK_ACTIONS[tab.key].map(makeDeckItem);
                    const categoryAvailableActions = defaults.filter(item => isDeckActionAvailable(item, race, subrace));
                    const savedKeys = deckWheelAssignments[tab.key];
                    const categoryActions = savedKeys?.length
                        ? Array.from({ length: 8 }, (_, index) => {
                            if (index >= savedKeys.length) return defaults[index];
                            const key = savedKeys[index];
                            if (!key) return undefined;
                            const item = categoryAvailableActions.find(action => getWheelActionKey(action) === key);
                            if (!item) return defaults[index];
                            return item;
                        })
                        : defaults.slice(0, 8);
                    const assignedSpokeKeys = new Set(categoryActions
                        .filter((item): item is DeckItem => item !== undefined && isDeckActionAvailable(item, race, subrace))
                        .map(item => getWheelActionKey(item)));
                    const defaultCenterAction = categoryAvailableActions.find(item => !assignedSpokeKeys.has(getWheelActionKey(item)));
                    const savedCenterKey = savedKeys?.[8];
                    const savedCenterAction = savedCenterKey
                        ? categoryAvailableActions.find(item => getWheelActionKey(item) === savedCenterKey)
                        : undefined;
                    const centerAction = savedCenterAction && !assignedSpokeKeys.has(getWheelActionKey(savedCenterAction))
                        ? savedCenterAction
                        : defaultCenterAction;
                    const wheelActions = categoryActions.map(item => item && isDeckActionAvailable(item, race, subrace)
                        ? { ...item, targetReady: getWheelTargetReady(item) }
                        : undefined);
                    const targetKindByCommand = Object.fromEntries(
                        [
                            ...deckWheelCatalog.filter(item => item.targetKind),
                            ...[...wheelActions, centerAction].filter((item): item is DeckItem => Boolean(item?.targetKind)),
                        ].map(item => [item.cmd.trim().toLowerCase().split(/\s+/)[0], item.targetKind!])
                    );
                    const button: CustomButton = {
                        id: `deck-category-${tab.key}`,
                        setId: 'Tactical',
                        label: tab.label,
                        command: centerAction?.cmd || '',
                        display: 'standard',
                        isVisible: true,
                        style: {
                            w: 38, h: 38, borderWidth: 1, borderRadius: 7,
                            backgroundColor: 'rgba(35, 28, 22, 0.82)',
                            borderColor: 'rgba(201, 168, 76, 0.14)',
                            color: '#b0a080',
                        },
                        position: { x: 0, y: 0, w: 38, h: 38 },
                        swipeCommands: Object.fromEntries(WHEEL_DIRECTION_MAP.map((direction, index) => [direction, wheelActions[index]?.cmd || ''])) as Partial<Record<SwipeDirection, string>>,
                    };
                    const categoryGameButtonProps: Omit<GameButtonProps, 'button' | 'className' | 'useDefaultPositioning' | 'iconNode' | 'ariaLabel' | 'onSwapWheel'> = {
                        isEditMode: tactical?.isEditMode ?? false,
                        isGridEnabled: false,
                        gridSize: 1,
                        isSelected: false,
                        dragState: tactical?.dragState ?? null,
                        handleDragStart: tactical?.handleDragStart ?? (() => undefined),
                        handleButtonClick: game.handleButtonClick,
                        wasDraggingRef,
                        triggerHaptic: triggerHaptic || (() => undefined),
                        setPopoverState,
                        setEditButton: () => undefined,
                        activePrompt: null,
                        executeCommand,
                        setCommandPreview,
                        setHeldButton,
                        heldButton,
                        joystick: {
                            isActive: game.joystick.joystickActive,
                            currentDir: game.joystick.currentDir,
                            isTargetModifierActive: game.joystick.isTargetModifierActive,
                            setIsJoystickConsumed: game.joystick.setIsJoystickConsumed,
                        },
                        target,
                        setActiveSet: game.btn.setActiveSet,
                        setButtons: game.btn.setButtons,
                        isMobile: true,
                        targetKindByCommand,
                        containerContents,
                        requestContainerContents,
                    };
                    const getCurrentWheelKeys = (savedKeys?: Array<string | null>) => Array.from({ length: 9 }, (_, index) => {
                        if (savedKeys && index < savedKeys.length) return savedKeys[index];
                        if (index < 8) return defaults[index] ? getWheelActionKey(defaults[index]) : null;
                        return defaultCenterAction ? getWheelActionKey(defaultCenterAction) : null;
                    });
                    const swapCategoryCells = (sourceIndex: number, destinationIndex: number, displayedCenterCommand: string): boolean | string => {
                        if (sourceIndex < 0 || sourceIndex > 8 || destinationIndex < 0 || destinationIndex > 8 || sourceIndex === destinationIndex) return false;
                        const currentKeys = getCurrentWheelKeys(deckWheelAssignments[tab.key]);
                        const displayedCenterAction = getWheelActionForCommand(categoryAvailableActions, displayedCenterCommand);
                        if ((sourceIndex === 8 || destinationIndex === 8) && displayedCenterAction) {
                            currentKeys[8] = getWheelActionKey(displayedCenterAction);
                        }
                        if (currentKeys[sourceIndex] === currentKeys[destinationIndex]) return false;
                        [currentKeys[sourceIndex], currentKeys[destinationIndex]] = [currentKeys[destinationIndex], currentKeys[sourceIndex]];
                        setDeckWheelAssignments(previous => {
                            return { ...previous, [tab.key]: currentKeys };
                        });
                        if (sourceIndex === 8 || destinationIndex === 8) {
                            return categoryAvailableActions.find(action => getWheelActionKey(action) === currentKeys[8])?.cmd || '';
                        }
                        return true;
                    };
                    const assignCategoryAction = (directionIndex: number, replacement: DeckItem): boolean => {
                        if (directionIndex < 0 || directionIndex > 8) return false;
                        const currentKeys = getCurrentWheelKeys(deckWheelAssignments[tab.key]);
                        const replacementKey = getWheelActionKey(replacement);
                        const sourceIndex = currentKeys.indexOf(replacementKey);
                        if (currentKeys[directionIndex] === replacementKey && (sourceIndex < 0 || sourceIndex === directionIndex)) return false;
                        setDeckWheelAssignments(previous => {
                            const nextKeys = getCurrentWheelKeys(previous[tab.key]);
                            const currentSourceIndex = nextKeys.indexOf(replacementKey);
                            const destinationKey = nextKeys[directionIndex] || null;
                            if (currentSourceIndex >= 0 && currentSourceIndex !== directionIndex) nextKeys[currentSourceIndex] = destinationKey;
                            nextKeys[directionIndex] = replacementKey;
                            return { ...previous, [tab.key]: nextKeys };
                        });
                        return true;
                    };
                    return (
                        viewport?.isMobile
                            ? <DeckCategoryWheel
                                key={tab.key}
                                label={tab.label}
                                icon={Icon}
                                button={button}
                                gameButtonProps={categoryGameButtonProps}
                                availableActions={categoryAvailableActions}
                                onSwapCells={swapCategoryCells}
                                onAssignAction={assignCategoryAction}
                            />
                            : <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className="deck-tab"
                                onClick={() => selectTab(tab.key)}
                            >
                                <Icon size={13} strokeWidth={2.2} />
                                <span>{tab.label}</span>
                            </button>
                    );
                })}
            </div>

            {activeTab && !viewport?.isMobile && <div className="deck-grid-wrap">
                <div className="deck-grid" aria-label={`${activeTab} actions`}>
                    {items.map((item, i) => {
                        const Icon = iconFor(item);
                        const hotkey = i < 9 ? String(i + 1) : i === 9 ? '0' : null;
                        const itemTarget = item.needsTarget && !item.targetKind
                            ? (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
                                || getCombatRoomTarget(item.cmd, roomOccupants, characterName || '', combatOpponent)
                                || getRememberedCommandTarget(item.cmd)
                                || getAutoRoomTarget(item.cmd, roomOccupants, characterName || '', roomZone, combatOpponent)
                            : null;
                        const viableTargets = getViableRoomCharacterTargets(item.cmd, roomOccupants, characterName || '', combatOpponent);
                        const targetReady = Boolean(itemTarget && viableTargets.some(value => value.toLowerCase() === itemTarget.toLowerCase()));
                        return (
                            <button
                                key={item.label}
                                type="button"
                                className={`deck-slot state-ready${targetReady ? ' target-ready' : ''}${needsTargetHint === item.label ? ' needs-target' : ''}${pressedLabel === item.label ? ' is-key-pressed' : ''}`}
                                onPointerDown={(e) => deckTargeting.handlePointerDown(item, e)}
                                onPointerUp={(e) => deckTargeting.handlePointerUp(item, e)}
                                onPointerCancel={deckTargeting.handlePointerCancel}
                                onClick={(e) => deckTargeting.handleClick(item, e)}
                                aria-label={item.label}
                                title={itemTarget ? `${item.cmd}${itemTarget}` : item.cmd.trim()}
                            >
                                {hotkey && <span className="deck-slot-key">{hotkey}</span>}
                                <Icon size={17} strokeWidth={2} />
                                <span className="deck-slot-label">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>}

            {!viewport?.isMobile && <RightPanelTargetBar target={target} setTarget={setTarget} triggerHaptic={triggerHaptic} />}

            <TacticalTargetBar
                isOpen={deckTargeting.isTargetMenuOpen}
                currentTarget={deckTargeting.activeItem?.targetKind
                    ? null
                    : getRememberedCommandTarget(deckTargeting.activeItem?.cmd || '')
                        || (isCompatibleGlobalTarget(deckTargeting.activeItem?.cmd || '', target) ? target : null)}
                selectedTarget={deckTargeting.pendingTarget}
                onSelectTarget={(value, keepOpenAfterFire) => deckTargeting.handleSelectTarget(value, false, undefined, undefined, keepOpenAfterFire)}
                columns={deckTargeting.isStagedTargetMenu ? [
                    {
                        title: deckTargeting.activeItem?.targetKind === 'social'
                            ? 'Social'
                            : deckTargeting.activeItem?.targetKind === 'room-object-container' ? 'Item' : 'Object',
                        suggestions: deckTargeting.firstArgumentSuggestions,
                        selectedTarget: deckTargeting.selectedFirstArgument,
                        selectedKey: deckTargeting.selectedFirstArgumentKey,
                        emptyText: deckTargeting.firstArgumentEmptyText,
                    },
                    {
                        title: deckTargeting.activeItem?.targetKind === 'social'
                            ? 'Room Target'
                            : deckTargeting.activeItem?.targetKind === 'inventory-recipient' ? 'Recipient' : deckTargeting.activeItem?.targetKind === 'inventory-container' ? 'Container' : 'Get From',
                        suggestions: deckTargeting.secondArgumentSuggestions,
                        selectedTarget: deckTargeting.selectedSecondArgument,
                        selectedKey: deckTargeting.selectedSecondArgumentKey,
                    },
                ] : undefined}
                onSelectColumnTarget={(value, columnIndex, suggestion, keepOpenAfterFire) => deckTargeting.handleSelectTarget(value, false, columnIndex, suggestion, keepOpenAfterFire)}
                roomOccupants={deckTargeting.roomOccupants}
                roomItems={deckTargeting.roomItems}
                characterName={characterName}
                suggestions={deckTargeting.targetSuggestions}
                title={deckTargeting.targetMenuTitle}
                commandLabel={deckTargeting.activeItem?.targetKind === 'status-panel'
                    ? undefined
                    : deckTargeting.activeItem?.cmd.trim() || deckTargeting.activeItem?.label}
                customContent={deckTargeting.activeItem?.targetKind === 'status-panel'
                    ? deckTargeting.activeItem.cmd.trim().toLowerCase() === 'practice'
                        ? <RightActionPanel skillsOnly embedded />
                        : <ThisIsYouConsole alwaysExpanded />
                    : deckTargeting.activeItem?.targetKind === 'shop' ? <ShopTargetMenu
                        executeCommand={game.executeCommand}
                        selectedTarget={deckTargeting.pendingTarget}
                        onSelectTarget={value => deckTargeting.handleSelectTarget(value)}
                    /> : undefined}
                isInteractive
                isBlurred={false}
                isSwipeTargeting={deckTargeting.isTargetMenuHeld}
                showKeepOpenToggle={deckTargeting.activeItem?.targetKind !== 'status-panel' && !deckTargeting.isTargetMenuHeld}
                onDismiss={deckTargeting.closeTargetMenu}
            />
        </div>
    );
};

export default CommandDeck;
