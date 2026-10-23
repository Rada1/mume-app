/** @file Saved client macros shared by settings, command definitions, and hotkeys. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientMacroState } from '../types';
import { validateClientMacro } from '../utils/clientMacros';
import { DEFAULT_NUMPAD_MACROS } from '../utils/defaultHotkeys';

// --- Default Migration ---
const installMissingDefaults = (savedMacros: ClientMacroState['macros']) => {
    const names = new Set(savedMacros.map(macro => macro.name));
    const assignedKeys = new Set(savedMacros.flatMap(macro => macro.hotkey ? [macro.hotkey] : []));
    const defaults = DEFAULT_NUMPAD_MACROS
        .filter(macro => !names.has(macro.name))
        .map(macro => assignedKeys.has(macro.hotkey ?? '') ? { ...macro, hotkey: null } : macro);
    return [...savedMacros, ...defaults];
};

// --- Macro Persistence ---
export const useClientMacroStore = create<ClientMacroState>()(persist((set, get) => ({
    macros: DEFAULT_NUMPAD_MACROS,
    defaultMacrosInstalled: true,
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
}), {
    name: 'mume-client-macros-v1',
    version: 1,
    partialize: state => ({ macros: state.macros, defaultMacrosInstalled: state.defaultMacrosInstalled }),
    migrate: (persistedState, version) => {
        const savedState = persistedState as Partial<Pick<ClientMacroState, 'macros' | 'defaultMacrosInstalled'>>;
        const savedMacros = Array.isArray(savedState.macros) ? savedState.macros : [];
        const installDefaults = version < 1 || savedState.defaultMacrosInstalled !== true;
        return {
            macros: installDefaults ? installMissingDefaults(savedMacros) : savedMacros,
            defaultMacrosInstalled: true
        } as ClientMacroState;
    }
}));
