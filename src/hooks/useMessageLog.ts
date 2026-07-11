import { useCallback, useRef, useEffect, useMemo } from 'react';
import { MessageType, Message } from '../types';
import { useMessageStore } from '../stores/useMessageStore';
import { ansiConvert } from '../utils/ansi';
import { isEnvironmentEventLine } from '../utils/environmentEventUtils';
import { hasXmlTag } from '../utils/xmlTagUtils';

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

import { ARRIVE_REGEX, LEAVE_REGEX } from '../utils/highlighterUtils';
import { noteArrivalText, noteDepartureText, normalizeArrivalDir } from '../utils/followerSync';
export const NPC_LINE_REGEX = /^((?:A|An|The|Some)?\s*[\w\s,-]+?'?s?)\s+(\w+s)\b\s*(.*)$/i;

export const ROOM_EXIT_REGEX = /^(North|South|East|West|Up|Down|North|Southwest|Northeast|Southwest|Southeast)\s+-\s+/i;

export const MOVE_FAILURE_REGEX = /^(The .+ seems to be closed\.|Alas, you cannot go that way\.|You can't go there\.|You are too exhausted\.|You cannot go that way\.|It's closed\.|You can't see to go that way\.|You need a boat\.|It's too dark\.)/i;

// Classify a room-contents line into a section using the highlighter's entity
// categories (the same data that colors the inline entities), so the log card
// can group objects / NPCs / players / exits with dividers.
export type RoomSection = 'objects' | 'mobs' | 'players' | 'exits';
const ROOM_OBJECT_CATS = new Set(['cat-room-object', 'cat-inventory-object', 'cat-worn-object', 'cat-object', 'cat-container-item']);
const ROOM_MOB_CATS = new Set(['cat-npc', 'cat-enemy', 'cat-neutral']);
const ROOM_PLAYER_CATS = new Set(['cat-ally', 'cat-ally-remote']);

const classifyRoomSection = (m: Message): RoomSection | null => {
    const t = (m.textRaw || '').replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (ROOM_EXIT_REGEX.test(t) || /^obvious exits\b/i.test(t) ||
        /^\((?:up|down|north|south|east|west|northeast|northwest|southeast|southwest)\)/i.test(t)) {
        return 'exits';
    }
    let hasPlayer = false, hasMob = false, hasObject = false;
    for (const tok of (m.tokens || [])) {
        if (tok.type !== 'entity') continue;
        const c = (tok as any).metadata?.category as string | undefined;
        if (!c) continue;
        if (c === 'cat-exit') return 'exits';
        if (ROOM_PLAYER_CATS.has(c)) hasPlayer = true;
        else if (ROOM_MOB_CATS.has(c)) hasMob = true;
        else if (ROOM_OBJECT_CATS.has(c)) hasObject = true;
    }
    if (hasPlayer) return 'players';
    if (hasMob) return 'mobs';
    if (hasObject) return 'objects';
    return null;
};

// A message is a valid "trigger" line for a resource gain if it's real game output —
// not a prompt, echoed command, system notice, comm/social line, blank line, or a
// meta status/weather/movement line.
const isResourceGainTriggerLine = (m: Message): boolean =>
    !m.isEmpty &&
    m.type !== 'prompt' && m.type !== 'user' && m.type !== 'system' &&
    m.type !== 'weather' && m.type !== 'gmcp-event' && m.type !== 'movement' &&
    m.type !== 'status-event' &&
    !m.isComm && !m.isSocial;

// Fold queued gains (summed per kind) onto a message's resourceGain badge.
const mergeResourceGains = <T extends Message>(m: T, gains: import('../types').ResourceGain[]): T => {
    let resourceGain = m.resourceGain;
    for (const g of gains) {
        if (!g || g.amount <= 0) continue;
        resourceGain = resourceGain && resourceGain.kind === g.kind
            ? { ...resourceGain, amount: resourceGain.amount + g.amount }
            : g;
    }
    return resourceGain === m.resourceGain ? m : { ...m, resourceGain } as T;
};

// ---------------------------------------------------------------------------
let lastVibrateTime = 0;
const USER_LOG_MESSAGE_LIMIT = 500;
const SPECTATE_LOG_MESSAGE_LIMIT = Number.POSITIVE_INFINITY;

export function useMessageLog(
    inCombatRef: React.RefObject<boolean>,
    roomContext: {
        players: import('../types').GmcpOccupant[],
        npcs: import('../types').GmcpOccupant[],
        items: import('../types').GmcpOccupant[],
        roomName?: string | null,
        roomDesc?: string | null,
        terrain?: string | null,
        roomNum?: number | null
    },
    lastCommIdBySenderRef: React.MutableRefObject<Map<string, string>>,
    isNewbieMode: boolean,
    recordEntry?: (type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any) => void,
    roomDescRef?: React.RefObject<string | null>,
    pendingMove?: { dir: string; timestamp: number } | null,
    setPendingMove?: (val: { dir: string; timestamp: number } | null) => void,
    isAccountModeRef?: React.RefObject<boolean>,
    playCommMessageSound?: () => void,
    isSpectateSession?: boolean
) {
    const messageLimit = isSpectateSession ? SPECTATE_LOG_MESSAGE_LIMIT : USER_LOG_MESSAGE_LIMIT;
    const setMessages = isSpectateSession
        ? useMessageStore.getState().setSpectateMessages
        : useMessageStore.getState().setUserMessages;
    const clearStoreMessages = isSpectateSession
        ? useMessageStore.getState().clearSpectateMessages
        : useMessageStore.getState().clearUserMessages;
    const lastMessageRef = useRef<Message | null>(null);
    const messageBufferRef = useRef<Message[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Tracks every mid that has been committed to the buffer or state. Used for
    // deduplication instead of `messages.some(...)` which captures a stale closure.
    const addedMidSetRef = useRef<Set<string>>(new Set());

    const batchIdRef = useRef(0);

    // Resource gains (XP/TP) arrive via GMCP, sometimes just *before* the combat line
    // that earned them. We queue them and attach to the next action line that flushes;
    // a short fallback timer covers the tail case (last kill with no line after it).
    const pendingGainsRef = useRef<import('../types').ResourceGain[]>([]);
    const pendingGainTimerRef = useRef<NodeJS.Timeout | null>(null);

    const isCombatLine = useCallback((text: string) => {
        const lower = text.toLowerCase();
        return lower.includes(' hits ') || lower.includes(' misses ') || 
               lower.includes(' scratches ') || lower.includes(' bruises ') || 
               lower.includes(' smashes ') || lower.includes(' cleaves ') || 
               lower.includes(' pierces ') || lower.includes(' crushes ') ||
               lower.includes(' massacres ') || lower.includes(' obliterates ') ||
               lower.includes(' stabs ') || lower.includes(' slashes ') ||
               lower.includes(' whips ') || lower.includes(' blasts ') ||
               lower.includes(' stings ') || lower.includes(' fails to ') ||
               lower.includes(' strongly ') || lower.includes(' barely ');
    }, []);

    const flushMessages = useCallback(() => {
        if (messageBufferRef.current.length === 0) return;

        batchIdRef.current += 1;
        const currentBatchId = batchIdRef.current;

        const hasRoomInBatch = messageBufferRef.current.some(m => m.isRoomName);
        const containsPrompt = messageBufferRef.current.some(m => m.type === 'prompt');
        
        let pending = messageBufferRef.current.map((m, idx) => {
            const prev = idx > 0 ? messageBufferRef.current[idx - 1] : lastMessageRef.current;
            const isRoomBlockStart = m.isRoomBlock && (!prev || !prev.isRoomBlock);
            const isCombatMsg = !!(m.isHitImpact || m.isDamageImpact || m.isAvoidDamageImpact || m.isMissImpact);
            const prevIsCombatMsg = prev ? !!(prev.isHitImpact || prev.isDamageImpact || prev.isAvoidDamageImpact || prev.isMissImpact) : false;
            const isCombatBlockStart = isCombatMsg && !prevIsCombatMsg;
            const isSocialMsg = !!m.isSocial;
            const prevIsSocialMsg = prev ? !!prev.isSocial : false;
            const isCommMsg = !!m.isComm && !isSocialMsg;
            const prevIsCommMsg = prev ? !!prev.isComm && !prev.isSocial : false;
            const isCommBlockStart = isCommMsg && !prevIsCommMsg;
            const isSocialBlockStart = isSocialMsg && !prevIsSocialMsg;
            const isWeatherMsg = m.type === 'weather' || m.type === 'gmcp-event' || isEnvironmentEventLine(m.textOnly || m.textRaw);
            const prevIsWeatherMsg = prev ? prev.type === 'weather' || prev.type === 'gmcp-event' || isEnvironmentEventLine(prev.textOnly || prev.textRaw) : false;
            const isWeatherBlockStart = isWeatherMsg && !prevIsWeatherMsg;
            const isMovementMsg = m.type === 'movement';
            const prevIsMovementMsg = prev ? prev.type === 'movement' : false;
            const isMovementBlockStart = isMovementMsg && !prevIsMovementMsg;
            const isStatusMsg = m.type === 'status-event' || hasXmlTag(m.textRaw, 'status');
            const prevIsStatusMsg = prev ? prev.type === 'status-event' || hasXmlTag(prev.textRaw, 'status') : false;
            const isStatusBlockStart = isStatusMsg && !prevIsStatusMsg;
            return {
                ...m,
                batchId: currentBatchId,
                inRoomBatch: hasRoomInBatch,
                isRoomBlockStart,
                isCombatBlockStart,
                isCommBlockStart,
                isSocialBlockStart,
                isWeatherBlockStart,
                isMovementBlockStart,
                isStatusBlockStart
            };
        });

        // Attach any queued resource gains (GMCP arrived just before this text) to the
        // first real action line in this batch — the line that actually earned them.
        if (pendingGainsRef.current.length > 0) {
            const idx = pending.findIndex(isResourceGainTriggerLine);
            if (idx !== -1) {
                pending[idx] = mergeResourceGains(pending[idx], pendingGainsRef.current);
                pendingGainsRef.current = [];
                if (pendingGainTimerRef.current) {
                    clearTimeout(pendingGainTimerRef.current);
                    pendingGainTimerRef.current = null;
                }
            }
        }

        // Extend the room block to cover the room's contents (mob/player/object/
        // exit lines) that immediately follow the room name in this batch, so the
        // log can render the whole room as one card with a divider before the
        // contents. We stop at the prompt or any non-room line (comm/combat/etc).
        const roomNameIdx = pending.findIndex(m => m.isRoomName);
        if (roomNameIdx !== -1) {
            const roomBlockTerrain = pending[roomNameIdx].terrain;
            // Description lines sometimes arrive as separate (unmerged) game lines.
            // Use the known GMCP room description to keep those in the description
            // section so the divider lands before the actual contents, not the desc.
            const roomDescNorm = ((roomDescRef && roomDescRef.current) || roomContext.roomDesc || '')
                .replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
            let markedContentsStart = false;
            let prevSection: RoomSection | null = null;
            for (let i = roomNameIdx + 1; i < pending.length; i++) {
                const m = pending[i];
                if (
                    m.type === 'prompt' || m.type === 'user' || m.type === 'snoop-command' ||
                    m.type === 'weather' || m.type === 'gmcp-event' || m.type === 'movement' ||
                    m.type === 'status-event' || hasXmlTag(m.textRaw, 'status') ||
                    isEnvironmentEventLine(m.textOnly || m.textRaw) || m.isComm || m.isSocial || m.isCombat
                ) break;
                const lineNorm = (m.textRaw || '')
                    .replace(/\x1b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
                const isDescLine = !!roomDescNorm && lineNorm.length >= 6 && roomDescNorm.includes(lineNorm);
                const isContents = !m.isEmpty && !isDescLine;

                // Group contents into sections (objects / NPCs / players / exits)
                // and flag the first line of each section so the card can draw a
                // labelled divider between the groups.
                let roomSection: RoomSection | undefined;
                let isRoomSectionStart = false;
                if (isContents) {
                    const section = classifyRoomSection(m) || prevSection || 'objects';
                    isRoomSectionStart = section !== prevSection;
                    prevSection = section;
                    roomSection = section;
                }

                // Everything from the first contents line onward (including any
                // trailing blank lines before the prompt) gets the solid panel so
                // the bottom of the card fills in rather than showing the map.
                const isRoomContentsLine = isContents || markedContentsStart;

                pending[i] = {
                    ...m,
                    isRoomBlock: true,
                    terrain: m.terrain ?? roomBlockTerrain,
                    isRoomContentsStart: !markedContentsStart && isContents,
                    isRoomContentsLine,
                    roomSection,
                    isRoomSectionStart
                };
                if (isContents) markedContentsStart = true;
            }
        }

        if (containsPrompt) {
            let lastRoomIdx = -1;
            for (let i = pending.length - 1; i >= 0; i--) {
                if (pending[i].isRoomBlock) {
                    lastRoomIdx = i;
                    break;
                }
            }
            if (lastRoomIdx !== -1) {
                pending[lastRoomIdx].isRoomBlockEnd = true;
            }
        }

        messageBufferRef.current = [];
        const ordered: Message[] = pending;
        
        if (ordered.length > 0) ordered[ordered.length - 1] = { ...ordered[ordered.length - 1], isBatchEnd: true };
        // Register all flushed mids before committing to state so deduplication
        // is current even before the next render cycle.
        ordered.forEach(m => { if (m.id) addedMidSetRef.current.add(m.id); });

        setMessages(prev => {
            const nextMessages = [...prev, ...ordered];
            if (nextMessages.length >= messageLimit) {
                const trimmed = nextMessages.slice(nextMessages.length - messageLimit);
                // Remove evicted IDs from the set so it stays bounded.
                const kept = new Set(trimmed.map(m => m.id).filter(Boolean));
                addedMidSetRef.current.forEach(id => { if (!kept.has(id)) addedMidSetRef.current.delete(id); });
                return trimmed;
            }
            return nextMessages;
        });
        flushTimeoutRef.current = null;
    }, [messageLimit]);

    const addMessage = useCallback((
        type: MessageType,
        text: string,
        extra?: any,           // Maps to combatOverride
        mid?: string,          // Maps to cmd
        isRoomName?: boolean,  // Maps to context
        precalculated?: { textOnly: string, lower: string, html?: string, tokens?: any[] }, // Maps to htmlProps
        _shopItem?: any,       // Maps to sender (unused — shop system removed)
        practiceSkill?: any,   // Maps to channel
        practiceHeader?: any,  // Maps to id
        isSystem: boolean = false, // Maps to isSystem
        replyTarget?: string,
        replyCommand?: string,
        commSender?: string,
        commAction?: string,
        commText?: string,
        commColor?: string,
        commSenderTokens?: import('../types').Token[],
        commTextTokens?: import('../types').Token[],
        providedCombatSide?: 'player' | 'opponent' | 'groupmate',
        providedIsHitImpact?: boolean,
        providedIsDamageImpact?: boolean,
        providedIsAvoidDamageImpact?: boolean,
        providedIsMissImpact?: boolean,
        providedIsHitterImpact?: boolean,
        providedIsSnoop?: boolean,
        providedIsSnoopInput?: boolean,
        providedIsRipMessage?: boolean,
        providedIsSocial?: boolean,
        resourceGain?: import('../types').ResourceGain
    ) => {
        const combatOverride = extra === true || (typeof extra === 'object' && extra?.isCombat);
        let currentText = text;
        let currentTextOnly = precalculated?.textOnly || text.replace(/\x1b\[[0-9;]*m/g, '').trim();
        let currentTextLower = precalculated?.lower || currentTextOnly.toLowerCase();

        // If combatOverride is provided directly (from parser), trust it.
        // The parser handles inCombat context for ambiguous verbs like 'dodge'.
        const isCombat = !!combatOverride;
        const combatSide = isCombat
            ? (providedCombatSide || ((currentTextLower.startsWith('you ') || currentTextLower.startsWith('your ')) ? 'player' : 'opponent'))
            : undefined;
        const isTaggedSocial = /<(social|emote)(?:\s+[^>]*)?>/i.test(currentText) ||
            /<(social|emote)(?:\s+[^>]*)?>/i.test(String(precalculated?.html || ''));
        const isSocial = !!providedIsSocial || isTaggedSocial;
        const isComm = type === 'comm' || !!replyCommand || isSocial;
        const isNarrate = currentTextLower.includes('narrate') || replyCommand === 'narrate';
        const curRoom = roomContext.roomName;
        const curDesc = roomContext.roomDesc;
        const commRoomKey = roomContext.roomNum ? `#${roomContext.roomNum}` : (curRoom || undefined);
        const commRoomName = curRoom || undefined;

        // --- Removed Surgical Silence (Newbie Mode) ---
        // We no longer strip descriptions or fragments from the log.
        // This ensures a raw, consistent terminal experience as requested.

        // Only suppress the line if it exactly matches the authoritative GMCP room name.
        // We no longer use ANSI color heuristics — those caused too many false positives.
        const isActuallyRoomName = !isCombat && !isComm && type !== 'room-description' && type !== 'prompt' && (
            isRoomName === true ||
            (!providedIsSnoop && curRoom && !replyCommand && (
                currentTextOnly === curRoom ||
                currentTextLower === curRoom.toLowerCase() ||
                currentTextOnly === curRoom + '.' ||
                currentTextLower === curRoom.toLowerCase() + '.'
            ))
        );

        if (!providedIsSnoop && (currentTextLower === 'you are hungry.' || currentTextLower === 'you are thirsty.')) {
            return;
        }

        const arriveMatch = currentTextOnly.match(ARRIVE_REGEX);
        const leaveMatch = currentTextOnly.match(LEAVE_REGEX);
        const isArriveLeave = !!arriveMatch ||
            !!leaveMatch ||
            currentTextLower.includes('arrives from') ||
            currentTextLower.includes('has arrived from') ||
            currentTextLower.includes(' leaves ') ||
            currentTextLower.includes(' leave ') ||
            currentTextLower.includes(' flees ') ||
            currentTextLower.includes(' flee ') ||
            currentTextLower.includes(' fled ');

        // Bridge text-only arrival/departure into roomChars when GMCP is silent
        // (e.g. mounts/followers walking in alongside the player). The followerSync
        // module debounces; if a real Room.Chars.Add/Remove arrives in 200ms it wins.
        if (!providedIsSnoop) {
            if (arriveMatch && arriveMatch[1]) {
                const dir = normalizeArrivalDir(arriveMatch[4]);
                noteArrivalText(arriveMatch[1].trim(), dir);
            } else if (leaveMatch && leaveMatch[1]) {
                noteDepartureText(leaveMatch[1].trim());
            }
        }

        const isLiveEvent = isCombat || isComm || isArriveLeave || type === 'user';



        if (isActuallyRoomName) {
            // Room name detected
        }

        // --- Removed Room Description Suppression ---
        // Descriptions are now always rendered in the log for a raw experience.


        // Description logic

        const isUrgent = isArriveLeave ||
            currentTextLower.includes('strange incantations') ||
            currentTextLower.includes('utters the words') ||
            currentTextLower.includes('is dead! r.i.p.') ||
            currentTextLower.includes('is standing.') ||
            currentTextLower.includes('is sitting.') ||
            currentTextLower.includes('is resting.') ||
            currentTextLower.includes('is sleeping.');

        // Final Type Polish: If this looks like a prompt, force it to 'prompt'
        // This ensures the black background is applied correctly even if the socket 
        // sent it as part of a game-text batch.
        let finalType = type;
        if (currentTextOnly.startsWith('!') || currentTextOnly.startsWith('*') || currentTextOnly.startsWith(':') || currentTextOnly.includes('[>')) {
            if (currentTextOnly.trim().length < 15 && currentTextOnly.includes('>')) finalType = 'prompt';
        }

        const dimmedInCombat = inCombatRef.current && !isCombat && !isUrgent;

        const lastMsg = lastMessageRef.current;
        const targetMid = mid;
        const canContinue = type === 'comm-continue' && lastMsg && (lastMsg.type === 'comm' || lastMsg.isComm) &&
            (!commSender || lastMsg.commSender === commSender);

        if (isComm && playCommMessageSound && !canContinue) {
            playCommMessageSound();
        }

        if (canContinue) {
            const currentMsgText = lastMsg.commText || '';
            const needsSpace = currentMsgText.length > 0 &&
                !currentMsgText.endsWith('-') &&
                !currentMsgText.endsWith(' ') &&
                !/^[.,!?;'"]/.test(commText || '');

            const updatedMsg: Message = {
                ...lastMsg,
                commText: currentMsgText + (needsSpace ? ' ' : '') + (commText || ''),
                commTextTokens: lastMsg.commTextTokens ? [...lastMsg.commTextTokens, ...(commTextTokens || [])] : commTextTokens,
                timestamp: Date.now()
            };

            // If we have a specific targetMid, use it to find and update the correct message
            const actualId = targetMid || lastMsg.id;
            lastMessageRef.current = updatedMsg;
            if (messageBufferRef.current.length > 0) {
                const idx = messageBufferRef.current.findIndex(m => m.id === actualId);
                if (idx !== -1) messageBufferRef.current[idx] = updatedMsg;
                else setMessages(prev => prev.map(m => m.id === actualId ? updatedMsg : m));
            } else {
                setMessages(prev => prev.map(m => m.id === actualId ? updatedMsg : m));
            }
            return;
        }

        // Room description lines are merged into the preceding room-name message
        // so they render as one unified DOM element with no subpixel gaps.
        if (type === 'room-description') {
            const descHtml = ansiConvert.toHtml(text);
            const buffer = messageBufferRef.current;
            
            let lastRoomIdx = -1;
            for (let i = buffer.length - 1; i >= 0; i--) {
                if (buffer[i].isRoomName) {
                    lastRoomIdx = i;
                    break;
                }
            }
            
            if (lastRoomIdx !== -1) {
                // Case 1: Room name is still in the pending buffer
                buffer[lastRoomIdx] = {
                    ...buffer[lastRoomIdx],
                    html: buffer[lastRoomIdx].html + `<div class="room-desc-line">${descHtml}</div>`,
                };
                lastMessageRef.current = buffer[lastRoomIdx];
                if (!flushTimeoutRef.current) {
                    flushTimeoutRef.current = requestAnimationFrame(flushMessages) as unknown as NodeJS.Timeout;
                }
            } else {
                // Case 2: Room name has already been flushed to the messages state
                setMessages(prev => {
                    const lastRoomStateIdx = [...prev].reverse().findIndex(m => m.isRoomName);
                    if (lastRoomStateIdx === -1) return prev;
                    
                    const actualIdx = (prev.length - 1) - lastRoomStateIdx;
                    const next = [...prev];
                    next[actualIdx] = {
                        ...next[actualIdx],
                        html: next[actualIdx].html + `<div class="room-desc-line">${descHtml}</div>`,
                    };
                    return next;
                });
            }
            return;
        }




        let processedText = currentText;
        const isEmpty = currentTextOnly.length === 0;


        const rawHtml = (precalculated as any)?.html;
        const html = (typeof rawHtml === 'string' ? rawHtml : rawHtml?.html) || ansiConvert.toHtml(processedText);
        const tokens = precalculated?.tokens || (typeof rawHtml === 'object' ? rawHtml?.tokens : undefined);        // Record the message for replay
        if (recordEntry) {
            recordEntry('rx', {
                type: finalType,
                text: processedText,
                html,
                tokens,
                mid,
                isCombat,
                isComm,
                isSocial,
                isNarrate,
                isRoomName: isActuallyRoomName,
                terrain: isActuallyRoomName ? roomContext.terrain : undefined,
                commSender,
                commAction,
                commText,
                commColor,
                resourceGain
            });
        }

        const isWelcomeBlock = !providedIsSnoop && (
            currentTextLower.includes('***  mume ix') ||
            currentTextLower.includes('*** mume ix') ||
            currentTextLower.includes('in progress at fire') ||
            currentTextLower.includes('free internet roleplay experiences') ||
            currentTextLower.includes("hosted at heig-vd") ||
            currentTextLower.includes("tolkien's middle-earth") ||
            currentTextLower.includes('maintained by cryhavoc') ||
            currentTextLower.includes('original code dikumud') ||
            currentTextLower.includes('s. hammer, t. madsen') ||
            currentTextLower.includes('if you have never played mume before') ||
            currentTextLower.includes('type new to create a new character') ||
            currentTextLower.includes('or ? for help.') ||
            currentTextLower.includes('by what name')
        );

        const isWelcomeTitle = isWelcomeBlock && currentTextLower.includes('***');

        const msg: Message = {
            id: mid || Math.random().toString(36).substring(7),
            html,
            tokens,
            textRaw: processedText,
            type: finalType,
            timestamp: Date.now(),
            isCombat,
            combatSide,
            dimmedInCombat,
            isUrgent,
            isEmpty,
            isWelcomeBlock,
            isWelcomeTitle,
            isComm,
            isSocial,
            replyTarget,
            replyCommand,
            isRoomName: isActuallyRoomName,
            terrain: isActuallyRoomName ? roomContext.terrain : undefined,
            isRoomBlock: isActuallyRoomName,
            isRoomBlockStart: isActuallyRoomName,
            isNarrate,
            practiceSkill,
            practiceHeader,
            commSender,
            commAction,
            commText,
            commColor,
            commRoomKey,
            commRoomName,
            commSenderTokens,
            commTextTokens,
            isHitImpact: providedIsHitImpact,
            isDamageImpact: providedIsDamageImpact,
            isAvoidDamageImpact: providedIsAvoidDamageImpact,
            isMissImpact: providedIsMissImpact,
            isHitterImpact: providedIsHitterImpact,
            isSnoop: providedIsSnoop,
            isSnoopInput: providedIsSnoopInput,
            isRipMessage: providedIsRipMessage,
            resourceGain
        };

        if (isCombat) {
            // Throttled haptic feedback for combat to avoid browser API spam
            try {
                const now = Date.now();
                if (window.navigator?.vibrate && now - lastVibrateTime > 150) {
                    window.navigator.vibrate(15);
                    lastVibrateTime = now;
                }
            } catch (e) { }
        }

        if (type === 'user') {
            // Drain any buffered server data first (from prior commands), then append the
            // user command immediately. This ensures consistent ordering: lingering server
            // output always precedes the new user command, and future server responses
            // (which haven't arrived yet) will be batched and rendered below it.
            if (flushTimeoutRef.current) {
                cancelAnimationFrame(flushTimeoutRef.current as unknown as number);
                flushTimeoutRef.current = null;
            }
            const drained = messageBufferRef.current.splice(0);

            // Deduplicate: if an ID is provided, ensure it's not already in the log
            if (mid) {
                if (addedMidSetRef.current.has(mid) || drained.some(m => m.id === mid)) return;
            }

            lastMessageRef.current = msg;
            if (mid) addedMidSetRef.current.add(mid);
            setMessages(prev => {
                const nextMessages = [...prev, ...drained, msg];
                return nextMessages.length >= messageLimit ? nextMessages.slice(nextMessages.length - messageLimit) : nextMessages;
            });
        } else {
            // Deduplicate: if an ID is provided, ensure it's not already in the buffer or state.
            // addedMidSetRef is always current (no stale closure), unlike messages state.
            if (mid) {
                if (addedMidSetRef.current.has(mid)) return;
            }

            lastMessageRef.current = msg;
            if (mid) addedMidSetRef.current.add(mid);
            messageBufferRef.current.push(msg);

            if (!flushTimeoutRef.current) {
                // Adaptive delay instead of a fixed 50ms, relying on requestAnimationFrame
                // to give the browser time to paint, but processing sooner.
                flushTimeoutRef.current = requestAnimationFrame(flushMessages) as unknown as NodeJS.Timeout;
            }
        }
    }, [inCombatRef, setMessages, flushMessages, roomContext, isAccountModeRef, playCommMessageSound, messageLimit]);

    const clearLog = useCallback(() => {
        messageBufferRef.current = [];
        addedMidSetRef.current.clear();
        if (flushTimeoutRef.current) {
            cancelAnimationFrame(flushTimeoutRef.current as unknown as number);
            flushTimeoutRef.current = null;
        }
        clearStoreMessages();
    }, [clearStoreMessages]);

    const addSystemMessage = useCallback((text: string) => {
        const msg: Message = {
            id: Math.random().toString(36).substring(7),
            type: 'system',
            html: text,
            textRaw: text,
            timestamp: Date.now(),
            isUrgent: true
        };
        setMessages(prev => {
            const nextMessages = [...prev, msg];
            return nextMessages.length >= messageLimit ? nextMessages.slice(nextMessages.length - messageLimit) : nextMessages;
        });
    }, [setMessages, messageLimit]);

    // Fallback: attach any still-unclaimed gains to the most recent action line
    // already in the buffer or committed store. Used when no new text line follows
    // the gain (e.g. the final kill of a fight), so the badge doesn't wait forever.
    const flushPendingGainsToLast = useCallback(() => {
        const gains = pendingGainsRef.current;
        if (gains.length === 0) return;
        pendingGainsRef.current = [];

        const buf = messageBufferRef.current;
        for (let i = buf.length - 1; i >= 0; i--) {
            if (isResourceGainTriggerLine(buf[i])) {
                buf[i] = mergeResourceGains(buf[i], gains);
                return;
            }
        }
        setMessages(prev => {
            for (let i = prev.length - 1; i >= 0; i--) {
                if (isResourceGainTriggerLine(prev[i])) {
                    const copy = prev.slice();
                    copy[i] = mergeResourceGains(prev[i], gains);
                    return copy;
                }
            }
            return prev;
        });
    }, [setMessages]);

    // Queue a resource gain (XP/TP) to be badged onto the line that earned it. On this
    // server the GMCP gain often arrives just before that line, so we wait for the next
    // action line to flush; if none comes within the window, we fall back to the last line.
    const registerPendingResourceGain = useCallback((gain: import('../types').ResourceGain) => {
        if (!gain || gain.amount <= 0) return;
        const arr = pendingGainsRef.current;
        const existing = arr.find(g => g.kind === gain.kind);
        if (existing) existing.amount += gain.amount;
        else arr.push({ ...gain });

        if (pendingGainTimerRef.current) clearTimeout(pendingGainTimerRef.current);
        pendingGainTimerRef.current = setTimeout(() => {
            pendingGainTimerRef.current = null;
            flushPendingGainsToLast();
        }, 400);
    }, [flushPendingGainsToLast]);

    return useMemo(() => ({
        addMessage,
        addSystemMessage,
        registerPendingResourceGain,
        flushMessages,
        isCombatLine,
        clearLog
    }), [
        addMessage, addSystemMessage, registerPendingResourceGain, flushMessages, isCombatLine, clearLog
    ]);
}
