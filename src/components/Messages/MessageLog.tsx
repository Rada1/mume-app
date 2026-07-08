/**
 * @file MessageLog.tsx
 * @description Renders the MUME game client message log, supporting virtual scrolling, theme styles, text reveal animations, and block headers.
 */

// --- Logic Section ---
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Message } from '../../types';
import { ansiConvert } from '../../utils/ansi';
import { sanitizeMumeHtml } from '../../utils/securityUtils';
import { TokenRenderer } from './TokenRenderer';
import { useVirtualizer, defaultRangeExtractor } from '@tanstack/react-virtual';
import PracticeSkillCard from '../Practice/PracticeSkillCard';
import PracticeHeaderCard from '../Practice/PracticeHeaderCard';
import PracticeClassHeaderCard from '../Practice/PracticeClassHeaderCard';
import PracticeColumnHeaderCard from '../Practice/PracticeColumnHeaderCard';
import { useBaseGame, useLog, useUI } from '../../context/GameContext';
import { useMessageStore } from '../../stores/useMessageStore';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { decodeCommandEntities } from '../../utils/commandTextUtils';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { getRoomTerrainVisualKey, getRoomTerrainGlowColor } from '../../utils/roomTerrainVisuals';

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

const UserCommandBubbleWithTimer: React.FC<{
    msg: Message;
    isAwaitingResponse?: boolean;
    commandBloomPhase: string;
}> = ({ msg, isAwaitingResponse, commandBloomPhase }) => {
    const active = useActionTimerStore(state => state.activeTimer);
    const cleanMsgCmd = (msg.textRaw || '').trim().toLowerCase();
    const cleanTimerCmd = (active?.name || '').trim().toLowerCase();
    
    // Check if this timer matches our command
    const isMatchingTimer = active && (
        cleanMsgCmd === cleanTimerCmd || 
        (cleanTimerCmd.startsWith('casting:') && cleanMsgCmd.includes(cleanTimerCmd.substring(8).trim()))
    );

    const [progress, setProgress] = React.useState(0);
    const [elapsedMs, setElapsedMs] = React.useState(0);

    // Commit active timer completion to the message's persistent timerInfo
    React.useEffect(() => {
        if (!isMatchingTimer || !active) return;

        if (active.isFinished) {
            const finalElapsed = active.elapsedMs || (Date.now() - active.startedAt);
            const status = active.isInterrupted ? 'interrupted' : 'completed';
            useMessageStore.getState().setUserMessages(prev =>
                prev.map(m => m.id === msg.id ? {
                    ...m,
                    timerInfo: {
                        durationMs: active.durationMs,
                        elapsedMs: finalElapsed,
                        status
                    }
                } : m)
            );
        }
    }, [isMatchingTimer, active?.id, active?.isFinished, active?.isInterrupted, msg.id]);

    React.useEffect(() => {
        if (!isMatchingTimer || !active || active.isFinished) {
            setProgress(0);
            setElapsedMs(0);
            return;
        }

        const start = active.startedAt;
        const duration = active.durationMs;

        const update = () => {
            const now = Date.now();
            const elapsed = now - start;
            const currentRatio = Math.max(0, Math.min(1, elapsed / duration));
            
            setElapsedMs(elapsed);
            
            if (duration <= 1000 && elapsed >= duration) {
                setProgress(1.0);
                setElapsedMs(duration);
                useActionTimerStore.getState().completeTimer(false);
                return;
            }

            if (elapsed > duration) {
                setProgress(0.99);
            } else {
                setProgress(currentRatio);
            }

            const currentActive = useActionTimerStore.getState().activeTimer;
            if (currentActive && !currentActive.isFinished && currentActive.id === active.id) {
                requestAnimationFrame(update);
            }
        };

        const animationFrame = requestAnimationFrame(update);
        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, [isMatchingTimer, active?.id, active?.isFinished]);

    const bubbleText = <TokenRenderer tokens={msg.tokens} fallbackHtml={decodeCommandEntities(msg.textRaw || '')} splitFirstWord={true} />;

    const hasPersisted = !!msg.timerInfo;
    
    if (!isMatchingTimer && !hasPersisted) {
        return (
            <div className={`user-command-bubble${isAwaitingResponse ? ' awaiting-response' : ''}${commandBloomPhase !== 'off' ? ` bloom-${commandBloomPhase}` : ''}`}>
                {bubbleText}
            </div>
        );
    }

    let finalProgress = progress;
    let finalElapsed = elapsedMs;
    let statusText = 'Attempting';
    let statusColor = '#eab308'; // yellow
    let isFinished = false;
    let isInterrupted = false;

    if (hasPersisted && msg.timerInfo) {
        isFinished = true;
        isInterrupted = msg.timerInfo.status === 'interrupted';
        finalProgress = 1.0;
        finalElapsed = msg.timerInfo.elapsedMs;
        statusText = msg.timerInfo.status;
        statusColor = isInterrupted ? '#ef4444' : '#22c55e';
    } else if (active) {
        isFinished = active.isFinished;
        isInterrupted = active.isInterrupted;
        if (isFinished) {
            statusText = isInterrupted ? 'interrupted' : 'completed';
            statusColor = isInterrupted ? '#ef4444' : '#22c55e';
            finalProgress = 1.0;
        } else if (active.type === 'spell') {
            statusText = 'casting';
            statusColor = '#c084fc';
        }
    }

    const stopwatchText = `${(finalElapsed / 1000).toFixed(2)}s`;

    return (
        <div 
            className={`user-command-bubble${isFinished ? (isInterrupted ? ' interrupted' : ' completed') : ' active-timer'}${commandBloomPhase !== 'off' ? ` bloom-${commandBloomPhase}` : ''}`}
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: isFinished 
                    ? (isInterrupted ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)') 
                    : 'rgba(13, 16, 23, 0.85)',
                border: `1px solid ${isFinished ? (isInterrupted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)') : 'rgba(255, 255, 255, 0.15)'}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.2s ease',
                pointerEvents: 'none',
                overflow: 'hidden'
            }}
        >
            <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{bubbleText}</span>
            <div 
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
                    paddingLeft: '8px'
                }}
            >
                <span style={{ color: statusColor }}>{statusText}</span>
                <span style={{ fontFamily: 'monospace', color: '#fff', opacity: 0.8 }}>{stopwatchText}</span>
            </div>
            
            <div 
                style={{
                    position: 'absolute',
                    left: 0,
                    bottom: 0,
                    width: '100%',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.05)'
                }}
            >
                <div 
                    style={{
                        height: '100%',
                        width: `${finalProgress * 100}%`,
                        background: isFinished 
                            ? (isInterrupted ? '#ef4444' : '#22c55e') 
                            : (active?.type === 'spell' ? '#c084fc' : '#eab308'),
                        transition: isFinished ? 'width 0.2s ease-out' : 'none'
                    }}
                />
            </div>
        </div>
    );
};

const MessageItem = React.memo(({
    msg,
    inCombat,
    scrollToBottom,
    executeCommand,
    setParley,
    triggerHaptic,
    playClickSound,
    brightBatchFloor,
    isTimestampEnabled,
    isNewbieMode,
    currentRoomName,
    viewport,
    isTextRevealEnabled,
    isAwaitingResponse,
    batchOffset = 0,
    colors,
    maxBatchId = -1,
}: {
    msg: Message,
    executeCommand: (cmd: string, silent?: boolean) => void,
    inCombat: boolean,
    scrollToBottom?: (force?: boolean, immediate?: boolean, source?: string) => void;
    setParley?: (p: any) => void;
    triggerHaptic?: (ms: number) => void;
    playClickSound?: () => void;
    brightBatchFloor?: number;
    isTimestampEnabled?: boolean;
    isNewbieMode?: boolean;
    currentRoomName?: string | null,
    viewport: any;
    isTextRevealEnabled: boolean;
    isAwaitingResponse?: boolean;
    batchOffset?: number;
    colors?: {
        targetColor?: string;
        playerColor?: string;
        enemyColor?: string;
        neutralColor?: string;
        npcColor?: string;
        objectColor?: string;
        roomColor?: string;
    };
    maxBatchId?: number;
}) => {
    const showBlockHeaders = useSettingsStore(s => s.showBlockHeaders);
    const content = msg.html;
    // Frozen at mount — prevents wordReveal from toggling off mid-life when re-renders
    // cross the 2-second mark (rapid combat GMCP updates), which collapses inline-block
    // log-word wrappers and shifts inline button positions.
    const [isRecent] = React.useState(() => Date.now() - msg.timestamp < 2000);
    const [isRecentEntry] = React.useState(() => Date.now() - msg.timestamp < 600);
    const isLatestBatch = msg.batchId === undefined || msg.batchId === maxBatchId;
    const isOldBatchDim = brightBatchFloor !== undefined && (msg.batchId === undefined || msg.batchId < brightBatchFloor);
    const [commandBloomPhase, setCommandBloomPhase] = React.useState<'off' | 'active' | 'exiting'>(isAwaitingResponse ? 'active' : 'off');
    
    // local state to handle the cleanup of the hit sheen animation
    const [sheenActive, setSheenActive] = React.useState(!!(msg.isHitImpact || msg.isDamageImpact || msg.isRipMessage));

    React.useEffect(() => {
        if (msg.type !== 'user') return;
        if (isAwaitingResponse) {
            setCommandBloomPhase('active');
            return;
        }
        setCommandBloomPhase(phase => phase === 'active' ? 'exiting' : phase);
        const timer = setTimeout(() => {
            setCommandBloomPhase('off');
        }, 220);
        return () => clearTimeout(timer);
    }, [isAwaitingResponse, msg.type]);

    React.useEffect(() => {
        if (msg.isHitImpact || msg.isDamageImpact || msg.isRipMessage) {
            const timer = setTimeout(() => {
                setSheenActive(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [msg.isHitImpact, msg.isDamageImpact, msg.isRipMessage]);

    const triggerParley = useCallback((e: React.MouseEvent) => {
        if (!setParley || !triggerHaptic || !playClickSound) return;
        // If an inner inline-btn was clicked, let handleLogClick handle it instead
        const clickedBtn = (e.target as HTMLElement).closest('.inline-btn');
        if (clickedBtn && clickedBtn !== e.currentTarget) return;
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
            className={`message ${msg.type}${msg.isSnoop ? ' is-snoop' : ''}${msg.isRoomName ? ' is-room-name' : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isRoomContentsLine ? ' room-contents-line' : ''}${msg.isRoomContentsStart ? ' room-contents-start' : ''}${msg.isRoomBlockStart && msg.terrain ? ` room-terrain-${getRoomTerrainVisualKey(msg.terrain)}` : ''}${msg.isCombatBlockStart ? ' combat-block-start' : ''}${msg.isCommBlockStart ? ' comm-block-start' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isSpacer ? ' is-spacer' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}${isRecentEntry && isTextRevealEnabled ? ' recent-entry' : ''}${msg.isWelcomeBlock ? ' welcome-block' : ''}${msg.isWelcomeTitle ? ' welcome-title' : ''}`}
            style={{ 
                '--reveal-delay': `${batchOffset * 15}ms`,
                '--terrain-glow-color': msg.isRoomBlock && !msg.isRoomContentsLine ? getRoomTerrainGlowColor(msg.terrain) : undefined
            } as React.CSSProperties}
        >
            {showBlockHeaders && msg.isRoomBlockStart && (
                <div className="room-block-header">
                    {formatTimestamp(msg.timestamp)} LOCATION
                </div>
            )}
            {showBlockHeaders && msg.isCombatBlockStart && (
                <div className="combat-block-header">
                    {formatTimestamp(msg.timestamp)} COMBAT
                </div>
            )}
            {showBlockHeaders && msg.isCommBlockStart && (
                <div className="comm-block-header">
                    {formatTimestamp(msg.timestamp)} COMMUNICATION
                </div>
            )}
            {msg.type === 'user' ? (
                <UserCommandBubbleWithTimer 
                    msg={msg} 
                    isAwaitingResponse={isAwaitingResponse} 
                    commandBloomPhase={commandBloomPhase} 
                />
            ) : msg.type === 'snoop-command' ? (
                <div className="snoop-command-bubble">
                    <TokenRenderer tokens={msg.tokens} fallbackHtml={decodeCommandEntities(msg.textRaw || '')} splitFirstWord={true} />
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
                            className="comm-bubble"
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
                            <span className="comm-text"><TokenRenderer tokens={msg.commTextTokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commText || ''))} splitFirstWord={true} wordReveal={isTextRevealEnabled && isRecent} /></span>
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
                                <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} splitFirstWord={true} />
                                {msg.isHitImpact && sheenActive && (
                                    <div className="hit-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} splitFirstWord={true} />
                                    </div>
                                )}
                                {msg.isDamageImpact && sheenActive && (
                                    <div className="damage-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} splitFirstWord={true} />
                                    </div>
                                )}
                                {msg.isRipMessage && sheenActive && (
                                    <div className="rip-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} splitFirstWord={true} />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="message-content hit-sheen-container">
                                <TokenRenderer
                                    tokens={msg.tokens}
                                    fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)}
                                    splitFirstWord={true}
                                    wordReveal={isTextRevealEnabled && isRecent && !msg.isRoomName}
                                    metadata={msg.isRoomName ? {
                                        id: `room:${(currentRoomName || msg.textRaw || '').toLowerCase()}`,
                                        context: currentRoomName || msg.textRaw || '',
                                        category: 'cat-room',
                                        cmd: 'cat-room',
                                        action: 'menu'
                                    } : undefined}
                                />
                                {msg.isHitImpact && sheenActive && (
                                    <div className="hit-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer
                                            tokens={msg.tokens}
                                            fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)}
                                            splitFirstWord={true}
                                            metadata={msg.isRoomName ? {
                                                id: `room:${(currentRoomName || msg.textRaw || '').toLowerCase()}`,
                                                context: currentRoomName || msg.textRaw || '',
                                                category: 'cat-room',
                                                cmd: 'cat-room',
                                                action: 'menu'
                                            } : undefined}
                                        />
                                    </div>
                                )}
                                {msg.isDamageImpact && sheenActive && (
                                    <div className="damage-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} splitFirstWord={true} />
                                    </div>
                                )}
                                {msg.isRipMessage && sheenActive && (
                                    <div className="rip-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} splitFirstWord={true} />
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
        isNewbieMode, showSpectatePromptInLog, sessionMode,
        accountState
    } = useBaseGame() as any;
    const isSpectateMode = useModeStore(s => s.isSpectating);
    const activeView = useModeStore(s => s.activeView);
    const { replayer, spectateBuffer } = useUI() as any;
    const userMessages = useMessageStore(s => s.user);
    const spectateMessages = useMessageStore(s => s.spectate);
    const messages = (isSpectateMode && activeView === 'target') ? spectateMessages : userMessages;
    // NOTE: MessageLog intentionally does NOT subscribe to vitals (target/opponent) or the
    // input field. Target highlighting is handled inside TokenRenderer via TokenHighlightContext,
    // and the input box is independent — subscribing here forced a full virtual-list re-map on
    // every prompt tick and every keystroke.
    const { scrollContainerRef, messagesEndRef, scrollToBottom, isLockedToBottomRef } = viewport;

    // Highlight the selected character line in the log via a dynamic <style> rule.
    const selectedCharName = accountState?.selectedCharacter?.name ?? null;
    useEffect(() => {
        const id = 'account-char-select-style';
        let styleEl = document.getElementById(id) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = id;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = selectedCharName
            ? `.account-char-name[data-context="${CSS.escape(selectedCharName)}"] { border-left: 1.5px solid var(--accent, #b48230); border-top-left-radius: 0 !important; border-bottom-left-radius: 0 !important; background: rgba(var(--accent-rgb, 180, 130, 60), 0.16) !important; color: #fff; padding-left: 6px; }`
            : '';
        return () => { if (styleEl) styleEl.textContent = ''; };
    }, [selectedCharName]);

    // Highlight the selected menu command line in the log via a dynamic <style> rule.
    const selectedMenuCommand = accountState?.selectedMenuCommand ?? null;
    useEffect(() => {
        const id = 'account-menu-cmd-style';
        let styleEl = document.getElementById(id) as HTMLStyleElement | null;
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = id;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = selectedMenuCommand
            ? `.account-menu-cmd[data-context="${CSS.escape(selectedMenuCommand)}"] { border-left: 1.5px solid var(--accent, #b48230); border-top-left-radius: 0 !important; border-bottom-left-radius: 0 !important; background: rgba(var(--accent-rgb, 180, 130, 60), 0.16) !important; color: #fff; padding-left: 6px; }`
            : '';
        return () => { if (styleEl) styleEl.textContent = ''; };
    }, [selectedMenuCommand]);

    const {
        targetColor, playerColor, enemyColor, neutralColor, npcColor, objectColor, roomColor,
        hidePrompt, showBlockHeaders, isTextRevealEnabled
    } = useSettingsStore();

    const colors = useMemo(() => ({
        targetColor, playerColor, enemyColor, neutralColor, npcColor, objectColor, roomColor
    }), [targetColor, playerColor, enemyColor, neutralColor, npcColor, objectColor, roomColor]);

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
        let list: Message[] = [];
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
            list = replayMessages.slice(0, low);
        } else {
            const base = messages.filter(m => m.type !== 'prompt' || !m.isSnoop || showSpectatePromptInLog);

            // Spectate DVR buffer: hide messages newer than displayCutoff so the user
            // can watch from an earlier point in the session and advance in real-time.
            if (isSpectateMode && activeView === 'target' && !spectateBuffer.isLive) {
                list = base.filter(m => m.timestamp <= spectateBuffer.displayCutoff);
            } else {
                list = base;
            }
        }

        if (hidePrompt) {
            list = list.filter(m => m.type !== 'prompt');
        }

        return list;
    }, [messages, replayMessages, sessionMode, showSpectatePromptInLog, replayer.state.currentTime, isSpectateMode, activeView, spectateBuffer.isLive, spectateBuffer.displayCutoff, hidePrompt]);

    const lastUserMsgIndex = useMemo(() => {
        for (let i = displayMessages.length - 1; i >= 0; i--) {
            if (displayMessages[i].type === 'user') return i;
        }
        return -1;
    }, [displayMessages]);

    const awaitingResponseUserId = useMemo(() => {
        for (let i = displayMessages.length - 1; i >= 0; i--) {
            const message = displayMessages[i];
            if (message.type === 'user') return message.id;
            if (message.type !== 'snoop-command') return null;
        }
        return null;
    }, [displayMessages]);

    const brightBatchFloor = useMemo(() => {
        const seenBatchIds = new Set<number>();
        for (let i = displayMessages.length - 1; i >= 0; i--) {
            const batchId = displayMessages[i].batchId;
            if (batchId === undefined) continue;
            seenBatchIds.add(batchId);
            if (seenBatchIds.size === 2) return batchId;
        }
        return undefined;
    }, [displayMessages]);

    const maxBatchId = useMemo(() => {
        let max = -1;
        for (let i = displayMessages.length - 1; i >= 0; i--) {
            const bId = displayMessages[i].batchId;
            if (bId !== undefined) {
                max = bId;
                break;
            }
        }
        return max;
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
        // Flag active scrolling so the atmosphere overlays can step aside (see environment.css).
        document.body.classList.add('ui-scrolling');
        if (userScrollTimerRef.current) clearTimeout(userScrollTimerRef.current);
        userScrollTimerRef.current = setTimeout(() => {
            isUserScrollingRef.current = false;
            document.body.classList.remove('ui-scrolling');
        }, 150);

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

    // Safety: clear the scroll flag if the log unmounts mid-scroll so the atmosphere
    // overlays can't get stuck hidden.
    useEffect(() => () => { document.body.classList.remove('ui-scrolling'); }, []);

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

    const [selectionRange, setSelectionRange] = React.useState<{ start: number; end: number } | null>(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || selection.toString().length === 0) {
                setSelectionRange(null);
                return;
            }
            let anchorIndex = -1;
            let focusIndex = -1;

            let node: Node | null = selection.anchorNode;
            while (node && node !== document.body) {
                if (node instanceof HTMLElement && node.hasAttribute('data-index')) {
                    anchorIndex = parseInt(node.getAttribute('data-index') || '-1', 10);
                    break;
                }
                node = node.parentNode;
            }

            node = selection.focusNode;
            while (node && node !== document.body) {
                if (node instanceof HTMLElement && node.hasAttribute('data-index')) {
                    focusIndex = parseInt(node.getAttribute('data-index') || '-1', 10);
                    break;
                }
                node = node.parentNode;
            }

            if (anchorIndex !== -1 && focusIndex !== -1) {
                setSelectionRange({
                    start: Math.min(anchorIndex, focusIndex),
                    end: Math.max(anchorIndex, focusIndex)
                });
            } else {
                setSelectionRange(null);
            }
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const messagesRef = React.useRef(displayMessages);
    messagesRef.current = displayMessages;

    const rangeExtractor = useCallback((range: any) => {
        const defaultIndices = defaultRangeExtractor(range);
        if (!selectionRange) return defaultIndices;
        
        const extraIndices = [];
        for (let i = selectionRange.start; i <= selectionRange.end; i++) {
            extraIndices.push(i);
        }
        
        return Array.from(new Set([...defaultIndices, ...extraIndices])).sort((a, b) => a - b);
    }, [selectionRange]);

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
            if (showBlockHeaders && msg.isRoomBlockStart) h += 24;
            if (showBlockHeaders && msg.isCombatBlockStart) h += 24;
            if (showBlockHeaders && msg.isCommBlockStart) h += 24;
            return h;
        }, [viewport.columns, viewport.logFontSize, viewport.logFontSizePx, showBlockHeaders]),
        overscan: 12,
        rangeExtractor,
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
        <div className="message-log-layout" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden', position: 'relative' }}>
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
                    {(() => {
                        const nowMs = Date.now();
                        const minRecentVIndex = virtualItems.reduce((min, vi) => {
                            const m = displayMessages[vi.index];
                            return m && (nowMs - m.timestamp < 600) ? Math.min(min, vi.index) : min;
                        }, Infinity);
                        return virtualItems.map((virtualItem) => {
                        const msg = displayMessages[virtualItem.index];
                        const batchOffset = msg && (nowMs - msg.timestamp < 600) ? virtualItem.index - minRecentVIndex : 0;
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
                                    transform: `translate3d(0, ${virtualItem.start}px, 0)`,
                                    contain: 'layout paint style',
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
                                    brightBatchFloor={brightBatchFloor}
                                    isTimestampEnabled={isTimestampEnabled}
                                    isNewbieMode={isNewbieMode}
                                    currentRoomName={roomName}
                                    viewport={viewport}
                                    isTextRevealEnabled={isTextRevealEnabled}
                                    isAwaitingResponse={msg.type === 'user' && msg.id === awaitingResponseUserId}
                                    batchOffset={batchOffset}
                                    colors={colors}
                                    maxBatchId={maxBatchId}
                                />
                            </div>
                        );
                    });
                    })()}
                </div>
                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '30px', flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
