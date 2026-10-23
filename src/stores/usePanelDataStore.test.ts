/** @file usePanelDataStore.test.ts — Session isolation and serialized panel snapshot requests. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePanelDataStore } from './usePanelDataStore';

// --- Session and Request Checks ---
beforeEach(() => {
    vi.useFakeTimers();
    usePanelDataStore.getState().setSession(null);
    usePanelDataStore.getState().setSession('ellessar');
});
afterEach(() => {
    usePanelDataStore.getState().setSession(null);
    vi.useRealTimers();
});

describe('on demand panel snapshots', () => {
    it('does not send commands until requested and serializes simultaneous gear opens', () => {
        const send = vi.fn();
        const store = usePanelDataStore.getState();
        expect(store.status.skills).toBe('idle');
        expect(send).not.toHaveBeenCalled();
        store.request('equipment', send);
        store.request('inventory', send);
        store.request('equipment', send);
        expect(send.mock.calls).toEqual([['equipment']]);
        store.complete('equipment');
        vi.advanceTimersByTime(0);
        expect(send.mock.calls).toEqual([['equipment'], ['inventory']]);
        store.complete('inventory');
        store.request('inventory', send);
        expect(send).toHaveBeenCalledTimes(2);
    });

    it('accepts a manual practice capture and allows explicit refreshing', () => {
        const send = vi.fn();
        const store = usePanelDataStore.getState();
        store.complete('skills');
        store.request('skills', send);
        expect(send).not.toHaveBeenCalled();
        store.request('skills', send, true);
        expect(send).toHaveBeenCalledWith('practice');
        store.complete('skills');
        expect(usePanelDataStore.getState().status.skills).toBe('ready');
    });

    it('allows retry after a missing response without getting stuck', () => {
        const send = vi.fn();
        const store = usePanelDataStore.getState();
        store.request('skills', send);
        vi.advanceTimersByTime(15000);
        expect(usePanelDataStore.getState().status.skills).toBe('idle');
        store.request('skills', send);
        expect(send).toHaveBeenCalledTimes(2);
    });

    it('discards pending requests and readiness when changing characters', () => {
        const send = vi.fn();
        const store = usePanelDataStore.getState();
        store.complete('skills');
        store.request('equipment', send);
        store.request('inventory', send);
        store.setSession('another-character');
        vi.runAllTimers();
        expect(send.mock.calls).toEqual([['equipment']]);
        expect(usePanelDataStore.getState().status).toEqual({ skills: 'idle', equipment: 'idle', inventory: 'idle', aliases: 'idle', shop: 'idle', gold: 'idle' });
    });
});
