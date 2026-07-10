/**
 * @file SkillsDeck.tsx
 * @description Class skills/spells panel that lives in the action-box column under
 * the character drawer. Split out of CommandDeck because the per-class sorting +
 * proficiency badges need more room than the compact combat/social/utility tabs.
 * Desktop-only; reuses the CommandDeck slot styles. Target-taking skills follow
 * the same target-ready / pick-a-target flow as the CommandDeck combat buttons.
 */

import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { Target } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useInputStore } from '../../stores/useInputStore';
import { PRACTICE_CLASS_SKILLS, PracticeClassKey } from '../../utils/practiceClassCatalog';
import './CommandDeck.css';

interface SkillItem {
    label: string;
    cmd: string;
    state: 'ready' | 'dim' | 'passive';
    needsTarget: boolean;
    pct?: number;
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
    const { executeCommand, triggerHaptic, abilities = {}, characterClass = '' } = useGame() as {
        executeCommand: (cmd: string) => void;
        triggerHaptic?: (ms: number) => void;
        abilities?: Record<string, number>;
        characterClass?: string;
    };
    const { target } = useActiveVitals() as { target: string | null };
    const setInput = useInputStore(s => s.setInput);

    const classLower = (characterClass || '').toLowerCase();
    const [skillClass, setSkillClass] = useState<PracticeClassKey>(isValidClass(classLower) ? classLower : 'ranger');

    useEffect(() => {
        if (isValidClass(classLower)) setSkillClass(classLower);
    }, [classLower]);

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
                state,
                needsTarget: state === 'ready' && TARGETED_SKILLS.has(normalized),
                pct: known ? pct : undefined
            };
        }).sort((a, b) => (b.state === 'ready' ? 1 : 0) - (a.state === 'ready' ? 1 : 0));
    }, [skillClass, abilities]);

    const fire = (item: SkillItem) => {
        if (item.state === 'passive') return;
        if (item.needsTarget && !target) {
            // Same "pick a target" flow as the combat buttons.
            triggerHaptic?.(30);
            setNeedsTargetHint(item.label);
            window.clearTimeout(hintTimerRef.current);
            hintTimerRef.current = window.setTimeout(() => setNeedsTargetHint(null), 3200);
            setInput(`${item.cmd} `);
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
                        className={`deck-class-chip${skillClass === c ? ' is-active' : ''}`}
                        onClick={() => { setSkillClass(c); triggerHaptic?.(10); }}
                    >
                        {c}
                    </button>
                ))}
            </div>
            <div className="deck-grid-wrap">
                <div className="deck-grid" aria-label={`${skillClass} skills`}>
                    {items.map(item => {
                        const targetReady = item.needsTarget && !!target;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                className={`deck-slot state-${item.state}${targetReady ? ' target-ready' : ''}${needsTargetHint === item.label ? ' needs-target' : ''}`}
                                onClick={() => fire(item)}
                                title={targetReady ? `${item.cmd} ${target}` : item.cmd}
                            >
                                {item.pct !== undefined && <span className="deck-slot-pct">{item.pct}%</span>}
                                <span className="deck-slot-label deck-slot-label-lg">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SkillsDeck;
