/** @file Saved client macros shared by settings, command definitions, and hotkeys. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientMacroState } from '../types';
import { validateClientMacro } from '../utils/clientMacros';

// --- Macro Persistence ---
export const useClientMacroStore = create<ClientMacroState>()(persist((set, get) => ({
    macros: [],
    save: (macro, previousName) => {
        const normalized = { ...macro, name: macro.name.trim().toLowerCase() };
        const error = validateClientMacro(normalized);
        if (error) return error;
        if (previousName && previousName !== normalized.name && get().macros.some(item => item.name === normalized.name)) return 'That macro name is already in use.';
        if (normalized.hotkey && get().macros.some(item => item.name !== previousName && item.name !== normalized.name && item.hotkey === normalized.hotkey)) return 'That keybinding is already assigned to another macro.';
        set(state => ({ macros: [...state.macros.filter(item => item.name !== normalized.name && item.name !== previousName), normalized] }));
        return null;
    },
    remove: name => set(state => ({ macros: state.macros.filter(macro => macro.name !== name) }))
}), { name: 'mume-client-macros-v1', partialize: state => ({ macros: state.macros }) }));
