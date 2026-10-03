/**
 * @file useMessageStore.ts
 * @description Holds the visible log and the longer-lived chat transcript.
 */
// --- Logic Section ---

import { create } from 'zustand';
import { Message } from '../types';

interface MessageStore {
    user: Message[];
    spectate: Message[];
    userChat: Message[];
    spectateChat: Message[];
    setUserMessages: (fn: (prev: Message[]) => Message[]) => void;
    setSpectateMessages: (fn: (prev: Message[]) => Message[]) => void;
    addUserChatMessage: (message: Message) => void;
    addSpectateChatMessage: (message: Message) => void;
    clearUserMessages: () => void;
    clearSpectateMessages: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
    user: [],
    spectate: [],
    userChat: [],
    spectateChat: [],
    setUserMessages: (fn) => set(s => ({ user: fn(s.user) })),
    setSpectateMessages: (fn) => set(s => ({ spectate: fn(s.spectate) })),
    addUserChatMessage: (message) => set(s => s.userChat.some(existing => existing.id === message.id)
        ? s
        : { userChat: [...s.userChat, message] }),
    addSpectateChatMessage: (message) => set(s => s.spectateChat.some(existing => existing.id === message.id)
        ? s
        : { spectateChat: [...s.spectateChat, message] }),
    clearUserMessages: () => set({ user: [] }),
    clearSpectateMessages: () => set({ spectate: [] }),
}));

if (typeof window !== 'undefined') {
    (window as any).__MESSAGE_STORE__ = useMessageStore;
}
