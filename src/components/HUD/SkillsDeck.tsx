/**
 * @file SkillsDeck.tsx
 * @description Class skills/spells panel that lives in the action-box column under
 * the character drawer. Split out of CommandDeck because the per-class sorting +
 * proficiency badges need more room than the compact combat/social/utility tabs.
 * Desktop-only; reuses the CommandDeck slot styles. Target-taking skills follow
 * the same target-ready / pick-a-target flow as the CommandDeck combat buttons.
 */

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Target, GraduationCap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { PRACTICE_CLASS_SKILLS, PracticeClassKey, getGuildClassFromFlags } from '../../utils/practiceClassCatalog';
import type { PracticeSkill } from '../../types';
import { SkillClassIcon } from './SkillClassIcon';
import './CommandDeck.css';

interface SkillItem {
    label: string;
    cmd: string;
    /** Bare skill/spell name used for the `practice <name>` command. */
    practiceName: string;
    state: 'ready' | 'dim' | 'passive';
    needsTarget: boolean;
    pct?: number;
    /** Parsed prac-command detail for this skill, when known. */
    prac?: PracticeSkill;
}

const CLASS_KEYS: PracticeClassKey[] = ['ranger', 'thief', 'warrior', 'mage', 'cleric'];

const PASSIVE_SKILLS = new Set([
    'cleaving weapons', 'concussion weapons', 'slashing weapons', 'stabbing weapons',
    'two-handed weapons', 'unarmed combat', 'parry', 'endurance', 'dodge', 'missile',
    'piercing weapons', 'awareness', 'swim', 'wilderness', 'leadership'
]);

// Skills/spells that act on a target (offensive, heals, buffs cast on someone).
// Self/room skills (sneak, hide, armour-on-self, create light, earthquake…) are
// intentionally excluded — they fire bare. Self-casts are still possible by
// targeting your own pin.
const TARGETED_SKILLS = new Set([
    // ranger / thief / warrior
    'bandage', 'command', 'dark oath', 'ride', 'track',
    'attack', 'backstab', 'envenom', 'steal',
    'bash', 'charge', 'kick', 'rescue',
    // mage
    'magic missile', 'armour', 'chill touch', 'burning hands', 'locate', 'shocking grasp',
    'teleport', 'lightning bolt', 'colour spray', 'locate life', 'call lightning', 'enchant',
    'scry', 'shield', 'charm', 'sleep', 'fireball', 'magic blast', 'dispel magic', 'silence',
    'identify', 'portal',
    // cleric
    'cure light', 'smother', 'cure blindness', 'protection from evil', 'bless', 'cure serious',
    'blindness', 'cure disease', 'strength', 'poison', 'summon', 'cure critic', 'cure critical',
    'remove poison', 'curse', 'remove curse', 'black breath', 'dispel evil', 'energy drain',
    'heal', 'transfer', 'fear', 'harm', 'hold', 'raise dead', 'sanctuary'
]);

const isValidClass = (c: string): c is PracticeClassKey => (CLASS_KEYS as string[]).includes(c);

export const SkillsDeck: FC = () => {
    const { executeCommand, triggerHaptic, abilities = {}, characterClass = '', practice } = useGame() as {
        executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
        triggerHaptic?: (ms: number) => void;
        abilities?: Record<string, number>;
        characterClass?: string;
        practice?: {
            practiceData?: { sessionsLeft: number; skills: PracticeSkill[]; isAtGuildmaster?: boolean } | null;
            setLastPracticedSkill?: (skill: string | null) => void;
        };
    };
    const { target } = useActiveVitals() as { target: string | null };
    const mapper = useMapper();
    const setInput = useInputStore(s => s.setInput);
    const requestTargetPicker = useInputStore(s => s.requestTargetPicker);

    const classLower = (characterClass || '').toLowerCase();
    const [skillClass, setSkillClass] = useState<PracticeClassKey>(isValidClass(classLower) ? classLower : 'ranger');

    useEffect(() => {
        if (isValidClass(classLower)) setSkillClass(classLower);
    }, [classLower]);

    // --- Guild detection: is the current room a class guild where we can practice? ---
    const currentRoomKey = mapper.currentRoomId || '';
    const guildClass = useMemo<PracticeClassKey | null>(() => {
        const roomIdVnum = currentRoomKey.replace(/^m_/, '');
        const mapRoom = mapper.rooms[currentRoomKey] || mapper.rooms[`m_${roomIdVnum}`] || mapper.rooms[roomIdVnum];
        const currentVnum = mapRoom?.gmcpId ? String(mapRoom.gmcpId) : roomIdVnum;
        const preloadedRoom = currentVnum ? mapper.preloadedCoordsRef?.current?.[currentVnum] : undefined;
        // Guild flags (e.g. WARRIOR_GUILD) can live in either the mob-flag column
        // (index 7) or the load-flag column (index 8), so check both — same as
        // MapperRoomInfo's deriveMapFlags.
        const guildFlags = [
            ...(preloadedRoom?.[7] || []), ...(mapRoom?.mobFlags || []),
            ...(preloadedRoom?.[8] || []), ...(mapRoom?.loadFlags || [])
        ];
        return getGuildClassFromFlags(guildFlags);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentRoomKey, mapper.rooms]);

    // When we enter a guild room, auto-select that class and silently sync prac data
    // (sessions left / difficulty / advice) once per room entry.
    const syncedGuildRoomRef = useRef<string | null>(null);
    useEffect(() => {
        if (!guildClass) return;
        setSkillClass(guildClass);
        const syncKey = `${currentRoomKey}:${guildClass}`;
        if (syncedGuildRoomRef.current !== syncKey) {
            syncedGuildRoomRef.current = syncKey;
            // Silent system practice — same path the skills drawer uses to refresh.
            executeCommand('practice', true, true, false, true);
        }
    }, [guildClass, currentRoomKey, executeCommand]);

    const practiceData = practice?.practiceData;
    const practiceByName = useMemo(() => {
        const map: Record<string, PracticeSkill> = {};
        (practiceData?.skills || []).forEach(s => { map[s.name.trim().toLowerCase()] = s; });
        return map;
    }, [practiceData]);

    // A guildmaster only teaches a subset of the class's skills. The `practice`
    // command run at a guildmaster lists exactly those (with a sessions column,
    // which the parser flags via isAtGuildmaster). Only offer prac chips for the
    // skills in that list — not the whole class catalog.
    const guildmasterSkills = useMemo(() => {
        if (!practiceData?.isAtGuildmaster) return null;
        const set = new Set<string>();
        practiceData.skills.forEach(s => set.add(s.name.trim().toLowerCase()));
        return set;
    }, [practiceData]);

    const [needsTargetHint, setNeedsTargetHint] = useState<string | null>(null);
    const hintTimerRef = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(hintTimerRef.current), []);

    const items = useMemo<SkillItem[]>(() => {
        const isSpell = skillClass === 'mage' || skillClass === 'cleric';
        return PRACTICE_CLASS_SKILLS[skillClass].map(name => {
            const normalized = name.toLowerCase();
            const pct = abilities[normalized];
            const known = pct !== undefined;
            const passive = PASSIVE_SKILLS.has(normalized);
            const state: SkillItem['state'] = passive ? 'passive' : known ? 'ready' : 'dim';
            return {
                label: name,
                cmd: isSpell ? `cast '${normalized}'` : normalized,
                practiceName: normalized,
                state,
                needsTarget: state === 'ready' && TARGETED_SKILLS.has(normalized),
                pct: known ? pct : undefined,
                prac: practiceByName[normalized]
            };
        }).sort((a, b) => (b.state === 'ready' ? 1 : 0) - (a.state === 'ready' ? 1 : 0));
    }, [skillClass, abilities, practiceByName]);

    const atGuildForThisClass = guildClass !== null && guildClass === skillClass;

    const practiceSkill = (e: React.MouseEvent, item: SkillItem) => {
        e.stopPropagation();
        triggerHaptic?.(20);
        practice?.setLastPracticedSkill?.(item.label);
        executeCommand(`practice ${item.practiceName}`);
    };

    const fire = (item: SkillItem) => {
        if (item.state === 'passive') return;
        if (item.needsTarget && !target) {
            // Same "pick a target" flow as the combat buttons.
            triggerHaptic?.(30);
            setNeedsTargetHint(item.label);
            window.clearTimeout(hintTimerRef.current);
            hintTimerRef.current = window.setTimeout(() => setNeedsTargetHint(null), 3200);
            setInput(`${item.cmd} `);
            requestTargetPicker();
            setTimeout(() => {
                const el = document.getElementById('mud-input') as HTMLTextAreaElement | null;
                if (el) { el.focus(); el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
            }, 50);
            return;
        }
        triggerHaptic?.(15);
        executeCommand(item.needsTarget && target ? `${item.cmd} ${target}` : item.cmd);
    };

    return (
        <div className="command-deck skills-deck" onClick={e => e.stopPropagation()}>
            {/* Wrapper is `display: contents` on mobile and an absolutely-positioned
                fill on desktop, so a long skill list scrolls internally instead of
                growing the bottom bar. */}
            <div className="skills-deck-inner">
            {needsTargetHint && (
                <div className="deck-target-hint" role="status">
                    <Target size={12} strokeWidth={2.4} />
                    <span>Pick a target for <strong>{needsTargetHint}</strong> — tap a name in the room or log</span>
                </div>
            )}
            <div className="deck-class-switch" aria-label="Skill class">
                {CLASS_KEYS.map(c => (
                    <button
                        key={c}
                        type="button"
                        className={`deck-class-chip${skillClass === c ? ' is-active' : ''}${guildClass === c ? ' is-guild' : ''}`}
                        onClick={() => { setSkillClass(c); triggerHaptic?.(10); }}
                        title={guildClass === c ? `You can practice ${c} skills here` : undefined}
                    >
                        {c}
                        {guildClass === c && <GraduationCap size={11} strokeWidth={2.4} className="deck-class-guild-icon" />}
                    </button>
                ))}
            </div>
            {atGuildForThisClass && (
                <div className="deck-guild-note" role="status">
                    <GraduationCap size={12} strokeWidth={2.4} />
                    <span>
                        Practice here
                        {practiceData ? <> · <strong>{practiceData.sessionsLeft}</strong> session{practiceData.sessionsLeft === 1 ? '' : 's'} left</> : null}
                    </span>
                </div>
            )}
            <div className="deck-grid-wrap">
                <div className="deck-grid" aria-label={`${skillClass} skills`}>
                    {items.map(item => {
                        const targetReady = item.needsTarget && !!target;
                        const prac = item.prac;
                        // Only skills this guildmaster actually teaches get a prac chip.
                        const isTaughtHere = guildmasterSkills?.has(item.practiceName) ?? false;
                        // "Maxed here" comes from the sessions column (N/M): when
                        // spent >= max the guildmaster can't teach more. Knowledge %
                        // is NOT the gate — weapon skills read above 100%.
                        const sessMatch = prac?.sessions?.match(/^(\d+)\s*\/\s*(\d+)$/);
                        const sessionsMaxed = sessMatch ? parseInt(sessMatch[1], 10) >= parseInt(sessMatch[2], 10) : false;
                        const adviceMaxed = /know as much as i do/i.test(prac?.advice || '');
                        const canPractice = atGuildForThisClass && isTaughtHere && !sessionsMaxed && !adviceMaxed;
                        const pracTitle = prac
                            ? [
                                prac.sessions ? `Sessions: ${prac.sessions}` : null,
                                prac.difficulty ? `Difficulty: ${prac.difficulty}` : null,
                                prac.advice || null
                              ].filter(Boolean).join(' · ')
                            : `practice ${item.practiceName}`;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                className={`deck-slot state-${item.state}${targetReady ? ' target-ready' : ''}${needsTargetHint === item.label ? ' needs-target' : ''}${canPractice ? ' can-practice' : ''}`}
                                onClick={() => fire(item)}
                                title={targetReady ? `${item.cmd} ${target}` : item.cmd}
                            >
                                {item.pct !== undefined && <span className="deck-slot-pct">{item.pct}%</span>}
                                {canPractice && (
                                    <button
                                        type="button"
                                        className="deck-slot-practice-chip"
                                        onClick={(e) => practiceSkill(e, item)}
                                        title={pracTitle}
                                        aria-label={`Practice ${item.label}`}
                                    >
                                        <GraduationCap size={11} strokeWidth={2.6} />
                                        <span>prac</span>
                                    </button>
                                )}
                                <SkillClassIcon classKey={skillClass} size={17} />
                                <span className="deck-slot-label deck-slot-label-lg">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            </div>
        </div>
    );
};

export default SkillsDeck;
