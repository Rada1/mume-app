/** @file useCorpseLootActions.ts - Refreshes a persistent corpse after acknowledged loot commands. */
import { useEffect, useRef, useState } from 'react';
import { useMessageStore } from '../stores/useMessageStore';

// --- Response Tracking ---
const sendAndWait = (command: string, send: (command: string) => void, signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
    const previous = useMessageStore.getState().user.filter(message => message.type === 'prompt').at(-1);
    let unsubscribe = () => {};
    const finish = (error?: Error) => {
        clearTimeout(timeout);
        unsubscribe();
        signal.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
    };
    const abort = () => finish(new Error('Looting stopped because the room changed.'));
    const timeout = setTimeout(() => finish(new Error('No reply to the loot command. Reopen the corpse to check its contents.')), 20000);
    signal.addEventListener('abort', abort, { once: true });
    unsubscribe = useMessageStore.subscribe(state => {
        const prompt = state.user.filter(message => message.type === 'prompt').at(-1);
        if (prompt && prompt.id !== previous?.id) finish();
    });
    try { if (signal.aborted) abort(); else send(command); }
    catch (error) { finish(error instanceof Error ? error : new Error('The loot command failed.')); }
});

// --- Loot Workflow ---
export const useCorpseLootActions = <T,>({ executeCommand, examineCorpse, roomNum }: {
    executeCommand: (command: string) => void;
    examineCorpse: (corpse: T) => void;
    roomNum: string | number | null | undefined;
}) => {
    const active = useRef<AbortController | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [status, setStatus] = useState('');
    useEffect(() => {
        setIsBusy(false);
        setStatus('');
        return () => { active.current?.abort(); active.current = null; };
    }, [roomNum]);
    const execute = (corpse: T, commands: string) => {
        if (active.current) return;
        const controller = new AbortController();
        active.current = controller;
        setIsBusy(true);
        setStatus('');
        void (async () => {
            try {
                for (const command of commands.split(';').map(part => part.trim()).filter(Boolean)) {
                    await sendAndWait(command, executeCommand, controller.signal);
                }
                if (!controller.signal.aborted) examineCorpse(corpse);
            } catch (error) {
                if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Unable to refresh corpse contents.');
            } finally {
                if (active.current === controller) { active.current = null; setIsBusy(false); }
            }
        })();
    };
    return { execute, isBusy, status };
};
