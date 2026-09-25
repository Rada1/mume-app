// @vitest-environment jsdom
/**
 * @file useCombatParser.test.ts
 * @description Unit tests for combat line matching and room occupant exclusion.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCombatParser, CombatParserDeps } from './useCombatParser';

describe('useCombatParser - checkCombatMatch', () => {
    const createDeps = (inCombat = false): CombatParserDeps => ({
        inCombatRef: { current: inCombat },
        setOpponentHealthStatus: () => {},
        setOpponentName: () => {},
        setCharacterInfo: () => {},
        groupMembers: []
    });

    it('rejects room occupant presence descriptions with combat verbs (e.g. troll ready to crush)', () => {
        const { result } = renderHook(() => useCombatParser(createDeps()));

        // Plaintext room presence
        const matchPlain = result.current.checkCombatMatch(
            'a huge stone troll looms overhead, ready to crush your body.',
            false,
            'A huge stone troll looms overhead, ready to crush your body.'
        );
        expect(matchPlain.isMatch).toBe(false);

        // XML-tagged room presence (has <enemy> but no combat tags)
        const matchXml = result.current.checkCombatMatch(
            'a huge stone troll looms overhead, ready to crush your body.',
            false,
            'A <enemy>huge stone troll</enemy> looms overhead, ready to crush your body.'
        );
        expect(matchXml.isMatch).toBe(false);
    });

    it('rejects standard room occupant presence lines', () => {
        const { result } = renderHook(() => useCombatParser(createDeps()));

        const line1 = result.current.checkCombatMatch('a wounded soldier is here.', false, 'A wounded soldier is here.');
        expect(line1.isMatch).toBe(false);

        const line2 = result.current.checkCombatMatch('a black bear is resting here.', false, 'A black bear is resting here.');
        expect(line2.isMatch).toBe(false);
    });

    it('matches real combat lines with combat XML tags', () => {
        const { result } = renderHook(() => useCombatParser(createDeps(true)));

        const hitMatch = result.current.checkCombatMatch(
            "you pierce a huge stone troll's body.",
            false,
            "<hit>You pierce a huge stone troll's body.</hit>"
        );
        expect(hitMatch.isMatch).toBe(true);
        expect(hitMatch.side).toBe('player');

        const dmgMatch = result.current.checkCombatMatch(
            'a huge stone troll crushes your body.',
            false,
            '<damage>A huge stone troll crushes your body.</damage>'
        );
        expect(dmgMatch.isMatch).toBe(true);
        expect(dmgMatch.side).toBe('opponent');
        expect(dmgMatch.isPlayerTarget).toBe(true);

        const avoidMatch = result.current.checkCombatMatch(
            "you dodge a huge stone troll's crush.",
            false,
            "<avoid_damage>You dodge a huge stone troll's crush.</avoid_damage>"
        );
        expect(avoidMatch.isMatch).toBe(true);

        const missMatch = result.current.checkCombatMatch(
            'a huge stone troll tries to hit you, but misses.',
            false,
            '<miss>A huge stone troll tries to hit you, but misses.</miss>'
        );
        expect(missMatch.isMatch).toBe(true);
    });

    it('rejects practice and skill table lines containing combat verbs (e.g. bash, kick, dodge, parry)', () => {
        const { result } = renderHook(() => useCombatParser(createDeps()));

        const pracLines = [
            'Bash             Excellent  Hard        Warrior',
            'Kick             Bad        Normal      Warrior',
            'Dodge            Average    Hard        Thief',
            'Parry            Excellent  Normal      Warrior',
            'Cleaving weapons Superb     Normal      Warrior',
            'Slashing weapons Average    Normal      Warrior',
            'You have 34 practice sessions left.',
            'Skill / Spell    Knowledge  Difficulty  Class       Mana  Casting time'
        ];

        for (const line of pracLines) {
            const match = result.current.checkCombatMatch(line.toLowerCase(), false, line);
            expect(match.isMatch).toBe(false);
        }
    });

    it('clears opponentName and opponentHealthStatus on death or flee even if inCombatRef is already false', () => {
        let opponentName: string | null = 'bullfrog';
        let opponentHealth: any = 'healthy';

        const deps: CombatParserDeps = {
            inCombatRef: { current: false }, // GMCP already switched position to standing
            setOpponentHealthStatus: (status) => { opponentHealth = status; },
            setOpponentName: (name) => { opponentName = name; },
            setCharacterInfo: () => {},
            groupMembers: []
        };

        const { result } = renderHook(() => useCombatParser(deps));

        // When mob dies
        const exited = result.current.handleCombatExit('a bullfrog is dead! r.i.p.', false, 'A bullfrog is dead! R.I.P.');
        expect(exited).toBe(true);
        expect(opponentName).toBe(null);
        expect(opponentHealth).toBe(null);

        // Reset and test player flee
        opponentName = 'bullfrog';
        opponentHealth = 'healthy';
        const fled = result.current.handleCombatExit('you flee head over heels.', false, 'You flee head over heels.');
        expect(fled).toBe(true);
        expect(opponentName).toBe(null);
        expect(opponentHealth).toBe(null);
    });

    it('plays miss effect when user misses or avoids damage', () => {
        const effectsPlayed: string[] = [];
        const deps: CombatParserDeps = {
            inCombatRef: { current: true },
            setOpponentHealthStatus: () => {},
            setOpponentName: () => {},
            setCharacterInfo: () => {},
            groupMembers: [],
            playEffect: (name) => { effectsPlayed.push(name); }
        };

        const { result } = renderHook(() => useCombatParser(deps));

        // Player misses via XML
        result.current.parseCombatLine("you miss an orc with your pierce.", "<miss>You miss an orc with your pierce.</miss>");
        expect(effectsPlayed).toEqual(['miss']);

        // Player bash fails
        effectsPlayed.length = 0;
        result.current.parseCombatLine("your attempt to bash an orc fails.", "Your attempt to bash an orc fails.");
        expect(effectsPlayed).toEqual(['miss']);

        // Opponent parries player attack
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you try to slash an orc, but he parries.", "You try to slash an orc, but he parries.");
        expect(effectsPlayed).toEqual(['miss']);

        // Player avoids damage via XML dodge
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you dodge a huge stone troll's crush.", "<avoid_damage>You dodge a huge stone troll's crush.</avoid_damage>");
        expect(effectsPlayed).toEqual(['miss']);

        // Opponent misses player via XML miss
        effectsPlayed.length = 0;
        result.current.parseCombatLine("a huge stone troll tries to hit you, but misses.", "<miss>A huge stone troll tries to hit you, but misses.</miss>");
        expect(effectsPlayed).toEqual(['miss']);

        // Opponent fails to hit player
        effectsPlayed.length = 0;
        result.current.parseCombatLine("an orc fails to hit you.", "An orc fails to hit you.");
        expect(effectsPlayed).toEqual(['miss']);

        // Plain text dodge
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you dodge an orc's slash.", "You dodge an orc's slash.");
        expect(effectsPlayed).toEqual(['miss']);

        // Third party miss does NOT play miss effect
        effectsPlayed.length = 0;
        result.current.parseCombatLine("a goblin misses a wolf with his dagger.", "<miss>A goblin misses a wolf with his dagger.</miss>");
        expect(effectsPlayed).toHaveLength(0);

        // Snoop mode does NOT play miss effect
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you miss an orc.", "<miss>You miss an orc.</miss>", true);
        expect(effectsPlayed).toHaveLength(0);

        // User flees head over heels
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you flee head over heels.", "You flee head over heels.");
        expect(effectsPlayed).toEqual(['flee']);

        // User flees in a direction
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you flee south.", "You flee south.");
        expect(effectsPlayed).toEqual(['flee']);

        // Opponent flees does NOT play flee effect
        effectsPlayed.length = 0;
        result.current.parseCombatLine("an orc flees south.", "An orc flees south.");
        expect(effectsPlayed).toHaveLength(0);

        // Snoop mode flee does NOT play flee effect
        effectsPlayed.length = 0;
        result.current.parseCombatLine("you flee south.", "You flee south.", true);
        expect(effectsPlayed).toHaveLength(0);
    });

    it('plays arrowhit sound effect when user shoots an arrow and lands a hit', () => {
        const effects: string[] = [];
        let hitImpact = false;
        let arrowHit = false;

        const deps: CombatParserDeps = {
            ...createDeps(true),
            playEffect: (name: string) => { effects.push(name); },
            playHitImpactSound: () => { hitImpact = true; },
            playArrowHitSound: () => { arrowHit = true; }
        };

        const { result } = renderHook(() => useCombatParser(deps));

        // 1. XML <hit> shot message triggers playArrowHitSound without generic melee sound
        result.current.parseCombatLine("you shoot a troll.", "<hit>You shoot a troll.</hit>");
        expect(arrowHit).toBe(true);
        expect(hitImpact).toBe(false);

        // 2. Plain text shot hit message also triggers playArrowHitSound
        arrowHit = false;
        result.current.parseCombatLine("you shoot a bear hard.", "You shoot a bear hard.");
        expect(arrowHit).toBe(true);

        // 3. Fallback to playEffect('arrowhit') when playArrowHitSound is absent
        const { result: fallback } = renderHook(() => useCombatParser({ ...createDeps(), playEffect: (name) => { effects.push(name); } }));
        fallback.current.parseCombatLine("you shoot an orc.", "<hit>You shoot an orc.</hit>");
        expect(effects).toContain('arrowhit');

        // 4. Misses do NOT play arrowhit, they play miss
        arrowHit = false;
        effects.length = 0;
        result.current.parseCombatLine("you shoot at an orc, but miss.", "<miss>You shoot at an orc, but miss.</miss>");
        expect(arrowHit).toBe(false);
        expect(effects).toEqual(['miss']);

        // 5. Plain text miss
        effects.length = 0;
        result.current.parseCombatLine("you shoot at a deer, but miss.", "You shoot at a deer, but miss.");
        expect(arrowHit).toBe(false);
        expect(effects).toEqual(['miss']);

        // 6. Failed attempt
        effects.length = 0;
        result.current.parseCombatLine("your attempt to shoot an orc fails.", "Your attempt to shoot an orc fails.");
        expect(arrowHit).toBe(false);
        expect(effects).toEqual(['miss']);

        // 7. Opponent shooting / snoop mode does NOT play player arrowhit
        arrowHit = false;
        result.current.parseCombatLine("an orc shoots an arrow at you.", "<damage>An orc shoots an arrow at you.</damage>");
        result.current.parseCombatLine("you shoot an orc hard.", "<hit>You shoot an orc hard.</hit>", true);
        expect(arrowHit).toBe(false);
    });
});

