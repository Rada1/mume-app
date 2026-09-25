// @vitest-environment jsdom
/**
 * @file ThisIsYouConsole.test.tsx
 * @description Unit tests for ThisIsYouConsole component and state pills.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThisIsYouConsole } from './ThisIsYouConsole';
import { hasCondition, formatHeight, formatNumber } from './thisIsYouHelpers';

const mockExecuteCommand = vi.fn();
const mockSetMood = vi.fn();
const mockSetSpellSpeed = vi.fn();
const mockSetAlertness = vi.fn();
const mockSetPlayerPosition = vi.fn();
const mockCombatState = vi.hoisted(() => ({
    inCombat: false,
    opponentName: null as string | null,
    opponentHealthStatus: null as string | null
}));

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        characterInfo: {
            name: 'Ellessar',
            level: 104,
            subrace: 'Ainu',
            subclass: 'Rider',
            height: 'six feet two inches',
            age: 500,
            gold: 1500,
            citizenships: 'Gondor',
            xp: 12000000,
            xpnl: 0,
            tp: 110000,
            tpnl: 0
        },
        characterName: 'Ellessar',
        executeCommand: mockExecuteCommand,
        triggerHaptic: vi.fn(),
        mood: 'aggressive',
        setMood: mockSetMood,
        spellSpeed: 'normal',
        setSpellSpeed: mockSetSpellSpeed,
        alertness: 'vigilant',
        setAlertness: mockSetAlertness,
        setPlayerPosition: mockSetPlayerPosition,
        isSpectateMode: false
    }),
    useUI: () => ({
        ui: {},
        setUI: vi.fn()
    })
}));

vi.mock('../../stores/useActiveGameState', () => ({
    useActiveVitals: () => ({
        hp: 437,
        maxHp: 437,
        mana: 96,
        maxMana: 96,
        move: 120,
        maxMove: 120,
        ob: 137,
        db: 23,
        pb: 25,
        armour: 1,
        wimpy: 30,
        inCombat: mockCombatState.inCombat,
        position: 'standing',
        conditions: { riding: true, sanctuary: true },
        characterInfo: { affectedBy: ['armour', 'bless'] }
    }),
    useActiveCombat: () => ({
        opponentName: mockCombatState.opponentName,
        opponentHealthStatus: mockCombatState.opponentHealthStatus
    })
}));

vi.mock('../../stores/useEffectTimerStore', () => ({
    useEffectTimerStore: () => []
}));

describe('thisIsYouHelpers', () => {
    it('handles various condition formats correctly in hasCondition', () => {
        expect(hasCondition(null, 'riding')).toBe(false);
        expect(hasCondition(undefined, 'riding')).toBe(false);
        expect(hasCondition(['riding', 'sanctuary'], 'riding')).toBe(true);
        expect(hasCondition(['riding', 'sanctuary'], 'bless')).toBe(false);
        expect(hasCondition({ riding: true, sanctuary: false }, 'riding')).toBe(true);
        expect(hasCondition({ riding: true, sanctuary: false }, 'sanctuary')).toBe(false);
        expect(hasCondition('riding sanctuary', 'riding')).toBe(true);
    });

    it('formats height properly', () => {
        expect(formatHeight('six feet two inches')).toBe('6\' 2"');
        expect(formatHeight('5 feet 11 inches')).toBe('5\' 11"');
        expect(formatHeight(undefined)).toBe('—');
    });

    it('formats numbers with locale commas', () => {
        expect(formatNumber(12605497)).toBe('12,605,497');
        expect(formatNumber(0)).toBe('0');
        expect(formatNumber(null)).toBe('—');
    });
});

describe('ThisIsYouConsole Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCombatState.inCombat = false;
        mockCombatState.opponentName = null;
        mockCombatState.opponentHealthStatus = null;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('renders all three tiers with explicit category state labels', () => {
        render(<ThisIsYouConsole />);

        // Tier 1: Identity & Bio
        expect(screen.getByText('Ellessar')).toBeDefined();
        expect(screen.getByText('Lv.104')).toBeDefined();
        expect(screen.getByText(/6' 2"/)).toBeDefined();
        expect(screen.getByText('1,500')).toBeDefined();

        // Tier 2: Numerical Vitals & Capabilities
        expect(screen.getByText('437 / 437')).toBeDefined();
        expect(screen.getByText('96 / 96')).toBeDefined();
        expect(screen.getByText('120 / 120')).toBeDefined();
        expect(screen.getByText('137')).toBeDefined(); // Attack
        expect(screen.getByText('23')).toBeDefined();  // Dodge
        expect(screen.getByText('25')).toBeDefined();  // Parry
        expect(screen.getByText(/Wimpy:/i)).toBeDefined(); // Wimpy
        expect(screen.getByText('30')).toBeDefined();

        // Tier 3: Category-explicit state pills
        expect(screen.getByText(/Position:/i)).toBeDefined();
        expect(screen.getByText('Standing')).toBeDefined();
        expect(screen.getByText(/Alertness:/i)).toBeDefined();
        expect(screen.getByText('Vigilant')).toBeDefined();
        expect(screen.getByText(/Mood:/i)).toBeDefined();
        expect(screen.getByText('Aggressive')).toBeDefined();
        expect(screen.getByText(/Cast Speed:/i)).toBeDefined();
        expect(screen.getByText('Normal')).toBeDefined();

        // Reported affects and condition flags use their actual names.
        expect(screen.getByText('Armour')).toBeDefined();
        expect(screen.getByText('Bless')).toBeDefined();
        expect(screen.getByText('Sanctuary')).toBeDefined();
        expect(screen.queryByText(/hit power/)).toBeNull();
    });

    it('allows changing mood via popover dropdown', () => {
        render(<ThisIsYouConsole />);

        const moodPill = screen.getByRole('button', { name: /Mood:.*Aggressive/i });
        fireEvent.click(moodPill);

        const braveOption = screen.getByRole('option', { name: /Brave/i });
        fireEvent.click(braveOption);

        expect(mockSetMood).toHaveBeenCalledWith('brave');
        expect(mockExecuteCommand).toHaveBeenCalledWith('cha mood brave');
    });

    it('keeps combat ratings visible without repeating the opponent', () => {
        mockCombatState.inCombat = true;
        mockCombatState.opponentName = 'a snarling wolf';
        mockCombatState.opponentHealthStatus = 'Wounded';

        render(<ThisIsYouConsole />);

        const combatPanel = screen.getByRole('group', { name: 'Combat' });
        expect(combatPanel.textContent).toContain('Offense: 137');
        expect(combatPanel.textContent).toContain('Parry: 25');
        expect(combatPanel.textContent).toContain('Dodge: 23');
        expect(combatPanel.textContent).toContain('Armor: 1');
        expect(combatPanel.textContent).toContain('Wimpy: 30');
        expect(combatPanel.textContent).not.toContain('a snarling wolf');
        expect(combatPanel.textContent).not.toContain('Wounded');
    });
});
