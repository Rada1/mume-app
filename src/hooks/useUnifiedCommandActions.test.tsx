// @vitest-environment jsdom
/** @file useUnifiedCommandActions.test.tsx — Checks mount actions react to the public game context. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NPC_BUTTONS } from '../constants/buttons/inline/npcs';
import { WORLD_BUTTONS } from '../constants/buttons/inline/world';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import type { PopoverState } from '../types';
import { useUnifiedCommandActions } from './useUnifiedCommandActions';

const state = vi.hoisted(() => ({
    isRiding: false,
    playerPosition: 'standing',
    inCombat: false,
    groupMembers: [] as Array<{ id: number; name: string; hp: number }>,
    opponentId: null as number | null,
    abilities: {} as Record<string, number>
}));
vi.mock('../context/GameContext', () => ({
    useGame: () => ({ ...state, btn: { buttons: [...NPC_BUTTONS, ...WORLD_BUTTONS] }, entities: {}, roomNpcs: [], roomPlayers: [], inlineCategories: [] }),
    useVitals: () => ({ groupMembers: state.groupMembers, opponentId: state.opponentId, opponentName: null })
}));

// --- Mount Availability Regression ---
const target: PopoverState = {
    x: 0, y: 0, entityId: 'roomchars:17', category: 'cat-mount', setId: 'cat-mount', context: 'horse'
};
beforeEach(() => {
    state.isRiding = false;
    state.playerPosition = 'standing';
    state.inCombat = false;
    state.groupMembers = [];
    state.opponentId = null;
    state.abilities = {};
    usePanelDataStore.setState(current => ({ status: { ...current.status, skills: 'idle' } }));
});
afterEach(cleanup);

// --- Door Skill Availability ---
describe('door commands', () => {
    it('offers learned Bash and Pick after skill sync and excludes movement', () => {
        const door: PopoverState = {
            x: 0, y: 0, entityId: 'room-exit:d', category: 'cat-exit', setId: 'cat-exit', context: 'exit d'
        };
        state.abilities = { bash: 80, pick: 60 };
        const { result, rerender } = renderHook(() => useUnifiedCommandActions(door, 'selected', 'exit d'));
        const buttons = () => result.current.actionGroups.flatMap(group => group.buttons);
        expect(buttons().map(button => button.label)).not.toContain('Go');
        expect(buttons().map(button => button.label)).not.toContain('Bash');
        usePanelDataStore.setState(current => ({ status: { ...current.status, skills: 'ready' } }));
        rerender();
        expect(buttons().map(button => button.label)).toEqual(expect.arrayContaining(['Bash', 'Pick']));
        expect(buttons().map(button => button.label)).not.toContain('Go');
        state.abilities = { bash: 0, pick: 0 };
        rerender();
        expect(buttons().map(button => button.label)).not.toContain('Bash');
        expect(buttons().map(button => button.label)).not.toContain('Pick');
    });
});

describe('mount commands', () => {
    it('updates both directions when GameContext riding changes without changing the target', () => {
        const { result, rerender } = renderHook(() => useUnifiedCommandActions(target, 'selected', 'horse'));
        const verbs = () => result.current.actionGroups.find(group => group.section.key === 'trait-mount')
            ?.buttons.map(button => button.command.split(' ')[0]);
        expect(verbs()).toEqual(expect.arrayContaining(['ride', 'abandon']));
        expect(verbs()).not.toContain('saddle');
        expect(verbs()).not.toContain('unsaddle');
        expect(verbs()).not.toContain('dismount');
        state.isRiding = true;
        rerender();
        expect(verbs()).toContain('dismount');
        for (const verb of ['ride', 'saddle', 'unsaddle', 'abandon']) expect(verbs()).not.toContain(verb);
        state.isRiding = false;
        rerender();
        expect(verbs()).toContain('ride');
        expect(verbs()).not.toContain('dismount');
    });

    it.each(['riding', 'mounted'])('recognizes the %s game position', position => {
        state.playerPosition = position;
        const { result } = renderHook(() => useUnifiedCommandActions(target, 'selected', 'horse'));
        const buttons = result.current.actionGroups.find(group => group.section.key === 'trait-mount')?.buttons || [];
        expect(buttons.some(button => button.command.startsWith('dismount'))).toBe(true);
        expect(buttons.some(button => button.command.startsWith('ride '))).toBe(false);
    });
});

describe('group member commands', () => {
    it('hides the offense trait for a group member even while engaged in combat', () => {
        state.groupMembers = [{ id: 17, name: 'pack horse', hp: 100 }];
        state.inCombat = true;
        state.opponentId = 17;
        const groupTarget: PopoverState = {
            ...target, category: 'cat-npc', setId: 'cat-npc', context: 'pack horse'
        };
        const { result } = renderHook(() => useUnifiedCommandActions(groupTarget, 'selected', 'pack horse'));

        const traits = result.current.actionGroups.map(group => group.section.key);
        expect(traits).not.toContain('trait-offense');
    });
});

describe('offense commands', () => {
    it('includes Hit in the general offense actions for an enemy', () => {
        const enemyTarget: PopoverState = {
            ...target, category: 'cat-enemy', setId: 'cat-enemy', context: 'orc'
        };
        const { result } = renderHook(() => useUnifiedCommandActions(enemyTarget, 'selected', 'orc'));
        const offense = result.current.actionGroups.find(group => group.section.key === 'trait-offense');

        expect(offense?.buttons).toContainEqual(expect.objectContaining({
            id: 'btn-hit',
            label: 'Hit',
            command: 'hit %n'
        }));
    });

    it('shows Bash Disengage in the Warrior offense subgroup when Bash is learned', () => {
        const enemyTarget: PopoverState = {
            ...target, category: 'cat-enemy', setId: 'cat-enemy', context: 'orc'
        };
        state.abilities = { bash: 80 };
        usePanelDataStore.setState(current => ({ status: { ...current.status, skills: 'ready' } }));

        const { result } = renderHook(() => useUnifiedCommandActions(enemyTarget, 'selected', 'orc'));
        const offense = result.current.actionGroups.find(group => group.section.key === 'trait-offense');

        expect(offense?.buttons.map(button => button.label)).toContain('Bash');
        expect(offense?.buttons).toContainEqual(expect.objectContaining({
            id: 'inline-ability-offense-warrior-bash-disengage',
            label: 'Bash Disengage',
            command: 'bash dis %n',
            inlineSubgroup: 'Warrior'
        }));
    });

    it('shows Disengage and Flee under Retreat for enemy targets', () => {
        const enemyTarget: PopoverState = {
            ...target, category: 'cat-enemy', setId: 'cat-enemy', context: 'orc'
        };
        const { result } = renderHook(() => useUnifiedCommandActions(enemyTarget, 'selected', 'orc'));
        const retreat = result.current.actionGroups.find(group => group.section.key === 'trait-retreat');

        expect(retreat?.buttons.map(button => button.command)).toEqual(['disengage', 'flee']);
    });
});
