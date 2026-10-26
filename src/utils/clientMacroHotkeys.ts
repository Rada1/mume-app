/** @file Physical macro shortcuts with stable modifier and numeric keypad identity. */
import type { ClientMacroKeyEvent } from '../types';

// --- Physical Key Normalization ---
const keypadKeys: Record<string,string> = {
    Insert:'Numpad0', End:'Numpad1', ArrowDown:'Numpad2', PageDown:'Numpad3',
    ArrowLeft:'Numpad4', Clear:'Numpad5', ArrowRight:'Numpad6', Home:'Numpad7',
    ArrowUp:'Numpad8', PageUp:'Numpad9', Delete:'NumpadDecimal',
    '.':'NumpadDecimal', ',':'NumpadDecimal', '+':'NumpadAdd', '-':'NumpadSubtract',
    '*':'NumpadMultiply', '/':'NumpadDivide', Enter:'NumpadEnter', '=':'NumpadEqual'
};
export const macroKeyCodeFor = (event: ClientMacroKeyEvent): string | null => {
    if (event.code.startsWith('Numpad')) return event.code;
    if (event.location === 3) {
        if (/^\d$/.test(event.key || '')) return `Numpad${event.key}`;
        const code = keypadKeys[event.key || ''] || keypadKeys[event.code];
        if (code) return code;
    }
    return event.code || null;
};

// --- Windows Shift/Num Lock Translation ---
const hasTranslatedNumpadShift = (event: ClientMacroKeyEvent, code: string, platform: string): boolean => {
    if (!/^Win/i.test(platform) || event.altKey || event.ctrlKey || event.metaKey || !event.getModifierState) return false;
    if (!/^Numpad(?:\d|Decimal)$/.test(code)) return false;
    const key = event.key || '';
    const navigation = keypadKeys[key] === code && /^(?:Arrow|Insert|Delete|Home|End|Page|Clear)/.test(key);
    const numeric = code === 'NumpadDecimal' ? /^[.,]$/.test(key) : key === code.slice('Numpad'.length);
    // Windows can release Shift synthetically while temporarily reversing Num Lock.
    // Detect that reversal only for identifiable digit/navigation keys, never Alt codes.
    return event.getModifierState('NumLock') ? navigation : numeric;
};

// --- Shared Recording and Dispatch Identity ---
export const macroHotkeyFor = (event: ClientMacroKeyEvent,
    platform = typeof navigator === 'undefined' ? '' : navigator.platform): string | null => {
    const code = macroKeyCodeFor(event);
    if (!code || /^(?:Control|Shift|Alt|Meta)(?:Left|Right)$/.test(code)) return null;
    const shift = event.shiftKey || hasTranslatedNumpadShift(event,code,platform);
    return [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', shift && 'Shift', event.metaKey && 'Meta', code].filter(Boolean).join('+');
};
