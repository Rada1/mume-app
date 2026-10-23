/** @file Persisted client macro and keybinding contracts. */

// --- Macro Definitions ---
export interface ClientMacro {
    name: string;
    commands: string[];
    hotkey: string | null;
}
export interface ClientMacroState {
    macros: ClientMacro[];
    defaultMacrosInstalled: boolean;
    save: (macro: ClientMacro, previousName?: string) => string | null;
    remove: (name: string) => void;
}
