/** @file objectSaddleTracker.test.ts — Confirmed mount cargo changes preserve unrelated belongings. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DrawerLine } from '../../types';
import { useCorpseContentsStore } from '../../stores/useCorpseContentsStore';
import { trackSaddleAction } from './objectSaddleTracker';

// --- Captured Mount Fixtures ---
const saddle: DrawerLine = {
    id: 'saddle', text: 'a leather saddle', html: 'a leather saddle', isItem: true, prefix: '<worn about body>'
};
const sword: DrawerLine = {
    id: 'sword', text: 'a two-handed sword', html: 'a two-handed sword', isItem: true
};
const capture = (id: string, target: string, lines: DrawerLine[]) => {
    const store = useCorpseContentsStore.getState();
    store.requestContents(id, target);
    store.captureContents(`examine ${target}`, lines);
};

// --- Confirmed Cargo Changes ---
describe('mount belongings confirmations', () => {
    beforeEach(() => useCorpseContentsStore.getState().clearContents());

    it('clears carried items for the mount alias while retaining worn equipment and other mounts', () => {
        capture('command-mount:1:horse', 'horse', [saddle, sword]);
        capture('command-mount:1:pony', 'pony', [sword]);
        capture('command-mount:2:horse', 'horse', [sword]);
        const setInventoryLines = vi.fn();
        const clear = vi.fn();

        const handled = trackSaddleAction('You make a pack horse drop his belongings.', () => ['mount', 'all'], clear, {
            roomNum: 1, setInventoryLines
        });

        expect(handled).toBe(true);
        expect(useCorpseContentsStore.getState().contents['command-mount:1:horse']).toEqual([saddle]);
        expect(useCorpseContentsStore.getState().contents['command-mount:1:pony']).toEqual([sword]);
        expect(useCorpseContentsStore.getState().contents['command-mount:2:horse']).toEqual([sword]);
        expect(setInventoryLines).not.toHaveBeenCalled();
        expect(clear).toHaveBeenCalledOnce();
    });

    it('empties the displayed contents after the saddle has already been removed', () => {
        capture('command-mount:1:horse', 'horse', [sword]);
        trackSaddleAction('You make a pack horse drop its belongings.', () => ['horse', 'all'], vi.fn(), {
            roomNum: 1, setInventoryLines: vi.fn()
        });
        expect(useCorpseContentsStore.getState().contents['command-mount:1:horse']).toEqual([]);
    });

    it('retains cargo when the game does not confirm a successful drop', () => {
        capture('command-mount:1:horse', 'horse', [sword]);
        expect(trackSaddleAction('You cannot do that.', () => ['horse', 'all'], vi.fn(), {
            roomNum: 1, setInventoryLines: vi.fn()
        })).toBe(false);
        expect(useCorpseContentsStore.getState().contents['command-mount:1:horse']).toEqual([sword]);
    });
});
