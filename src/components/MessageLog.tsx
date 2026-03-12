import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import { useVirtualizer } from '@tanstack/react-virtual';
import TypewriterText from './TypewriterText';
import ShopItemCard from './ShopItemCard';
import PracticeSkillCard from './PracticeSkillCard';
import PracticeHeaderCard from './PracticeHeaderCard';

import { useBaseGame, useVitals, useLog } from '../context/GameContext';
import { useTextSelectionTarget } from '../hooks/useTextSelectionTarget';
import { MagnificationBubble } from './Overlay/MagnificationBubble';

interface MessageLogProps {
    onLogClick: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
}

const MessageItem = React.memo(({
    msg,
    processMessageHtml,
    inCombat,
    scrollToBottom,
    executeCommand,
}: {
    msg: Message,
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean) => string,
    inCombat: boolean,
    scrollToBottom: (force?: boolean, instant?: boolean, source?: string) => void;
    executeCommand: (cmd: string) => void;
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
            ) : msg.type === 'shop-item' && msg.shopItem ? (
                <ShopItemCard item={msg.shopItem} executeCommand={executeCommand} />
            ) : msg.type === 'practice-skill' && msg.practiceSkill ? (
                <PracticeSkillCard skill={msg.practiceSkill} />
            ) : msg.type === 'practice-header' && msg.practiceHeader ? (
                <PracticeHeaderCard sessionsLeft={msg.practiceHeader.sessionsLeft} />
            ) : (
                <div className="message-content" dangerouslySetInnerHTML={{ __html: content }} />
            )}
        </div>
    );
});

const MessageLog: React.FC<MessageLogProps> = ({
    onLogClick,
    onMouseUp,
    onPointerDown,
    onDragStart,
    onDragEnd
}) => {
    const { inCombat, viewport, executeCommand, triggerHaptic } = useBaseGame();
    const { messages, processMessageHtml } = useLog();
    const { activePrompt, setTarget } = useVitals();
    const { scrollContainerRef, messagesEndRef, scrollToBottom } = viewport;

    const { selection, handlePointerDown: onSelectionDown, handlePointerMove: onSelectionMove, handlePointerUp: onSelectionUp } = useTextSelectionTarget(setTarget, triggerHaptic);

    const handlePointerDownInternal = useCallback((e: React.PointerEvent) => {
        onSelectionDown(e);
        if (onPointerDown) onPointerDown(e);
    }, [onSelectionDown, onPointerDown]);

    const handlePointerMoveInternal = useCallback((e: React.PointerEvent) => {
        onSelectionMove(e);
    }, [onSelectionMove]);

    const handlePointerUpInternal = useCallback((e: React.PointerEvent) => {
        onSelectionUp(e);
        if (onMouseUp) onMouseUp(e as any);
    }, [onSelectionUp, onMouseUp]);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (viewport.isAutoScrollingRef.current) return;

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;

        if (viewport.isLockedToBottomRef.current !== isNearBottom) {
            viewport.isLockedToBottomRef.current = isNearBottom;
        }

    }, [viewport]);

    const virtualizer = useVirtualizer({
        count: messages.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: useCallback((index: number) => {
            const msg = messages[index];
            if (!msg) return 24;
            if (msg.type === 'shop-item') return 120;
            if (msg.type === 'practice-skill') return 80;
            if (msg.type === 'practice-header') return 100;
            if (msg.textRaw.length > 200) return 60;
            if (msg.textRaw.length > 100) return 40;
            return 24;
        }, [messages]),
        overscan: 20,
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
                    viewport.scrollToBottom(true, lastMsg?.type === 'user', 'NewMessage');
                }
            }
        } else if (viewport.isLockedToBottomRef.current && !isThrottled) {
            lastScrollCallRef.current = now;
            viewport.scrollToBottom(true, false, 'LayoutEffect');
        }
    }, [messages, activePrompt, viewport]);

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
            onPointerMove={handlePointerMoveInternal}
            onPointerUp={handlePointerUpInternal}
            onPointerCancel={(e) => onSelectionUp(e)}
            onContextMenu={(e) => selection.isActive && e.preventDefault()}
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
                            />
                        </div>
                    );
                })}
            </div>
            {activePromptContent}
            {selection.isActive && selection.wordRect && (
                <div 
                    className="selection-highlight"
                    style={{
                        position: 'fixed',
                        left: `${selection.wordRect.left}px`,
                        top: `${selection.wordRect.top}px`,
                        width: `${selection.wordRect.width}px`,
                        height: `${selection.wordRect.height}px`,
                        pointerEvents: 'none',
                        zIndex: 9999
                    }}
                />
            )}
            <MagnificationBubble 
                x={selection.x} 
                y={selection.y} 
                text={selection.word} 
                isActive={selection.isActive} 
            />
            {/* 12px "Visual Safe Zone" clears the input bar shadow and 3D perspective distortion */}
            <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
        </div>
    );
};

export default React.memo(MessageLog);
