/** @file useChatComposerRequestStore.ts — Routes command selections into the Chat panel composer. */
import { create } from 'zustand';
import type { ParleyState } from '../types';

// --- Request State ---
type ChatCommand = Exclude<ParleyState['command'], 'none'>;

interface ChatComposerRequest {
    id: number;
    command: ChatCommand;
    target: string | null;
    text: string;
}

interface ChatComposerRequestState {
    nextRequestId: number;
    request: ChatComposerRequest | null;
    requestComposer: (command: ChatCommand, target: string | null, text?: string) => void;
    clearRequest: (id: number) => void;
}

// --- Store ---
export const useChatComposerRequestStore = create<ChatComposerRequestState>()(set => ({
    nextRequestId: 1,
    request: null,
    requestComposer: (command, target, text = '') => set(state => ({
        nextRequestId: state.nextRequestId + 1,
        request: { id: state.nextRequestId, command, target, text }
    })),
    clearRequest: id => set(state => state.request?.id === id ? { request: null } : state)
}));
