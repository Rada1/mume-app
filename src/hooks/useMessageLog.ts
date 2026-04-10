import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageType, Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import { numToWord, pluralizeMumeSubject, pluralizeVerb, pluralizeRest } from '../utils/gameUtils';

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

export const ARRIVE_REGEX = /^(.+?)\s+(has arrived from|arrives from|enters from)\s+(the\s+)?(.+?)\.?$/i;
export const LEAVE_REGEX = /^(.+?)\s+(leaves|enters)\s+(the\s+)?(.+?)\.?$/i;
export const HERE_REGEX = /^(.+?)\s+(is(?:\s+[\w\s,]+)?\s+here|stands? here|sits? here|rests? here|sleeps? here)(?:.*)?$/i;
export const NPC_LINE_REGEX = /^((?:A|An|The|Some)?\s*[\w\s,-]+?'?s?)\s+(\w+s)\b\s*(.*)$/i;

export const ROOM_EXIT_REGEX = /^(North|South|East|West|Up|Down|North|Southwest|Northeast|Southwest|Southeast)\s+-\s+/i;

export const MOVE_FAILURE_REGEX = /^(The .+ seems to be closed\.|Alas, you cannot go that way\.|You can't go there\.|You are too exhausted\.|You cannot go that way\.|It's closed\.|You can't see to go that way\.|You need a boat\.|It's too dark\.)/i;

// ---------------------------------------------------------------------------
let lastVibrateTime = 0;

export function useMessageLog(
    inCombatRef: React.RefObject<boolean>,
    isMobileBrevityMode: boolean,
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
    isAccountModeRef?: React.RefObject<boolean>
) {
    const [messages, setMessages] = useState<Message[]>([]);
    const lastMessageRef = useRef<Message | null>(null);
    const messageBufferRef = useRef<Message[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const roomLineBufferRef = useRef<{ subject: string, action: string, original: string }[]>([]);
    const roomBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
            const lastRoomIdx = pending.findLastIndex(m => m.isRoomBlock);
            if (lastRoomIdx !== -1) {
                pending[lastRoomIdx].isRoomBlockEnd = true;
            }
        }

        messageBufferRef.current = [];
        const nonPrompts = pending.filter(m => m.type !== 'prompt');
        const prompts = pending.filter(m => m.type === 'prompt');
        const ordered = nonPrompts.length > 0 ? [...nonPrompts, ...prompts] : pending;
        if (ordered.length > 0) ordered[ordered.length - 1] = { ...ordered[ordered.length - 1], isBatchEnd: true };
        setMessages(prev => {
            const nextMessages = [...prev, ...ordered];
            return nextMessages.length >= 500 ? nextMessages.slice(nextMessages.length - 500) : nextMessages;
        });
        flushTimeoutRef.current = null;
    }, []);

    const addMessageRef = useRef<any>(null);

    const flushRoomBuffer = useCallback(() => {
        if (roomLineBufferRef.current.length === 0) return;
        const items = roomLineBufferRef.current;
        roomLineBufferRef.current = [];
        if (roomBufferTimeoutRef.current) {
            clearTimeout(roomBufferTimeoutRef.current);
            roomBufferTimeoutRef.current = null;
        }

        const actionGroups: Record<string, string[]> = {};
        const textChunks: string[] = [];

        items.forEach(item => {
            if (item.action === "text-chunk") textChunks.push(item.original);
            else {
                if (!actionGroups[item.action]) actionGroups[item.action] = [];
                actionGroups[item.action].push(item.subject);
            }
        });

        const actionStrings = Object.entries(actionGroups).map(([action, subjects]) => {
            if (subjects.length === 0) return "";
            const unique = Array.from(new Set(subjects));
            let subjectStr = unique.length === 1 ? unique[0] : (unique.length === 2 ? `${unique[0]} and ${unique[1]}` : `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`);
            let verb = unique.length > 1 ? (action.startsWith('is ') ? 'are ' + action.slice(3) : pluralizeVerb(action)) : action;
            return `${subjectStr} ${verb}`;
        }).filter(Boolean);

        const allSentences = [...textChunks, ...actionStrings].map(s => s.trim()).filter(Boolean);
        if (allSentences.length === 0) return;

        const punctuated = allSentences.map((s, idx) => {
            let t = s;
            const isLast = idx === allSentences.length - 1;

            // Normalize punctuation
            if (t.endsWith('.') || t.endsWith('..') || t.endsWith('...')) {
                t = t.replace(/\.+$/, '');
            }

            if (isLast) return t + '.';
            return t + '...';
        });

        const finalPara = punctuated.join(' ');

        if (finalPara) {
            const finalParagraph = finalPara.charAt(0).toUpperCase() + finalPara.slice(1);
            const msgText = `\x1b[1;37m${finalParagraph.replace(/\s+/g, ' ')}\x1b[0m`;
            addMessageRef.current?.('game', msgText, false, undefined, false, { textOnly: finalParagraph, lower: finalParagraph.toLowerCase() }, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined);
        }
    }, []);

    const addMessage = useCallback((
        type: MessageType,
        text: string,
        combatOverride?: boolean,
        mid?: string,
        isRoomName?: boolean,
        precalculated?: { textOnly: string, lower: string },
        shopItem?: any,
        practiceSkill?: any,
        practiceHeader?: any,
        skipBrevity: boolean = false,
        replyTarget?: string,
        replyCommand?: string,
        commSender?: string,
        commAction?: string,
        commText?: string,
        commColor?: string,
        providedCombatSide?: 'player' | 'opponent' | 'groupmate'
    ) => {
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

        // --- SURGICAL SILENCE (Newbie Mode) ---
        // If the description is already in the authoritative header, we strip it from the log.
        // We use a robust normalization to handle line wraps or minor spacing differences.
        // Use the ref (synchronous, always current) over state (may lag behind GMCP).
        const descSource = roomDescRef?.current || curDesc;
        if (isNewbieMode && descSource && currentTextOnly.length > 0) {
            const normDesc = descSource.replace(/\s+/g, ' ').trim().toLowerCase();
            const normLine = currentTextOnly.replace(/\s+/g, ' ').trim().toLowerCase();

            // Strip to alphanumeric for fuzzy matching (handles terminal wrapping, punctuation diffs)
            const strippedDesc = normDesc.replace(/[^a-z0-9]/g, '');
            const strippedLine = normLine.replace(/[^a-z0-9]/g, '');

            if (normLine.startsWith(normDesc)) {
                // Line starts with full description — either exact match or desc + extra text
                if (normLine === normDesc) return;
                const descEndIdx = currentTextOnly.indexOf(descSource.substring(Math.max(0, descSource.length - 10)));
                if (descEndIdx !== -1) {
                    const cutPoint = descEndIdx + (descSource.length - Math.max(0, descSource.length - 10));
                    const remainingRaw = currentTextOnly.substring(cutPoint).trim();
                    if (remainingRaw.length === 0) return;
                    const remainingSuffix = remainingRaw.substring(0, 20);
                    const rawIndex = currentText.indexOf(remainingSuffix);
                    if (rawIndex !== -1) {
                        currentText = currentText.substring(rawIndex);
                        currentTextOnly = currentText.replace(/\x1b\[[0-9;]*m/g, '').trim();
                        currentTextLower = currentTextOnly.toLowerCase();
                    }
                }
            } else if (strippedLine.length >= 20 && strippedDesc.includes(strippedLine)) {
                // Line is a substantial fragment of the description (e.g. a terminal-wrapped line).
                // The >=20 threshold prevents false positives with short common phrases.
                // No type check needed — this catches lines even when detectRoom missed them
                // due to GMCP/text packet ordering.
                return;
            }
        }
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
            currentTextLower.includes(' leave ');

        const isLiveEvent = isCombat || isComm || isArriveLeave || type === 'user';



        if (isActuallyRoomName) {
            flushRoomBuffer();
        }

        // RETURN EARLY: The description is already shown in the authoritative GMCP header.
        if (type === 'room-description' && isNewbieMode) {
            return;
        }





        if (isMobileBrevityMode && type === 'game' && !isActuallyRoomName && !isCombat && !isComm && !skipBrevity) {
            if (currentTextOnly.length > 0) {
                const hereMatch = currentTextOnly.match(HERE_REGEX);
                const npcMatch = currentTextOnly.match(NPC_LINE_REGEX);

                if (hereMatch || npcMatch) {
                    const subject = hereMatch ? hereMatch[1] : (npcMatch ? npcMatch[1] : "");
                    const action = hereMatch ? hereMatch[2] : (npcMatch ? `${npcMatch[2]} ${npcMatch[3]}` : "");
                    roomLineBufferRef.current.push({ subject, action: action.trim(), original: currentTextOnly });
                } else {
                    roomLineBufferRef.current.push({ subject: "", action: "text-chunk", original: currentTextOnly });
                }

                if (roomBufferTimeoutRef.current) clearTimeout(roomBufferTimeoutRef.current);
                roomBufferTimeoutRef.current = setTimeout(flushRoomBuffer, 300);
                return;
            }
            // Fall through to real message for blank lines (currentTextOnly.length === 0)
            // But we MUST flush whatever is already in the buffer first so the blank
            // line appears after the buffered text, not before it.
            flushRoomBuffer();
        } else {
            flushRoomBuffer();
        }

        addMessageRef.current = addMessage;

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
        let stackId = '';
        let subject = '', actionText = '', direction = '';

        if (isMobileBrevityMode) {
            const arriveMatch = currentTextOnly.match(ARRIVE_REGEX);
            const leaveMatch = currentTextOnly.match(LEAVE_REGEX);
            const hereMatch = currentTextOnly.match(HERE_REGEX);
            const npcMatch = currentTextOnly.match(NPC_LINE_REGEX);

            if (arriveMatch) { subject = arriveMatch[1]; actionText = arriveMatch[2]; direction = arriveMatch[4]; stackId = `arrive:${subject.toLowerCase()}:${actionText.toLowerCase()}:${direction.toLowerCase()}`; }
            else if (leaveMatch) { subject = leaveMatch[1]; actionText = leaveMatch[2]; direction = leaveMatch[4]; stackId = `leave:${subject.toLowerCase()}:${actionText.toLowerCase()}:${direction.toLowerCase()}`; }
            else if (hereMatch) { subject = hereMatch[1]; actionText = hereMatch[2]; stackId = `here:${subject.toLowerCase()}:${actionText.toLowerCase()}`; }
            else if (npcMatch) { subject = npcMatch[1]; actionText = npcMatch[2]; direction = npcMatch[3]; stackId = `npc:${currentTextOnly.toLowerCase()}`; }
        }

        const lastMsg = lastMessageRef.current;
        const targetMid = mid;
        const canContinue = type === 'comm-continue' && lastMsg && (lastMsg.type === 'comm' || lastMsg.isComm) &&
            (!commSender || lastMsg.commSender === commSender);

        if (canContinue) {
            const currentMsgText = lastMsg.commText || '';
            const needsSpace = currentMsgText.length > 0 &&
                !currentMsgText.endsWith('-') &&
                !currentMsgText.endsWith(' ') &&
                !/^[.,!?;'"]/.test(commText || '');

            const updatedMsg: Message = {
                ...lastMsg,
                commText: currentMsgText + (needsSpace ? ' ' : '') + (commText || ''),
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

        // If this is NOT a communication continuation, and the last message WAS a comm, 
        // we MUST ensure we don't accidentally carry over ghost comm properties from a previous logic branch.
        // This prevents the 'duplicate message' bug where a new message inherits the last comm's text.

        if (stackId && lastMsg && lastMsg.stackId === stackId && lastMsg.type === type && !isActuallyRoomName) {
            let newCount = (lastMsg.stackCount || 1) + 1;
            const pluralSubject = pluralizeMumeSubject(subject);
            let verb = '', rest = direction;
            if (actionText.includes('arrive')) verb = 'have arrived';
            else if (actionText.includes('leave')) verb = 'leave';
            else if (actionText.toLowerCase().startsWith('is ')) {
                if (actionText.toLowerCase().includes('standing')) verb = 'stand ' + actionText.slice(12);
                else if (actionText.toLowerCase().includes('resting')) verb = 'rest ' + actionText.slice(11);
                else if (actionText.toLowerCase().includes('sleeping')) verb = 'sleep ' + actionText.slice(12);
                else if (actionText.toLowerCase().includes('sitting')) verb = 'sit ' + actionText.slice(11);
                else verb = 'are ' + actionText.slice(3);
            } else { verb = pluralizeVerb(actionText); rest = pluralizeRest(direction); }

            const newTextRaw = `${numToWord(newCount).charAt(0).toUpperCase() + numToWord(newCount).slice(1)} ${pluralSubject} ${verb}${actionText.includes('arrive') ? ' from ' : ''}${rest}.`.replace(/\s+/g, ' ');
            const updatedMsg: Message = { ...lastMsg, textRaw: newTextRaw, html: ansiConvert.toHtml(`\x1b[1;37m${newTextRaw}\x1b[0m`), stackCount: newCount, timestamp: Date.now() };
            lastMessageRef.current = updatedMsg;
            if (messageBufferRef.current.length > 0) messageBufferRef.current[messageBufferRef.current.length - 1] = updatedMsg;
            else setMessages(prev => { const next = [...prev]; if (next.length > 0) next[next.length - 1] = updatedMsg; return next; });
            return;
        }

        // Room description lines are merged into the preceding room-name message
        // so they render as one unified DOM element with no subpixel gaps.
        if (type === 'room-description') {
            const descHtml = ansiConvert.toHtml(text);
            const buffer = messageBufferRef.current;
            const lastRoomIdx = buffer.findLastIndex(m => m.isRoomName);
            
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

        const CHARACTER_AGENCY_VERBS = [
            'says', 'tells', 'whispers', 'shouts', 'asks', 'exclaims', 'narrates', 'talks',
            'say', 'tell', 'whisper', 'shout', 'ask', 'exclaim', 'narrate', 'talk',
            'smiles', 'laughs', 'nods', 'points', 'grins', 'chuckles', 'stares',
            'smile', 'laugh', 'nod', 'point', 'grin', 'chuckle', 'stare',
            'hits', 'misses', 'stabs', 'cleaves', 'stings', 'lashes', 'scratches', 'bruises', 'dodges',
            'hit', 'miss', 'stab', 'cleave', 'sting', 'lash', 'scratch', 'bruise', 'dodge',
            'gets', 'takes', 'drops', 'puts', 'gives', 'opens', 'closes', 'locks', 'unlocks',
            'get', 'take', 'drop', 'put', 'give', 'open', 'close', 'lock', 'unlock',
            'arrives', 'leaves', 'enters'
        ];

        let processedText = currentText;
        const isEmpty = currentTextOnly.length === 0;
        if (isNewbieMode && !isActuallyRoomName && type !== 'prompt' && !isEmpty) {
            // Check for NPC/Player actions: Subject + Whitelisted Verb
            const npcMatch = currentTextOnly.match(NPC_LINE_REGEX);
            const isNPCActor = npcMatch && CHARACTER_AGENCY_VERBS.includes(npcMatch[2].toLowerCase());

            // Check for User actions: "You" + Whitelisted Verb
            const userMatch = currentTextOnly.match(/^You\s+(\w+)\b/i);
            const isUserActor = userMatch && CHARACTER_AGENCY_VERBS.includes(userMatch[1].toLowerCase());

            // Check for Comms (Tells, Says)
            const isPlayerActor = isComm && !currentTextOnly.startsWith('[') && !currentTextOnly.startsWith('(') && !currentTextOnly.startsWith('*');

            if (isNPCActor || isUserActor || isPlayerActor || isCombat) {
                processedText = currentText;
            }
        }

        const html = ansiConvert.toHtml(processedText);

        const msg: Message = {
            id: mid || Math.random().toString(36).substring(7),
            html,
            textRaw: processedText,
            type: finalType,
            timestamp: Date.now(),
            isCombat,
            combatSide,
            dimmedInCombat,
            isUrgent,
            isEmpty,
            stackId: stackId || undefined,
            stackCount: 1,
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
            lastMessageRef.current = msg;
            setMessages(prev => {
                const nextMessages = [...prev, ...drained, msg];
                return nextMessages.length >= 500 ? nextMessages.slice(nextMessages.length - 500) : nextMessages;
            });
        } else {
            lastMessageRef.current = msg;
            messageBufferRef.current.push(msg);
            // Batch at ~20fps (50ms) to reduce React render thrashing on the main thread
            if (!flushTimeoutRef.current) {
                flushTimeoutRef.current = setTimeout(flushMessages, 50);
            }
        }
    }, [inCombatRef, setMessages, flushMessages, isMobileBrevityMode, roomContext, flushRoomBuffer, isAccountModeRef]);

    const clearLog = useCallback(() => {
        messageBufferRef.current = [];
        roomLineBufferRef.current = [];
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

    return { messages, setMessages, addMessage, addSystemMessage, flushMessages, isCombatLine, clearLog };
}
