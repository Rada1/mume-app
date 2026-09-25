/**
 * @file MessageLog.tsx
 * @description Renders the MUME game client message log, supporting virtual scrolling, theme styles, text reveal animations, and block headers.
 */

// --- Logic Section ---
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { 
    Compass, Swords, MessageSquare, CloudSun, Footprints,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ChevronsUp, ChevronsDown, Heart, Zap,
    ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight, CircleHelp
} from 'lucide-react';
import { GmcpOccupant, Message, Token } from '../../types';
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
import { useRoomStore } from '../../stores/useRoomStore';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { decodeCommandEntities } from '../../utils/commandTextUtils';
import { getMumeCommandMatch } from '../../utils/mumeCommandCatalog';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { getRoomTerrainVisualKey, getRoomTerrainGlowColor } from '../../utils/roomTerrainVisuals';
import { formatMovementArrow, getMovementDirectionLabel, normalizeMovementDirection } from '../../utils/movementDirections';
import { RunnerIcon } from '../HUD/PromptBox';

const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
};

type ItemActionAnimation = 'get' | 'drop' | 'wear' | 'remove';

// These are confirmation lines emitted by the game, not the commands the player
// typed. Keeping the visual cue here makes it work for buttons, aliases, and
// manually typed commands alike.
const getItemActionAnimation = (text: string): ItemActionAnimation | null => {
    if (/^you\s+(?:(?:\w+\s+){0,3})?(?:get|take|pick)\b/i.test(text)) return 'get';
    if (/^you\s+(?:(?:\w+\s+){0,3})?drop\b/i.test(text)) return 'drop';
    if (/^you\s+(?:(?:\w+\s+){0,3})?(?:wear|put on|wield|hold|fasten|sling|slip|tie|buckle|don|drape|loop|attach|wrap)\b/i.test(text)) return 'wear';
    if (/^you\s+(?:(?:\w+\s+){0,3})?(?:remove|stop using)\b/i.test(text)) return 'remove';
    return null;
};

const playedFocusRevealIds = new Set<string>();
const playedRoomJiggleIds = new Set<string>();

// Account output intentionally bypasses the entity tokenizer to preserve terminal
// formatting. Wrap only its visible HTML text nodes so the login screen can still
// participate in the continuous word-by-word ripple.
const wrapHtmlWordsForRipple = (html: string): string => {
    let wordIndex = 0;
    return html.replace(/(>|^)([^<]+)(?=<|$)/g, (_match, boundary: string, text: string) => {
        const wrappedText = text.replace(/(\S+)(\s*)/g, (_wordMatch, word: string, trailingSpace: string) => {
            const wrappedWord = `<span class="log-text-word" style="--word-idx:${wordIndex}">${word}</span>`;
            wordIndex += 1;
            return `${wrappedWord}${trailingSpace}`;
        });
        return `${boundary}${wrappedText}`;
    });
};

/**
 * Expands a user-typed command into the l(ook) display format.
 * Returns null when no expansion applies (typed full word, unknown cmd, or has args).
 */
const expandCommandDisplay = (raw: string): { typed: string; remainder: string; suffix: string } | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const match = getMumeCommandMatch(trimmed);
    if (!match.entry) return null;
    const { token, suffix, entry } = match;
    // No expansion needed if the user already typed the full command word
    if (token === entry.full) return null;
    const remainder = entry.full.slice(token.length);
    return { typed: token, remainder, suffix };
};

const arrowToDirection: Record<string, string> = {
    '\u2191': 'n',
    '\u2193': 's',
    '\u2192': 'e',
    '\u2190': 'w',
    '\u2197': 'ne',
    '\u2196': 'nw',
    '\u2198': 'se',
    '\u2199': 'sw',
    '\u21c8': 'u',
    '\u21ca': 'd',
    '\u25b2': 'u',
    '\u25bc': 'd'
};

const getMovementDisplay = (raw: string) => {
    const trimmed = raw.trim();
    const direction = normalizeMovementDirection(trimmed) || normalizeMovementDirection(arrowToDirection[trimmed]);
    const arrow = direction ? formatMovementArrow(direction) : trimmed;
    const label = direction ? getMovementDirectionLabel(direction) : 'movement';
    return { arrow, label, direction };
};

const parseEntityCountPrompt = (text: string) => {
    const matches = [...text.matchAll(/\[(Player|NPC|Object):\s*(\d+)\]/g)];
    if (matches.length === 0 || matches.map(match => match[0]).join('') !== text) return null;
    return matches.map(([, kind, count]) => ({ kind, count }));
};

const renderMovementArrowIcon = (direction: string | null, fallback: string) => {
    if (!direction) return fallback;
    switch (direction) {
        case 'n': return <ArrowUp size={11} strokeWidth={2.4} />;
        case 's': return <ArrowDown size={11} strokeWidth={2.4} />;
        case 'w': return <ArrowLeft size={11} strokeWidth={2.4} />;
        case 'e': return <ArrowRight size={11} strokeWidth={2.4} />;
        case 'u': return <ChevronsUp size={11} strokeWidth={2.4} />;
        case 'd': return <ChevronsDown size={11} strokeWidth={2.4} />;
        case 'nw': return <ArrowUpLeft size={11} strokeWidth={2.4} />;
        case 'ne': return <ArrowUpRight size={11} strokeWidth={2.4} />;
        case 'sw': return <ArrowDownLeft size={11} strokeWidth={2.4} />;
        case 'se': return <ArrowDownRight size={11} strokeWidth={2.4} />;
        default: return fallback;
    }
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

const ResourceGainBadge = ({ gain }: { gain?: Message['resourceGain'] }) => {
    if (!gain || gain.amount <= 0) return null;
    const label = gain.kind.toUpperCase();
    return (
        <span className={`resource-gain-badge ${gain.kind}`} aria-label={`Gained ${gain.amount} ${label}`}>
            +{gain.amount.toLocaleString()} {label}
        </span>
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
    isTimestampEnabled,
    isNewbieMode,
    viewport,
    isTextRevealEnabled,
    isAwaitingResponse,
    batchOffset = 0,
    colors,
    lineIndex,
}: {
    msg: Message,
    executeCommand: (cmd: string, silent?: boolean) => void,
    inCombat: boolean,
    scrollToBottom?: (force?: boolean, immediate?: boolean, source?: string) => void;
    setParley?: (p: any) => void;
    triggerHaptic?: (ms: number) => void;
    playClickSound?: () => void;
    isTimestampEnabled?: boolean;
    isNewbieMode?: boolean;
    viewport: any;
    isTextRevealEnabled: boolean;
    isAwaitingResponse?: boolean;
    batchOffset?: number;
    lineIndex?: number;
    colors?: {
        targetColor?: string;
        playerColor?: string;
        enemyColor?: string;
        neutralColor?: string;
        npcColor?: string;
        objectColor?: string;
        roomColor?: string;
    };
}) => {
    const showBlockHeaders = useSettingsStore(s => s.showBlockHeaders);
    const isImmersionMode = useSettingsStore(s => s.isImmersionMode);
    const { gameState } = useBaseGame();
    const content = msg.html;
    const accountRippleHtml = isImmersionMode && gameState === 'account' && (!msg.tokens || msg.tokens.length === 0)
        ? wrapHtmlWordsForRipple(sanitizeMumeHtml(content))
        : sanitizeMumeHtml(content);
    const isLoginNamePrompt = /\bby what name do you wish to be known\?/i.test(msg.textRaw || msg.textOnly || '');
    const statusNotice = (msg.textOnly || msg.textRaw || '').trim().toLowerCase();
    const isHungryNotice = statusNotice === 'you are hungry.';
    const isThirstyNotice = statusNotice === 'you are thirsty.';
    const regenSlowTooltip = isHungryNotice
        ? 'Regeneration of all vitals slowed! Find something to eat quickly.'
        : isThirstyNotice
            ? 'Regeneration of all vitals slowed! Find something to drink quickly.'
            : undefined;
    const entityCountPrompt = msg.type === 'game' ? parseEntityCountPrompt(msg.textOnly || msg.textRaw || '') : null;
    const [isRecent] = React.useState(() => Date.now() - msg.timestamp < 3500);
    const itemActionAnimation = getItemActionAnimation(msg.textOnly || msg.textRaw || '');
    const isImpactRumble = isImmersionMode && isRecent && (msg.isHitImpact || msg.isDamageImpact);
    const impactRowRef = React.useRef<HTMLDivElement>(null);
    const messageRootRef = React.useRef<HTMLDivElement>(null);
    // Virtualized rows are reused, so bind the animation to its message ID rather
    // than leaving a boolean active for whichever message occupies the row next.
    const [focusRevealMessageId, setFocusRevealMessageId] = React.useState<string | null>(null);
    const isFocusRevealActive = focusRevealMessageId === msg.id;
    const [magicRippleMessageId, setMagicRippleMessageId] = React.useState<string | null>(null);
    const [itemActionMessageId, setItemActionMessageId] = React.useState<string | null>(null);
    const isMagicRippleActive = magicRippleMessageId === msg.id;
    const isItemActionActive = itemActionMessageId === msg.id;
    // local state to handle the cleanup of the hit sheen animation
    const [sheenActive, setSheenActive] = React.useState(!!(isImmersionMode && (msg.isHitImpact || msg.isDamageImpact || msg.isRipMessage)));

    React.useEffect(() => {
        if (isImmersionMode && (msg.isHitImpact || msg.isDamageImpact || msg.isRipMessage)) {
            const timer = setTimeout(() => {
                setSheenActive(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isImmersionMode, msg.isHitImpact, msg.isDamageImpact, msg.isRipMessage]);

    // The parser already tags spell completions and action confirmations. These
    // short-lived classes are deliberately keyed by message ID so a virtualized
    // row cannot replay an old effect when it is recycled for another message.
    React.useEffect(() => {
        if (!isImmersionMode || !msg.isMagicRipple || Date.now() - msg.timestamp > 3500) return;
        setMagicRippleMessageId(msg.id);
        const timer = window.setTimeout(() => {
            setMagicRippleMessageId(activeId => activeId === msg.id ? null : activeId);
        }, 900);
        return () => window.clearTimeout(timer);
    }, [isImmersionMode, msg.id, msg.isMagicRipple, msg.timestamp]);

    React.useEffect(() => {
        if (!isImmersionMode || !itemActionAnimation || Date.now() - msg.timestamp > 3500) return;
        setItemActionMessageId(msg.id);
        const timer = window.setTimeout(() => {
            setItemActionMessageId(activeId => activeId === msg.id ? null : activeId);
        }, 520);
        return () => window.clearTimeout(timer);
    }, [isImmersionMode, itemActionAnimation, msg.id, msg.timestamp]);

    React.useEffect(() => {
        if (!isImpactRumble || !impactRowRef.current) return;
        const rumble = impactRowRef.current.animate([
            { transform: 'translate3d(0, 0, 0)' },
            { transform: 'translate3d(-5px, 1.5px, 0)', offset: 0.18 },
            { transform: 'translate3d(6px, -1.5px, 0)', offset: 0.38 },
            { transform: 'translate3d(-3px, 1px, 0)', offset: 0.58 },
            { transform: 'translate3d(1.5px, 0, 0)', offset: 0.76 },
            { transform: 'translate3d(0, 0, 0)' }
        ], { duration: 360, easing: 'ease-out' });
        return () => rumble.cancel();
    }, [isImpactRumble]);

    React.useLayoutEffect(() => {
        if (!isImmersionMode || !msg.audioSheen || Date.now() - msg.timestamp > 1000 || !messageRootRef.current) return;

        // Server messages and visual rows are not always the same thing: a single incoming
        // line can wrap several times. Reset the sheen delay for every rendered row so each
        // visible line receives its own left-to-right pass.
        const words = Array.from(messageRootRef.current.querySelectorAll<HTMLElement>(
            '.log-text-word, .inline-btn, .comm-action'
        ));
        const wordsPerVisualLine = new Map<number, number>();
        words.forEach(word => {
            const visualLine = Math.round(word.offsetTop);
            const wordIndex = wordsPerVisualLine.get(visualLine) ?? 0;
            wordsPerVisualLine.set(visualLine, wordIndex + 1);
            word.style.setProperty('--sheen-word-delay', `${wordIndex * 20}ms`);
        });
    }, [isImmersionMode, msg.audioSheen, msg.id, msg.timestamp]);

    React.useLayoutEffect(() => {
        // Rapid movement can batch several server lines before React paints. Keep
        // the reveal eligible through that short burst instead of dropping it.
        if (!msg.isFocusReveal || Date.now() - msg.timestamp > 4000 || playedFocusRevealIds.has(msg.id)) return;

        playedFocusRevealIds.add(msg.id);
        setFocusRevealMessageId(msg.id);
        const timer = window.setTimeout(() => {
            setFocusRevealMessageId(activeId => activeId === msg.id ? null : activeId);
        }, 1000);
        return () => window.clearTimeout(timer);
    }, [msg.id, msg.isFocusReveal, msg.timestamp]);

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

    const [isRoomJiggleActive, setIsRoomJiggleActive] = React.useState(false);

    React.useLayoutEffect(() => {
        if (!isImmersionMode || !msg.isRoomArrival || Date.now() - msg.timestamp > 4000 || playedRoomJiggleIds.has(msg.id)) return;

        if (playedRoomJiggleIds.size > 2000) {
            const iter = playedRoomJiggleIds.values();
            for (let i = 0; i < 500; i++) {
                const val = iter.next().value;
                if (val) playedRoomJiggleIds.delete(val);
            }
        }
        playedRoomJiggleIds.add(msg.id);
        setIsRoomJiggleActive(true);
        const timer = window.setTimeout(() => {
            setIsRoomJiggleActive(false);
        }, 1600);
        return () => window.clearTimeout(timer);
    }, [isImmersionMode, msg.id, msg.isRoomArrival, msg.timestamp]);

    const showTimestamp = isTimestampEnabled &&
        !msg.isRoomName &&
        msg.type !== 'room-description' &&
        msg.type !== 'weather' &&
        msg.type !== 'gmcp-event';
    const timestampEl = showTimestamp ? (
        <span className="message-timestamp">{formatTimestamp(msg.timestamp)}</span>
    ) : null;

    const extractRoomDescription = (html: string, baseReverseIdx = 0) => {
        const startIdx = html.indexOf('<div class="room-desc-line">');
        if (startIdx === -1) return '';
        const raw = html.substring(startIdx);
        const totalDescLines = (raw.match(/<div class="room-desc-line">/g) || []).length;
        let lineIdx = 0;
        return raw.replace(/(<div class="room-desc-line">)([\s\S]*?)(<\/div>)/g, (_match, _open, inner, close) => {
            let wIdx = 0;
            const reverseLineIdx = baseReverseIdx + (totalDescLines - 1 - lineIdx);
            const currentLineDelay = reverseLineIdx * 35;
            lineIdx++;
            const wrappedInner = inner.replace(/(>|^)([^<]+)(<|$)/g, (_m: string, before: string, text: string, after: string) => {
                const words = text.replace(/(\S+)(\s*)/g, (_wm: string, word: string, space: string) => {
                    const span = `<span class="log-text-word" style="--word-idx:${wIdx};">${word}</span>${space}`;
                    wIdx++;
                    return span;
                });
                return `${before}${words}${after}`;
            });
            return `<div class="room-desc-line" style="--room-line-delay:${currentLineDelay}ms;">${wrappedInner}${close}`;
        });
    };

    return (
        <div
            ref={messageRootRef}
            data-subdued-action={msg.isSubduedAction || undefined}
            className={`message ${msg.type}${msg.isSnoop ? ' is-snoop' : ''}${entityCountPrompt ? ' entity-prompt' : ''}${msg.isRoomName ? ' is-room-name' : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isRoomContentsLine ? ' room-contents-line' : ''}${msg.isRoomContentsStart ? ' room-contents-start' : ''}${msg.isRoomBlockStart && msg.terrain ? ` room-terrain-${getRoomTerrainVisualKey(msg.terrain)}` : ''}${msg.isCombatBlockStart ? ' combat-block-start' : ''}${msg.isCommBlockStart ? ' comm-block-start' : ''}${msg.isSocialBlockStart ? ' social-block-start' : ''}${msg.isWeatherBlockStart ? ' weather-block-start' : ''}${msg.isMovementBlockStart ? ' movement-block-start' : ''}${msg.isStatusBlockStart ? ' status-block-start' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isSpacer ? ' is-spacer' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}${msg.isWelcomeBlock ? ' welcome-block' : ''}${msg.isWelcomeTitle ? ' welcome-title' : ''}${isLoginNamePrompt ? ' login-name-prompt' : ''}${regenSlowTooltip ? ' regen-slow-notice' : ''}${isImmersionMode && msg.audioSheen && Date.now() - msg.timestamp < 1000 ? ' audio-sheen-active' : ''}${isFocusRevealActive ? ' focus-reveal-active' : ''}${isMagicRippleActive ? ' magic-ripple-active' : ''}${isItemActionActive && itemActionAnimation ? ` item-action-${itemActionAnimation}` : ''}${isImmersionMode && isRoomJiggleActive ? ' room-jiggle-active' : ''}`}
            data-regeneration-tooltip={regenSlowTooltip}
            title={regenSlowTooltip}
            style={{ 
                '--reveal-delay': `${batchOffset * 15}ms`,
                '--room-line-delay': `${(msg.roomLineIndex ?? (batchOffset || 0)) * 35}ms`,
                '--terrain-glow-color': msg.isRoomBlock && !msg.isRoomContentsLine ? getRoomTerrainGlowColor(msg.terrain) : undefined,
                // A negative delay starts the infinite wave at a varied phase
                // immediately, instead of holding freshly received text still.
                '--msg-line-delay': `-${(((lineIndex ?? 0) % 16) * 0.22).toFixed(2)}s`
            } as React.CSSProperties}
        >
            {showBlockHeaders && msg.isRoomBlockStart && (
                <div className="room-block-header">
                    <Compass size={11} strokeWidth={2.5} />
                    LOCATION
                </div>
            )}
            {showBlockHeaders && msg.isCombatBlockStart && (
                <div className="combat-block-header">
                    <Swords size={11} strokeWidth={2.5} />
                    COMBAT
                </div>
            )}
            {showBlockHeaders && msg.isCommBlockStart && (
                <div className="comm-block-header">
                    <MessageSquare size={11} strokeWidth={2.5} />
                    COMMUNICATION
                </div>
            )}
            {showBlockHeaders && msg.isWeatherBlockStart && (msg.type === 'weather' || msg.type === 'gmcp-event') && (
                <div className="weather-block-header">
                    <CloudSun size={11} strokeWidth={2.5} />
                    WEATHER
                </div>
            )}
            {showBlockHeaders && msg.isMovementBlockStart && msg.type === 'movement' && (
                <div className="movement-block-header">
                    <Footprints size={11} strokeWidth={2.5} />
                    MOVEMENT
                </div>
            )}
            {msg.type === 'user' ? (
                <div className="content-row user-command-row" style={{ justifyContent: 'flex-end', width: '100%', paddingRight: '8px', alignItems: 'center' }}>
                    {timestampEl}
                    <div className={`user-command-bubble${isAwaitingResponse ? ' awaiting-response' : ''}`}>
                        <span className="message-content user-command-text">
                            {(() => {
                                const expansion = expandCommandDisplay(msg.textRaw || '');
                                if (!expansion) {
                                    return <TokenRenderer tokens={msg.tokens} fallbackHtml={decodeCommandEntities(msg.textRaw || '')} splitFirstWord={true} />;
                                }
                                return <>
                                    {expansion.typed}<span className="user-command-expansion">({expansion.remainder})</span>{decodeCommandEntities(expansion.suffix)}
                                </>;
                            })()}
                        </span>
                    </div>
                </div>
            ) : msg.type === 'snoop-command' ? (
                <div className="snoop-command-bubble">
                    <TokenRenderer tokens={msg.tokens} fallbackHtml={decodeCommandEntities(msg.textRaw || '')} splitFirstWord={true} />
                </div>
            ) : msg.type === 'prompt' ? (
                <div className="content-row">
                    <span className="message-content prompt-text">
                        <TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(content)} />
                    </span>
                </div>
            ) : entityCountPrompt ? (
                null
            ) : msg.type === 'movement' ? (() => {
                const movement = getMovementDisplay(msg.textRaw || '');
                return (
                    <div className="content-row">
                        {timestampEl}
                        <span className="message-content">
                            <span className="log-text-word" style={{ '--word-idx': 0 } as any}>You </span>
                            <span className="log-text-word" style={{ '--word-idx': 1 } as any}>move </span>
                            <span className="log-text-word" style={{ '--word-idx': 2 } as any}>{movement.label}.</span>
                        </span>
                    </div>
                );
            })() : msg.type === 'practice-skill' && msg.practiceSkill ? (
                <PracticeSkillCard skill={msg.practiceSkill} />
            ) : msg.type === 'practice-header' && msg.practiceHeader ? (
                <PracticeHeaderCard sessionsLeft={msg.practiceHeader.sessionsLeft} />
            ) : msg.type === 'practice-column-header' ? (
                <PracticeColumnHeaderCard sessionsLeft={msg.practiceHeader?.sessionsLeft} />
            ) : msg.type === 'practice-class-header' ? (
                <PracticeClassHeaderCard label={ansiConvert.toHtml(msg.textRaw || '')} />
            ) : ((msg.type === 'comm' || msg.type === 'comm-continue' || msg.isComm) && (msg.commSender || msg.commText)) ? (
                <div className={`content-row comm-row${msg.type === 'comm-continue' ? ' continuation' : ''}`} ref={impactRowRef}>
                    {timestampEl}
                    <div
                        className="message-content comm-content"
                        onClick={triggerParley}
                    >
                        {msg.type !== 'comm-continue' && (
                            <>
                                <span className="comm-sender"><TokenRenderer tokens={msg.commSenderTokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commSender || ''))} /></span>
                                <span className="comm-action" style={{ color: msg.commColor || (msg.replyCommand === 'tell' ? 'var(--ansi-bright-green, #22c55e)' : undefined) }} dangerouslySetInnerHTML={{ __html: sanitizeMumeHtml(ansiConvert.toHtml(` ${msg.commAction}: `)) }} />
                            </>
                        )}
                        <span className={`comm-text${msg.replyCommand === 'tell' ? ' tell-body' : ''}`}><TokenRenderer tokens={msg.commTextTokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.commText || ''))} splitFirstWord={true} /></span>
                    </div>
                    <ReplyButton msg={msg} setParley={setParley || (() => {})} onReply={triggerParley} />
                </div>
            ) : (
                <div className="content-row" ref={impactRowRef}>
                    {timestampEl}
                    {msg.isCombat && inCombat ? (
                        <div className="combat-bubble">
                            <div className="message-content hit-sheen-container">
                                <TokenRenderer
                                    tokens={msg.tokens}
                                    fallbackHtml={sanitizeMumeHtml(content)}
                                    splitFirstWord={true}
                                />
                                <ResourceGainBadge gain={msg.resourceGain} />
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
                                {msg.isRoomName ? (() => {
                                    const rawZone = (msg.roomZone || useRoomStore.getState().roomZone)?.trim();
                                    const formatted = rawZone ? (rawZone.startsWith('(') && rawZone.endsWith(')') ? rawZone : `(${rawZone})`) : null;
                                    return (
                                        <span className="room-title-badge">
                                            <TokenRenderer
                                                tokens={msg.tokens}
                                                fallbackHtml={msg.tokens ? undefined : sanitizeMumeHtml(content)}
                                                splitFirstWord={false}
                                                disableRoomInline={true}
                                                isRoomContentsLine={msg.isRoomContentsLine}
                                            />
                                            {formatted && <span className="room-zone-name">{formatted}</span>}
                                        </span>
                                    );
                                })() : (
                                    <TokenRenderer
                                        tokens={msg.tokens}
                                        fallbackHtml={accountRippleHtml}
                                        splitFirstWord={true}
                                        disableRoomInline={false}
                                        isRoomContentsLine={msg.isRoomContentsLine}
                                    />
                                )}
                                {regenSlowTooltip && (
                                    <span className="regen-slow-info-cue" aria-hidden="true">
                                        <CircleHelp size={12} strokeWidth={2.2} />
                                    </span>
                                )}
                                <ResourceGainBadge gain={msg.resourceGain} />
                                {msg.isHitImpact && sheenActive && (
                                    <div className="hit-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer
                                            tokens={msg.tokens}
                                            fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)}
                                            splitFirstWord={msg.isRoomName ? false : true}
                                            disableRoomInline={msg.isRoomName}
                                            isRoomContentsLine={msg.isRoomContentsLine}
                                        />
                                    </div>
                                )}
                                {msg.isDamageImpact && sheenActive && (
                                    <div className="damage-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} splitFirstWord={msg.isRoomName ? false : true} disableRoomInline={msg.isRoomName} isRoomContentsLine={msg.isRoomContentsLine} />
                                    </div>
                                )}
                                {msg.isRipMessage && sheenActive && (
                                    <div className="rip-sheen-overlay" aria-hidden="true">
                                    <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} splitFirstWord={msg.isRoomName ? false : true} disableRoomInline={msg.isRoomName} isRoomContentsLine={msg.isRoomContentsLine} />
                                    </div>
                                )}
                                {msg.isRoomName && msg.tokens && msg.html?.includes('room-desc-line') && (
                                    <div 
                                        className="room-description-merged" 
                                        dangerouslySetInnerHTML={{ __html: extractRoomDescription(msg.html, msg.roomContentCount ?? 0) }}
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
    const { ui, replayer, spectateBuffer } = useUI() as any;
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
                        resourceGain: data.resourceGain,
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

        // The raw in-game prompt belongs at the bottom of the log. Retain only
        // its latest value so historical prompts never accumulate in the scrollback.
        const latestPrompt = [...list].reverse().find(m => m.type === 'prompt');
        list = list.filter(m => m.type !== 'prompt');
        if (latestPrompt) list.push(latestPrompt);

        return list.filter(message => !(message.type === 'game' && parseEntityCountPrompt(message.textOnly || message.textRaw || '')));
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

        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 40;
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
            const logElement = scrollContainerRef.current;
            const selectionInLog = !!selection && !selection.isCollapsed && selection.toString().length > 0 && !!logElement && (
                (!!selection.anchorNode && logElement.contains(selection.anchorNode)) ||
                (!!selection.focusNode && logElement.contains(selection.focusNode))
            );
            logElement?.classList.toggle('is-text-selecting', selectionInLog);

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
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            scrollContainerRef.current?.classList.remove('is-text-selecting');
        };
    }, [scrollContainerRef]);

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
            if (msg.type === 'movement') return showBlockHeaders && msg.isMovementBlockStart ? 64 : 36;
            if (msg.type === 'prompt') {
                // The raw prompt is now a compact final log line, not the old
                // multi-row custom-prompt placeholder.
                const promptLines = Math.max(1, Math.ceil((msg.textRaw || '').length / (viewport.columns || 80)));
                return promptLines * Math.round(viewport.logFontSizePx * 1.4) + 6;
            }

            if (msg.isEmpty) return Math.round(viewport.logFontSizePx * 1.5);

            const charCount = (msg.textRaw || msg.commText || '').length;
            const cols = viewport.columns || 80;
            const lineCount = Math.max(1, Math.ceil(charCount / cols));
            let h = lineCount * Math.round(viewport.logFontSizePx * 1.5) + (isComm ? 48 : 0);
            if (msg.type === 'user') h += 24;
            if (
                msg.isCombatBlockStart ||
                msg.isCommBlockStart ||
                msg.isSocialBlockStart ||
                msg.isWeatherBlockStart ||
                msg.isMovementBlockStart ||
                msg.isStatusBlockStart ||
                msg.isRoomBlockStart
            ) {
                h += Math.round(viewport.logFontSizePx * 1.2);
            }
            if (showBlockHeaders && msg.isRoomBlockStart) h += 24;
            if (showBlockHeaders && msg.isCombatBlockStart) h += 24;
            if (showBlockHeaders && msg.isCommBlockStart) h += 24;
            return h;
        }, [viewport.columns, viewport.logFontSize, viewport.logFontSizePx, showBlockHeaders]),
        overscan: 12,
        rangeExtractor,
    });

    const wasShaperOpenRef = useRef(!!ui.isShaperOpen);
    useEffect(() => {
        const wasOpen = wasShaperOpenRef.current;
        const isOpen = !!ui.isShaperOpen;
        wasShaperOpenRef.current = isOpen;
        if (!wasOpen || isOpen) return;

        const resyncLogLayout = () => {
            virtualizer.measure();
            if (viewport.isLockedToBottomRef.current) {
                viewport.scrollToBottom(true, true, 'ShaperClosed');
            }
        };

        requestAnimationFrame(() => {
            resyncLogLayout();
            requestAnimationFrame(resyncLogLayout);
        });
    }, [ui.isShaperOpen, virtualizer, viewport]);

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
    }, [messages, viewport, isNewbieMode, lastUserMsgIndex, virtualizer, isSpectateMode, sessionMode]);

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
                                    isTimestampEnabled={isTimestampEnabled}
                                    isNewbieMode={isNewbieMode}
                                    viewport={viewport}
                                    isTextRevealEnabled={isTextRevealEnabled}
                                    isAwaitingResponse={msg.type === 'user' && msg.id === awaitingResponseUserId}
                                    batchOffset={batchOffset}
                                    colors={colors}
                                    lineIndex={virtualItem.index}
                                />
                            </div>
                        );
                    });
                    })()}
                </div>
                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: '4px', flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
