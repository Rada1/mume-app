/**
 * @file CommandDeck.tsx
 * @description Desktop tactical action deck — a WoW/LoL-style ability bar in the
 * action box below the log. Loadout tabs page a uniform grid of action slots
 * (combat, social, utility). Movement lives on the MovementPad (under the map)
 * and class skills live on the SkillsDeck (under the character drawer). Mobile
 * can reuse this deck in the map gutter for the center action buttons.
 */

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
    Swords, MessageSquare, Wrench,
    Sword, HeartPulse, Footprints, Target, ScrollText
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import './CommandDeck.css';

type TabKey = 'combat' | 'social' | 'utility';

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
    ]
};

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'combat', label: 'Combat', icon: Swords },
    { key: 'social', label: 'Social', icon: MessageSquare },
    { key: 'utility', label: 'Utility', icon: Wrench }
];

const LABEL_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
    Kill: Sword, Flee: Footprints,
    Consider: Target, Assist: HeartPulse
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
        return (['combat', 'social', 'utility'] as string[]).includes(saved || '') ? (saved as TabKey) : 'combat';
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

    const items = useMemo<DeckItem[]>(() => (
        STATIC[activeTab].map(item => ({
            label: item.label,
            cmd: item.cmd,
            needsTarget: item.cmd.endsWith(' ')
        }))
    ), [activeTab]);

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
        triggerHaptic?.(15);
        executeCommand(item.needsTarget && target ? `${item.cmd}${target}`.trim() : item.cmd.trim());
    };

    // Number-row hotkeys (1-9, 0) fire the first ten slots, but only when the
    // command line isn't focused so typing isn't hijacked.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const active = document.activeElement as HTMLElement | null;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
            if (!/^[0-9]$/.test(e.key)) return;
            const idx = e.key === '0' ? 9 : parseInt(e.key, 10) - 1;
            if (idx < items.length) {
                e.preventDefault();
                fire(items[idx]);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const iconFor = (item: DeckItem): React.ComponentType<{ size?: number; strokeWidth?: number }> => {
        if (activeTab === 'social') return MessageSquare;
        if (activeTab === 'utility') return LABEL_ICONS[item.label] || ScrollText;
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
                                className={`deck-slot state-ready${targetReady ? ' target-ready' : ''}${needsTargetHint === item.label ? ' needs-target' : ''}`}
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
