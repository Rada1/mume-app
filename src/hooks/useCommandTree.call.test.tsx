/** @file Call requires a nearby door but never offers or sends a target. */
// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCommandTree } from './useCommandTree';
import { COMMAND_TREE_CALL_BUTTON } from '../utils/commandTreeAccess';
import type { useCommandTreeController } from './useCommandTreeController';

vi.mock('./useRoomDrinkWater', () => ({ useRoomDrinkWater: () => false }));
vi.mock('./useGearPanelData', () => ({ useGearPanelData: () => ({ status: { skills: 'ready' } }) }));
vi.mock('./useCommandTreeAutomaticTarget', () => ({ useCommandTreeAutomaticTarget: () => null }));
afterEach(cleanup);

// --- Targetless Call Section ---
it.each([false, true])('gates targetless Call on a nearby door: %s', hasDoor => {
    const controller = {
        game: { characterName: 'Tester', inlineCategories: [], roomNpcs: [], entities: {}, currentTerrain: 'field', viewport: { isMobile: true } },
        ui: { displayInventoryLines: [], displayEqLines: [] }, vitals: { characterInfo: {} },
        entries: [{ id: 'exit-n', label: 'North exit', keyword: 'north', context: 'north', category: 'cat-exit', group: 'objects', scope: 'room', hasDoor }],
        menuButtons: [], previewEntity: vi.fn(), previewTargetContext: vi.fn(),
        practice: { open: false, setOpen: vi.fn() }, shop: { browsing: false },
    } as unknown as ReturnType<typeof useCommandTreeController>;
    const { result } = renderHook(() => useCommandTree(controller));
    expect(result.current.grouped.flatMap(group => group.buttons).some(button => button.id === COMMAND_TREE_CALL_BUTTON.id)).toBe(hasDoor);
    expect(result.current.targetsFor(COMMAND_TREE_CALL_BUTTON)).toEqual([]);
    expect(COMMAND_TREE_CALL_BUTTON.command).toBe('call');
});
