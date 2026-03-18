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

export function useNumpadControls(executeCommand: (cmd: string) => void) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const cmd = NUMPAD_MAP[e.code];
            if (!cmd) return;

            // Don't intercept when typing in an input or textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            e.preventDefault();
            executeCommand(cmd);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [executeCommand]);
}
