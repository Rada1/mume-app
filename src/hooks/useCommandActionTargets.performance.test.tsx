/** @file Command room updates reuse personal gear projection and selector numbering. */
// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCommandActionTargets } from './useCommandActionTargets';
import { getCommandGearActionTargets, getCommandRoomActionTargets } from '../objects/commandActionTargetModel';
import type { DrawerLine } from '../types';

const room = vi.hoisted(() => ({ rawExits: {} as Record<string, unknown> }));
vi.mock('../stores/useActiveGameState', () => ({ useActiveRoom: () => room }));
vi.mock('../objects/commandActionTargetModel', async original => {
    const model = await original<typeof import('../objects/commandActionTargetModel')>();
    return { ...model, getCommandGearActionTargets: vi.fn(model.getCommandGearActionTargets),
        getCommandRoomActionTargets: vi.fn(model.getCommandRoomActionTargets) };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); room.rawExits = {}; });

// --- Projection Lifetime Section ---
it('reuses gear across room arrivals, but renumbers inventory and equipment together after gear edits', () => {
    const arrow = (id: string): DrawerLine => ({ id, text: 'an ash arrow', html: '', isItem: true, context: 'arrow' });
    const initial: Parameters<typeof useCommandActionTargets>[0] = {
        players: [], npcs: [], roomObjects: [], groupMembers: [],
        wornLines: [arrow('worn')], inventoryLines: [arrow('carried')],
        selectedObjectIds: new Set(), toggleObjectSelection: vi.fn(), setTarget: vi.fn(),
        setPopoverState: vi.fn(), setScope: vi.fn(), setPanelOpen: vi.fn()
    };
    const { result, rerender } = renderHook(props => useCommandActionTargets(props), { initialProps: initial });
    const worn = result.current.entries.find(entry => entry.id === 'worn')!;
    expect(worn.context).toBe('2.arrow');
    expect(getCommandGearActionTargets).toHaveBeenCalledTimes(1);
    for (let index = 0; index < 5; index++) {
        rerender({ ...initial, npcs: [{ id: index + 1, name: `guard ${index}`, type: 'npc' }] });
        expect(result.current.entries.find(entry => entry.id === 'worn')).toBe(worn);
    }
    expect(getCommandGearActionTargets).toHaveBeenCalledTimes(1);
    const roomCalls = vi.mocked(getCommandRoomActionTargets).mock.calls.length;
    // Keep the last room snapshot stable while changing just inventory.
    const lastNpcs = vi.mocked(getCommandRoomActionTargets).mock.calls.at(-1)![1];
    rerender({ ...initial, npcs: lastNpcs, inventoryLines: [...initial.inventoryLines, arrow('second')] });
    expect(getCommandGearActionTargets).toHaveBeenCalledTimes(2);
    expect(getCommandRoomActionTargets).toHaveBeenCalledTimes(roomCalls);
    expect(result.current.entries.find(entry => entry.id === 'worn')?.context).toBe('3.arrow');
});

it('refreshes live exit metadata without rebuilding gear', () => {
    const options: Parameters<typeof useCommandActionTargets>[0] = {
        players: [], npcs: [], roomObjects: [], groupMembers: [], wornLines: [], inventoryLines: [],
        selectedObjectIds: new Set(), toggleObjectSelection: vi.fn(), setTarget: vi.fn(),
        setPopoverState: vi.fn(), setScope: vi.fn(), setPanelOpen: vi.fn()
    };
    const { result, rerender } = renderHook(() => useCommandActionTargets(options));
    room.rawExits = { north: { door: true, doorName: 'gate' } };
    rerender();
    expect(getCommandGearActionTargets).toHaveBeenCalledTimes(1);
    expect(result.current.entries.some(entry => entry.category === 'cat-exit')).toBe(true);
});
