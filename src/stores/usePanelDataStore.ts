/** @file usePanelDataStore.ts — Serializes requested panel snapshots and tracks session readiness. */
import { create } from 'zustand';
import type { PanelDataKind, PanelDataSender, PanelDataStatus, PanelDataState } from '../types';
import { useCommandAliasStore } from './useCommandAliasStore';
import { beginCharacterInfoRefresh } from '../utils/characterInfoRefreshTracker';

// --- Request Queue ---
const emptyStatus = (): Record<PanelDataKind, PanelDataStatus> => ({ skills: 'idle', equipment: 'idle', inventory: 'idle', aliases: 'idle', shop: 'idle', gold: 'idle' });
let queue: Array<{ kind: PanelDataKind; send: PanelDataSender }> = [];
let active: PanelDataKind | null = null;
let timeout: ReturnType<typeof setTimeout> | undefined;
const drain = () => {
    if (active) return;
    const next = queue.shift();
    if (!next) return;
    active = next.kind;
    if (next.kind === 'aliases') useCommandAliasStore.getState().begin();
    if (next.kind === 'gold') beginCharacterInfoRefresh(['gold']);
    timeout = setTimeout(() => {
        if (next.kind === 'aliases') useCommandAliasStore.getState().cancel();
        if (next.kind === 'gold') beginCharacterInfoRefresh([]);
        active = null;
        usePanelDataStore.setState(state => ({ status: { ...state.status, [next.kind]: 'idle' } }));
        drain();
    }, 15000);
    try { next.send(next.kind === 'skills' ? 'practice' : next.kind === 'aliases' ? 'alias'
        : next.kind === 'shop' ? 'list' : next.kind === 'gold' ? 'info %g' : next.kind); }
    catch {
        if (next.kind === 'aliases') useCommandAliasStore.getState().cancel();
        if (next.kind === 'gold') beginCharacterInfoRefresh([]);
        clearTimeout(timeout); active = null;
        usePanelDataStore.setState(state => ({ status: { ...state.status, [next.kind]: 'idle' } }));
        drain();
    }
};

// --- Session State ---
export const usePanelDataStore = create<PanelDataState>((set, get) => ({
    session: null,
    status: emptyStatus(),
    revision: 0,
    isActive: kind => active === kind,
    hasActiveRequest: () => active !== null,
    setSession: session => {
        if (get().session === session) return;
        if (active === 'gold') beginCharacterInfoRefresh([]);
        clearTimeout(timeout); active = null; queue = [];
        useCommandAliasStore.getState().reset();
        set({ session, status: emptyStatus() });
    },
    request: (kind, send, force = false) => {
        const state = get();
        if (!state.session || state.status[kind] === 'loading' || (!force && state.status[kind] === 'ready')) return;
        set({ status: { ...state.status, [kind]: 'loading' } });
        queue.push({ kind, send });
        drain();
    },
    invalidate: kind => {
        if (get().status[kind] === 'loading') return;
        set(state => ({ status: { ...state.status, [kind]: 'idle' }, revision: state.revision + 1 }));
    },
    fail: kind => {
        set(state => ({ status: { ...state.status, [kind]: 'idle' } }));
        queue = queue.filter(request => request.kind !== kind);
        if (active === kind) {
            clearTimeout(timeout); active = null;
            setTimeout(drain, 0);
        }
    },
    complete: kind => {
        if (!get().session) return;
        set(state => ({ status: { ...state.status, [kind]: 'ready' } }));
        queue = queue.filter(request => request.kind !== kind);
        if (active === kind) {
            clearTimeout(timeout); active = null;
            // Let the parser finish this response before starting another capture.
            setTimeout(drain, 0);
        }
    }
}));
