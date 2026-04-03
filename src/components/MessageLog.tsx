import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../types';
import { ansiConvert } from '../utils/ansi';
import { useVirtualizer } from '@tanstack/react-virtual';
import ShopItemCard from './ShopItemCard';
import PracticeSkillCard from './PracticeSkillCard';
import PracticeHeaderCard from './PracticeHeaderCard';
import PracticeClassHeaderCard from './PracticeClassHeaderCard';
import PracticeColumnHeaderCard from './PracticeColumnHeaderCard';
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
    triggerHaptic,
    playClickSound,
    playCommMessageSound,
    stopCommMessageSound,
    latestBatchId,
}: {



    msg: Message,
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean, type?: MessageType) => string,
    inCombat: boolean,
    scrollToBottom: (force?: boolean, instant?: boolean, source?: string) => void;
    executeCommand: (cmd: string) => void;
    setParley: (p: import('../types').ParleyState) => void;
    triggerHaptic: (ms: number) => void;
    playClickSound: () => void;
    playCommMessageSound?: (options?: { volume?: number }) => void;
    stopCommMessageSound?: () => void;
    latestBatchId?: number;


}) => {
    const content = useMemo(() => processMessageHtml(msg.html, msg.id, msg.isRoomName, msg.type), [msg.html, msg.id, msg.isRoomName, msg.type, processMessageHtml]);
    const isRecent = Date.now() - msg.timestamp < 2000;
    const isOldBatchDim = latestBatchId !== undefined && (msg.batchId === undefined || msg.batchId < latestBatchId);

    const triggerParley = useCallback((e: React.MouseEvent) => {
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


    return (
        <div
            className={`message ${msg.type}${msg.isRoomName ? ' is-room-name' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide && inCombat ? ` combat-${msg.combatSide}` : ''}${isRecent && (msg.timestamp > Date.now() - 600) && !isOldBatchDim ? ' recent-entry' : ''}`}
        >
            {msg.type === 'user' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'prompt' ? (
                <span>{msg.textRaw}</span>
            ) : msg.type === 'shop-item' && msg.shopItem ? (
                <div className="content-row">
                    <ShopItemCard item={msg.shopItem} executeCommand={executeCommand} />
                    <ReplyButton msg={msg} setParley={setParley} onReply={triggerParley} />
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
                    <div className="comm-sender-line" style={{ color: msg.commColor }}>
                        <span className="comm-sender">{msg.commSender}</span>
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
                        <ReplyButton msg={msg} setParley={setParley} onReply={triggerParley} />


                    </div>
                </div>
            ) : (
                <div className="content-row">
                    {msg.isCombat && inCombat ? (
                        <div className="combat-bubble">
                            <div className="message-content" dangerouslySetInnerHTML={{ __html: content }} />
                        </div>
                    ) : (
                        <>
                            <div className="message-content" dangerouslySetInnerHTML={{ __html: content }} />
                            <ReplyButton msg={msg} setParley={setParley} onReply={triggerParley} />
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
    const { inCombat, viewport, executeCommand, setParley, triggerHaptic, playClickSound, playCommMessageSound, stopCommMessageSound } = useBaseGame();



    const { messages, processMessageHtml } = useLog();
    const { activePrompt, setTarget } = useVitals();
    const { scrollContainerRef, messagesEndRef, scrollToBottom } = viewport;

    const latestBatchId = useMemo(() => {
        if (messages.length === 0) return undefined;
        // Search from the end to find the last message with a batchId (just in case there are anomalies)
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].batchId !== undefined) return messages[i].batchId;
        }
        return undefined;
    }, [messages]);

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
        }, [viewport.columns, viewport.logFontSize]),
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
                // No throttle on new-message scrolls — each batch (flushed every 50ms) must
                // trigger its own scroll. Throttling here caused missed scrolls when an
                // in-place message update fired within 16ms of the batch.
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

    // Re-scroll when virtualizer re-measures items and totalSize changes.
    // This catches the race where scrollToBottom fired based on estimated sizes,
    // then the virtualizer measured actual sizes (different), shifting us off-bottom.
    // useLayoutEffect (not useEffect) fires BEFORE paint so the correction is invisible.
    const totalSize = virtualizer.getTotalSize();
    React.useLayoutEffect(() => {
        if (viewport.isLockedToBottomRef.current) {
            viewport.scrollToBottom(true, true, 'VirtualizerResize');
        }
    }, [totalSize, viewport]);

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
                                triggerHaptic={triggerHaptic}
                                playClickSound={playClickSound}
                                playCommMessageSound={playCommMessageSound}
                                stopCommMessageSound={stopCommMessageSound}
                                latestBatchId={latestBatchId}
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
