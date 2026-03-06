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

    return (
        <div
            className={`message ${msg.type}${inCombat && !msg.isCombat ? ' combat-dim' : ''}`}
        >
            {msg.type === 'user' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
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
        const estimatedMsgHeight = 25;
        
        const start = Math.max(0, Math.floor(scrollTop / estimatedMsgHeight) - 30);
        // If locked to bottom or near it, ensure we render everything to the end
        const end = isNearBottom 
            ? messages.length 
            : Math.min(messages.length, Math.ceil((scrollTop + containerHeight) / estimatedMsgHeight) + 30);
        
        if (Math.abs(start - visibleRange.start) > 10 || (isNearBottom && visibleRange.end !== messages.length) || (!isNearBottom && Math.abs(end - visibleRange.end) > 10)) {
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
                viewport.scrollToBottom(true);
            }
        } else if (viewport.isLockedToBottomRef.current) {
            viewport.scrollToBottom(true);
        }
    }, [messages, viewport]);

    const renderedMessages = useMemo(() => {
        return messages.map((msg, i) => {
            if (i < visibleRange.start || i > visibleRange.end) {
                // Return a spacer div to maintain scroll position
                return <div key={msg.id} style={{ height: '25px' }} />;
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
    }, [messages, visibleRange, processMessageHtml, inCombat, viewport]);

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
            {activePrompt && (
                <div className="message prompt msg-latest" style={{ transition: 'none' }}>
                    <div className="message-content" dangerouslySetInnerHTML={{ __html: processMessageHtml(ansiConvert.toHtml(activePrompt), 'prompt', false) }} />
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default React.memo(MessageLog);
