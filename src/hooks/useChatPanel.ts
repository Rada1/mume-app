/**
 * @file useChatPanel.ts
 * @description Keeps the communication transcript, type filter, and command composer in sync.
 */

import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useGame } from '../context/GameContext';
import { useMessageStore } from '../stores/useMessageStore';
import { useModeStore } from '../stores/useModeStore';
import { getChatMessageDetails, getChatWindowMessages, getWhoPlayerNames } from '../utils/chatWindowUtils';

// --- Logic Section ---

export const CHAT_COMMANDS = ['say', 'tell', 'whisper', 'ask', 'narrate', 'yell', 'shout', 'sing', 'pray', 'group'] as const;
const TARGETED_COMMANDS = new Set<string>(['tell', 'whisper', 'ask']);

export const useChatPanel = () => {
    const { executeCommand, triggerHaptic, whoList } = useGame();
    const isSpectating = useModeStore(state => state.isSpectating);
    const activeView = useModeStore(state => state.activeView);
    const userMessages = useMessageStore(state => state.user);
    const spectateMessages = useMessageStore(state => state.spectate);
    const [filter, setFilter] = useState('all');
    const [command, setCommand] = useState('say');
    const [recipient, setRecipient] = useState('');
    const [recipientOpen, setRecipientOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [status, setStatus] = useState('');

    const messages = useMemo(() => getChatWindowMessages(
        isSpectating && activeView === 'target' ? spectateMessages : userMessages
    ), [activeView, isSpectating, spectateMessages, userMessages]);
    const visibleMessages = useMemo(() => filter === 'all'
        ? messages
        : messages.filter(message => getChatMessageDetails(message)?.channel === filter), [filter, messages]);
    const channels = useMemo(() => Array.from(new Set(
        messages.map(message => getChatMessageDetails(message)?.channel).filter((channel): channel is string => Boolean(channel))
    )).sort(), [messages]);
    const recipients = useMemo(() => getWhoPlayerNames(whoList), [whoList]);
    const needsRecipient = TARGETED_COMMANDS.has(command);

    const openRecipients = useCallback(() => {
        executeCommand('who', true, true, false, true);
        setRecipientOpen(true);
    }, [executeCommand]);

    const chooseCommand = useCallback((nextCommand: string) => {
        setCommand(nextCommand);
        setRecipient('');
        if (TARGETED_COMMANDS.has(nextCommand)) openRecipients();
        else setRecipientOpen(false);
        setStatus('');
    }, [openRecipients]);

    const toggleRecipients = useCallback(() => {
        if (recipientOpen) setRecipientOpen(false);
        else openRecipients();
    }, [openRecipients, recipientOpen]);

    const chooseRecipient = useCallback((name: string) => {
        setRecipient(name);
        setRecipientOpen(false);
        setStatus('');
    }, []);

    const send = useCallback((event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const text = inputValue.trim();
        if (!text) return;
        if (needsRecipient && !recipient) {
            openRecipients();
            setStatus('Choose a recipient from WHO.');
            return;
        }
        const serverCommand = command === 'group' ? 'gsay' : command;
        executeCommand(`${serverCommand}${recipient && needsRecipient ? ` ${recipient}` : ''} ${text}`);
        setInputValue('');
        setStatus('');
        triggerHaptic?.(15);
    }, [command, executeCommand, inputValue, needsRecipient, openRecipients, recipient, triggerHaptic]);

    return {
        messages, visibleMessages, channels, recipients, filter, setFilter,
        command, chooseCommand, recipient, chooseRecipient, recipientOpen, toggleRecipients,
        needsRecipient, inputValue, setInputValue, status, send
    };
};
