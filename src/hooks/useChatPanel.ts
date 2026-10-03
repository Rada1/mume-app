/**
 * @file useChatPanel.ts
 * @description Keeps communication history, reply context, and the chat-only composer in sync.
 */

import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useGame } from '../context/GameContext';
import { useMessageStore } from '../stores/useMessageStore';
import { useModeStore } from '../stores/useModeStore';
import type { Message, ParleyState } from '../types';
import { getChatMessageDetails, getChatReplyDetails, getChatWindowMessages } from '../utils/chatWindowUtils';
import { useWhoListRefresh } from './useWhoListRefresh';

// --- Logic Section ---

export const useChatPanel = () => {
    const { executeCommand, triggerHaptic, whoList } = useGame();
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const userMessages = useMessageStore(state => state.userChat);
    const spectateMessages = useMessageStore(state => state.spectateChat);
    const [filter, setFilter] = useState('all');
    const [command, setCommand] = useState<Exclude<ParleyState['command'], 'none'>>('say');
    const [target, setTarget] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');

    const messages = useMemo(() => getChatWindowMessages(
        isSpectating && activeView === 'target' ? spectateMessages : userMessages
    ), [activeView, isSpectating, spectateMessages, userMessages]);
    const visibleMessages = useMemo(() => filter === 'all'
        ? messages
        : messages.filter(message => getChatMessageDetails(message)?.channel === filter), [filter, messages]);
    const channels = useMemo(() => Array.from(new Set(
        messages.map(message => getChatMessageDetails(message)?.channel).filter((channel): channel is string => Boolean(channel))
    )).sort(), [messages]);

    const replyToMessage = useCallback((message: Message) => {
        const reply = getChatReplyDetails(message);
        if (!reply) return false;
        setCommand(reply.command);
        setTarget(reply.target);
        return true;
    }, []);

    const ensureWhoList = useWhoListRefresh(whoList, executeCommand);

    const send = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const text = inputValue.trim();
        if (!text) return;
        const needsTarget = command === 'tell' || command === 'whisper' || command === 'ask';
        if (needsTarget && !target) return;
        const serverCommand = command === 'group' ? 'gsay' : command;
        executeCommand(`${serverCommand}${needsTarget && target ? ` ${target}` : ''} ${text}`);
        setInputValue('');
        triggerHaptic?.(15);
    }, [command, executeCommand, inputValue, target, triggerHaptic]);

    return {
        visibleMessages, channels, filter, setFilter,
        command, setCommand, target, setTarget, inputValue, setInputValue,
        whoList, replyToMessage, ensureWhoList, send
    };
};
