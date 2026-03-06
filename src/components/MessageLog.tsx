import React, { useCallback } from 'react';
import { Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import TypewriterText from './TypewriterText';

import { useGame } from '../context/GameContext';

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
    index,
    total,
    isLatest
}: {
    msg: Message,
    index: number,
    total: number,
    isLatest: boolean
}) => {
    const { inCombat, processMessageHtml, viewport } = useGame();
    return (
        <div
            className={`message ${msg.type}${inCombat && !msg.isCombat ? ' combat-dim' : ''}`}
        >
            {msg.type === 'user' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
            ) : (msg.isComm && isLatest) ? (
                <TypewriterText html={processMessageHtml(msg.html, msg.id, msg.isRoomName)} onUpdate={() => viewport.scrollToBottom(true)} />
            ) : (
                <div className="message-content" dangerouslySetInnerHTML={{ __html: processMessageHtml(msg.html, msg.id, msg.isRoomName) }} />
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
    const { messages, activePrompt, inCombat, viewport, processMessageHtml } = useGame();
    const { scrollContainerRef, messagesEndRef } = viewport;

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        // DO NOT update the locked state while an auto-scroll is in progress,
        // otherwise the smooth animation will "unlock" itself as it passes the threshold.
        if (!container || viewport.isAutoScrollingRef.current) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
        if (viewport.isLockedToBottomRef.current !== isNearBottom) {
            viewport.isLockedToBottomRef.current = isNearBottom;
        }
    }, [viewport]);

    const lastMessagesRef = React.useRef(messages);

    React.useLayoutEffect(() => {
        const isNewMessage = messages.length > lastMessagesRef.current.length;
        const lastMsg = messages[messages.length - 1];
        lastMessagesRef.current = messages;

        // Only force scroll-to-bottom if we were already locked OR if it's a user echo
        if (isNewMessage) {
            if (viewport.isLockedToBottomRef.current || lastMsg?.type === 'user') {
                viewport.isLockedToBottomRef.current = true;
                viewport.scrollToBottom(true);
            }
        } else if (viewport.isLockedToBottomRef.current) {
            viewport.scrollToBottom(true);
        }
    }, [messages, activePrompt, viewport]);

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
            {messages.map((msg, i) => (
                <MessageItem
                    key={msg.id}
                    msg={msg}
                    index={i}
                    total={messages.length}
                    isLatest={i === messages.length - 1}
                />
            ))}
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
