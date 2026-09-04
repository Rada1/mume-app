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
    ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight 
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
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { decodeCommandEntities } from '../../utils/commandTextUtils';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { getRoomTerrainVisualKey, getRoomTerrainGlowColor } from '../../utils/roomTerrainVisuals';
import { formatMovementArrow, getMovementDirectionLabel, normalizeMovementDirection } from '../../utils/movementDirections';
import { RunnerIcon } from '../HUD/PromptBox';
import PromptModeIndicators from './PromptModeIndicators';

const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return `[${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}]`;
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

const getLightingLabel = (lighting?: string): string => {
    switch (lighting) {
        case 'sun': return 'Sunlight';
        case 'artificial': return 'Artificial light';
        case 'moon': return 'Moonlight';
        case 'dark': return 'Darkness';
        default: return '';
    }
};

const getTerrainLabel = (terrain?: string | null): string => {
    const value = terrain?.trim() || '';
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

const getWeatherLabel = (weather?: string | null): string => {
    const value = weather?.trim() || '';
    if (!value || value.toLowerCase() === 'none') return '';
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

const stripPromptModeTokens = (tokens?: Token[]): Token[] | undefined => tokens?.map(token => {
    if (token.type !== 'text' && token.type !== 'ansi') return token;
    return {
        ...token,
        content: token.content.replace(/\b[AMPS]\d+\b/g, '')
    };
});

const parseEntityCountPrompt = (text: string) => {
    const matches = [...text.matchAll(/\[(Player|NPC|Object):\s*(\d+)\]/g)];
    if (matches.length === 0 || matches.map(match => match[0]).join('') !== text) return null;
    return matches.map(([, kind, count]) => ({ kind, count }));
};

const getRoomEntityLabel = (entity: string | GmcpOccupant): string => {
    if (typeof entity === 'string') return entity.trim();
    return entity.keyword?.trim() || entity.name?.trim() || entity.shortdesc?.trim() || entity.short?.trim() || '';
};

interface PromptEntityButton {
    label: string;
    id?: string;
    category: 'cat-npc' | 'cat-object';
}

const getEntityButtonsForPrompt = (
    entityCountPrompt: Array<{ kind: string; count: string }>,
    roomNpcs: Array<string | GmcpOccupant> = [],
    roomItems: Array<string | GmcpOccupant> = [],
): PromptEntityButton[] => {
    const entitiesByKind: Record<string, Array<string | GmcpOccupant>> = {
        NPC: roomNpcs,
        Object: roomItems,
    };

    return entityCountPrompt.flatMap(({ kind, count }) => {
        const limit = Number.parseInt(count, 10);
        return (entitiesByKind[kind] || [])
            .map(entity => ({
                label: getRoomEntityLabel(entity),
                id: typeof entity === 'string' || entity.id === undefined ? undefined : String(entity.id),
                category: kind === 'NPC' ? 'cat-npc' as const : 'cat-object' as const,
            }))
            .filter(entity => Boolean(entity.label))
            .slice(0, Number.isNaN(limit) ? undefined : limit);
    });
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
    isOldBatchDim = false,
    isTimestampEnabled,
    isNewbieMode,
    viewport,
    isTextRevealEnabled,
    isAwaitingResponse,
    batchOffset = 0,
    colors,
    lighting,
    currentTerrain,
    weather,
    roomNpcs,
    roomItems,
}: {
    msg: Message,
    executeCommand: (cmd: string, silent?: boolean) => void,
    inCombat: boolean,
    scrollToBottom?: (force?: boolean, immediate?: boolean, source?: string) => void;
    setParley?: (p: any) => void;
    triggerHaptic?: (ms: number) => void;
    playClickSound?: () => void;
    isOldBatchDim?: boolean;
    isTimestampEnabled?: boolean;
    isNewbieMode?: boolean;
    viewport: any;
    isTextRevealEnabled: boolean;
    isAwaitingResponse?: boolean;
    batchOffset?: number;
    lighting?: string;
    currentTerrain?: string | null;
    weather?: string | null;
    roomNpcs?: Array<string | GmcpOccupant>;
    roomItems?: Array<string | GmcpOccupant>;
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
    const content = msg.html;
    const promptTokens = msg.type === 'prompt' ? stripPromptModeTokens(msg.tokens) : msg.tokens;
    const promptFallbackHtml = msg.type === 'prompt'
        ? sanitizeMumeHtml(ansiConvert.toHtml((msg.textRaw || '').replace(/\b[AMPS]\d+\b/g, '')))
        : sanitizeMumeHtml(ansiConvert.toHtml(msg.textRaw || ''));
    const lightingLabel = getLightingLabel(lighting);
    const terrainLabel = getTerrainLabel(currentTerrain);
    const weatherLabel = getWeatherLabel(weather);
    const entityCountPrompt = msg.type === 'game' ? parseEntityCountPrompt(msg.textOnly || msg.textRaw || '') : null;
    const promptEntities = getEntityButtonsForPrompt(
        [{ kind: 'NPC', count: String(roomNpcs?.length || 0) }, { kind: 'Object', count: String(roomItems?.length || 0) }],
        roomNpcs,
        roomItems,
    );
    const environmentLabels = [terrainLabel, lightingLabel, weatherLabel].filter(Boolean);
    const promptEnvironment = environmentLabels.length > 0 ? (
        <span className="prompt-environment-line">
            [{environmentLabels.join(' | ')}]
        </span>
    ) : null;
    const promptEntityLine = promptEntities.length > 0 ? (
        <span className="prompt-entities-line">
            [
            {promptEntities.map((entity, index) => (
                <React.Fragment key={`${entity.label}-${entity.id || index}`}>
                    <span
                        className="inline-btn prompt-entity-inline"
                        data-action="menu"
                        data-category={entity.category}
                        data-cmd={entity.category}
                        data-context={entity.label}
                        data-menu-display="list"
                        data-targetable="true"
                        {...(entity.id ? { 'data-id': entity.id } : {})}
                    >
                        {entity.label}
                    </span>
                    {index < promptEntities.length - 1 ? ' | ' : ''}
                </React.Fragment>
            ))}
            ]
        </span>
    ) : null;
    const promptMetadataLine = promptEnvironment || promptEntityLine ? (
        <span className="prompt-metadata-line">
            {promptEnvironment}
            {promptEntityLine}
        </span>
    ) : null;
    // Frozen at mount — prevents wordReveal from toggling off mid-life when re-renders
    // cross the 2-second mark (rapid combat GMCP updates), which collapses inline-block
    // log-word wrappers and shifts inline button positions.
    const [isRecent] = React.useState(() => Date.now() - msg.timestamp < 2000);
    const [isRecentEntry] = React.useState(() => Date.now() - msg.timestamp < 600);
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

    const showTimestamp = isTimestampEnabled &&
        !msg.isRoomName &&
        msg.type !== 'room-description' &&
        msg.type !== 'weather' &&
        msg.type !== 'gmcp-event';
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
            className={`message ${msg.type}${msg.isSnoop ? ' is-snoop' : ''}${entityCountPrompt ? ' entity-prompt' : ''}${msg.isRoomName ? ' is-room-name' : ''}${msg.isRoomBlock ? ' is-room-block' : ''}${msg.isRoomBlockStart ? ' room-block-start' : ''}${msg.isRoomBlockEnd ? ' room-block-end' : ''}${msg.isRoomContentsLine ? ' room-contents-line' : ''}${msg.isRoomContentsStart ? ' room-contents-start' : ''}${msg.isRoomBlockStart && msg.terrain ? ` room-terrain-${getRoomTerrainVisualKey(msg.terrain)}` : ''}${msg.isCombatBlockStart ? ' combat-block-start' : ''}${msg.isCommBlockStart ? ' comm-block-start' : ''}${msg.isMovementBlockStart ? ' movement-block-start' : ''}${msg.isCombat && inCombat ? ' is-combat' : ''}${msg.isComm ? ' is-comm' : ''}${msg.isNarrate ? ' is-narrate' : ''}${msg.isEmpty ? ' is-empty' : ''}${msg.isSpacer ? ' is-spacer' : ''}${msg.isBatchEnd ? ' batch-end' : ''}${isOldBatchDim ? ' old-batch-dim' : ''}${msg.combatSide ? ` combat-${msg.combatSide}` : ''}${showTimestamp ? ' has-timestamp' : ' no-timestamp'}${isRecentEntry && isTextRevealEnabled ? ' recent-entry' : ''}${msg.isWelcomeBlock ? ' welcome-block' : ''}${msg.isWelcomeTitle ? ' welcome-title' : ''}`}
            style={{ 
                '--reveal-delay': `${batchOffset * 15}ms`,
                '--terrain-glow-color': msg.isRoomBlock && !msg.isRoomContentsLine ? getRoomTerrainGlowColor(msg.terrain) : undefined
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
                    <div className={`user-command-bubble${isAwaitingResponse ? ' awaiting-response' : ''}${commandBloomPhase !== 'off' ? ` bloom-${commandBloomPhase}` : ''}`}>
                        <span className="message-content user-command-text">
                            <TokenRenderer tokens={msg.tokens} fallbackHtml={decodeCommandEntities(msg.textRaw || '')} splitFirstWord={true} />
                        </span>
                    </div>
                </div>
            ) : msg.type === 'snoop-command' ? (
                <div className="snoop-command-bubble">
                    <TokenRenderer tokens={msg.tokens} fallbackHtml={decodeCommandEntities(msg.textRaw || '')} splitFirstWord={true} />
                </div>
            ) : msg.type === 'prompt' ? (
                msg.promptHPPercent !== undefined ? (
                    <span className="custom-prompt-container">
                        <span className="prompt-row prompt-vitals-row">
                            <span className="custom-prompt-prefix">[</span>
                            <span className="prompt-stat-item"><span className="prompt-stat-label">HP</span><span>{msg.promptHPPercent}%</span></span>
                            <span className="prompt-stat-divider">|</span>
                            <span className="prompt-stat-item"><span className="prompt-stat-label">MANA</span><span>{msg.promptManaPercent ?? 100}%</span></span>
                            <span className="prompt-stat-divider">|</span>
                            <span className="prompt-stat-item"><span className="prompt-stat-label">MP</span><span>{msg.promptMovePercent ?? 100}%</span></span>
                            <span className="custom-prompt-prefix">]</span>
                        {msg.promptOpponentName && (
                            <>
                                <span className="prompt-vs-label">Vs</span>
                                <span className="prompt-opponent-info">
                                    <span className="prompt-opponent-name">{msg.promptOpponentName}</span>
                                    <span className="prompt-opponent-status"> 
                                        {msg.promptOpponentHealthPercent !== undefined && msg.promptOpponentHealthPercent !== null 
                                            ? ` (${msg.promptOpponentHealthPercent}%)` 
                                            : ` (${msg.promptOpponentHealthStatus || 'Fighting'})`}
                                    </span>
                                </span>
                            </>
                        )}
                        </span>
                        <span className="prompt-row prompt-controls-row">
                            <PromptModeIndicators />
                            <span className="raw-prompt-suffix"> <TokenRenderer tokens={promptTokens} fallbackHtml={promptFallbackHtml} /></span>
                        </span>
                        {promptMetadataLine}
                    </span>
                ) : msg.promptHPStatus ? (
                    <span className="custom-prompt-container">
                        <span className="prompt-row prompt-vitals-row">
                            <span className="custom-prompt-prefix">[</span>
                            <span className="prompt-stat-item"><span className="prompt-stat-label">HP</span><span>{msg.promptHPStatus}</span></span>
                            <span className="prompt-stat-divider">|</span>
                            <span className="prompt-stat-item"><span className="prompt-stat-label">MANA</span><span>{msg.promptManaStatus}</span></span>
                            <span className="prompt-stat-divider">|</span>
                            <span className="prompt-stat-item"><span className="prompt-stat-label">MP</span><span>{msg.promptMoveStatus}</span></span>
                            <span className="custom-prompt-prefix">]</span>
                        {msg.promptOpponentName && (
                            <>
                                <span className="prompt-vs-label">Vs</span>
                                <span className="prompt-opponent-info">
                                    <span className="prompt-opponent-name">{msg.promptOpponentName}</span>
                                    <span className="prompt-opponent-status"> ({msg.promptOpponentHealthStatus || 'Fighting'})</span>
                                </span>
                            </>
                        )}
                        </span>
                        <span className="prompt-row prompt-controls-row">
                            <PromptModeIndicators />
                            <span className="raw-prompt-suffix"> <TokenRenderer tokens={promptTokens} fallbackHtml={promptFallbackHtml} /></span>
                        </span>
                        {promptMetadataLine}
                    </span>
                ) : (
                    <span><TokenRenderer tokens={msg.tokens} fallbackHtml={sanitizeMumeHtml(ansiConvert.toHtml(msg.textRaw || ''))} /></span>
                )
            ) : entityCountPrompt ? (
                null
            ) : msg.type === 'movement' ? (() => {
                const movement = getMovementDisplay(msg.textRaw || '');
                return (
                    <div className="content-row">
                        {timestampEl}
                        <span className="message-content">
                            You move {movement.label}.
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
                                <TokenRenderer
                                    tokens={msg.tokens}
                                    fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)}
                                    splitFirstWord={msg.isRoomName ? false : true}
                                    wordReveal={isTextRevealEnabled && isRecent && !msg.isRoomName}
                                    disableRoomInline={msg.isRoomName}
                                />
                                <ResourceGainBadge gain={msg.resourceGain} />
                                {msg.isHitImpact && sheenActive && (
                                    <div className="hit-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer
                                            tokens={msg.tokens}
                                            fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)}
                                            splitFirstWord={msg.isRoomName ? false : true}
                                            disableRoomInline={msg.isRoomName}
                                        />
                                    </div>
                                )}
                                {msg.isDamageImpact && sheenActive && (
                                    <div className="damage-sheen-overlay" aria-hidden="true">
                                        <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} splitFirstWord={msg.isRoomName ? false : true} disableRoomInline={msg.isRoomName} />
                                    </div>
                                )}
                                {msg.isRipMessage && sheenActive && (
                                    <div className="rip-sheen-overlay" aria-hidden="true">
                                    <TokenRenderer tokens={msg.tokens} fallbackHtml={msg.isRoomName && msg.tokens ? undefined : sanitizeMumeHtml(content)} splitFirstWord={msg.isRoomName ? false : true} disableRoomInline={msg.isRoomName} />
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
        isNewbieMode, showSpectatePromptInLog, sessionMode, lighting, currentTerrain, weather, roomNpcs, roomItems,
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

        if (hidePrompt) {
            list = list.filter(m => m.type !== 'prompt');
        } else {
            let lastPromptIdx = -1;
            for (let i = list.length - 1; i >= 0; i--) {
                if (list[i].type === 'prompt') {
                    lastPromptIdx = i;
                    break;
                }
            }
            if (lastPromptIdx !== -1) {
                list = list.filter((m, idx) => m.type !== 'prompt' || idx === lastPromptIdx);
            }
        }

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
    const getLiveScrollTopRef = useRef<() => number>(() => 0);

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

        const currentLiveScroll = getLiveScrollTopRef.current();
        const threshold = 60;
        const isAtLive = Math.abs(container.scrollTop - currentLiveScroll) < threshold || container.scrollTop > currentLiveScroll;
        const isScrollingUp = container.scrollTop < lastScrollTopRef.current;

        lastScrollTopRef.current = container.scrollTop;

        // Only update lock state if we aren't currently auto-scrolling
        if (viewport.isLockedToBottomRef.current !== isAtLive) {
            // If we are scrolling UP and move away from live, unlock.
            // If we are scrolling DOWN and hit the threshold, relock.
            if (isScrollingUp || isAtLive) {
                viewport.isLockedToBottomRef.current = isAtLive;
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
            if (msg.type === 'prompt') return Math.max(64, Math.ceil(viewport.logFontSizePx * 3.75 + 16));

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

    const lastCommandIdRef = React.useRef<string | number | null>(null);
    const commandAnchorOffsetRef = React.useRef<number | null>(null);
    const [containerHeight, setContainerHeight] = React.useState(600);

    React.useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        setContainerHeight(container.clientHeight);
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.height) {
                    setContainerHeight(entry.contentRect.height);
                }
            }
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, [scrollContainerRef]);

    const getLiveScrollTop = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return 0;
        const totalSize = virtualizer.getTotalSize();
        const clientHeight = container.clientHeight;

        if (commandAnchorOffsetRef.current !== null) {
            const cmdOffset = Math.max(0, commandAnchorOffsetRef.current - 12);
            const contentBelowCmd = totalSize - cmdOffset;
            // While the command and streaming response fit within the visible viewport,
            // keep the command anchored at the top!
            if (contentBelowCmd <= clientHeight - 40) {
                return cmdOffset;
            }
            // Once the response exceeds the viewport, follow the streaming bottom edge
            return Math.max(cmdOffset, totalSize - clientHeight + 40);
        }

        // Default (before any user command, spectate, or replay): follow the bottom of virtual content
        return Math.max(0, totalSize - clientHeight + 40);
    }, [virtualizer, scrollContainerRef]);

    getLiveScrollTopRef.current = getLiveScrollTop;

    useEffect(() => {
        if (viewport.targetScrollCalculatorRef) {
            viewport.targetScrollCalculatorRef.current = getLiveScrollTop;
        }
        return () => {
            if (viewport.targetScrollCalculatorRef) {
                viewport.targetScrollCalculatorRef.current = null;
            }
        };
    }, [viewport, getLiveScrollTop]);

    const lastScrollCallRef = React.useRef(0);
    const lastMessagesRef = React.useRef(messages);

    React.useLayoutEffect(() => {
        const isNewMessage = messages.length > lastMessagesRef.current.length;
        const lastMsg = messages[messages.length - 1];
        lastMessagesRef.current = messages;

        const now = Date.now();
        const isThrottled = now - lastScrollCallRef.current < 16;
        const isUserCmd = lastMsg?.type === 'user';

        if (isUserCmd && lastMsg.id !== lastCommandIdRef.current) {
            lastCommandIdRef.current = lastMsg.id;
            const offsetResult = lastUserMsgIndex >= 0 ? virtualizer.getOffsetForIndex(lastUserMsgIndex, 'start') : undefined;
            const cmdOffset = offsetResult ? offsetResult[0] : virtualizer.getTotalSize();
            commandAnchorOffsetRef.current = cmdOffset;
            viewport.isLockedToBottomRef.current = true;
            lastScrollCallRef.current = now;
            requestAnimationFrame(() => {
                viewport.scrollToBottom(true, true, 'UserCommand');
            });
        } else if (isNewMessage) {
            // In Spectate and Replay Mode, we always want to follow the action 
            // unless the user manually scrolled up.
            if (viewport.isLockedToBottomRef.current || isSpectateMode || sessionMode === 'replay') {
                viewport.isLockedToBottomRef.current = true;
                lastScrollCallRef.current = now;
                requestAnimationFrame(() => {
                    viewport.scrollToBottom(true, isSpectateMode || sessionMode === 'replay', 'NewMessage');
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
        if (lastUserMsgIndex >= 0 && lastCommandIdRef.current) {
            const offsetResult = virtualizer.getOffsetForIndex(lastUserMsgIndex, 'start');
            if (offsetResult && offsetResult[0] !== undefined) {
                commandAnchorOffsetRef.current = offsetResult[0];
            }
        }
        if (viewport.isLockedToBottomRef.current && !isUserScrollingRef.current) {
            viewport.scrollToBottom(true, true, 'VirtualizerResize');
        }
    }, [totalSize, viewport, virtualizer, lastUserMsgIndex]);

    const spacerHeight = useMemo(() => {
        if (commandAnchorOffsetRef.current === null) return 30;
        const contentBelowCmd = totalSize - commandAnchorOffsetRef.current;
        return Math.max(30, Math.ceil(containerHeight - contentBelowCmd + 20));
    }, [containerHeight, totalSize]);

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
                                    isOldBatchDim={brightBatchFloor !== undefined && (msg.batchId === undefined || msg.batchId < brightBatchFloor)}
                                    isTimestampEnabled={isTimestampEnabled}
                                    isNewbieMode={isNewbieMode}
                                    viewport={viewport}
                                    isTextRevealEnabled={isTextRevealEnabled}
                                    isAwaitingResponse={msg.type === 'user' && msg.id === awaitingResponseUserId}
                                    batchOffset={batchOffset}
                                    colors={colors}
                                    lighting={lighting}
                                    currentTerrain={currentTerrain}
                                    weather={weather}
                                    roomNpcs={roomNpcs}
                                    roomItems={roomItems}
                                />
                            </div>
                        );
                    });
                    })()}
                </div>
                <div className="log-bottom-spacer" ref={messagesEndRef} style={{ height: `${spacerHeight}px`, flexShrink: 0 }} />
            </div>
        </div>
    );
};

export default React.memo(MessageLog);
