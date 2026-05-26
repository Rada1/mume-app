import { useEffect } from 'react';

const NUMPAD_MAP: Record<string, string> = {
    Numpad8: 'n',
    Numpad2: 's',
    Numpad6: 'e',
    Numpad4: 'w',
    Numpad7: 'u',
    Numpad3: 'd',
    Numpad5: 'look',
};

export function useNumpadControls(
    executeCommand: (cmd: string) => void,
    getExitState?: (dir: string) => { hasDoor: boolean; isClosed: boolean } | null
) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isNumpad = e.code.startsWith('Numpad') || e.location === 3;
            if (!isNumpad) return;

            let dir: string | undefined = undefined;
            
            // Map keys based on code or key + location
            if (e.code === 'Numpad8' || (e.location === 3 && (e.key === 'ArrowUp' || e.key === '8'))) {
                dir = 'n';
            } else if (e.code === 'Numpad2' || (e.location === 3 && (e.key === 'ArrowDown' || e.key === '2'))) {
                dir = 's';
            } else if (e.code === 'Numpad6' || (e.location === 3 && (e.key === 'ArrowRight' || e.key === '6'))) {
                dir = 'e';
            } else if (e.code === 'Numpad4' || (e.location === 3 && (e.key === 'ArrowLeft' || e.key === '4'))) {
                dir = 'w';
            } else if (e.code === 'Numpad7' || (e.location === 3 && (e.key === 'Home' || e.key === '7'))) {
                dir = 'u';
            } else if (e.code === 'Numpad3' || (e.location === 3 && (e.key === 'PageDown' || e.key === '3'))) {
                dir = 'd';
            } else if (e.code === 'Numpad5' || (e.location === 3 && (e.key === 'Clear' || e.key === '5'))) {
                dir = 'look';
            }

            if (!dir) return;

            const activeEl = e.target as HTMLElement;
            const tag = activeEl?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') {
                // Only allow numpad to trigger navigation if focused in the main chat/input area (.input-field)
                if (!activeEl.classList.contains('input-field')) {
                    return;
                }
            }

            e.preventDefault();

            // Alt+numpad: toggle open/close on the exit in that direction
            if (e.altKey && dir !== 'look' && getExitState) {
                const state = getExitState(dir);
                if (state?.hasDoor) {
                    executeCommand(state.isClosed ? `open ${dir}` : `close ${dir}`);
                }
                return;
            }

            executeCommand(dir);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [executeCommand, getExitState]);
}
