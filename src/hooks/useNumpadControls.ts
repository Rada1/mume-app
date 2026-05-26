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
            const dir = NUMPAD_MAP[e.code];
            if (!dir) return;

            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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
