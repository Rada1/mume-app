import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Message } from '../../types';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from './TokenRenderer';
import { useVirtualizer } from '@tanstack/react-virtual';
import PracticeSkillCard from '../Practice/PracticeSkillCard';
import PracticeHeaderCard from '../Practice/PracticeHeaderCard';
import PracticeClassHeaderCard from '../Practice/PracticeClassHeaderCard';
import PracticeColumnHeaderCard from '../Practice/PracticeColumnHeaderCard';
import { useBaseGame, useVitals, useLog, useUI } from '../../context/GameContext';
import { useModeStore } from '../../stores/useModeStore';

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


interface MessageLogProps {
    onLogClick: (e: React.MouseEvent) => void;
    onMouseUp?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onPointerUp?: (e: React.PointerEvent) => void;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onWheel?: (e: React.WheelEvent) => void;
}

const MessageItem = React.memo(({
    msg,
    inCombat,
    scrollToBottom,
    executeCommand,
    setParley,
    triggerHaptic,
    playClickSound,
    latestBatchId,
    isTimestampEnabled,
    isNewbieMode,
    currentRoomName,
    input,
    setInput,
    viewport,
}: {
    msg: Message,
    executeCommand: (cmd: string, silent?: boolean) => void,
    inCombat: boolean,
    scrollToBottom?: (force?: boolean, immediate?: boolean, source?: string) => void;
    setParley?: (p: any) => void;
    triggerHaptic?: (ms: number) => void;
    playClickSound?: () => void;
    latestBatchId?: number;
    isTimestampEnabled?: boolean;
    isNewbieMode?: boolean;
    currentRoomName?: string | null,
    input?: string,
    setInput?: (val: string) => void;
    viewport: any;
}) => {
    const content = msg.html;
    const isRecent = Date.now() - msg.timestamp < 2000;
    const isOldBatchDim = latestBatchId !== undefined && (msg.batchId === undefined || msg.batchId < latestBatchId);
    
    // local state to handle the cleanup of the hit sheen animation
    const [sheenActive, setSheenActive] = React.useState(!!(msg.isHitImpact || msg.isDamageImpact));

    React.useEffect(() => {
        if (msg.isHitImpact || msg.isDamageImpact) {
            const timer = setTimeout(() => {
                setSheenActive(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [msg.isHitImpact, msg.isDamageImpact]);

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

    const extractRoomDescription = (html: string) => {
        const startIdx = html.indexOf('<div class="room-desc-line">');
        if (startIdx === -1) return '';
        return html.substring(startIdx);
    };

    return (
        <div
            className={`message ${msg.type}${msg.isSnoop ? ' is-snoop' : ''}${msg.isRoomName ? ' is-room-name' : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isSpacer ? ' is-spacer' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${isRecent && (msg.timestamp > Date.now() - 600) && !isOldBatchDim ? ' recent-entry' : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}`}
        >
            {msg.type === 'user' || msg.type === 'snoop-command' ? (
                <div 
                    className={msg.type === 'user' ? "user-command-bubble" : "snoop-command-bubble"}
                >
                    <TokenRenderer tokens={msg.tokens} fallbackHtml={ansiConvert.toHtml(msg.textRaw || '')} />
                </div>
            ) : msg.type === 'prompt' ? (
                <span><TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.textRaw || ''))} /></span>
            ) : msg.type === 'practice-skill' && msg.practiceSkill ? (
                <PracticeSkillCard skill={msg.practiceSkill} />
            ) : msg.type === 'practice-header' && msg.practiceHeader ? (
                <PracticeHeaderCard sessionsLeft={msg.practiceHeader.sessionsLeft} />
            ) : msg.type === 'practice-column-header' ? (
                <PracticeColumnHeaderCard sessionsLeft={msg.practiceHeader?.sessionsLeft} />
            ) : msg.type === 'practice-class-header' ? (
                <PracticeClassHeaderCard label={ansiConvert.toHtml(msg.textRaw || '')} />
            ) : ((msg.type === 'comm' || msg.type === 'comm-continue' || msg.isComm) && (msg.commSender || msg.commText)) ? (
                <div className={`comm-bubble-wrapper ${msg.type === 'comm-continue' ? 'continuation' : ''}`}>

                    <div className="comm-content-row">
                        <div
                            className="comm-bubble inline-btn"
                            style={{ color: msg.commColor, cursor: 'pointer', '--bubble-color': msg.commColor, '--glow-color': msg.commColor } as React.CSSProperties}
                            onClick={triggerParley}
                        >
                            {timestampEl}
                            {msg.type !== 'comm-continue' && (
                                <>
                                    <span className="comm-sender"><TokenRenderer tokens={msg.commSenderTokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commSender || ''))} /></span>
                                    <span className="comm-action" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(` ${msg.commAction}: `)) }} />
                                </>
                            )}
                            <span className="comm-text"><TokenRenderer tokens={msg.commTextTokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commText || ''))} /></span>
                        </div>
                        <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                    </div>
                </div>
            ) : (
                <div className="content-row">
                    {timestampEl}
                    {msg.isCombat && inCombat ? (
                        <div className="combat-bubble">
                            <div className="message-content hit-sheen-container">
                                <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
                                {msg.isHitImpact && sheenActive && (
                                    <div className="hit-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
                                    </div>
                                )}
                                {msg.isDamageImpact && sheenActive && (
                                    <div className="damage-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="message-content hit-sheen-container">
                                <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} />
                                {msg.isHitImpact && sheenActive && (
                                    <div className="hit-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} />
                                    </div>
                                )}
                                {msg.isDamageImpact && sheenActive && (
                                    <div className="damage-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} />
                                    </div>
                                )}
                                {msg.isRoomName && msg.tokens && msg.html?.includes('room-desc-line') && (
                                    <div 
                                        className="room-description-merged" 
                                        dangerouslySetInnerHTML={{ __html: extractRoomDescription(msg.html) }} 
                                    />
                                )}
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
    onDragEnd,
    onWheel
}) => {
    const { 
        inCombat, inCombatRef, roomName, viewport, executeCommand, setParley, 
        triggerHaptic, playClickSound, playCommMessageSound, isTimestampEnabled, 
        isNewbieMode, showSpectatePromptInLog, input, setInput, sessionMode
    } = useBaseGame() as any;
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const activeView = useModeStore(s => s.activeView);
    const { replayer, spectateBuffer } = useUI() as any;
    const { messages } = useLog();
    const { target, setTarget, opponentName, opponentHealthStatus } = useVitals();
    const { scrollContainerRef, messagesEndRef, scrollToBottom, isLockedToBottomRef } = viewport;

    // --- Replay Mode Mapping ---
    // rx entries: pre-processed message objects { type, text, html, tokens, ... } from useMessageLog
    // ui entries: user commands { event: 'executeCommand', cmd }
    // useTelnet also writes rx entries as { length: N } (junk) — these are skipped
    const replayMessages = useMemo(() => {
        if (!replayer.log) return [];

        const results: Message[] = [];

        replayer.log.log.forEach((entry: any, idx: number) => {
            const typ = entry.typ ?? entry.type;
            const data = entry.d ?? entry.data;
            const ts = entry.t ?? entry.timestamp ?? 0;

            if (typ === 'rx') {
                // Pre-processed message object recorded by useMessageLog
                if (data && typeof data === 'object' && typeof data.text === 'string') {
                    // User commands are recorded twice: once as rx (from addMessage) and once as ui
                    // (from executeCommand). Skip rx entries to avoid duplicates.
                    if (data.type === 'user') return;
                    results.push({
                        id: data.mid || `replay-rx-${idx}`,
                        type: (data.type || 'game') as any,
                        textRaw: data.text,
                        html: data.html || data.text,
                        tokens: data.tokens,
                        timestamp: ts,
                        isRoomName: data.isRoomName,
                        isCombat: data.isCombat,
                        isComm: data.isComm,
                        isNarrate: data.isNarrate,
                        commSender: data.commSender,
                        commAction: data.commAction,
                        commText: data.commText,
                        commColor: data.commColor,
                    });
                }
                // { length: N } entries from useTelnet are silently skipped
            } else if (typ === 'ui') {
                // User command: { event: 'executeCommand', cmd }
                if (data?.event === 'executeCommand' && typeof data.cmd === 'string') {
                    const cmd: string = data.cmd;
                    const lower = cmd.toLowerCase();
                    if (!lower.includes('change width') && !lower.includes('change length') &&
                        !lower.includes('cha wid') && !lower.includes('cha len')) {
                        results.push({
                            id: `replay-ui-${idx}`,
                            type: 'user' as any,
                            textRaw: cmd,
                            html: cmd,
                            timestamp: ts,
                        });
                    }
                }
            }
            // gmcp, sys, flag, tx: not rendered
        });

        return results;
    }, [replayer.log]);



    const displayMessages = useMemo(() => {
        if (sessionMode === 'replay') {
            // Filter replay messages to only show what has been "played" according to currentTime.
            const now = replayer.state.currentTime;
            let low = 0;
            let high = replayMessages.length;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (replayMessages[mid].timestamp <= now) low = mid + 1;
                else high = mid;
            }
            return replayMessages.slice(0, low);
        }

        const base = messages.filter(m => m.type !== 'prompt' || !m.isSnoop || showSpectatePromptInLog);

        // Spectate DVR buffer: hide messages newer than displayCutoff so the user
        // can watch from an earlier point in the session and advance in real-time.
        if (isSpectateMode && activeView === 'target' && !spectateBuffer.isLive) {
            return base.filter(m => m.timestamp <= spectateBuffer.displayCutoff);
        }

        return base;
    }, [messages, replayMessages, sessionMode, showSpectatePromptInLog, replayer.state.currentTime, isSpectateMode, activeView, spectateBuffer.isLive, spectateBuffer.displayCutoff]);

    const lastUserMsgIndex = useMemo(() => {
        for (let i = displayMessages.length - 1; i >= 0; i--) {
            if (displayMessages[i].type === 'user') return i;
        }
        return -1;
    }, [displayMessages]);

    const latestBatchId = useMemo(() => {
        for (let i = displayMessages.length - 1; i >= 0; i--) {
            const b = (displayMessages[i] as any).batchId;
            if (b !== undefined) return b as number;
        }
        return undefined;
    }, [displayMessages]);

    const handlePointerDownInternal = useCallback((e: React.PointerEvent) => {
        if (onPointerDown) onPointerDown(e);
    }, [onPointerDown]);

    const handlePointerUpInternal = useCallback((e: React.PointerEvent) => {
        if (onPointerUp) onPointerUp(e);
        if (onMouseUp) onMouseUp(e as any);
    }, [onPointerUp, onMouseUp]);

    const isUserScrollingRef = React.useRef(false);
    const userScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const lastScrollTopRef = useRef(0);

    const handleScroll = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        if (viewport.isAutoScrollingRef.current) {
            lastScrollTopRef.current = container.scrollTop;
            return;
        }

        isUserScrollingRef.current = true;
        if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
        userScrollTimerRef.current = setTimeout(() => { isUserScrollingRef.current = false; }, 150);

        // Increased threshold to be more forgiving of sub-pixel drift or rapid growth
        const threshold = 80; 
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
        const isScrollingUp = container.scrollTop < lastScrollTopRef.current;

        lastScrollTopRef.current = container.scrollTop;

        // Only update lock state if we aren't currently auto-scrolling
        if (viewport.isLockedToBottomRef.current !== isNearBottom) {
            // If we are scrolling UP and move away from bottom, unlock.
            // If we are scrolling DOWN and hit the threshold, relock.
            if (isScrollingUp || isNearBottom) {
                viewport.isLockedToBottomRef.current = isNearBottom;
            }
        }

    }, [viewport, scrollContainerRef]);

    const onWheelRef = useRef(onWheel);
    useEffect(() => { onWheelRef.current = onWheel; }, [onWheel]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheelInternal = (e: WheelEvent) => {
            // Manually drive the scroll so wheel works regardless of what the
            // wheel target is (text node, span, etc). Browser's native
            // scroll-chain occasionally fails to reach this container from
            // deeply-nested text nodes in the virtualizer.
            if (e.ctrlKey) return; // let browser handle zoom
            e.preventDefault();
            container.scrollTop += e.deltaY;

            if (onWheelRef.current) onWheelRef.current(e as any);
            
            // Only unlock if we are explicitly wheeling UP. 
            // Wheeling down should maintain the lock if near bottom.
            if (e.deltaY < 0 && viewport.isLockedToBottomRef.current) {
                viewport.isLockedToBottomRef.current = false;
            }
        };

        container.addEventListener('wheel', handleWheelInternal, { passive: false });
        return () => container.removeEventListener('wheel', handleWheelInternal);
    }, [scrollContainerRef, viewport]);

    const messagesRef = React.useRef(displayMessages);
    messagesRef.current = displayMessages;

    const virtualizer = useVirtualizer({
        count: displayMessages.length,
        getScrollElement: () => scrollContainerRef.current,
        getItemKey: useCallback((index: number) => displayMessages[index]?.id || index, [displayMessages]),
        estimateSize: useCallback((index: number) => {
            // Read from ref, not reactive state — avoids blowing the virtualizer's
            // size cache (and causing every visible item to re-estimate) on each
            // new message arrival.
            const msg = messagesRef.current[index];
            if (!msg) return 24;
            const isComm = msg.type === 'comm' || msg.isComm;
            if (isComm && msg.commSender) {
                // Comm bubbles are narrower than the full column width (~60%).
                // Use text length to estimate line count so tall bubbles don't
                // get placed too close to the item below them.
                const bubbleCols = Math.floor((viewport.columns || 80) * 0.6);
                const lineCount = Math.max(1, Math.ceil((msg.commText || '').length / bubbleCols));
                return 46 + lineCount * 22;
            }
            if (msg.type === 'practice-skill') return 84;
            if (msg.type === 'practice-header') return 52;
            if (msg.type === 'practice-class-header') return 32;
            if (msg.type === 'practice-column-header') return 80;
            if (msg.type === 'prompt') return Math.ceil(viewport.logFontSizePx * 1.25 + 6);

            const charCount = (msg.textRaw || msg.commText || '').length;
            const cols = viewport.columns || 80;
            const lineCount = Math.max(1, Math.ceil(charCount / cols));
            let h = lineCount * (viewport.logFontSizePx * 1.1) + (isComm ? 48 : 4);
            if (msg.type === 'user') h += 24;
            if (msg.isCombat) h += 10;
            return h;
        }, [viewport.columns, viewport.logFontSize]),
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
            // In Spectate and Replay Mode, we always want to follow the action 
            // unless the user manually scrolled up.
            if (viewport.isLockedToBottomRef.current || lastMsg?.type === 'user' || isSpectateMode || sessionMode === 'replay') {
                viewport.isLockedToBottomRef.current = true;
                lastScrollCallRef.current = now;
                requestAnimationFrame(() => {
                    viewport.scrollToBottom(true, lastMsg?.type === 'user' || isSpectateMode || sessionMode === 'replay', 'NewMessage');
                });
            }
        } else if (viewport.isLockedToBottomRef.current && !isThrottled) {
            lastScrollCallRef.current = now;
            requestAnimationFrame(() => {
                viewport.scrollToBottom(true, false, 'LayoutEffect');
            });
        }
    }, [messages, viewport, isNewbieMode, lastUserMsgIndex, virtualizer]);

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
    }, [totalSize, viewport, virtualizer]);

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div className="message-log-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
            <div
                className={`message-log${inCombat ? ' combat-mode' : ''}${isSpectateMode ? ' spectate-mode' : ''}`}
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
                        pointerEvents: 'auto',
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
                                    pointerEvents: 'auto',
                                }}
                            >
                                <MessageItem
                                    msg={msg as any}
                                    inCombat={inCombat}
                                    scrollToBottom={scrollToBottom}
                                    executeCommand={executeCommand}
                                    setParley={setParley}
                                    triggerHaptic={triggerHaptic}
                                    playClickSound={playClickSound}
                                    latestBatchId={latestBatchId}
                                    isTimestampEnabled={isTimestampEnabled}
                                    isNewbieMode={isNewbieMode}
                                    currentRoomName={roomName}
                                    input={input}
                                    setInput={setInput}
                                    viewport={viewport}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
