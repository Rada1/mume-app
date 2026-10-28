/** @file Mobile command snapshots reuse eligibility across unrelated character updates. */
// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCommandTreeEligibility } from './useCommandTreeEligibility';
import type { useCommandTreeController } from './useCommandTreeController';
import { createButton } from '../utils/buttonFactory';
import type { CharacterInfo, CustomButton } from '../types';
import * as objectTargets from '../objects/objectTargetModel';

vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));
vi.mock('./useCommandTreeAutomaticTarget', () => ({ useCommandTreeAutomaticTarget: () => null }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// --- Snapshot Invalidation Section ---
const setup = () => {
    const hit = createButton({ id: 'btn-hit', label: 'Hit', command: 'hit %n', setId: 'trait-offense' });
    const guard = { id: 'guard', label: 'Guard', keyword: 'guard', context: 'guard',
        category: 'cat-npc', group: 'npcs', scope: 'room' };
    const controller = {
        game: { characterName: 'Tester', inlineCategories: [], entities: {}, roomNpcs: [], currentTerrain: 'field' },
        vitals: { characterInfo: { race: 'elf', class: 'warrior' } as CharacterInfo },
        ui: {}, entries: [guard], menuButtons: [hit]
    } as unknown as ReturnType<typeof useCommandTreeController>;
    const catalog = { groups: [{ label: 'Abilities', buttons: [hit] }], sectionFor: () => 'Combat action' };
    const variants = new Map<string, CustomButton[]>();
    const hook = renderHook(() => useCommandTreeEligibility(controller, catalog, variants, false, true, true));
    return { controller, hit, ...hook };
};

it('retains materialized groups and targets after XP, gold and level updates', () => {
    const { controller, hit, result, rerender } = setup();
    const first = result.current;
    const buttons = first.grouped[0].buttons;
    const targets = first.targetsFor(hit);
    expect(targets.some(entry => entry.id === 'guard')).toBe(true);
    controller.vitals.characterInfo = { ...controller.vitals.characterInfo, xp: 123, gold: 456, level: 40 };
    rerender();
    expect(result.current).toBe(first);
    expect(result.current.grouped[0].buttons).toBe(buttons);
    expect(result.current.targetsFor(hit)).toBe(targets);
});

it('refreshes requirements, trait settings, occupants, terrain and learned buttons', () => {
    const { controller, hit, result, rerender } = setup();
    const refresh = (change: () => void) => {
        const previous = result.current;
        change(); rerender();
        expect(result.current).not.toBe(previous);
    };
    refresh(() => { controller.vitals.characterInfo = { ...controller.vitals.characterInfo, race: 'troll' }; });
    refresh(() => { controller.vitals.characterInfo = { ...controller.vitals.characterInfo, subrace: 'cave' }; });
    refresh(() => { controller.vitals.characterInfo = { ...controller.vitals.characterInfo, class: 'ranger' }; });
    refresh(() => { controller.game.inlineCategories = [...controller.game.inlineCategories]; });
    refresh(() => { controller.game.currentTerrain = 'water'; });
    refresh(() => { controller.menuButtons = [...controller.menuButtons]; });
    refresh(() => { controller.entries = []; });
    expect(result.current.targetsFor(hit).some(entry => entry.id === 'guard')).toBe(false);
});

it('does not repeatedly classify gear during room eligibility refreshes', () => {
    const classify = vi.spyOn(objectTargets, 'getGearObjectCandidates');
    const { controller, result, rerender } = setup();
    expect(classify).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 10; index++) {
        controller.entries = [...controller.entries];
        rerender();
        void result.current.grouped[0].buttons;
    }
    expect(classify).toHaveBeenCalledTimes(2);
    controller.ui.displayInventoryLines = [{ id: 'sword', text: 'a steel sword', html: '', context: 'sword', isItem: true }];
    rerender();
    expect(classify).toHaveBeenCalledTimes(3);
});
