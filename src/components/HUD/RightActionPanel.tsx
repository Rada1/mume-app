/**
 * @file RightActionPanel.tsx
 * @description Desktop right-side action sidebar: tactical combat actions,
 * class skills, spells within their classes, and target indicator.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swords, Target } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveRoom, useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import {
    PRACTICE_CLASS_SKILLS, PracticeClassKey,
    PASSIVE_SKILLS, TARGETED_SKILLS
} from '../../utils/practiceClassCatalog';
import { RightPanelTabs } from './RightPanelTabs';
import { ActionCommandRow } from './ActionCommandRow';
import { RightPanelSkills } from './RightPanelSkills';
import { useGuildPracticeActions } from '../../hooks/useGuildPracticeActions';
import { getRoomTargetSuggestions } from '../../utils/commandSuggestionUtils';
import type { GmcpOccupant, PracticeData } from '../../types';
import { MainTab, ActionItem, COMBAT_ACTIONS, UTILITY_ACTIONS, CLASS_KEYS } from './rightActionData';
import { getSkillOrSpellSyntax, getSpellManaCost } from '../../utils/spellSyntaxUtils';
import { MovementPad } from './MovementPad';
import { RightPanelTargetBar } from './RightPanelTargetBar';
import './RightActionPanel.css';
import './RightActionTerminal.css';

export const RightActionPanel: FC = () => {
    // --- Logic Section ---
    const {
        executeCommand, triggerHaptic, abilities = {}, gameState, characterClass = '', practice,
        roomPlayers = [], roomNpcs = [], roomItems = [], setTarget, characterName = ''
    } = useGame() as {
        executeCommand: (cmd: string, silent?: boolean, hideInHistory?: boolean, skipHistory?: boolean, sys?: boolean) => void;
        triggerHaptic?: (ms: number) => void; abilities?: Record<string, number>; gameState?: string; characterClass?: string;
        practice?: { practiceData?: PracticeData | null };
        roomPlayers?: GmcpOccupant[]; roomNpcs?: GmcpOccupant[]; roomItems?: GmcpOccupant[];
        setTarget: (target: string | null) => void;
        characterName?: string;
    };
    const { target } = useActiveVitals() as { target: string | null };
    const { roomNum } = useActiveRoom();
    const guildPractice = useGuildPracticeActions(gameState === 'playing', roomNum, roomNpcs, practice?.practiceData, executeCommand);
    const setInput = useInputStore(s => s.setInput);
    const requestTargetPicker = useInputStore(s => s.requestTargetPicker);
    const [activeTab, setActiveTab] = useState<MainTab>(() => {
        const saved = localStorage.getItem('mume-right-panel-tab');
        if (saved === 'spells' || saved === 'move') return 'combat';
        return (['combat', 'skills', 'utility'] as string[]).includes(saved || '') ? (saved as MainTab) : 'combat';
    });

    const [selectedClass, setSelectedClass] = useState<PracticeClassKey>(() => {
        const lower = (characterClass || '').toLowerCase();
        return (CLASS_KEYS as string[]).includes(lower) ? (lower as PracticeClassKey) : 'warrior';
    });

    const [needsTargetHint, setNeedsTargetHint] = useState<string | null>(null);
    const [pressedLabel, setPressedLabel] = useState<string | null>(null);
    const [targetOverrides, setTargetOverrides] = useState<Record<string, string>>({});
    const pressTimerRef = useRef<number | undefined>(undefined);
    const hintTimerRef = useRef<number | undefined>(undefined);
    const hasSyncRef = useRef(false);
    useEffect(() => { setTargetOverrides({}); }, [target]);
    useEffect(() => { setTargetOverrides({}); }, [roomNum]);
    const choicesFor = (item: ActionItem) => getRoomTargetSuggestions(
        [...roomPlayers, ...roomNpcs], roomItems, item.targetKind || 'characters', characterName
    );
    const actionTarget = (item: ActionItem) => targetOverrides[item.label] || target || choicesFor(item)[0]?.value || null;
    const primeTargetCommand = (item: ActionItem) => {
        setInput(item.cmd);
        requestTargetPicker();
        window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
    };
    useEffect(() => {
        if (gameState === 'playing' && !practice?.practiceData && !hasSyncRef.current) {
            hasSyncRef.current = true;
            executeCommand('practice', true, true, false, true);
        }
    }, [gameState, practice?.practiceData, executeCommand]);

    const handleSelectTab = (tab: MainTab) => {
        setActiveTab(tab);
        localStorage.setItem('mume-right-panel-tab', tab);
        triggerHaptic?.(10);
    };

    const flashPressed = useCallback((label: string) => {
        window.clearTimeout(pressTimerRef.current);
        setPressedLabel(label);
        pressTimerRef.current = window.setTimeout(() => setPressedLabel(null), 140);
    }, []);

    const fireAction = (item: ActionItem) => {
        const chosenTarget = item.needsTarget ? actionTarget(item) : null;
        if (item.needsTarget && !chosenTarget) {
            triggerHaptic?.(30);
            setNeedsTargetHint(item.label);
            window.clearTimeout(hintTimerRef.current);
            hintTimerRef.current = window.setTimeout(() => setNeedsTargetHint(null), 3000);
            primeTargetCommand(item);
            return;
        }
        flashPressed(item.label);
        triggerHaptic?.(15);
        executeCommand(chosenTarget ? `${item.cmd}${chosenTarget}`.trim() : item.cmd.trim());
    };

    const skillTargetKind = (name: string): 'characters' | 'allies' | 'objects' => {
        const norm = name.toLowerCase();
        if (['locate', 'identify', 'enchant', 'detect poison'].includes(norm)) return 'objects';
        if (['rescue', 'bandage', 'heal', 'cure light', 'cure serious', 'cure critical', 'cure critic'].includes(norm)) return 'allies';
        return 'characters';
    };
    const skillTarget = (name: string) => {
        const kind = skillTargetKind(name);
        return targetOverrides[name] || target || getRoomTargetSuggestions(
            [...roomPlayers, ...roomNpcs], roomItems, kind, characterName
        )[0]?.value || null;
    };

    const fireSkill = (name: string, isSpell = false) => {
        const norm = name.toLowerCase();
        if (PASSIVE_SKILLS.has(norm)) return;
        const needsTgt = TARGETED_SKILLS.has(norm);
        const chosenTarget = needsTgt ? skillTarget(name) : null;
        if (needsTgt && !chosenTarget) {
            triggerHaptic?.(30);
            setNeedsTargetHint(name);
            window.clearTimeout(hintTimerRef.current);
            hintTimerRef.current = window.setTimeout(() => setNeedsTargetHint(null), 3000);
            setInput(isSpell ? `cast '${norm}' ` : `${norm} `);
            requestTargetPicker();
            window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
            return;
        }
        flashPressed(name);
        triggerHaptic?.(15);
        executeCommand(isSpell
            ? (chosenTarget ? `cast '${norm}' ${chosenTarget}` : `cast '${norm}'`)
            : (chosenTarget ? `${norm} ${chosenTarget}` : norm)
        );
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
            if (e.code.startsWith('Numpad') || e.location === 3) return;
            const active = document.activeElement as HTMLElement | null;
            const isCmdBar = active?.id === 'mud-input';
            if (active && !isCmdBar && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            if (!/^[1-9]$/.test(e.key)) return;

            const mudInput = document.getElementById('mud-input') as HTMLTextAreaElement | null;
            const txt = isCmdBar ? (mudInput?.value ?? '') : (useInputStore.getState().input ?? '');
            if (txt.length > 0) return;

            const list = activeTab === 'combat' ? COMBAT_ACTIONS : activeTab === 'utility' ? UTILITY_ACTIONS : null;
            if (!list) return;
            const idx = parseInt(e.key, 10) - 1;
            if (idx >= 0 && idx < list.length) {
                e.preventDefault();
                const item = list[idx];
                if (item.needsTarget) primeTargetCommand(item);
                else {
                    setInput(item.cmd);
                    window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
                }
                flashPressed(item.label);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const isSpellClass = selectedClass === 'mage' || selectedClass === 'cleric';
    const displayedSkills = useMemo(() => {
        const practiceSkills = practice?.practiceData?.skills;
        return (PRACTICE_CLASS_SKILLS[selectedClass] || []).map(skillName => {
            const norm = skillName.toLowerCase();
            const pct = abilities[norm];
            const isKnown = pct !== undefined;
            return {
                name: skillName, pct: isKnown ? pct : null,
                isPassive: PASSIVE_SKILLS.has(norm), isKnown,
                syntax: getSkillOrSpellSyntax(skillName, isSpellClass),
                mana: isSpellClass ? getSpellManaCost(skillName, practiceSkills) : null
            };
        }).sort((a, b) => (b.isKnown ? 1 : 0) - (a.isKnown ? 1 : 0));
    }, [selectedClass, abilities, isSpellClass, practice?.practiceData?.skills]);

    // --- Render Section ---
    return (
        <aside className="right-action-panel" aria-label="Action Deck">
            {gameState === 'account' && (
                <div className="right-panel-locked-overlay">
                    <div className="right-panel-locked-icon-ring"><Swords size={22} /></div>
                    <span className="right-panel-locked-title">Actions & Skills</span>
                    <span className="right-panel-locked-subtitle">Log in to activate panel</span>
                </div>
            )}

            <RightPanelTabs
                activeTab={activeTab}
                count={activeTab === 'combat' ? COMBAT_ACTIONS.length : activeTab === 'utility' ? UTILITY_ACTIONS.length : displayedSkills.length}
                onSelect={handleSelectTab}
            />

            {needsTargetHint && (
                <div className="right-panel-target-hint">
                    <Target size={13} />
                    <span>Pick a target for <strong>{needsTargetHint}</strong></span>
                </div>
            )}

            {/* Scrollable Content Deck */}
            <div className="right-panel-content">
                {activeTab === 'combat' && (
                    <div className="right-panel-grid" role="region" aria-label="Combat Actions">
                        {COMBAT_ACTIONS.map((item, idx) => (
                            <ActionCommandRow key={item.label} item={item} index={idx} target={actionTarget(item)}
                                choices={choicesFor(item)} isPressed={pressedLabel === item.label}
                                onFire={() => fireAction(item)}
                                onChoose={value => setTargetOverrides(current => ({ ...current, [item.label]: value }))}
                                onTypeTarget={() => primeTargetCommand(item)} />
                        ))}
                    </div>
                )}

                {activeTab === 'utility' && (
                    <div className="right-panel-grid" role="region" aria-label="Utility Actions">
                        {UTILITY_ACTIONS.map((item, idx) => (
                            <ActionCommandRow key={item.label} item={item} index={idx} target={actionTarget(item)}
                                choices={item.needsTarget ? choicesFor(item) : []} isPressed={pressedLabel === item.label}
                                onFire={() => fireAction(item)}
                                onChoose={value => setTargetOverrides(current => ({ ...current, [item.label]: value }))}
                                onTypeTarget={() => primeTargetCommand(item)} />
                        ))}
                    </div>
                )}

                {activeTab === 'skills' && (
                    <RightPanelSkills items={displayedSkills} selectedClass={selectedClass}
                        onSelectClass={key => { setSelectedClass(key); triggerHaptic?.(10); }}
                        isSpellClass={isSpellClass} pressedLabel={pressedLabel}
                        guildAvailable={guildPractice.available} sessionsLeft={guildPractice.sessionsLeft}
                        trainingFor={guildPractice.trainingFor}
                        onPractice={name => { triggerHaptic?.(20); executeCommand(`practice ${name.toLowerCase()}`); }}
                        onFire={fireSkill} targetFor={skillTarget}
                        choicesFor={name => getRoomTargetSuggestions(
                            [...roomPlayers, ...roomNpcs], roomItems, skillTargetKind(name), characterName
                        )}
                        onChooseTarget={(name, value) => setTargetOverrides(current => ({ ...current, [name]: value }))}
                        onTypeTarget={name => {
                            setInput(isSpellClass ? `cast '${name.toLowerCase()}' ` : `${name.toLowerCase()} `);
                            requestTargetPicker();
                            window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
                        }} />
                )}
            </div>

            {/* Movement Controls Section - Always visible */}
            <div className="right-panel-navigation" role="region" aria-label="Movement Controls">
                <MovementPad />
            </div>

            {/* Target Status Bar */}
            <RightPanelTargetBar target={target} setTarget={setTarget} />
        </aside>
    );
};

export default RightActionPanel;
