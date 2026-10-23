/** @file useCommandAliasStore.ts — Atomically imports explicitly requested server alias lists. */

import { create } from 'zustand';
import type { CommandAliasState } from '../types';

// --- Import Lifecycle ---
export const useCommandAliasStore = create<CommandAliasState>((set, get) => ({
    aliases: [], pending: null, error: null,
    begin: () => set({ pending: [], error: null }),
    cancel: (error = 'Alias sync did not finish. Try syncing again.') => set({ pending: null, error }),
    reset: () => set({ aliases: [], pending: null, error: null }),
    receive: line => {
        const pending = get().pending;
        if (!pending) return 'ignored';
        const clean = line.trim();
        const footer = /^You have (\d+) alias(?:es)? defined\.$/i.exec(clean);
        const empty = /^(?:You have no|No) aliases(?: defined)?\.$/i.test(clean);
        if (footer || empty) {
            const expected = footer ? Number(footer[1]) : 0;
            if (expected !== pending.length) {
                get().cancel('Alias list was incomplete. Try syncing again.');
                return 'invalid';
            }
            set({ aliases: pending, pending: null, error: null });
            return 'complete';
        }
        const row = /^(\S+)\s+==>\s*(.+)$/.exec(clean);
        if (!row) return 'ignored';
        const name = row[1].toLowerCase();
        const alias = { name, expansion: row[2].trim() };
        set({ pending: [...pending.filter(entry => entry.name !== name), alias] });
        return 'row';
    }
}));
