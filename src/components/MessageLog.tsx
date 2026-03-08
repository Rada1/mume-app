import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import TypewriterText from './TypewriterText';

import { useBaseGame, useVitals } from '../context/GameContext';

interface MessageLogProps {
    onLogClick: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onDoubleClick?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
}

    const MessageItem = React.memo(({
    msg,
    processMessageHtml,
    inCombat,
}: {
    msg: Message,
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean) => string,
    inCombat: boolean,
}) => {
    const content = useMemo(() => processMessageHtml(msg.html, msg.id, msg.isRoomName), [msg.html, msg.id, msg.isRoomName, processMessageHtml]);
    const isRecent = Date.now() - msg.timestamp < 2000;

    return (
        <div
            className={`message ${msg.type}${inCombat && !msg.isCombat ? ' combat-dim' : ''}${isRecent && (msg.timestamp > Date.now() - 300) ? ' recent-entry' : ''}`}
        >
            {msg.type === 'user' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
            ) : msg.isComm ? (
                isRecent ? (
                    <TypewriterText html={content} speed={2} />
                ) : (
                    <div className="message-content comm-text" dangerouslySetInnerHTML={{ __html: content }} />
                )
            ) : (
                <div className="message-content" dangerouslySetInnerHTML={{ __html: content }} />
            )}
        </div>
    );
});

const MessageLog: React.FC<MessageLogProps> = ({
    onLogClick,
    onMouseUp,
    onDoubleClick,
    onPointerDown,
    onDragStart,
    onDragEnd
}) => {
    const { messages, inCombat, viewport, processMessageHtml } = useBaseGame();
    const { activePrompt } = useVitals();
    const { scrollContainerRef, messagesEndRef } = viewport;

    // Virtualization state: start with a healthy range
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
    
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

        if (!viewport.isAutoScrollingRef.current) {
            if (viewport.isLockedToBottomRef.current !== isNearBottom) {
                viewport.isLockedToBottomRef.current = isNearBottom;
            }
        }

        // Simple virtualization: update visible window based on scroll
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const estimatedMsgHeight = 35; // Better average for MUME (descriptions are common)
        
        const start = Math.max(0, Math.floor(scrollTop / estimatedMsgHeight) - 40);
        // Force the last 50 messages to always be rendered to ensure smooth entry and animation
        const safeBottomCount = 50;
        const end = (isNearBottom || messages.length - (scrollTop + containerHeight) / estimatedMsgHeight < safeBottomCount)
            ? messages.length 
            : Math.min(messages.length, Math.ceil((scrollTop + containerHeight) / estimatedMsgHeight) + 40);
        
        if (Math.abs(start - visibleRange.start) > 20 || (isNearBottom && visibleRange.end !== messages.length) || (!isNearBottom && Math.abs(end - visibleRange.end) > 10)) {
            setVisibleRange({ start, end });
        }
    }, [viewport, messages.length, visibleRange]);

    useEffect(() => {
        handleScroll();
    }, [messages.length]);

    const lastMessagesRef = React.useRef(messages);

    React.useLayoutEffect(() => {
        const isNewMessage = messages.length > lastMessagesRef.current.length;
        const lastMsg = messages[messages.length - 1];
        lastMessagesRef.current = messages;

        if (isNewMessage) {
            // If we are at bottom or near it, we should hard scroll
            if (viewport.isLockedToBottomRef.current || lastMsg?.type === 'user') {
                viewport.isLockedToBottomRef.current = true;
                // User commands snap instantly, game text glides smoothly
                viewport.scrollToBottom(true, lastMsg?.type === 'user'); 
            }
        } else if (viewport.isLockedToBottomRef.current) {
            viewport.scrollToBottom(true, false);
        }
    }, [messages, viewport]);

    const renderedMessages = useMemo(() => {
        return messages.map((msg, i) => {
            const isVeryRecent = messages.length - i <= 10;
            // Always render the last 'safeBottomCount' messages to prevent popping during smooth scroll
            const isAtBottom = i >= messages.length - 50;

            if (i < visibleRange.start || (i > visibleRange.end && !isAtBottom)) {
                // Return a spacer div to maintain scroll position
                // Use a slightly smarter estimate: room names are small, descriptions are large
                const h = msg.isRoomName ? 20 : (msg.textRaw.length > 100 ? 100 : 35);
                return <div key={msg.id} style={{ height: `${h}px`, opacity: 0 }} />;
            }
            return (
                <MessageItem
                    key={msg.id}
                    msg={msg}
                    processMessageHtml={processMessageHtml}
                    inCombat={inCombat}
                />
            );
        });
    }, [messages, visibleRange, processMessageHtml, inCombat]);

    const activePromptContent = useMemo(() => {
        if (!activePrompt) return null;
        // Use a content-based mid to ensure highlighter cache doesn't return stale data
        const promptMid = `prompt-${activePrompt.length}-${activePrompt.replace(/\x1b\[[0-9;]*m/g, '').substring(0, 20)}`;
        return (
            <div className="message prompt msg-latest" style={{ transition: 'none' }}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: processMessageHtml(ansiConvert.toHtml(activePrompt), promptMid, false) }} />
            </div>
        );
    }, [activePrompt, processMessageHtml]);

    return (
        <div
            className={`message-log${inCombat ? ' combat-mode' : ''}`}
            ref={scrollContainerRef}
            onScroll={handleScroll}
            onPointerDown={onPointerDown}
            onClick={onLogClick}
            onMouseUp={onMouseUp}
            onDoubleClick={onDoubleClick}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            {renderedMessages}
            {activePromptContent}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default React.memo(MessageLog);
