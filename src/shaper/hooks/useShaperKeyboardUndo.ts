/**
 * @file useShaperKeyboardUndo.ts
 * @description Keyboard shortcut support for Shaper undo.
 */

import { useEffect } from 'react';

// --- Keyboard Section ---
const isTextEditingTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    const tagName = target.tagName.toLowerCase();
    return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

export const useShaperKeyboardUndo = (canUndo: boolean, onUndo: () => void): void => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!canUndo || !event.ctrlKey || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') return;
            if (isTextEditingTarget(event.target)) return;
            event.preventDefault();
            onUndo();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndo, onUndo]);
};
