/**
 * @file RightActionPanel.tsx
 * @description Responsive command panel for combat actions, class skills,
 * spells, and targets.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Swords, Target } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveRoom, useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import {
    PRACTICE_CLASS_SKILLS, PracticeClassKey,
    PASSIVE_SKILLS, TARGETED_SKILLS
} from '../../utils/practiceClassCatalog';
import { RightPanelTabs } from './RightPanelTabs';
import { ActionCommandRow } from './ActionCommandRow';
import { RightPanelSkills } from './RightPanelSkills';
import { useGuildPracticeActions } from '../../hooks/useGuildPracticeActions';
import {
    getAssistTargetSuggestions, getRoomTargetSuggestions, getSelfAndRoomAlliesTargetSuggestions,
    getSelfAndRoomTargetSuggestions
} from '../../utils/commandSuggestionUtils';
import { BLANK_TARGET_VALUE } from '../../utils/commandTargetUtils';
import type { GmcpOccupant, PracticeData } from '../../types';
import { MainTab, ActionItem, COMBAT_ACTIONS, UTILITY_ACTIONS, CLASS_KEYS } from './rightActionData';
import { getSkillOrSpellSyntax, getSpellManaCost } from '../../utils/spellSyntaxUtils';
import { getRememberedCommandTarget, isCompatibleGlobalTarget, rememberCommandTarget } from '../../utils/commandTargetMemory';
import { doesCommandMatchDeckItem, doesCommandMatchSkill } from '../../utils/commandFeedbackUtils';
import { MovementPad } from './MovementPad';
import { RightPanelTargetBar } from './RightPanelTargetBar';
import './RightActionPanel.css';
import './RightActionTerminal.css';

interface RightActionPanelProps {
    skillsOnly?: boolean;
    embedded?: boolean;
    onClose?: () => void;
}

export const RightActionPanel: FC<RightActionPanelProps> = ({ skillsOnly = false, embedded = false, onClose }) => {
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
    const requestedTab = useCommandPanelStore(state => state.requestedTab);
    const clearRequestedTab = useCommandPanelStore(state => state.clearRequestedTab);
    useEffect(() => {
        if (!requestedTab) return;
        setActiveTab(requestedTab);
        localStorage.setItem('mume-right-panel-tab', requestedTab);
        clearRequestedTab();
    }, [clearRequestedTab, requestedTab]);

    const [selectedClass, setSelectedClass] = useState<PracticeClassKey>(() => {
        const lower = (characterClass || '').toLowerCase();
        return (CLASS_KEYS as string[]).includes(lower) ? (lower as PracticeClassKey) : 'warrior';
    });

    const [needsTargetHint, setNeedsTargetHint] = useState<string | null>(null);
    const [pressedLabel, setPressedLabel] = useState<string | null>(null);
    const [targetOverrides, setTargetOverrides] = useState<Record<string, string>>({});
    const pressTimerRef = useRef<number | undefined>(undefined);
    const hintTimerRef = useRef<number | undefined>(undefined);
    const lastPracticeRequestAtRef = useRef(0);
    const visibleTab = skillsOnly ? 'skills' : activeTab;
    useEffect(() => { setTargetOverrides({}); }, [target]);
    useEffect(() => { setTargetOverrides({}); }, [roomNum]);
    const choicesFor = (item: ActionItem) => item.cmd.trim().toLowerCase() === 'assist'
        ? getAssistTargetSuggestions([...roomPlayers, ...roomNpcs], characterName)
        : getRoomTargetSuggestions(
            [...roomPlayers, ...roomNpcs], roomItems, item.targetKind || 'characters', characterName
        );
    const actionTarget = (item: ActionItem) => {
        if (item.cmd.trim().toLowerCase() === 'assist') {
            const selected = targetOverrides[item.label];
            return selected && selected !== BLANK_TARGET_VALUE ? selected : null;
        }
        return targetOverrides[item.label]
        || getRememberedCommandTarget(item.cmd)
        || (isCompatibleGlobalTarget(item.cmd, target) ? target : null)
        || choicesFor(item)[0]?.value || null;
    };
    const primeTargetCommand = (item: ActionItem) => {
        setInput(item.cmd);
        requestTargetPicker();
        window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
    };
    const requestPracticeData = useCallback(() => {
        if (embedded || gameState !== 'playing' || guildPractice.hasGuildmaster || practice?.practiceData) return;
        if (Date.now() - lastPracticeRequestAtRef.current < 5000) return;
        lastPracticeRequestAtRef.current = Date.now();
        executeCommand('practice', true, true, false, true);
    }, [embedded, executeCommand, gameState, guildPractice.hasGuildmaster, practice?.practiceData]);

    useEffect(() => {
        if (skillsOnly && !embedded) requestPracticeData();
    }, [embedded, requestPracticeData, skillsOnly]);

    const handleSelectTab = (tab: MainTab) => {
        if (!skillsOnly) {
            setActiveTab(tab);
            localStorage.setItem('mume-right-panel-tab', tab);
        }
        if (tab === 'skills') requestPracticeData();
        triggerHaptic?.(10);
    };

    const flashPressed = useCallback((label: string) => {
        window.clearTimeout(pressTimerRef.current);
        setPressedLabel(label);
        pressTimerRef.current = window.setTimeout(() => setPressedLabel(null), 320);
    }, []);

    const fireAction = (item: ActionItem) => {
        const chosenTarget = item.needsTarget ? actionTarget(item) : null;
        const allowsBlankTarget = item.cmd.trim().toLowerCase() === 'assist';
        if (item.needsTarget && !chosenTarget && !allowsBlankTarget) {
            triggerHaptic?.(30);
            setNeedsTargetHint(item.label);
            window.clearTimeout(hintTimerRef.current);
            hintTimerRef.current = window.setTimeout(() => setNeedsTargetHint(null), 3000);
            primeTargetCommand(item);
            return;
        }
        if (chosenTarget) rememberCommandTarget(item.cmd, chosenTarget);
        flashPressed(item.label);
        triggerHaptic?.(15);
        executeCommand(chosenTarget ? `${item.cmd}${chosenTarget}`.trim() : item.cmd.trim());
    };

    const skillTargetKind = (name: string): 'characters' | 'allies' | 'objects' => {
        const norm = name.toLowerCase();
        if (['locate', 'identify', 'enchant', 'detect poison'].includes(norm)) return 'objects';
        if (['rescue', 'bless', 'bandage', 'heal', 'cure light', 'cure serious', 'cure critical', 'cure critic', 'cure disease', 'cure blindness'].includes(norm)) return 'allies';
        return 'characters';
    };
    const skillTarget = (name: string) => {
        const kind = skillTargetKind(name);
        const norm = name.toLowerCase();
        const command = isSpellClass ? `cast '${norm}'` : norm;
        if (norm === 'rescue') return targetOverrides[name] || '1.ally';
        if (norm === 'bless') {
            return targetOverrides[name] || getSelfAndRoomAlliesTargetSuggestions(
                [...roomPlayers, ...roomNpcs], characterName
            )[0]?.value || 'self';
        }
        if (['bandage', 'heal', 'cure light', 'cure serious', 'cure critical', 'cure critic', 'cure disease', 'cure blindness'].includes(norm)) {
            return targetOverrides[name] || getSelfAndRoomTargetSuggestions(
                [...roomPlayers, ...roomNpcs], roomItems, characterName
            )[0]?.value || 'self';
        }
        return targetOverrides[name] || getRememberedCommandTarget(command)
            || (isCompatibleGlobalTarget(command, target) ? target : null)
            || getRoomTargetSuggestions(
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
        if (chosenTarget) {
            rememberCommandTarget(isSpell ? `cast '${norm}'` : norm, chosenTarget);
        }
        flashPressed(name);
        triggerHaptic?.(15);
        executeCommand(isSpell
            ? (chosenTarget ? `cast '${norm}' ${chosenTarget}` : `cast '${norm}'`)
            : (chosenTarget ? `${norm} ${chosenTarget}` : norm)
        );
    };

    const isSpellClass = selectedClass === 'mage' || selectedClass === 'cleric';
    const displayedSkills = useMemo(() => {
        const practiceSkills = practice?.practiceData?.skills;
        const orderedSkills = (PRACTICE_CLASS_SKILLS[selectedClass] || []).map(skillName => {
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
        let hotkey = 0;
        return orderedSkills.map(skill => ({
            ...skill,
            hotkey: skill.isPassive || hotkey >= 9 ? null : ++hotkey
        }));
    }, [selectedClass, abilities, isSpellClass, practice?.practiceData?.skills]);

    const primeSkillCommand = (name: string, isSpell: boolean) => {
        const norm = name.toLowerCase();
        const command = isSpell ? `cast '${norm}'` : norm;
        setInput(TARGETED_SKILLS.has(norm) ? `${command} ` : command);
        if (TARGETED_SKILLS.has(norm)) requestTargetPicker();
        window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
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

            const actions = activeTab === 'combat' ? COMBAT_ACTIONS : activeTab === 'utility' ? UTILITY_ACTIONS : null;
            const skillHotkeys = activeTab === 'skills'
                ? displayedSkills.filter(skill => skill.hotkey !== null)
                : null;
            const idx = parseInt(e.key, 10) - 1;
            if (idx < 0) return;

            if (actions && idx < actions.length) {
                e.preventDefault();
                const item = actions[idx];
                if (item.needsTarget) primeTargetCommand(item);
                else {
                    setInput(item.cmd);
                    window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
                }
                flashPressed(item.label);
            } else if (skillHotkeys && idx < skillHotkeys.length) {
                e.preventDefault();
                const skill = skillHotkeys[idx];
                primeSkillCommand(skill.name, isSpellClass);
                flashPressed(skill.name);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeTab, displayedSkills, isSpellClass, setInput, flashPressed]);

    useEffect(() => {
        const onCommandSent = (event: Event) => {
            const cmd = (event as CustomEvent<{ cmd?: string }>).detail?.cmd;
            if (!cmd) return;
            if (activeTab === 'combat' || activeTab === 'utility') {
                const actions = activeTab === 'combat' ? COMBAT_ACTIONS : UTILITY_ACTIONS;
                const matched = actions.find(item => doesCommandMatchDeckItem(cmd, item));
                if (matched) flashPressed(matched.label);
                return;
            }
            const matched = displayedSkills.find(skill => doesCommandMatchSkill(cmd, {
                label: skill.name,
                practiceName: skill.name.toLowerCase(),
                cmd: isSpellClass ? `cast '${skill.name.toLowerCase()}'` : skill.name.toLowerCase()
            }));
            if (matched) flashPressed(matched.name);
        };
        window.addEventListener('mume-command-sent', onCommandSent);
        // Typed commands from the input also publish the execution event; keep
        // listening to it for command paths that don't go through telnet send.
        window.addEventListener('mume:command-executed', onCommandSent);
        return () => {
            window.removeEventListener('mume-command-sent', onCommandSent);
            window.removeEventListener('mume:command-executed', onCommandSent);
        };
    }, [activeTab, displayedSkills, isSpellClass, flashPressed]);

    // --- Render Section ---
    return (
        <aside className={`right-action-panel${embedded ? ' is-embedded-practice-menu' : ''}`} aria-label={skillsOnly ? 'Skills and Practice' : 'Action Deck'}>
            {gameState === 'account' && (
                <div className="right-panel-locked-overlay">
                    <div className="right-panel-locked-icon-ring"><Swords size={22} /></div>
                    <span className="right-panel-locked-title">Actions & Skills</span>
                    <span className="right-panel-locked-subtitle">Log in to activate panel</span>
                </div>
            )}

            <RightPanelTabs
                activeTab={visibleTab}
                count={visibleTab === 'combat' ? COMBAT_ACTIONS.length : visibleTab === 'utility' ? UTILITY_ACTIONS.length : displayedSkills.length}
                onSelect={handleSelectTab}
                skillsOnly={skillsOnly}
                onClose={onClose}
            />

            {needsTargetHint && (
                <div className="right-panel-target-hint">
                    <Target size={13} />
                    <span>Pick a target for <strong>{needsTargetHint}</strong></span>
                </div>
            )}

            {/* Scrollable Content Deck */}
            <div className="right-panel-content">
                {visibleTab === 'combat' && (
                    <div className="right-panel-grid" role="region" aria-label="Combat Actions">
                        {COMBAT_ACTIONS.map((item, idx) => (
                            <ActionCommandRow key={item.label} item={item} index={idx} target={actionTarget(item)}
                                choices={choicesFor(item)} isPressed={pressedLabel === item.label}
                                onFire={() => fireAction(item)}
                                onChoose={value => {
                                    rememberCommandTarget(item.cmd, value);
                                    setTargetOverrides(current => ({ ...current, [item.label]: value }));
                                }}
                                onTypeTarget={() => primeTargetCommand(item)} />
                        ))}
                    </div>
                )}

                {visibleTab === 'utility' && (
                    <div className="right-panel-grid" role="region" aria-label="Utility Actions">
                        {UTILITY_ACTIONS.map((item, idx) => (
                            <ActionCommandRow key={item.label} item={item} index={idx} target={actionTarget(item)}
                                choices={item.needsTarget ? choicesFor(item) : []} isPressed={pressedLabel === item.label}
                                onFire={() => fireAction(item)}
                                onChoose={value => {
                                    rememberCommandTarget(item.cmd, value);
                                    setTargetOverrides(current => ({ ...current, [item.label]: value }));
                                }}
                                onTypeTarget={() => primeTargetCommand(item)} />
                        ))}
                    </div>
                )}

                {visibleTab === 'skills' && (
                    <RightPanelSkills items={displayedSkills} selectedClass={selectedClass}
                        onSelectClass={key => { setSelectedClass(key); triggerHaptic?.(10); }}
                        isSpellClass={isSpellClass} pressedLabel={pressedLabel}
                        guildAvailable={guildPractice.available} sessionsLeft={guildPractice.sessionsLeft}
                        trainingFor={guildPractice.trainingFor}
                        onPractice={name => { triggerHaptic?.(20); executeCommand(`practice ${name.toLowerCase()}`); }}
                        onFire={fireSkill} targetFor={skillTarget}
                        choicesFor={name => name.toLowerCase() === 'bless'
                            ? getSelfAndRoomAlliesTargetSuggestions([...roomPlayers, ...roomNpcs], characterName)
                            : ['bandage', 'heal', 'cure light', 'cure serious', 'cure critical', 'cure critic', 'cure disease', 'cure blindness'].includes(name.toLowerCase())
                                ? getSelfAndRoomTargetSuggestions([...roomPlayers, ...roomNpcs], roomItems, characterName)
                                : getRoomTargetSuggestions(
                                    [...roomPlayers, ...roomNpcs], roomItems, skillTargetKind(name), characterName
                                )}
                        onChooseTarget={(name, value) => {
                            const command = isSpellClass ? `cast '${name.toLowerCase()}'` : name.toLowerCase();
                            rememberCommandTarget(command, value);
                            setTargetOverrides(current => ({ ...current, [name]: value }));
                        }}
                        onTypeTarget={name => {
                            setInput(isSpellClass ? `cast '${name.toLowerCase()}' ` : `${name.toLowerCase()} `);
                            requestTargetPicker();
                            window.setTimeout(() => document.getElementById('mud-input')?.focus(), 50);
                        }} />
                )}
            </div>

            {/* Movement Controls Section - Always visible */}
            {!embedded && <div className="right-panel-navigation" role="region" aria-label="Movement Controls">
                <MovementPad />
            </div>}

            {skillsOnly && !embedded && <div className="right-panel-target-bar-placeholder" aria-hidden="true" />}

            {/* Target Status Bar */}
            {!skillsOnly && <RightPanelTargetBar target={target} setTarget={setTarget} />}
        </aside>
    );
};

export default RightActionPanel;
