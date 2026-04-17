import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../../types';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { useVirtualizer } from '@tanstack/react-virtual';
import ShopItemCard from '../Shop/ShopItemCard';
import PracticeSkillCard from '../Practice/PracticeSkillCard';
import PracticeHeaderCard from '../Practice/PracticeHeaderCard';
import PracticeClassHeaderCard from '../Practice/PracticeClassHeaderCard';
import PracticeColumnHeaderCard from '../Practice/PracticeColumnHeaderCard';
import { useBaseGame, useVitals, useLog, useUI } from '../../context/GameContext';

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
    processMessageHtml,
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
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean, type?: MessageType, isCombat?: boolean, side?: string) => string,
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
    const content = useMemo(() => processMessageHtml(msg.html, msg.id, msg.isRoomName, msg.type, msg.isCombat, msg.combatSide), [msg.html, msg.id, msg.isRoomName, msg.type, msg.isCombat, msg.combatSide, processMessageHtml]);
    const isRecent = Date.now() - msg.timestamp < 2000;
    const isOldBatchDim = latestBatchId !== undefined && (msg.batchId === undefined || msg.batchId < latestBatchId);

    // Initialize the flash as ON immediately (first render already has the class), then
    // clear it after the animation duration. This avoids two bugs:
    // 1. A useEffect-based approach fires after the first paint, so the class misses the
    //    first render and the CSS `recent-entry` rule (`animation: none !important`) can
    //    still suppress it on the second render.
    // 2. Storing `isHitImpact` as a permanent message flag caused the animation to
    //    re-fire on the previous hit when `recent-entry` dropped off during a re-render.
    const [showHitFlash, setShowHitFlash] = useState(() => !!msg.isHitImpact);
    const [showHitterFlash, setShowHitterFlash] = useState(() => !!msg.isHitterImpact);
    useEffect(() => {
        if (msg.isHitImpact) {
            const t = setTimeout(() => setShowHitFlash(false), 2000);
            return () => clearTimeout(t);
        }
        if (msg.isHitterImpact) {
            const t = setTimeout(() => setShowHitterFlash(false), 2000);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — fire once on mount only

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


    const isOutdatedRoom = isNewbieMode && msg.isRoomName && currentRoomName && 
        msg.textRaw?.replace(/\x1b\[[0-9;]*m/g, '').trim() !== currentRoomName;

    return (
        <div
            className={`message ${msg.type}${msg.isRoomName ? ' is-room-name' : ''}${isOutdatedRoom ? ' is-outdated-room' : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${showHitFlash ? ' is-hit-impact' : ''}${showHitterFlash ? ' is-hitter-impact' : ''}${isRecent && (msg.timestamp > Date.now() - 600) && !isOldBatchDim ? ' recent-entry' : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}`}
        >
            {msg.type === 'user' || msg.type === 'snoop-command' ? (
                <div 
                    className={msg.type === 'user' ? "user-command-bubble" : "snoop-command-bubble"}
                    dangerouslySetInnerHTML={{ __html: ansiConvert.toHtml(msg.textRaw || '') }}
                />
            ) : msg.type === 'prompt' ? (
                <span dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(msg.textRaw || ''), msg.id, false, 'prompt')) }} />
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
                <PracticeClassHeaderCard label={ansiConvert.toHtml(msg.textRaw || '')} />
            ) : msg.type === 'account-prompt' ? (
                <div className="account-prompt-container">
                    <div className="message-content" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(content) }} />
                    <input 
                        className={`account-input-trigger ${input ? 'has-input' : ''}`}
                        type={msg.textRaw?.toLowerCase().includes('password') ? 'password' : 'text'}
                        value={input || ''}
                        onChange={(e) => setInput?.(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                executeCommand(input || '');
                                setInput?.('');
                            }
                        }}
                        placeholder={msg.textRaw?.toLowerCase().includes('password') ? 'TYPE PASSWORD' : 'TYPE NAME'}
                        autoFocus={viewport.isMobile}
                        inputMode={msg.textRaw?.toLowerCase().includes('password') ? 'text' : 'email'} 
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck="false"
                    />

                    {!msg.textRaw?.toLowerCase().includes('password') && (
                        <button 
                            className="account-new-char-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                executeCommand('new');
                            }}
                        >
                            New Player
                        </button>
                    )}
                </div>
            ) : (msg.type === 'comm' || msg.isComm) && msg.commSender ? (
                <div className="comm-bubble-wrapper">
                    <div className="comm-content-row">
                        <div
                            className="comm-bubble inline-btn"
                            style={{ color: msg.commColor, cursor: 'pointer', '--bubble-color': msg.commColor, '--glow-color': msg.commColor } as React.CSSProperties}
                            onClick={triggerParley}
                        >
                            {timestampEl}
                            <span className="comm-sender" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(msg.commSender || ''), msg.id + '-sender', false, 'comm-sender')) }} />
                            <span className="comm-action" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(` ${msg.commAction}: `)) }} />
                            <span className="comm-text" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(msg.commText || ''), msg.id + '-text', false, 'comm-text')) }} />
                        </div>
                        <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                    </div>
                </div>
            ) : (
                <div className="content-row">
                    {timestampEl}
                    {msg.isCombat && inCombat ? (
                        <div className="combat-bubble">
                            <div className="message-content" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(content) }} />
                        </div>
                    ) : (
                        <>
                            <div className="message-content" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(content) }} />
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
    const { inCombat, inCombatRef, roomName, viewport, executeCommand, setParley, triggerHaptic, playClickSound, playCommMessageSound, stopCommMessageSound, isTimestampEnabled, isNewbieMode, isSpectateMode, input, setInput, sessionMode } = useBaseGame();
    const { replayer } = useUI();
    const { messages, processMessageHtml } = useLog();
    const { activePrompt, target, setTarget, opponentName, opponentHealthStatus } = useVitals();
    const { scrollContainerRef, messagesEndRef, scrollToBottom } = viewport;

    // --- Replay Mode Mapping ---
    const replayMessages = useMemo(() => {
        if (sessionMode !== 'replay' || !replayer.log) return [];
        
        const results: Message[] = [];
        let combinedRx = '';
        let lastTimestamp = 0;

        replayer.log.entries.forEach((entry: any, idx: number) => {
            // LogEntry uses compact field names: typ, d, t
            const typ = entry.typ ?? entry.type;
            const data = entry.d ?? entry.data;
            const ts = entry.t ?? entry.timestamp ?? 0;

            if (typ === 'rx') {
                // data may be stored as a plain number array (Array.from(Uint8Array)) by useTelnet
                let text: string;
                if (typeof data === 'string') {
                    text = data;
                } else if (data instanceof Uint8Array) {
                    text = new TextDecoder().decode(data);
                } else if (Array.isArray(data)) {
                    text = new TextDecoder().decode(new Uint8Array(data));
                } else {
                    text = String(data);
                }
                combinedRx += text;
                lastTimestamp = ts;
            } else if (typ === 'tx' || typ === 'sys' || typ === 'ui') {
                // Flush pending RX as message lines
                if (combinedRx) {
                    const lines = combinedRx.split('\n');
                    lines.forEach((line, lIdx) => {
                        if (line.trim() || lIdx < lines.length - 1) {
                            results.push({
                                id: `replay-rx-${idx}-${lIdx}`,
                                type: 'system',
                                textRaw: line,
                                html: ansiConvert.toHtml(line),
                                timestamp: lastTimestamp,
                                isCombat: false
                            });
                        }
                    });
                    combinedRx = '';
                }

                if (typ === 'tx') {
                    const text = typeof data === 'string' ? data : String(data);
                    results.push({
                        id: `replay-tx-${idx}`,
                        type: 'user',
                        textRaw: text,
                        html: text,
                        timestamp: ts
                    });
                } else if (typ === 'sys') {
                    const text = typeof data === 'string' ? data : JSON.stringify(data);
                    results.push({
                        id: `replay-sys-${idx}`,
                        type: 'system',
                        textRaw: text,
                        html: text,
                        timestamp: ts
                    });
                }
            }
        });
        
        // Final flush of any remaining RX
        if (combinedRx) {
            const lines = combinedRx.split('\n');
            lines.forEach((line, lIdx) => {
                results.push({
                    id: `replay-final-${lIdx}`,
                    type: 'system',
                    textRaw: line,
                    html: ansiConvert.toHtml(line),
                    timestamp: lastTimestamp
                });
            });
        }
        
        return results;
    }, [sessionMode, replayer.log]);


    const displayMessages = useMemo(() => {
        if (sessionMode === 'replay') return replayMessages;
        
        // If Newbie Mode is OFF, we show everything in the log (classic mode)
        if (!isNewbieMode) return messages;

        // In Newbie Mode, we show most action but hide prompts (handled by HUD/Input).
        // We now allow room names to show so they act as markers in the persistent history.
        return messages.filter(m => m.type !== 'prompt' || m.isSnoop);
    }, [messages, replayMessages, sessionMode, isNewbieMode]);

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
            if (viewport.isLockedToBottomRef.current) {
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
            if (msg.type === 'shop-item') return 120;
            if (msg.type === 'practice-skill') return 84;
            if (msg.type === 'practice-header') return 52;
            if (msg.type === 'practice-class-header') return 32;
            if (msg.type === 'practice-column-header') return 80;

            const charCount = (msg.textRaw || msg.commText || '').length;
            const cols = viewport.columns || 80;
            const lineCount = Math.max(1, Math.ceil(charCount / cols));
            let h = lineCount * (viewport.logFontSize * 16 * 1.1) + (isComm ? 48 : 4);
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
            // In Spectate Mode, we always want to follow the action unless the user manually scrolled up.
            // The isLockedToBottomRef already tracks if we are at the bottom.
            if (viewport.isLockedToBottomRef.current || lastMsg?.type === 'user' || isSpectateMode) {
                viewport.isLockedToBottomRef.current = true;
                lastScrollCallRef.current = now;
                requestAnimationFrame(() => {
                    viewport.scrollToBottom(true, lastMsg?.type === 'user' || isSpectateMode, 'NewMessage');
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


    const activePromptContent = useMemo(() => {
        if (!activePrompt || isSpectateMode || isNewbieMode) return null;
        const promptMid = `prompt-${activePrompt.length}-${activePrompt.replace(/\x1b\[[0-9;]*m/g, '').substring(0, 20)}`;
        return (
            <div className="message prompt msg-latest" style={{ transition: 'none' }}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(processMessageHtml(ansiConvert.toHtml(activePrompt), promptMid, false)) }} />
            </div>
        );
    }, [activePrompt, processMessageHtml, isSpectateMode]);

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
                                    processMessageHtml={processMessageHtml}
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
                {activePromptContent}
                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
