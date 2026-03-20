import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { ansiConvert } from '../utils/ansi';
import { useVirtualizer } from '@tanstack/react-virtual';
import ShopItemCard from './ShopItemCard';
import PracticeSkillCard from './PracticeSkillCard';
import PracticeHeaderCard from './PracticeHeaderCard';
import PracticeClassHeaderCard from './PracticeClassHeaderCard';
import PracticeColumnHeaderCard from './PracticeColumnHeaderCard';

import { useBaseGame, useVitals, useLog } from '../context/GameContext';

interface MessageLogProps {
    onLogClick: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
}

const MessageItem = React.memo(({
    msg,
    processMessageHtml,
    inCombat,
    scrollToBottom,
    executeCommand,
    setParley,
}: {
    msg: Message,
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean, type?: MessageType) => string,
    inCombat: boolean,
    scrollToBottom: (force?: boolean, instant?: boolean, source?: string) => void;
    executeCommand: (cmd: string) => void;
    setParley: (p: import('../types').ParleyState) => void;
}) => {
    const content = useMemo(() => processMessageHtml(msg.html, msg.id, msg.isRoomName, msg.type), [msg.html, msg.id, msg.isRoomName, msg.type, processMessageHtml]);
    const isRecent = Date.now() - msg.timestamp < 2000;

    return (
        <div
            className={`message ${msg.type}${msg.isRoomName ? ' is-room-name' : ''}${msg.isComm ? ' is-comm' : ''}${inCombat && !msg.isCombat && !msg.isRoomName ? ' combat-dim' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${isRecent && (msg.timestamp > Date.now() - 600) ? ' recent-entry' : ''}`}
        >
            {msg.type === 'user' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'shop-item' && msg.shopItem ? (
                <ShopItemCard item={msg.shopItem} executeCommand={executeCommand} />
            ) : msg.type === 'practice-skill' && msg.practiceSkill ? (
                <PracticeSkillCard skill={msg.practiceSkill} />
            ) : msg.type === 'practice-header' && msg.practiceHeader ? (
                <PracticeHeaderCard sessionsLeft={msg.practiceHeader.sessionsLeft} />
            ) : msg.type === 'practice-column-header' ? (
                <PracticeColumnHeaderCard sessionsLeft={msg.practiceHeader?.sessionsLeft} />
            ) : msg.type === 'practice-class-header' ? (
                <PracticeClassHeaderCard label={msg.textRaw} />
            ) : (
                <div className="message-content" dangerouslySetInnerHTML={{ __html: content }} />
            )}
            {msg.replyCommand && (
                <button
                    className="reply-btn"
                    title={msg.replyTarget ? `Reply to ${msg.replyTarget}` : `Reply on ${msg.replyCommand}`}
                    onClick={() => {
                        const directed = msg.replyCommand === 'tell' || msg.replyCommand === 'whisper';
                        setParley({ active: true, command: msg.replyCommand!, target: directed ? (msg.replyTarget ?? null) : null });
                    }}
                >
                    ↩
                </button>
            )}
        </div>
    );
});

const MessageLog: React.FC<MessageLogProps> = ({
    onLogClick,
    onMouseUp,
    onPointerDown,
    onPointerUp,
    onDragStart,
    onDragEnd
}) => {
    const { inCombat, viewport, executeCommand, setParley } = useBaseGame();
    const { messages, processMessageHtml } = useLog();
    const { activePrompt, setTarget } = useVitals();
    const { scrollContainerRef, messagesEndRef, scrollToBottom } = viewport;

    const handlePointerDownInternal = useCallback((e: React.PointerEvent) => {
        if (onPointerDown) onPointerDown(e);
    }, [onPointerDown]);

    const handlePointerUpInternal = useCallback((e: React.PointerEvent) => {
        if (onPointerUp) onPointerUp(e);
        if (onMouseUp) onMouseUp(e as any);
    }, [onPointerUp, onMouseUp]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (viewport.isAutoScrollingRef.current) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;

        if (viewport.isLockedToBottomRef.current !== isNearBottom) {
            viewport.isLockedToBottomRef.current = isNearBottom;
        }

    }, [viewport]);

    const messagesRef = React.useRef(messages);
    messagesRef.current = messages;

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: useCallback((index: number) => {
            const msg = messagesRef.current[index];
            if (!msg) return 24;
            if (msg.type === 'shop-item') return 120;
            if (msg.type === 'practice-skill') return 36;
            if (msg.type === 'practice-header') return 52;
            if (msg.type === 'practice-class-header') return 32;
            if (msg.type === 'practice-column-header') return 56;
            if (msg.textRaw.length > 200) return 60;
            if (msg.textRaw.length > 100) return 40;
            return 24;
        }, []),
        overscan: 5,
    });

    const lastScrollCallRef = React.useRef(0);
    const lastMessagesRef = React.useRef(messages);

    React.useLayoutEffect(() => {
        const isNewMessage = messages.length > lastMessagesRef.current.length;
        const lastMsg = messages[messages.length - 1];
        lastMessagesRef.current = messages;

        const now = Date.now();
        const isThrottled = now - lastScrollCallRef.current < 16;

        if (isNewMessage) {
            if (viewport.isLockedToBottomRef.current || lastMsg?.type === 'user') {
                viewport.isLockedToBottomRef.current = true;
                if (!isThrottled || lastMsg?.type === 'user') {
                    lastScrollCallRef.current = now;
                    requestAnimationFrame(() => {
                        viewport.scrollToBottom(true, lastMsg?.type === 'user', 'NewMessage');
                    });
                }
            }
        } else if (viewport.isLockedToBottomRef.current && !isThrottled) {
            lastScrollCallRef.current = now;
            requestAnimationFrame(() => {
                viewport.scrollToBottom(true, false, 'LayoutEffect');
            });
        }
    }, [messages, activePrompt, viewport]);

    // Handle container resize (e.g. when input bar expands)
    React.useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            if (viewport.isLockedToBottomRef.current) {
                requestAnimationFrame(() => {
                    viewport.scrollToBottom(true, false, 'ContainerResize');
                });
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, [viewport, scrollContainerRef]);

    const virtualItems = virtualizer.getVirtualItems();

    const activePromptContent = useMemo(() => {
        if (!activePrompt) return null;
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
            onPointerDown={handlePointerDownInternal}
            onPointerUp={handlePointerUpInternal}
            onPointerCancel={handlePointerUpInternal}
            onClick={onLogClick}
            onMouseUp={handlePointerUpInternal as any}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualItems.map((virtualItem) => {
                    const msg = messages[virtualItem.index];
                    return (
                        <div
                            key={virtualItem.key}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <MessageItem
                                msg={msg}
                                processMessageHtml={processMessageHtml}
                                inCombat={inCombat}
                                scrollToBottom={scrollToBottom}
                                executeCommand={executeCommand}
                                setParley={setParley}
                            />
                        </div>
                    );
                })}
            </div>
            {activePromptContent}
            <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
        </div>
    );
};

export default React.memo(MessageLog);
