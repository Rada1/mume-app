/**
 * @file shaperEntityStore.test.ts
 * @description Tests live Shaper entity lookup loading and timeout behavior.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { useShaperEntityStore } from '../useShaperEntityStore';

// --- Test Section ---
describe('useShaperEntityStore', () => {
    afterEach(() => {
        vi.useRealTimers();
        useShaperEntityStore.setState({
            mobiles: [],
            objects: [],
            loadingMobiles: false,
            loadingObjects: false,
            loadingStats: {},
            mobilesError: null,
            objectsError: null,
            mobileStats: {},
            objectStats: {},
            executeCommand: null
        });
    });

    it('clears mobile search loading if no live response arrives', () => {
        vi.useFakeTimers();
        const executeCommand = vi.fn();
        useShaperEntityStore.getState().setExecuteCommand(executeCommand);

        useShaperEntityStore.getState().searchMobiles('puff');

        expect(executeCommand).toHaveBeenCalledWith('/num m puff', true, false, false, true);
        expect(useShaperEntityStore.getState().loadingMobiles).toBe(true);

        vi.advanceTimersByTime(10000);

        expect(useShaperEntityStore.getState().loadingMobiles).toBe(false);
        expect(useShaperEntityStore.getState().mobilesError).toBe('Live mobile lookup timed out.');
    });

    it('clears object search loading when results arrive', () => {
        vi.useFakeTimers();
        useShaperEntityStore.getState().setExecuteCommand(vi.fn());

        useShaperEntityStore.getState().searchObjects('sword');
        useShaperEntityStore.getState().setObjectsResult([{ vnum: 101, name: 'a long sword' }]);
        vi.advanceTimersByTime(10000);

        expect(useShaperEntityStore.getState().loadingObjects).toBe(false);
        expect(useShaperEntityStore.getState().objectsError).toBeNull();
        expect(useShaperEntityStore.getState().objects[0].name).toBe('a long sword');
    });

    it('loads mobile stats directly for m-prefixed vnum searches', () => {
        const executeCommand = vi.fn();
        useShaperEntityStore.getState().setExecuteCommand(executeCommand);

        useShaperEntityStore.getState().searchMobiles('m 6113');

        expect(executeCommand).toHaveBeenCalledWith('/stat m 6113', true, false, false, true);
        expect(useShaperEntityStore.getState().mobiles[0]).toMatchObject({ vnum: 6113, name: 'm 6113' });
    });

    it('loads object stats directly for o-prefixed vnum searches', () => {
        const executeCommand = vi.fn();
        useShaperEntityStore.getState().setExecuteCommand(executeCommand);

        useShaperEntityStore.getState().searchObjects('o 9902');

        expect(executeCommand).toHaveBeenCalledWith('/stat o 9902', true, false, false, true);
        expect(useShaperEntityStore.getState().objects[0]).toMatchObject({ vnum: 9902, name: 'o 9902' });
    });

    it('can request builder info for cached entities', () => {
        const executeCommand = vi.fn();
        useShaperEntityStore.getState().setExecuteCommand(executeCommand);
        useShaperEntityStore.getState().setObjectStatResult({
            vnum: 9002,
            name: 'a canoe',
            type: 'BOAT',
            weight: 16,
            value: 0,
            extraFlags: [],
            wearFlags: [],
            rawText: 'Object stat'
        });

        useShaperEntityStore.getState().loadObjectInfo(9002);

        expect(executeCommand).toHaveBeenCalledWith('/info o 9002 r', true, false, false, true);
    });
});
