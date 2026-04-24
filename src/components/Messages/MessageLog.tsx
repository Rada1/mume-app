import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Message, MessageType } from '../../types';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from './TokenRenderer';
import { Tokenizer } from '../../services/parser/Tokenizer';
import { useVirtualizer } from '@tanstack/react-virtual';
import ShopItemCard from '../Shop/ShopItemCard';
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
            className={`message ${msg.type}${msg.isRoomName ? ' is-room-name' : ''}${isOutdatedRoom ? ' is-outdated-room' : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${isRecent && (msg.timestamp > Date.now() - 600) && !isOldBatchDim ? ' recent-entry' : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}`}
        >
            {msg.type === 'user' || msg.type === 'snoop-command' ? (
                <div 
                    className={msg.type === 'user' ? "user-command-bubble" : "snoop-command-bubble"}
                >
                    <TokenRenderer tokens={msg.tokens} fallbackHtml={ansiConvert.toHtml(msg.textRaw || '')} />
                </div>
            ) : msg.type === 'prompt' ? (
                <span><TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.textRaw || ''))} /></span>
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
                    <div className="message-content">
                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
                    </div>
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
                            <span className="comm-sender"><TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commSender || ''))} /></span>
                            <span className="comm-action" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(` ${msg.commAction}: `)) }} />
                            <span className="comm-text"><TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commText || ''))} /></span>
                        </div>
                        <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                    </div>
                </div>
            ) : (
                <div className="content-row">
                    {timestampEl}
                    {msg.isCombat && inCombat ? (
                        <div className="combat-bubble">
                            <div className="message-content">
                                <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="message-content">
                                <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
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
    const { inCombat, inCombatRef, roomName, viewport, executeCommand, setParley, triggerHaptic, playClickSound, playCommMessageSound, isTimestampEnabled, isNewbieMode, showSpectatePromptInLog, input, setInput, sessionMode, setSessionMode } = useBaseGame() as any;
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const { replayer } = useUI() as any;
    const { messages } = useLog();
    const { activePrompt, target, setTarget, opponentName, opponentHealthStatus } = useVitals();
    const { scrollContainerRef, messagesEndRef, scrollToBottom, isLockedToBottomRef } = viewport;

    const { userSession, spectateSession, activeSession } = useBaseGame();
    const [isInternalLocked, setIsInternalLocked] = useState(viewport.isLockedToBottomRef.current);

    // --- Live Attach Logic ---
    const [isAttachedToLive, setIsAttachedToLive] = useState(false);
    useEffect(() => {
        if (isInternalLocked) {
            if (isAttachedToLive) {
                setIsAttachedToLive(false);
            }
        } else if (sessionMode === 'live' && !isAttachedToLive) {
            const currentSession = activeSession === 'user' ? userSession : spectateSession;
            const logSnapshot = {
                version: 1,
                startTime: new Date().toISOString(),
                log: [...((currentSession.recorder as any).entries || [])],
                metadata: { client: 'MUME AI Studio', version: '1.0.0' }
            };
            replayer.attachToLive(logSnapshot);
            setIsAttachedToLive(true);
        }
    }, [isInternalLocked, sessionMode, activeSession, isAttachedToLive, userSession, spectateSession]);

    // --- Replay Mode Mapping ---
    const replayMessages = useMemo(() => {
        if (sessionMode !== 'replay' || !replayer.log) return [];
        
        const results: Message[] = [];
        let combinedRx = '';
        let lastTimestamp = 0;
        let pendingComm: any = null;

        const COMM_COLORS: Record<string, string> = {
            'tell': '#ff55ff',
            'yell': '#ff5555',
            'say': '#00ffff',
            'shout': '#ffbbee',
            'narrate': '#ffff55',
            'chat': '#55ff55',
            'group': '#77ff77',
            'whisper': '#aaaaaa'
        };

        // Context for tokenizer
        const tokenizerContext = {
            target,
            currentOccupants: [],
            roomNpcs: [],
            activeGroupMembers: [],
            roomItems: [],
            discoveredItems: [],
            inlineCategories: [],
            buttons: [],
            selectedObjectIds: new Set<string>()
        };

        replayer.log.entries.forEach((entry: any, idx: number) => {
            // LogEntry uses compact field names: typ, d, t
            const typ = entry.typ ?? entry.type;
            const data = entry.d ?? entry.data;
            const ts = entry.t ?? entry.timestamp ?? 0;

            if (typ === 'gmcp') {
                const method = data?.method;
                const gData = data?.data;
                if (method === 'Comm.Channel') {
                    pendingComm = {
                        sender: gData.sender,
                        action: gData.channel,
                        text: gData.message,
                        color: COMM_COLORS[gData.channel] || '#ffffff',
                        id: `replay-comm-${idx}`
                    };
                }
            } else if (typ === 'rx') {
                // rx data in logs is often a raw byte array. We MUST strip telnet 
                // subnegotiations (like GMCP) so they don't appear as raw text entries 
                // in the Archive View.
                let bytes: Uint8Array;
                if (data instanceof Uint8Array) bytes = data;
                else if (Array.isArray(data)) bytes = new Uint8Array(data);
                else if (typeof data === 'string') bytes = new TextEncoder().encode(data);
                else bytes = new Uint8Array();

                // Simple telnet stripper: hides everything between IAC SB and IAC SE
                const cleanBytes: number[] = [];
                for (let i = 0; i < bytes.length; i++) {
                    if (bytes[i] === 255 && bytes[i + 1] === 250) { // IAC SB (255 250)
                        i += 2;
                        while (i < bytes.length && !(bytes[i - 1] === 255 && bytes[i] === 240)) i++; // Skip to IAC SE
                        continue;
                    }
                    if (bytes[i] === 255 && bytes[i + 1] >= 251 && bytes[i + 1] <= 254) { // IAC WILL/WONT/DO/DONT (3 bytes)
                        i += 2;
                        continue;
                    }
                    if (bytes[i] === 255) continue; // Skip naked IAC
                    cleanBytes.push(bytes[i]);
                }

                combinedRx += new TextDecoder().decode(new Uint8Array(cleanBytes));
                lastTimestamp = ts;
            } else if (typ === 'tx' || typ === 'sys' || typ === 'ui') {
                // Flush pending RX as message lines
                if (combinedRx) {
                    const html = ansiConvert.toHtml(combinedRx);
                    const msgId = pendingComm ? pendingComm.id : `replay-rx-${idx}`;
                    
                    results.push({
                        id: msgId,
                        type: (pendingComm ? 'comm' : 'system') as any,
                        textRaw: combinedRx,
                        html: html,
                        tokens: Tokenizer.tokenize(combinedRx, tokenizerContext),
                        timestamp: lastTimestamp,
                        isCombat: false,
                        isComm: !!pendingComm,
                        commSender: pendingComm?.sender,
                        commAction: pendingComm?.action,
                        commText: pendingComm?.text,
                        commColor: pendingComm?.color,
                        replyCommand: pendingComm?.action,
                        replyTarget: pendingComm?.sender
                    });
                    combinedRx = '';
                    pendingComm = null;
                }

                if (typ === 'tx') {
                    const text = typeof data === 'string' ? data : String(data);
                    // Filter out automated synchronization commands
                    const lower = text.toLowerCase();
                    if (lower.includes('change width') || lower.includes('change length') || lower.includes('cha wid') || lower.includes('cha len')) {
                        // Skip
                    } else {
                        results.push({
                            id: `replay-tx-${idx}`,
                            type: 'user',
                            textRaw: text,
                            html: text,
                            tokens: Tokenizer.tokenize(text, tokenizerContext),
                            timestamp: ts
                        });
                    }
                } else if (typ === 'sys') {
                    const text = typeof data === 'string' ? data : JSON.stringify(data);
                    results.push({
                        id: `replay-sys-${idx}`,
                        type: 'system',
                        textRaw: text,
                        html: text,
                        tokens: Tokenizer.tokenize(text, tokenizerContext),
                        timestamp: ts
                    });
                }
            }
        });
        
        // Final flush of any remaining RX
        if (combinedRx) {
            const html = ansiConvert.toHtml(combinedRx);
            const msgId = pendingComm ? pendingComm.id : `replay-final`;
            results.push({
                id: msgId,
                type: (pendingComm ? 'comm' : 'system') as any,
                textRaw: combinedRx,
                html: html,
                tokens: Tokenizer.tokenize(combinedRx, tokenizerContext),
                timestamp: lastTimestamp,
                isComm: !!pendingComm,
                commSender: pendingComm?.sender,
                commAction: pendingComm?.action,
                commText: pendingComm?.text,
                commColor: pendingComm?.color,
                replyCommand: pendingComm?.action,
                replyTarget: pendingComm?.sender
            });
        }
        
        return results;
    }, [sessionMode, replayer.log, target]);



    const displayMessages = useMemo(() => {
        if (sessionMode === 'replay') {
            // Filter replay messages to only show what has been "played" according to currentTime.
            // This prevents the log from being stuck at the bottom (end of session) and makes
            // it feel live/theatrical.
            const now = replayer.state.currentTime;
            
            // Replay messages are already sorted by timestamp. Binary search for efficiency.
            let low = 0;
            let high = replayMessages.length;
            while (low < high) {
                const mid = (low + high) >>> 1;
                if (replayMessages[mid].timestamp <= now) low = mid + 1;
                else high = mid;
            }
            return replayMessages.slice(0, low);
        }
        
        // Hide own prompts (handled by HUD PromptBox) but show snooped prompts
        // when the spectate-prompt toggle is on.
        const result = messages.filter(m => m.type !== 'prompt' || (m.isSnoop && showSpectatePromptInLog));
        const userMsgs = result.filter(m => m.type === 'user');
        console.log(`[MessageLog] displayMessages update: total=${result.length}, messages=${messages.length}, userCommands=${userMsgs.length}`, userMsgs.map(m => m.textRaw));
        return result;
    }, [messages, replayMessages, sessionMode, showSpectatePromptInLog, replayer.state.currentTime]);

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
                setIsInternalLocked(isNearBottom);
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
                setIsInternalLocked(false);
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


    const activePromptContent = useMemo(() => {
        if (!activePrompt || isSpectateMode) return null;
        const promptText = typeof activePrompt === 'string' ? activePrompt : activePrompt.text;
        if (!promptText) return null;
        return (
            <div className="message prompt msg-latest" style={{ transition: 'none' }}>
                <div className="message-content" dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(promptText)) }} />
            </div>
        );
    }, [activePrompt, isSpectateMode]);

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
                {activePromptContent}

                {/* --- Timeline Scrubber --- */}
                {!isInternalLocked && sessionMode !== 'replay' && (
                    <div className="timeline-scrubber-overlay">
                        <div className="scrubber-track-outer">
                            <input 
                                type="range"
                                min={0}
                                max={replayer.state.duration}
                                value={replayer.state.currentTime}
                                onChange={(e) => {
                                    const time = parseInt(e.target.value);
                                    if (sessionMode !== 'scrubbing') setSessionMode('scrubbing');
                                    replayer.seek(time);
                                }}
                                className="scrubber-slider"
                            />
                            <div className="scrubber-timestamp">
                                {formatTimestamp(Date.now() - (replayer.state.duration - replayer.state.currentTime))}
                            </div>
                        </div>
                        <button 
                            className="back-to-live-btn"
                            onClick={() => {
                                setSessionMode('live');
                                viewport.isLockedToBottomRef.current = true;
                                viewport.scrollToBottom(true, true, 'BackToLive');
                            }}
                        >
                            Back To Live
                        </button>
                    </div>
                )}

                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '12px', flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
