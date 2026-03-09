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

    // Removed virtualization to ensure bit-perfect scroll height accuracy
    
    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;

        if (!viewport.isAutoScrollingRef.current) {
            if (viewport.isLockedToBottomRef.current !== isNearBottom) {
                viewport.isLockedToBottomRef.current = isNearBottom;
            }
        }

        // Virtualization removed to fix scroll height drift (Diff > 200px)
    }, [viewport, messages.length]);

    useEffect(() => {
        handleScroll();
    }, [messages.length, activePrompt, handleScroll]);

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
    }, [messages, activePrompt, viewport]);

    const renderedMessages = useMemo(() => {
        return messages.map((msg) => (
            <MessageItem
                key={msg.id}
                msg={msg}
                processMessageHtml={processMessageHtml}
                inCombat={inCombat}
                scrollToBottom={scrollToBottom}
            />
        ));
    }, [messages, processMessageHtml, inCombat]);

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
            {/* 12px "Visual Safe Zone" clears the input bar shadow and 3D perspective distortion */}
            <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
        </div>
    );
};

export default React.memo(MessageLog);
