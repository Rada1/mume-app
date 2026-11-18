/** @file useChatHistoryChannels.ts — Filter a transcript and count recent incoming messages. */
import { useEffect, useMemo, useState } from 'react';
import type { Message } from '../types';
import { getChatMessageDetails } from '../utils/chatWindowUtils';

// --- Channel selection and recent activity ---
const RECENT_MS = 30_000;
export const useChatHistoryChannels = (messages: Message[]) => {
    const [filter, setFilter] = useState('all');
    const [clock, setClock] = useState(0);
    const summary = useMemo(() => {
        const now = Date.now();
        const channels = new Set<string>();
        const counts: Record<string, number> = {};
        let nextExpiry = Infinity;
        for (const message of messages) {
            const details = getChatMessageDetails(message);
            if (!details) continue;
            channels.add(details.channel);
            const expiry = message.timestamp + RECENT_MS;
            if (!details.isOutgoing && message.timestamp <= now && expiry > now) {
                counts[details.channel] = (counts[details.channel] || 0) + 1;
                counts.all = (counts.all || 0) + 1;
                nextExpiry = Math.min(nextExpiry, expiry);
            }
        }
        return { channels:[...channels].sort(), counts, nextExpiry };
    }, [messages, clock]);
    useEffect(() => {
        if (!Number.isFinite(summary.nextExpiry)) return;
        const timer = setTimeout(() => setClock(value => value + 1), Math.max(1, summary.nextExpiry - Date.now()));
        return () => clearTimeout(timer);
    }, [summary.nextExpiry]);
    const visibleMessages = useMemo(() => filter === 'all' ? messages : messages.filter(message => getChatMessageDetails(message)?.channel === filter), [filter, messages]);
    return { filter, setFilter, visibleMessages, channels:summary.channels, counts:summary.counts };
};
