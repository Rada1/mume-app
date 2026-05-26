import { useEffect, useRef } from 'react';
import { CustomButton } from '../types';

const FKEYS = new Set(['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12']);

export function useFKeyControls(
    buttonsRef: React.MutableRefObject<CustomButton[]>,
    executeCommand: (cmd: string) => void
) {
    const executeRef = useRef(executeCommand);
    useEffect(() => { executeRef.current = executeCommand; }, [executeCommand]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!FKEYS.has(e.key)) return;

            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const btn = buttonsRef.current.find(b => b.hotkey === e.key);
            if (!btn) return;

            e.preventDefault();
            if (btn.command) executeRef.current(btn.command);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [buttonsRef]);
}
