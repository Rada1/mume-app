/** @file useDesktopCommandInputFocus.ts — Routes desktop typing to the command bar when no editor is active. */

// --- Logic Section ---
import { useEffect, type RefObject } from 'react';

type CommandInputElement = HTMLInputElement | HTMLTextAreaElement;

const isTextEntryElement = (element: EventTarget | null): boolean => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.isContentEditable || element.getAttribute('role') === 'textbox') return true;
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
    if (!(element instanceof HTMLInputElement)) return false;
    return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(element.type);
};

export function useDesktopCommandInputFocus(
    enabled: boolean,
    inputRef: RefObject<CommandInputElement | null>,
    setInput: (value: string) => void,
): void {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.defaultPrevented || event.isComposing || event.key.length !== 1 || event.key === ' '
                || event.ctrlKey || event.metaKey || event.altKey
                || isTextEntryElement(event.target) || isTextEntryElement(document.activeElement)
            ) return;

            const input = inputRef.current;
            if (!input || input.disabled || input.readOnly) return;

            event.preventDefault();
            input.focus();
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? start;
            input.setRangeText(event.key, start, end, 'end');
            const caretPosition = start + event.key.length;
            setInput(input.value);

            window.requestAnimationFrame(() => {
                if (!input.isConnected) return;
                input.setSelectionRange(caretPosition, caretPosition);
                input.scrollLeft = input.scrollWidth;
            });
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [enabled, inputRef, setInput]);
}
