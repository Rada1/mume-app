/** @file Client macro parsing and bounded expansion. */
import type { ClientMacro } from '../types';

// --- Command Syntax ---
export const RESERVED_MACRO_NAMES = new Set(['alias', 'unalias', 'macros', 'help', 'snoop', 'perf', 'target', 'replay']);
export const splitMacroCommands = (body: string): string[] => body.split(/[;\r\n]+/).map(command => command.trim()).filter(Boolean);
export const validateClientMacro = (macro: ClientMacro): string | null => {
    if (!/^[a-z][a-z0-9_-]*$/.test(macro.name)) return 'Use a name starting with a letter, followed by letters, numbers, _ or -.';
    if (RESERVED_MACRO_NAMES.has(macro.name)) return 'That name is reserved for a client command.';
    if (!macro.commands.length) return 'Add at least one command.';
    if (macro.commands.length > 100) return 'A macro can contain up to 100 commands.';
    return null;
};

// --- Resolve Before Sending ---
export const expandClientMacro = (name: string, macros: readonly ClientMacro[], visited: string[] = []): string[] => {
    const macro = macros.find(item => item.name === name.toLowerCase());
    if (!macro) throw new Error(`No client macro named ${name}.`);
    if (visited.includes(macro.name)) throw new Error('Macro chain contains a circular reference.');
    if (visited.length >= 10) throw new Error('Macro nesting is limited to 10 levels.');
    const result: string[] = [];
    for (const command of macro.commands) {
        // A slash explicitly invokes another macro inside a macro. Bare names
        // remain ordinary game commands and are sent directly to the server.
        const nested = /^\/([a-z][\w-]*)$/i.exec(command);
        if (nested && macros.some(item => item.name === nested[1].toLowerCase())) {
            result.push(...expandClientMacro(nested[1], macros, [...visited, macro.name]));
        } else result.push(command);
        if (result.length > 100) throw new Error('Expanded macros can contain up to 100 commands.');
    }
    return result;
};

// --- Physical Key Identity ---
export const macroHotkeyFor = (event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>): string | null => {
    if (!event.code || /^(?:Control|Shift|Alt|Meta)(?:Left|Right)$/.test(event.code)) return null;
    return [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta', event.code].filter(Boolean).join('+');
};
