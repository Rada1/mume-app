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
import { useGame } from '../../context/GameContext';
import { useUI } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { doesCommandMatchDeckItem } from '../../utils/commandFeedbackUtils';
import { getRememberedCommandTarget, isCompatibleGlobalTarget, rememberCommandTarget } from '../../utils/commandTargetMemory';
import { useDeckTargeting, DeckItem } from './useDeckTargeting';
import { TacticalTargetBar } from '../Controls/GameButton/TacticalTargetBar';
import { RightPanelTargetBar } from './RightPanelTargetBar';
import { DeckCategoryWheel } from './DeckCategoryWheel';
import { DECK_ACTIONS, DECK_TABS, DECK_LABEL_ICONS, DEFAULT_DECK_ICON, type TabKey } from './commandDeckData';
import type { DrawerLine } from '../../types';
import type { CommandTargetSuggestion } from '../../utils/commandSuggestionUtils';
import './CommandDeck.css';

export const CommandDeck: FC = () => {
    const { executeCommand, triggerHaptic, setTarget, characterName, viewport, parser, containerContents } = useGame() as {
        executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
        triggerHaptic?: (ms: number) => void;
        setTarget: (target: string | null) => void;
        characterName?: string;
        viewport?: { isMobile: boolean };
        parser?: {
            setPendingFlags: (silent: boolean, fromDrawer: boolean, command?: string) => void;
            setLastRequestedContainerId?: (containerId: string | null) => void;
        };
        containerContents?: Record<string, DrawerLine[]>;
    };
    const { target } = useActiveVitals() as { target: string | null };
    const { displayInventoryLines, displayEqLines } = useUI();
    const setInput = useInputStore(s => s.setInput);
    const requestTargetPicker = useInputStore(s => s.requestTargetPicker);

    const [activeTab, setActiveTab] = useState<TabKey | null>(() => {
        const saved = localStorage.getItem('mud-deck-tab');
        const isKnownTab = (['combat', 'social', 'utility', 'room', 'personal', 'consume'] as string[]).includes(saved || '');
        const isMobileOnlyTab = saved === 'personal' || saved === 'consume';
        return isKnownTab && (viewport?.isMobile || !isMobileOnlyTab) ? (saved as TabKey) : 'combat';
    });

    useEffect(() => {
        if (!viewport?.isMobile && (activeTab === 'personal' || activeTab === 'consume')) setActiveTab('utility');
    }, [activeTab, viewport?.isMobile]);

    const selectTab = (key: TabKey) => {
        setActiveTab(current => viewport?.isMobile && current === key ? null : key);
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
        (activeTab ? DECK_ACTIONS[activeTab] : []).map(item => ({
            label: item.label,
            cmd: item.cmd,
            needsTarget: item.needsTarget ?? item.cmd.endsWith(' '),
            targetKind: item.targetKind,
            holdOpensMenuOnly: item.holdOpensMenuOnly,
        }))
    ), [activeTab]);

    const itemsRef = useRef(items);
    useEffect(() => { itemsRef.current = items; }, [items]);

    useEffect(() => {
        const onCommandExecuted = (event: Event) => {
            const cmd = (event as CustomEvent<{ cmd?: string }>).detail?.cmd;
            if (!cmd) return;
            const matched = itemsRef.current.find(item => doesCommandMatchDeckItem(cmd, item));
            if (matched) {
                flashPressed(matched.label);
            }
        };

        window.addEventListener('mume:command-executed', onCommandExecuted);
        return () => {
            window.removeEventListener('mume:command-executed', onCommandExecuted);
            window.clearTimeout(pressTimerRef.current);
        };
    }, [flashPressed]);

    const fire = (item: DeckItem) => {
        if (item.targetKind) {
            flashPressed(item.label);
            triggerHaptic?.(10);
            setInput(item.cmd);
            document.getElementById('mud-input')?.focus();
            return;
        }
        const effectiveTarget = getRememberedCommandTarget(item.cmd)
            || (isCompatibleGlobalTarget(item.cmd, target) ? target : null);
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

    return (
        <div className="command-deck" onClick={e => e.stopPropagation()}>
            {needsTargetHint && (
                <div className="deck-target-hint" role="status">
                    <Target size={12} strokeWidth={2.4} />
                    <span>Pick a target for <strong>{needsTargetHint}</strong> — tap a name in the room or log</span>
                </div>
            )}
            {viewport?.isMobile && (
                <div className="mobile-global-target-control">
                    <RightPanelTargetBar target={target} setTarget={setTarget} triggerHaptic={triggerHaptic} />
                </div>
            )}
            <div className="deck-tab-rail" role="tablist" aria-label="Action loadouts">
                {DECK_TABS.filter(tab => viewport?.isMobile || (tab.key !== 'personal' && tab.key !== 'consume')).map(tab => {
                    const Icon = tab.icon;
                    const categoryActions = DECK_ACTIONS[tab.key].map(item => ({
                        ...item,
                        needsTarget: item.needsTarget ?? item.cmd.endsWith(' '),
                    }));
                    return (
                        viewport?.isMobile
                            ? <DeckCategoryWheel
                                key={tab.key}
                                label={tab.label}
                                icon={Icon}
                                active={activeTab === tab.key}
                                actions={categoryActions}
                                onTap={() => selectTab(tab.key)}
                                onChoose={fire}
                                onHoldAction={deckTargeting.openTargetMenuFor}
                                onSelectTarget={deckTargeting.handleSelectTarget}
                                onReleaseTargetMenu={deckTargeting.releaseHeldTargetMenu}
                                onCancelTargetMenu={deckTargeting.closeTargetMenu}
                            />
                            : <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`deck-tab${activeTab === tab.key ? ' is-active' : ''}`}
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
                            ? getRememberedCommandTarget(item.cmd)
                                || (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
                            : null;
                        const targetReady = !!itemTarget;
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
                onSelectTarget={deckTargeting.handleSelectTarget}
                columns={deckTargeting.isStagedTargetMenu ? [
                    {
                        title: deckTargeting.activeItem?.targetKind === 'room-object-container' ? 'Item' : 'Object',
                        suggestions: deckTargeting.firstArgumentSuggestions,
                        selectedTarget: deckTargeting.selectedFirstArgument,
                        selectedKey: deckTargeting.selectedFirstArgumentKey,
                        emptyText: deckTargeting.firstArgumentEmptyText,
                    },
                    {
                        title: deckTargeting.activeItem?.targetKind === 'inventory-recipient' ? 'Recipient' : deckTargeting.activeItem?.targetKind === 'inventory-container' ? 'Container' : 'Get From',
                        suggestions: deckTargeting.secondArgumentSuggestions,
                        selectedTarget: deckTargeting.selectedSecondArgument,
                        selectedKey: deckTargeting.selectedSecondArgumentKey,
                    },
                ] : undefined}
                onSelectColumnTarget={(value, columnIndex, suggestion) => deckTargeting.handleSelectTarget(value, false, columnIndex, suggestion)}
                roomOccupants={deckTargeting.roomOccupants}
                roomItems={deckTargeting.roomItems}
                characterName={characterName}
                suggestions={deckTargeting.targetSuggestions}
                title={deckTargeting.targetMenuTitle}
                commandLabel={deckTargeting.activeItem?.cmd.trim() || deckTargeting.activeItem?.label}
                isInteractive={!deckTargeting.isTargetMenuHeld}
                isBlurred={deckTargeting.isTargetMenuHeld}
                onDismiss={deckTargeting.closeTargetMenu}
            />
        </div>
    );
};

export default CommandDeck;
