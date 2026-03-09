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
    scrollToBottom,
}: {
    msg: Message,
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean) => string,
    inCombat: boolean,
    scrollToBottom: (force?: boolean, instant?: boolean, source?: string) => void;
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
                    <TypewriterText 
                        html={content} 
                        speed={2} 
                        onUpdate={() => scrollToBottom(false, true, 'Typewriter')}
                    />
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
    const { scrollContainerRef, messagesEndRef, scrollToBottom } = viewport;

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
        const estimatedMsgHeight = 30; 
        
        const start = Math.max(0, Math.floor(scrollTop / estimatedMsgHeight) - 20);
        const end = Math.min(messages.length, Math.ceil((scrollTop + containerHeight) / estimatedMsgHeight) + 20);
        
        if (Math.abs(start - visibleRange.start) > 10 || Math.abs(end - visibleRange.end) > 10) {
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
            if (viewport.isLockedToBottomRef.current || lastMsg?.type === 'user') {
                viewport.isLockedToBottomRef.current = true;
                // User commands snap instantly, game text glides smoothly
                viewport.scrollToBottom(true, lastMsg?.type === 'user', 'NewMessage'); 
            }
        } else if (viewport.isLockedToBottomRef.current) {
            viewport.scrollToBottom(true, false, 'LayoutEffect');
        }
    }, [messages, viewport]);

    const renderedMessages = useMemo(() => {
        return messages.map((msg, i) => {
            // Always render the last 30 messages to prevent any popping at the bottom
            const isAtBottom = i >= messages.length - 30;

            if (i < visibleRange.start || (i > visibleRange.end && !isAtBottom)) {
                const h = msg.isRoomName ? 20 : (msg.textRaw.length > 100 ? 80 : 30);
                return <div key={msg.id} style={{ height: `${h}px` }} />;
            }
            return (
                <MessageItem
                    key={msg.id}
                    msg={msg}
                    processMessageHtml={processMessageHtml}
                    inCombat={inCombat}
                    scrollToBottom={scrollToBottom}
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
            <div ref={messagesEndRef} style={{ scrollMarginBottom: '100px', height: '1px' }} />
        </div>
    );
};

export default React.memo(MessageLog);
