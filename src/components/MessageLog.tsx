import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { ansiConvert } from '../utils/ansi';
import { useVirtualizer } from '@tanstack/react-virtual';
import ShopItemCard from './ShopItemCard';
import PracticeSkillCard from './PracticeSkillCard';
import PracticeHeaderCard from './PracticeHeaderCard';
import PracticeClassHeaderCard from './PracticeClassHeaderCard';
import PracticeColumnHeaderCard from './PracticeColumnHeaderCard';
import MiniMapRoom from './Layout/MiniMapRoom';

const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
};

const ReplyButton = ({ msg, setParley, onReply }: { msg: Message, setParley: (p: any) => void, onReply: (e: React.MouseEvent) => void }) => {
    if (!msg.replyCommand) return null;

    return (
        <button
            className="reply-btn inline-btn"
            title={msg.replyTarget ? `Reply to ${msg.replyTarget}` : `Reply on ${msg.replyCommand}`}
            onClick={onReply}
            style={{ '--glow-color': msg.commColor } as React.CSSProperties}
        >
            <div className="reply-btn-icon">↩</div>
        </button>
    );
};

// Module-level: tracks message IDs where the typewriter finished or was interrupted.
// Survives virtualizer unmount/remount so the animation never restarts mid-sentence.
const typewriterDoneIds = new Set<string>();

const Typewriter = ({ msgId, text, isRecent, playCommMessageSound, stopCommMessageSound }: {
    msgId: string,
    text: string,
    isRecent: boolean,
    playCommMessageSound?: (options?: { volume?: number }) => void,
    stopCommMessageSound?: () => void
}) => {
    // If the animation was interrupted (e.g. line shifted up in virtualizer), show full text immediately
    const alreadyDone = typewriterDoneIds.has(msgId);
    const [displayedText, setDisplayedText] = useState(!isRecent || alreadyDone ? text : '');

    // On true unmount, mark as done so remounts skip animation and show full text
    useEffect(() => {
        return () => { typewriterDoneIds.add(msgId); };
    }, [msgId]);

    // When text updates after animation already completed (or message not recent),
    // sync displayedText immediately — handles comm-continue appending to a finished bubble.
    useEffect(() => {
        if (alreadyDone || !isRecent) setDisplayedText(text);
    }, [text, alreadyDone, isRecent]);

    useEffect(() => {
        if (!isRecent || alreadyDone || displayedText === text) return;

        let index = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, index + 1));

            // Play typing sound every few characters to avoid audio clutter
            if (index % 4 === 0 && playCommMessageSound) {
                playCommMessageSound({ volume: 1.0 });
            }

            index++;
            if (index >= text.length) {
                clearInterval(interval);
                typewriterDoneIds.add(msgId);
                if (stopCommMessageSound) stopCommMessageSound();
            }
        }, 8); // Faster typewriter (8ms)

        return () => {
            clearInterval(interval);
            if (stopCommMessageSound) stopCommMessageSound();
            // Don't add to typewriterDoneIds here — that's handled by the unmount effect above.
            // Adding here would prematurely mark the id as done on dep-change (e.g. comm-continue
            // updating the text), causing the new animation to be skipped and text to freeze.
        };
    }, [text, isRecent, msgId, alreadyDone, playCommMessageSound, stopCommMessageSound]);

    return <span>{displayedText}</span>;
};



import { useBaseGame, useVitals, useLog, useGame } from '../context/GameContext';

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
    triggerHaptic,
    playClickSound,
    playCommMessageSound,
    stopCommMessageSound,
    latestBatchId,
    isTimestampEnabled,
    isNewbieMode,
}: {
    msg: Message,
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean, type?: MessageType) => string,
    executeCommand: (cmd: string, silent?: boolean) => void,
    inCombat: boolean,
    scrollToBottom?: (force?: boolean, immediate?: boolean, source?: string) => void;
    setParley?: (p: any) => void;
    triggerHaptic?: (ms: number) => void;
    playClickSound?: () => void;
    playCommMessageSound?: () => void;
    stopCommMessageSound?: () => void;
    latestBatchId?: number;
    isTimestampEnabled?: boolean;
    isNewbieMode?: boolean;
}) => {
    const content = useMemo(() => processMessageHtml(msg.html, msg.id, msg.isRoomName, msg.type), [msg.html, msg.id, msg.isRoomName, msg.type, processMessageHtml]);
    const isRecent = Date.now() - msg.timestamp < 2000;
    const isOldBatchDim = latestBatchId !== undefined && (msg.batchId === undefined || msg.batchId < latestBatchId);

    const triggerParley = useCallback((e: React.MouseEvent) => {
        if (!setParley || !triggerHaptic || !playClickSound) return;
        e.stopPropagation();
        const directed = msg.replyCommand === 'tell' || msg.replyCommand === 'whisper';
        setParley({ active: true, command: msg.replyCommand!, target: directed ? (msg.replyTarget ?? null) : null });
        triggerHaptic(20);
        playClickSound();


        // Trigger keyboard on mobile
        setTimeout(() => {
            const inputEl = document.querySelector('.input-field') as HTMLTextAreaElement;
            if (inputEl) {
                inputEl.focus();
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                if (isMobile) {
                    const wasReadOnly = inputEl.readOnly;
                    inputEl.readOnly = false;
                    inputEl.focus();
                    setTimeout(() => { inputEl.readOnly = wasReadOnly; }, 100);
                }
            }
        }, 50);
    }, [msg.replyCommand, msg.replyTarget, setParley, triggerHaptic, playClickSound]);

    const showTimestamp = isTimestampEnabled && !msg.isRoomName && msg.type !== 'room-description';
    const timestampEl = showTimestamp ? (
        <span className="message-timestamp">{formatTimestamp(msg.timestamp)}</span>
    ) : null;


    return (
        <div
            className={`message ${msg.type}${msg.isRoomName ? ' is-room-name' : ''}${(isNewbieMode && msg.moveDir) ? ` move-dir-${msg.moveDir}` : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide && inCombat ? ` combat-${msg.combatSide}` : ''}${isRecent && (msg.timestamp > Date.now() - 600) && !isOldBatchDim ? ' recent-entry' : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}`}
        >
            {msg.type === 'user' ? (
                <span>{timestampEl} {msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'shop-item' && msg.shopItem ? (
                <div className="content-row">
                    <ShopItemCard item={msg.shopItem} executeCommand={executeCommand} />
                    <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                </div>
            ) : msg.type === 'practice-skill' && msg.practiceSkill ? (
                <PracticeSkillCard skill={msg.practiceSkill} />
            ) : msg.type === 'practice-header' && msg.practiceHeader ? (
                <PracticeHeaderCard sessionsLeft={msg.practiceHeader.sessionsLeft} />
            ) : msg.type === 'practice-column-header' ? (
                <PracticeColumnHeaderCard sessionsLeft={msg.practiceHeader?.sessionsLeft} />
            ) : msg.type === 'practice-class-header' ? (
                <PracticeClassHeaderCard label={msg.textRaw} />
            ) : (msg.type === 'comm' || msg.isComm) && msg.commSender ? (
                <div className="comm-bubble-wrapper">
                    {timestampEl}
                    <div className="comm-sender-line" style={{ color: msg.commColor }}>
                        <span className="comm-sender" dangerouslySetInnerHTML={{ __html: processMessageHtml(msg.commSender || '', msg.id + '-sender', false, 'comm-sender') }} />
                        <span className="comm-action"> {msg.commAction}:</span>
                    </div>
                    <div className="comm-content-row">
                        <div
                            className="comm-bubble inline-btn"
                            style={{ color: msg.commColor, cursor: 'pointer', '--glow-color': msg.commColor } as React.CSSProperties}
                            onClick={triggerParley}
                        >
                            <Typewriter msgId={msg.id} text={msg.commText || ''} isRecent={isRecent} playCommMessageSound={playCommMessageSound} stopCommMessageSound={stopCommMessageSound} />
                        </div>
                        <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                    </div>
                </div>
            ) : (
                <div className="content-row">
                    {timestampEl}
                    {msg.isCombat && inCombat ? (
                        <div className="combat-bubble">
                            <div className="message-content" dangerouslySetInnerHTML={{ __html: content }} />
                        </div>
                    ) : (
                        <>
                            <div className="message-content-wrapper">
                                <div className="message-content anim-container" dangerouslySetInnerHTML={{ __html: content }} />
                            </div>
                            <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                        </>
                    )}
                </div>
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
    const { inCombat, viewport, executeCommand, setParley, triggerHaptic, playClickSound, playCommMessageSound, stopCommMessageSound, isTimestampEnabled, isNewbieMode, isSpectateMode } = useBaseGame();
    const { messages, processMessageHtml } = useLog();
    const { activePrompt, setTarget } = useVitals();
    const { currentTerrain, roomName, roomDesc } = useGame();
    const { scrollContainerRef, messagesEndRef, scrollToBottom } = viewport;

    const processedMessages = useMemo(() => messages, [messages]);

    const latestBatchId = useMemo(() => {
        if (messages.length === 0) return undefined;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].batchId !== undefined) return messages[i].batchId;
        }
        return undefined;
    }, [messages]);

    const displayMessages = useMemo(() => {
        // If Newbie Mode is OFF, we show everything in the log (classic mode)
        if (!isNewbieMode) return messages;

        // In Newbie Mode, we hide ALL instances of isRoomName and type === 'prompt' 
        // from the scrollable log to keep the timeline "clean" and focused on action.
        return messages.filter(m => !m.isRoomName && m.type !== 'prompt');
    }, [messages, isNewbieMode]);

    const handlePointerDownInternal = useCallback((e: React.PointerEvent) => {
        if (onPointerDown) onPointerDown(e);
    }, [onPointerDown]);

    const handlePointerUpInternal = useCallback((e: React.PointerEvent) => {
        if (onPointerUp) onPointerUp(e);
        if (onMouseUp) onMouseUp(e as any);
    }, [onPointerUp, onMouseUp]);

    const isUserScrollingRef = React.useRef(false);
    const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (viewport.isAutoScrollingRef.current) return;

        isUserScrollingRef.current = true;
        if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
        userScrollTimerRef.current = setTimeout(() => { isUserScrollingRef.current = false; }, 150);

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;

        if (viewport.isLockedToBottomRef.current !== isNearBottom) {
            viewport.isLockedToBottomRef.current = isNearBottom;
        }

    }, [viewport, scrollContainerRef]);

    const messagesRef = React.useRef(processedMessages);
    messagesRef.current = processedMessages;

    const virtualizer = useVirtualizer({
        count: displayMessages.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: useCallback((index: number) => {
            const msg = displayMessages[index];
            if (!msg) return 24;
            const isComm = msg.type === 'comm' || msg.isComm;
            if (isComm && msg.commSender) return 64;
            if (msg.type === 'shop-item') return 120;
            if (msg.type === 'practice-skill') return 84;
            if (msg.type === 'practice-header') return 52;
            if (msg.type === 'practice-class-header') return 32;
            if (msg.type === 'practice-column-header') return 80;

            const charCount = (msg.textRaw || msg.commText || '').length;
            const cols = viewport.columns || 80;
            const lineCount = Math.max(1, Math.ceil(charCount / cols));
            let h = lineCount * (viewport.logFontSize * 16 * 1.1) + (isComm ? 48 : 4);
            if (msg.isCombat) h += 10;
            return h;
        }, [viewport.columns, viewport.logFontSize, displayMessages]),
        overscan: 12,
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
                lastScrollCallRef.current = now;
                requestAnimationFrame(() => {
                    viewport.scrollToBottom(true, lastMsg?.type === 'user', 'NewMessage');
                });
            }
        } else if (viewport.isLockedToBottomRef.current && !isThrottled) {
            lastScrollCallRef.current = now;
            requestAnimationFrame(() => {
                viewport.scrollToBottom(true, false, 'LayoutEffect');
            });
        }
    }, [messages, activePrompt, viewport]);

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

    const totalSize = virtualizer.getTotalSize();
    React.useLayoutEffect(() => {
        if (viewport.isLockedToBottomRef.current && !isUserScrollingRef.current) {
            viewport.scrollToBottom(true, true, 'VirtualizerResize');
        }
    }, [totalSize, viewport]);

    const virtualItems = virtualizer.getVirtualItems();


    const activePromptContent = useMemo(() => {
        if (!activePrompt || isSpectateMode || isNewbieMode) return null;
        const promptMid = `prompt-${activePrompt.length}-${activePrompt.replace(/\x1b\[[0-9;]*m/g, '').substring(0, 20)}`;
        return (
            <div className="message prompt msg-latest" style={{ transition: 'none' }}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: processMessageHtml(ansiConvert.toHtml(activePrompt), promptMid, false) }} />
            </div>
        );
    }, [activePrompt, processMessageHtml, isSpectateMode]);

    return (
        <div className="message-log-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Sticky Room Header (Newbie Mode ONLY) - Outside scroll container to avoid masking/darkening */}
            {isNewbieMode && roomName && (
                <div className={`sticky-room-header terrain-${(currentTerrain || 'field').toLowerCase()}`} key="newbie-room-header">
                    <div className="room-info-text">
                        <div className="message-content room-name" dangerouslySetInnerHTML={{ __html: processMessageHtml(ansiConvert.toHtml(`\x1b[1;32m${roomName}\x1b[0m`), 'roomname', true, 'room-name' as any) }} />
                        {roomDesc && (
                            <div className="message-content room-desc" dangerouslySetInnerHTML={{ __html: processMessageHtml(ansiConvert.toHtml(`\x1b[0m${roomDesc}`), 'roomdesc', false, 'room-desc' as any) }} />
                        )}
                    </div>
                    <MiniMapRoom />
                </div>
            )}

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
                        const msg = displayMessages[virtualItem.index];
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
                                    msg={msg as any}
                                    processMessageHtml={processMessageHtml}
                                    inCombat={inCombat}
                                    scrollToBottom={scrollToBottom}
                                    executeCommand={executeCommand}
                                    setParley={setParley}
                                    triggerHaptic={triggerHaptic}
                                    playClickSound={playClickSound}
                                    playCommMessageSound={playCommMessageSound}
                                    stopCommMessageSound={stopCommMessageSound}
                                    latestBatchId={latestBatchId}
                                    isTimestampEnabled={isTimestampEnabled}
                                    isNewbieMode={isNewbieMode}
                                />
                            </div>
                        );
                    })}
                </div>
                {activePromptContent}
                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
