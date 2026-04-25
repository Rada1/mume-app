import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MessageType, Message } from '../types';
import { ansiConvert } from '../utils/ansi';

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

import { ARRIVE_REGEX, LEAVE_REGEX } from '../utils/highlighterUtils';
export const NPC_LINE_REGEX = /^((?:A|An|The|Some)?\s*[\w\s,-]+?'?s?)\s+(\w+s)\b\s*(.*)$/i;

export const ROOM_EXIT_REGEX = /^(North|South|East|West|Up|Down|North|Southwest|Northeast|Southwest|Southeast)\s+-\s+/i;

export const MOVE_FAILURE_REGEX = /^(The .+ seems to be closed\.|Alas, you cannot go that way\.|You can't go there\.|You are too exhausted\.|You cannot go that way\.|It's closed\.|You can't see to go that way\.|You need a boat\.|It's too dark\.)/i;

// ---------------------------------------------------------------------------
let lastVibrateTime = 0;

export function useMessageLog(
    inCombatRef: React.RefObject<boolean>,
    roomContext: {
        players: import('../types').GmcpOccupant[],
        npcs: import('../types').GmcpOccupant[],
        items: import('../types').GmcpOccupant[],
        roomName?: string | null,
        roomDesc?: string | null
    },
    lastCommIdBySenderRef: React.MutableRefObject<Map<string, string>>,
    isNewbieMode: boolean,
    recordEntry?: (type: 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys', data: any) => void,
    roomDescRef?: React.RefObject<string | null>,
    pendingMove?: { dir: string; timestamp: number } | null,
    setPendingMove?: (val: { dir: string; timestamp: number } | null) => void,
    isAccountModeRef?: React.RefObject<boolean>,
    playCommMessageSound?: () => void
) {
    const [messages, setMessages] = useState<Message[]>([]);
    const lastMessageRef = useRef<Message | null>(null);
    const messageBufferRef = useRef<Message[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Tracks every mid that has been committed to the buffer or state. Used for
    // deduplication instead of `messages.some(...)` which captures a stale closure.
    const addedMidSetRef = useRef<Set<string>>(new Set());

    const batchIdRef = useRef(0);

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
            return { ...m, batchId: currentBatchId, inRoomBatch: hasRoomInBatch, isRoomBlockStart };
        });

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
        const nonPrompts = pending.filter(m => m.type !== 'prompt');
        const prompts = pending.filter(m => m.type === 'prompt');
        const ordered = nonPrompts.length > 0 ? [...nonPrompts, ...prompts] : pending;
        if (ordered.length > 0) ordered[ordered.length - 1] = { ...ordered[ordered.length - 1], isBatchEnd: true };
        // Register all flushed mids before committing to state so deduplication
        // is current even before the next render cycle.
        ordered.forEach(m => { if (m.id) addedMidSetRef.current.add(m.id); });

        setMessages(prev => {
            const nextMessages = [...prev, ...ordered];
            if (nextMessages.length >= 500) {
                const trimmed = nextMessages.slice(nextMessages.length - 500);
                // Remove evicted IDs from the set so it stays bounded.
                const kept = new Set(trimmed.map(m => m.id).filter(Boolean));
                addedMidSetRef.current.forEach(id => { if (!kept.has(id)) addedMidSetRef.current.delete(id); });
                return trimmed;
            }
            return nextMessages;
        });
        flushTimeoutRef.current = null;
    }, []);

    const addMessage = useCallback((
        type: MessageType,
        text: string,
        extra?: any,           // Maps to combatOverride
        mid?: string,          // Maps to cmd
        isRoomName?: boolean,  // Maps to context
        precalculated?: { textOnly: string, lower: string, html?: string, tokens?: any[] }, // Maps to htmlProps
        shopItem?: any,        // Maps to sender
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
        providedIsHitterImpact?: boolean,
        providedIsSnoop?: boolean,
        providedIsSnoopInput?: boolean
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
        const isComm = type === 'comm' || !!replyCommand;
        const isNarrate = currentTextLower.includes('narrate') || replyCommand === 'narrate';
        const curRoom = roomContext.roomName;
        const curDesc = roomContext.roomDesc;

        // --- Removed Surgical Silence (Newbie Mode) ---
        // We no longer strip descriptions or fragments from the log.
        // This ensures a raw, consistent terminal experience as requested.

        // Only suppress the line if it exactly matches the authoritative GMCP room name.
        // We no longer use ANSI color heuristics — those caused too many false positives.
        const isActuallyRoomName = !isCombat && !isComm && type !== 'room-description' && type !== 'prompt' && (
            isRoomName === true ||
            (curRoom && !replyCommand && (
                currentTextOnly === curRoom ||
                currentTextLower === curRoom.toLowerCase() ||
                currentTextOnly === curRoom + '.' ||
                currentTextLower === curRoom.toLowerCase() + '.'
            ))
        );

        if (currentTextLower === 'you are hungry.' || currentTextLower === 'you are thirsty.') {
            return;
        }

        const isArriveLeave = ARRIVE_REGEX.test(currentTextOnly) ||
            LEAVE_REGEX.test(currentTextOnly) ||
            currentTextLower.includes('arrives from') ||
            currentTextLower.includes('has arrived from') ||
            currentTextLower.includes(' leaves ') ||
            currentTextLower.includes(' leave ') ||
            currentTextLower.includes(' flees ') ||
            currentTextLower.includes(' flee ') ||
            currentTextLower.includes(' fled ');

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
                    flushTimeoutRef.current = setTimeout(flushMessages, 50);
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
        const tokens = precalculated?.tokens || (typeof rawHtml === 'object' ? rawHtml?.tokens : undefined);

        // Record the message for replay
        if (recordEntry) {
            recordEntry('rx', {
                type: finalType,
                text: processedText,
                html,
                tokens,
                mid,
                isCombat,
                isComm,
                isNarrate,
                isRoomName: isActuallyRoomName,
                commSender,
                commAction,
                commText,
                commColor
            });
        }

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
            isComm,
            replyTarget,
            replyCommand,
            isRoomName: isActuallyRoomName,
            isRoomBlock: isActuallyRoomName,
            isRoomBlockStart: isActuallyRoomName,
            isNarrate,
            shopItem,
            practiceSkill,
            practiceHeader,
            commSender,
            commAction,
            commText,
            commColor,
            commSenderTokens,
            commTextTokens,
            isHitImpact: providedIsHitImpact,
            isHitterImpact: providedIsHitterImpact,
            isSnoop: providedIsSnoop,
            isSnoopInput: providedIsSnoopInput
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
                clearTimeout(flushTimeoutRef.current);
                flushTimeoutRef.current = null;
            }
            const buffered = messageBufferRef.current.splice(0);
            const nonPrompts = buffered.filter(m => m.type !== 'prompt');
            const prompts = buffered.filter(m => m.type === 'prompt');
            const drained = nonPrompts.length > 0 ? [...nonPrompts, ...prompts] : buffered;

            // Deduplicate: if an ID is provided, ensure it's not already in the log
            if (mid) {
                if (addedMidSetRef.current.has(mid) || drained.some(m => m.id === mid)) return;
            }

            lastMessageRef.current = msg;
            if (mid) addedMidSetRef.current.add(mid);
            setMessages(prev => {
                const nextMessages = [...prev, ...drained, msg];
                return nextMessages.length >= 500 ? nextMessages.slice(nextMessages.length - 500) : nextMessages;
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
            // Batch at ~20fps (50ms) to reduce React render thrashing on the main thread
            if (!flushTimeoutRef.current) {
                flushTimeoutRef.current = setTimeout(flushMessages, 50);
            }
        }
    }, [inCombatRef, setMessages, flushMessages, roomContext, isAccountModeRef, playCommMessageSound]);

    const clearLog = useCallback(() => {
        messageBufferRef.current = [];
        addedMidSetRef.current.clear();
        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
        }
        setMessages([]);
    }, []);

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
            return nextMessages.length >= 500 ? nextMessages.slice(nextMessages.length - 500) : nextMessages;
        });
    }, [setMessages]);

    return useMemo(() => ({ 
        messages, 
        setMessages, 
        addMessage, 
        addSystemMessage, 
        flushMessages, 
        isCombatLine, 
        clearLog 
    }), [
        messages, setMessages, addMessage, addSystemMessage, flushMessages, isCombatLine, clearLog
    ]);
}
