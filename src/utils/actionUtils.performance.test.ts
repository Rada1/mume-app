/** @file actionUtils.performance.test.ts — Guards shared trait checks and action parity. */
import { afterEach, expect, it, vi } from 'vitest';
import { getCommonActions, getEligibleActionButtonIds, isButtonValidForEntity, type ActionFilterDeps } from './actionUtils';
import * as traits from './inlineActionModel';
import { ITEM_BUTTONS } from '../constants/buttons/inline/items';
import { NPC_BUTTONS } from '../constants/buttons/inline/npcs';
import { DOOR_BUTTONS } from '../constants/buttons/doors';
import { createButton } from './buttonFactory';

// --- Eligibility Checks ---
afterEach(() => vi.restoreAllMocks());
const buttons = [...ITEM_BUTTONS, ...NPC_BUTTONS, ...DOOR_BUTTONS];
const deps: ActionFilterDeps = { buttons, entities: {}, inlineCategories: [], roomNpcs: [] };

it.each([
    ['cat-worn-object', 'a glass flask'],
    ['cat-inventory-object', 'a twisted rock fragment'],
    ['cat-room-object', 'a corpse'],
    ['cat-npc', 'a guard'],
    ['cat-exit', 'a gate'],
])('preserves all action rules for %s with shared eligibility', (category, name) => {
    const prepared = getEligibleActionButtonIds(category, name, deps);
    const direct = buttons.filter(button => isButtonValidForEntity(button, 'target', category, deps, category, name));
    const shared = buttons.filter(button => isButtonValidForEntity(button, 'target', category, deps, category, name, prepared));
    expect(shared).toEqual(direct);
});

it('resolves traits once per target instead of once per command and target', () => {
    const resolve = vi.spyOn(traits, 'getResolvedTraitSections');
    const targets = ['first', 'second', 'third'];
    const direct = targets.map(id => buttons.filter(button => isButtonValidForEntity(button, id, 'cat-inventory-object', deps)));
    expect(resolve).toHaveBeenCalledTimes(targets.length * buttons.length);
    resolve.mockClear();
    const common = getCommonActions(targets, 'cat-inventory-object', deps);
    expect(resolve).toHaveBeenCalledTimes(targets.length);
    expect(common.map(button => button.command).sort()).toEqual([...new Set(direct[0].map(button => button.command))].sort());
});

it('refreshes character and trait eligibility for each new preparation', () => {
    const button = createButton({id: 'restricted', label: 'Wear', command: 'wear %n', setId: 'trait-test'});
    const resolve = vi.spyOn(traits, 'getResolvedTraitSections');
    resolve.mockReturnValue([{trait: {id: 'trait-test', label: 'Test', keywords: [], buttonIds: [button.id], requirement: {race: ['elf']}}, buttonIds: [button.id]}]);
    const elf = {...deps, characterInfo: {race: 'elf'} as ActionFilterDeps['characterInfo']};
    const dwarf = {...deps, characterInfo: {race: 'dwarf'} as ActionFilterDeps['characterInfo']};
    expect(getEligibleActionButtonIds('cat-inventory-object', 'coat', elf).has(button.id)).toBe(true);
    expect(getEligibleActionButtonIds('cat-inventory-object', 'coat', dwarf).has(button.id)).toBe(false);
    resolve.mockReturnValue([]);
    expect(getEligibleActionButtonIds('cat-inventory-object', 'coat', elf).has(button.id)).toBe(false);
});
