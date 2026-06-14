/**
 * @file useShaperLiveImportStore.ts
 * @description Async rendezvous store for Shaper live-zone read captures.
 *
 * Live reads run god commands through `/at <room> …`, which teleports and emits
 * `<movement/>` tags plus extra prompts around the real output. The generic
 * capture machine is too fragile against that interleaving, so while an import
 * is active we collect output here directly: ignore movement/empty lines, and
 * resolve the pending command on the first prompt that follows real content.
 */

import { create } from 'zustand';
import type { CaptureType } from '../../types/capture';

export interface ShaperLiveCaptureResult {
    type: CaptureType;
    command: string;
    output: string;
}

interface PendingWaiter {
    command: string;
    resolve: (result: ShaperLiveCaptureResult) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

interface ShaperLiveImportState {
    waiters: PendingWaiter[];
    importing: boolean;
    activeCommand: string | null;
    buffer: string[];
    setImporting: (value: boolean) => void;
    waitForCommand: (command: string, timeoutMs?: number) => Promise<ShaperLiveCaptureResult>;
    collectLine: (text: string, isPromptBoundary: boolean) => void;
    receiveCapture: (result: ShaperLiveCaptureResult) => void;
    clearWaiters: () => void;
}

const normalizeCommand = (command: string): string =>
    command.trim().toLowerCase().replace(/\s+/g, ' ');

const isIgnorableLine = (text: string): boolean => {
    const clean = text.trim();
    if (!clean) return true;
    // `/at` teleport noise: movement tags and bare movement markers.
    return /^<\/?\s*movement\b/i.test(clean) || clean === '<movement/' || clean === '<movement/>';
};

// --- Store Section ---
export const useShaperLiveImportStore = create<ShaperLiveImportState>((set, get) => {
    const resolveActive = (output: string) => {
        const { activeCommand, waiters } = get();
        if (!activeCommand) return;
        const normalized = normalizeCommand(activeCommand);
        const waiter = waiters.find(item => normalizeCommand(item.command) === normalized);
        set({ activeCommand: null, buffer: [] });
        if (!waiter) return;
        clearTimeout(waiter.timer);
        set(state => ({ waiters: state.waiters.filter(item => item !== waiter) }));
        waiter.resolve({ type: 'none', command: activeCommand, output });
    };

    return {
        waiters: [],
        importing: false,
        activeCommand: null,
        buffer: [],
        setImporting: value => set({ importing: value }),
        waitForCommand: (command, timeoutMs = 8000) => new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                set(state => ({
                    waiters: state.waiters.filter(item => item.command !== command),
                    activeCommand: state.activeCommand === command ? null : state.activeCommand,
                    buffer: state.activeCommand === command ? [] : state.buffer
                }));
                reject(new Error(`Timed out waiting for live read: ${command}`));
            }, timeoutMs);
            set(state => ({
                waiters: [...state.waiters, { command, resolve, reject, timer }],
                activeCommand: command,
                buffer: []
            }));
        }),
        collectLine: (text, isPromptBoundary) => {
            if (!get().activeCommand) return;
            if (isPromptBoundary) {
                // Only a prompt that follows real (non-movement) content terminates
                // the read; leading teleport prompts arrive before any output.
                if (get().buffer.length > 0) resolveActive(get().buffer.join('\n'));
                return;
            }
            if (isIgnorableLine(text)) return;
            set(state => ({ buffer: [...state.buffer, text] }));
        },
        receiveCapture: result => {
            // While importing, the collector is the sole resolver (the capture
            // session is unreliable under `/at` movement); ignore session finalizes.
            if (get().importing) return;
            const command = normalizeCommand(result.command);
            const waiter = get().waiters.find(item => normalizeCommand(item.command) === command);
            if (!waiter) return;
            clearTimeout(waiter.timer);
            set(state => ({ waiters: state.waiters.filter(item => item !== waiter) }));
            waiter.resolve(result);
        },
        clearWaiters: () => {
            get().waiters.forEach(item => {
                clearTimeout(item.timer);
                item.reject(new Error('Live import cancelled.'));
            });
            set({ waiters: [], activeCommand: null, buffer: [] });
        }
    };
});
