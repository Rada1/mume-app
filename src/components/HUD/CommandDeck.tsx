/**
 * @file CommandDeck.tsx
 * @description Desktop tactical action deck — a WoW/LoL-style ability bar in the
 * action box below the log. Loadout tabs page a uniform grid of action slots
 * (combat, social, utility). Movement lives on the MovementPad (under the map)
 * and class skills live on the SkillsDeck (under the character drawer). Mobile
 * can reuse this deck in the map gutter for the center action buttons.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Swords, MessageSquare, Wrench, Home,
    Sword, HeartPulse, Footprints, Target, ScrollText,
    Eye, Tent, Droplets, BedDouble
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { doesCommandMatchDeckItem } from '../../utils/commandFeedbackUtils';
import './CommandDeck.css';

type TabKey = 'combat' | 'social' | 'utility' | 'room';

interface DeckItem {
    label: string;
    cmd: string;
    needsTarget: boolean;
}

const STATIC: Record<TabKey, { label: string; cmd: string }[]> = {
    combat: [
        { label: 'Kill', cmd: 'kill ' },
        { label: 'Flee', cmd: 'flee' },
        { label: 'Consider', cmd: 'consider ' },
        { label: 'Assist', cmd: 'assist ' }
    ],
    social: [
        { label: 'Say', cmd: 'say ' }, { label: 'Narrate', cmd: 'narrate ' },
        { label: 'Gtell', cmd: 'gtell ' }, { label: 'Yell', cmd: 'yell ' },
        { label: 'Tell', cmd: 'tell ' }, { label: 'Emote', cmd: 'emote ' }
    ],
    utility: [
        { label: 'Score', cmd: 'score' }, { label: 'Inventory', cmd: 'inventory' },
        { label: 'Equipment', cmd: 'equipment' }, { label: 'Time', cmd: 'time' },
        { label: 'Weather', cmd: 'weather' }, { label: 'Group', cmd: 'group' },
        { label: 'Who', cmd: 'who' }, { label: 'Affects', cmd: 'affects' }
    ],
    room: [
        { label: 'Watch', cmd: 'watch' }, { label: 'Camp', cmd: 'camp' },
        { label: 'Camp Rent', cmd: 'camp rent' }, { label: 'Drink Water', cmd: 'drink water' }
    ]
};

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'combat', label: 'Combat', icon: Swords },
    { key: 'social', label: 'Social', icon: MessageSquare },
    { key: 'utility', label: 'Utility', icon: Wrench },
    { key: 'room', label: 'Room', icon: Home }
];

const LABEL_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    Kill: Sword, Flee: Footprints,
    Consider: Target, Assist: HeartPulse,
    Watch: Eye, Camp: Tent, 'Camp Rent': BedDouble, 'Drink Water': Droplets
};

export const CommandDeck: FC = () => {
    const { executeCommand, triggerHaptic } = useGame() as {
        executeCommand: (cmd: string) => void;
        triggerHaptic?: (ms: number) => void;
    };
    const { target } = useActiveVitals() as { target: string | null };
    const setInput = useInputStore(s => s.setInput);
    const requestTargetPicker = useInputStore(s => s.requestTargetPicker);

    const [activeTab, setActiveTab] = useState<TabKey>(() => {
        const saved = localStorage.getItem('mud-deck-tab');
        return (['combat', 'social', 'utility', 'room'] as string[]).includes(saved || '') ? (saved as TabKey) : 'combat';
    });

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
        STATIC[activeTab].map(item => ({
            label: item.label,
            cmd: item.cmd,
            needsTarget: item.cmd.endsWith(' ')
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
        if (item.needsTarget && !target) {
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
        executeCommand(item.needsTarget && target ? `${item.cmd}${target}`.trim() : item.cmd.trim());
    };

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
        if (activeTab === 'social') return MessageSquare;
        if (activeTab === 'utility') return LABEL_ICONS[item.label] || ScrollText;
        if (activeTab === 'room') return LABEL_ICONS[item.label] || Home;
        return LABEL_ICONS[item.label] || Swords;
    };

    return (
        <div className="command-deck" onClick={e => e.stopPropagation()}>
            {needsTargetHint && (
                <div className="deck-target-hint" role="status">
                    <Target size={12} strokeWidth={2.4} />
                    <span>Pick a target for <strong>{needsTargetHint}</strong> — tap a name in the room or log</span>
                </div>
            )}
            <div className="deck-tab-rail" role="tablist" aria-label="Action loadouts">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
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

            <div className="deck-grid-wrap">
                <div className="deck-grid" aria-label={`${activeTab} actions`}>
                    {items.map((item, i) => {
                        const Icon = iconFor(item);
                        const hotkey = i < 9 ? String(i + 1) : i === 9 ? '0' : null;
                        const targetReady = item.needsTarget && !!target;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                className={`deck-slot state-ready${targetReady ? ' target-ready' : ''}${needsTargetHint === item.label ? ' needs-target' : ''}${pressedLabel === item.label ? ' is-key-pressed' : ''}`}
                                onClick={() => fire(item)}
                                title={item.needsTarget && target ? `${item.cmd}${target}` : item.cmd.trim()}
                            >
                                {hotkey && <span className="deck-slot-key">{hotkey}</span>}
                                <Icon size={17} strokeWidth={2} />
                                <span className="deck-slot-label">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CommandDeck;
