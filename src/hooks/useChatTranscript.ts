/** @file useChatTranscript.ts — Preserves transcript position and prepares replies in the local composer. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import { useGame } from '../context/GameContext';
import type { ChatTranscriptContentProps, Message } from '../types';

// --- Logic Section ---
export const useChatTranscript = ({ chat, isVisible = true, focusRequest = 0, onReplyPrepared }: ChatTranscriptContentProps) => {
    const { triggerHaptic, playClickSound } = useGame();
    const rootRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const pinned = useRef(true);
    const lastFilter = useRef(chat.filter);
    const [atBottom, setAtBottom] = useState(true);
    const scrollToLatest = () => {
        const element = scrollRef.current;
        if (element) element.scrollTop = element.scrollHeight;
        pinned.current = true;
        setAtBottom(true);
    };
    useLayoutEffect(() => {
        const filterChanged = lastFilter.current !== chat.filter;
        lastFilter.current = chat.filter;
        if (isVisible && (pinned.current || filterChanged)) scrollToLatest();
    }, [chat.visibleMessages.length, chat.filter, isVisible]);
    const focusComposer = () => rootRef.current?.querySelector<HTMLInputElement>('.chat-communication-input')?.focus();
    useEffect(() => { if (isVisible && focusRequest) focusComposer(); }, [focusRequest, isVisible]);
    const onScroll = () => {
        const element = scrollRef.current;
        if (!element) return;
        pinned.current = element.scrollHeight - element.clientHeight - element.scrollTop < 48;
        setAtBottom(pinned.current);
    };
    const reply = (message: Message, event: React.SyntheticEvent<HTMLElement>) => {
        if (!chat.replyToMessage(message)) return;
        event.stopPropagation();
        triggerHaptic?.(20);
        playClickSound?.();
        focusComposer();
        onReplyPrepared?.();
    };
    return { rootRef, scrollRef, atBottom, onScroll, scrollToLatest, reply };
};
