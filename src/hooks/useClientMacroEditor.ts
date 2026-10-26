/** @file Macro form drafts, saved records, and keybinding recording. */
import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { ClientMacro } from '../types';
import { useClientMacroStore } from '../stores/useClientMacroStore';
import { macroHotkeyFor, splitMacroCommands } from '../utils/clientMacros';
import { macroKeyCodeFor } from '../utils/clientMacroHotkeys';

// --- Editor Actions ---
export const useClientMacroEditor = () => {
    const { macros, save, remove } = useClientMacroStore();
    const [editing, setEditing] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [body, setBody] = useState('');
    const [hotkey, setHotkey] = useState<string | null>(null);
    const [recording, setRecording] = useState(false);
    const [error, setError] = useState('');
    const reset = () => { setEditing(null); setName(''); setBody(''); setHotkey(null); setRecording(false); setError(''); };
    const edit = (macro: ClientMacro) => {
        setEditing(macro.name); setName(macro.name); setBody(macro.commands.join('\n')); setHotkey(macro.hotkey); setError(''); setRecording(false);
    };
    const submit = () => {
        const normalizedName = name.trim().toLowerCase();
        if (!editing && macros.some(macro => macro.name === normalizedName)) { setError('That name already exists. Choose Edit to change it.'); return; }
        const problem = save({ name: normalizedName, commands: splitMacroCommands(body), hotkey }, editing ?? undefined);
        if (problem) setError(problem); else reset();
    };
    const record = (event: KeyboardEvent<HTMLInputElement>) => {
        if (!recording) return;
        event.preventDefault(); event.stopPropagation();
        if (event.repeat || event.nativeEvent.isComposing) return;
        const modified = event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;
        if (event.key === 'Escape' && !modified) { setRecording(false); return; }
        if (!modified && (event.key === 'Tab' || (event.key === 'Enter' && macroKeyCodeFor(event.nativeEvent) !== 'NumpadEnter'))) return;
        const key = macroHotkeyFor(event.nativeEvent);
        if (key) { setHotkey(key); setRecording(false); setError(''); }
    };
    const deleteMacro = (macroName: string) => { remove(macroName); if (editing === macroName) reset(); };
    return { macros, editing, name, setName, body, setBody, hotkey, setHotkey, recording,
        setRecording, error, reset, edit, submit, record, deleteMacro };
};
