/** @file Physical keybindings for client macros, including modified numpad keys. */
import { useEffect, useRef } from 'react';
import { useClientMacroStore } from '../stores/useClientMacroStore';
import { macroHotkeyFor } from '../utils/clientMacros';

// --- Keyboard Dispatch ---
export const useClientMacroHotkeys = (execute: (command: string) => void, enabled: boolean) => {
    const executeRef = useRef(execute);
    const enabledRef = useRef(enabled);
    executeRef.current = execute;
    enabledRef.current = enabled;
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            if (!enabledRef.current || event.repeat || event.isComposing || event.defaultPrevented) return;
            const target = event.target instanceof Element ? event.target : null;
            if (target?.closest('.modal, [role="dialog"], .mapper-room-info-panel')) return;
            const editing = target?.closest('input, textarea, select, [contenteditable="true"]');
            const commandInput = target?.classList.contains('input-field');
            if (editing && (!commandInput || (!event.code.startsWith('Numpad') && !event.ctrlKey && !event.altKey && !event.metaKey && !/^F\d+$/.test(event.code)))) return;
            const hotkey = macroHotkeyFor(event);
            if (!hotkey) return;
            const macro = useClientMacroStore.getState().macros.find(item => item.hotkey === hotkey);
            if (!macro) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            executeRef.current(`/${macro.name}`);
        };
        window.addEventListener('keydown', keydown, true);
        return () => window.removeEventListener('keydown', keydown, true);
    }, []);
};
