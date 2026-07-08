/**
 * @file chatWindowUtils.ts
 * @description Headless helpers for selecting communication messages for the optional chat window.
 */

import type { Message } from '../types';

// --- Logic Section ---

const CHAT_MESSAGE_LIMIT = 200;
const OUTGOING_CHAT_COMMANDS = new Set([
    'ask',
    'group',
    'narrate',
    'pray',
    'say',
    'shout',
    'sing',
    'song',
    'tell',
    'whisper',
    'yell'
]);

export interface ChatMessageDetails {
    channel: string;
    sender: string;
    text: string;
    isOutgoing: boolean;
    target?: string;
    roomKey?: string;
    roomName?: string;
}

// Strips leftover ANSI escapes/XML-ish tags from sender/target names so the
// same person always resolves to the same private-thread identity, regardless
// of whether the name came from a raw server tag (incoming) or plain typed
// text (outgoing).
const cleanChatName = (value?: string): string | undefined => {
    if (!value) return value;
    const cleaned = value
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '')
        .trim();
    return cleaned || undefined;
};

export const normalizeChatChannel = (value?: string): string => {
    const normalized = (value || 'chat').toLowerCase().replace(/s$/, '');
    if (normalized === 'song') return 'sing';
    if (normalized === 'tell the group') return 'group';
    return normalized;
};

export const parseOutgoingChatCommand = (text: string): ChatMessageDetails | null => {
    const clean = text.trim().replace(/^[>+\s]+/, '');
    const match = clean.match(/^([a-z]+)(?:\s+(.+))?$/i);
    if (!match) return null;

    const command = normalizeChatChannel(match[1]);
    if (!OUTGOING_CHAT_COMMANDS.has(command)) return null;

    const rest = (match[2] || '').trim();
    if (!rest) return null;

    if (command === 'tell' || command === 'whisper') {
        const targetMatch = rest.match(/^(\S+)\s+(.+)$/);
        if (!targetMatch) return null;
        return {
            channel: command,
            sender: 'You',
            target: cleanChatName(targetMatch[1]),
            text: targetMatch[2].trim(),
            isOutgoing: true
        };
    }

    return {
        channel: command,
        sender: 'You',
        text: rest,
        isOutgoing: true
    };
};

export const getChatMessageDetails = (message: Message): ChatMessageDetails | null => {
    if (message.type === 'user') {
        const parsed = parseOutgoingChatCommand(message.textOnly || message.textRaw);
        return parsed ? { ...parsed, roomKey: message.commRoomKey, roomName: message.commRoomName } : null;
    }
    if (message.isSocial) return null;
    if (!message.isComm && message.type !== 'comm' && message.type !== 'comm-continue' && !message.replyCommand) return null;

    const action = message.replyCommand || message.commAction || 'chat';
    return {
        channel: normalizeChatChannel(action),
        sender: cleanChatName(message.commSender) || cleanChatName(message.replyTarget) || 'Someone',
        text: message.commText || message.textOnly || message.textRaw,
        isOutgoing: false,
        target: cleanChatName(message.replyTarget),
        roomKey: message.commRoomKey,
        roomName: message.commRoomName
    };
};

export const isChatMessage = (message: Message): boolean => (
    getChatMessageDetails(message) !== null
);

export const getChatWindowMessages = (messages: Message[]): Message[] => (
    messages.filter(isChatMessage).slice(-CHAT_MESSAGE_LIMIT)
);
