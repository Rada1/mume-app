/** @file Client-only alias definitions and macro invocation before command splitting. */
import { useCallback } from 'react';
import { useClientMacroStore } from '../stores/useClientMacroStore';
import { expandClientMacro, splitMacroCommands } from '../utils/clientMacros';

// --- Local Command Interception ---
export const useClientMacroCommands = () => useCallback((
    input: string, execute: (command: string) => void, report: (message: string) => void, canRun: boolean, allowBareInvocation = false
): boolean => {
    const command = input.trim();
    const store = useClientMacroStore.getState();
    if (/^\/alias(?:\s|$)/i.test(command)) {
        const definition = /^\/alias\s+(\S+)\s+([\s\S]+)$/i.exec(command);
        if (!definition) {
            report('Usage: /alias <name> <command; command>. Type <name> to run it. Edit in Settings → Actions/Macros.');
            return true;
        }
        const name = definition[1].toLowerCase();
        const existing = store.macros.find(macro => macro.name === name);
        const error = store.save({ name, commands: splitMacroCommands(definition[2]), hotkey: existing?.hotkey ?? null });
        report(error ?? `Client macro ${name} saved. Type ${name} to run it.`);
        return true;
    }
    const deletion = /^\/unalias(?:\s+(\S+))?\s*$/i.exec(command);
    if (deletion) {
        const name = deletion[1]?.toLowerCase();
        if (!name) report('Usage: /unalias <name>.');
        else if (!store.macros.some(macro => macro.name === name)) report(`No client macro named ${name}.`);
        else { store.remove(name); report(`Client macro ${name} deleted.`); }
        return true;
    }
    const invocation = (allowBareInvocation ? /^\/?([a-z][\w-]*)$/i : /^\/([a-z][\w-]*)$/i).exec(command);
    if (!invocation || !store.macros.some(macro => macro.name === invocation[1].toLowerCase())) return false;
    if (!canRun) { report('Enter the game before running a macro.'); return true; }
    try { expandClientMacro(invocation[1], store.macros).forEach(command => execute(command)); }
    catch (error) { report(error instanceof Error ? error.message : 'Could not run macro.'); }
    return true;
}, []);
