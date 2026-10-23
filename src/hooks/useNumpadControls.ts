import { useEffect } from 'react';
import { NUMPAD_DIRECTION_KEYS } from '../utils/defaultHotkeys';

const emitNumpadCommandPress = (cmd: string) => {
    window.dispatchEvent(new CustomEvent('mume:numpad-command-press', { detail: { cmd } }));
};

export function useNumpadControls(
    executeCommand: (cmd: string) => void,
    getExitState?: (dir: string) => { hasDoor: boolean; isClosed: boolean } | null
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isNumpad = e.code.startsWith('Numpad') || e.location === 3;
            if (!isNumpad) return;

            const shortcut = NUMPAD_DIRECTION_KEYS.find(item => item.code === e.code
                || (e.location === 3 && item.alternateKeys.some(key => key === e.key)));
            const dir = shortcut?.command;

            if (!dir || !e.altKey) return;

            const activeEl = (e.target || document.activeElement) as HTMLElement;
            const isInputField = activeEl?.classList?.contains('input-field');
            const isInputOrTextarea = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
            if (isInputOrTextarea && !isInputField) {
                // Only allow numpad to trigger navigation if focused in the main chat/input area (.input-field)
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            emitNumpadCommandPress(dir);

            // Alt+numpad toggles the door on the exit in that direction.
            if (dir !== 'look' && getExitState) {
                const state = getExitState(dir);
                if (state?.hasDoor) {
                    executeCommand(state.isClosed ? `open ${dir}` : `close ${dir}`);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [executeCommand, getExitState]);
}
