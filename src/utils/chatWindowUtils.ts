/**
 * @file chatWindowUtils.ts
 * @description Headless helpers for selecting communication messages for the optional chat window.
 */

import type { Message } from '../types';

// --- Logic Section ---

const OUTGOING_CHAT_COMMANDS = new Set([
    'ask',
    'group',
    'gsay',
    'emote',
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
    color?: string;
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
    if (normalized === 'gsay') return 'group';
    if (normalized === 'tell the group') return 'group';
    return normalized;
};

export const getChatChannelColor = (channel?: string, commColor?: string): string => {
    if (commColor) return commColor;
    const norm = normalizeChatChannel(channel);
    const colorMap: Record<string, string> = {
        tell: 'var(--ansi-bright-green, #44ff70)',
        say: 'var(--ansi-bright-cyan, #38bdf8)',
        ask: 'var(--ansi-bright-cyan, #38bdf8)',
        yell: 'var(--ansi-bright-magenta, #c084fc)',
        shout: 'var(--ansi-bright-magenta, #fb7185)',
        whisper: 'var(--ansi-bright-magenta, #a78bfa)',
        narrate: 'var(--ansi-bright-yellow, #f5f749)',
        pray: 'var(--ansi-bright-yellow, #facc15)',
        sing: 'var(--ansi-bright-magenta, #f0abfc)',
        song: 'var(--ansi-bright-magenta, #f0abfc)',
        group: 'var(--ansi-bright-cyan, #38bdf8)',
    };
    return colorMap[norm] || 'var(--ansi-bright-cyan, #38bdf8)';
};

export const parseOutgoingChatCommand = (text: string): ChatMessageDetails | null => {
    const clean = text.trim().replace(/^(?:[^\s>]{1,20})?>\s*/, '').replace(/^[+\s]+/, '');
    const match = clean.match(/^([a-z]+)(?:\s+(.+))?$/i);
    if (!match) return null;

    const command = normalizeChatChannel(match[1]);
    if (!OUTGOING_CHAT_COMMANDS.has(command)) return null;

    const rest = (match[2] || '').trim();
    if (!rest) return null;

    const color = getChatChannelColor(command);

    if (command === 'tell' || command === 'whisper' || command === 'ask') {
        const targetMatch = rest.match(/^(\S+)\s+(.+)$/);
        if (!targetMatch) return null;
        return {
            channel: command,
            sender: 'You',
            target: cleanChatName(targetMatch[1]),
            text: targetMatch[2].trim(),
            isOutgoing: true,
            color
        };
    }

    return {
        channel: command,
        sender: 'You',
        text: rest,
        isOutgoing: true,
        color
    };
};

const CHAT_VERBS: Record<string, [string, string]> = {
    ask: ['asks you', 'ask'],
    group: ['tells the group', 'tell the group'],
    narrate: ['narrates', 'narrate'],
    pray: ['prays', 'pray'],
    say: ['says', 'say'],
    shout: ['shouts', 'shout'],
    sing: ['sings', 'sing'],
    tell: ['tells you', 'tell'],
    whisper: ['whispers to you', 'whisper to'],
    yell: ['yells', 'yell'],
    emote: ['emotes', 'emote']
};

export const getChatTranscriptPhrase = (details: ChatMessageDetails): string => {
    const [incoming, outgoing] = CHAT_VERBS[details.channel] || [details.channel, details.channel];
    if (!details.isOutgoing) return `${details.sender} ${incoming}:`;
    const target = details.target && ['tell', 'whisper', 'ask'].includes(details.channel) ? ` ${details.target}` : '';
    return `You ${outgoing}${target}:`;
};

export const getWhoPlayerNames = (whoList: string[]): string[] => Array.from(new Set(
    whoList.map(entry => (entry.includes('|') ? entry.split('|')[1] : entry).trim()).filter(Boolean)
)).sort((first, second) => first.localeCompare(second));

export const getChatMessageDetails = (message: Message): ChatMessageDetails | null => {
    if (message.type === 'user') {
        const parsed = parseOutgoingChatCommand(message.textOnly || message.textRaw);
        return parsed ? { ...parsed, roomKey: message.commRoomKey, roomName: message.commRoomName } : null;
    }
    if (message.isSocial) return null;
    if (!message.isComm && message.type !== 'comm' && message.type !== 'comm-continue' && !message.replyCommand) return null;

    const action = message.replyCommand || message.commAction || 'chat';
    const channel = normalizeChatChannel(action);
    const color = getChatChannelColor(channel, message.commColor);
    return {
        channel,
        sender: cleanChatName(message.commSender) || cleanChatName(message.replyTarget) || 'Someone',
        text: message.commText || message.textOnly || message.textRaw,
        isOutgoing: false,
        target: cleanChatName(message.replyTarget),
        roomKey: message.commRoomKey,
        roomName: message.commRoomName,
        color
    };
};

export const isChatMessage = (message: Message): boolean => (
    getChatMessageDetails(message) !== null
);

export const getChatWindowMessages = (messages: Message[]): Message[] => (
    messages.filter(isChatMessage)
);
