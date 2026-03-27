import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageType, Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import { numToWord, pluralizeMumeSubject, pluralizeVerb, pluralizeRest, extractNoun, simplifyDescription } from '../utils/gameUtils';

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

export const ARRIVE_REGEX = /^(.+)\s+(has arrived from|arrives from)\s+(the\s+)?(.+)\.?$/i;
export const LEAVE_REGEX = /^(.+)\s+leaves\s+(the\s+)?(.+)\.?$/i;
export const HERE_REGEX = /^(.+?)\s+(is [\w\s,]+? here|stands? here|sits? here|rests? here|sleeps? here)(?:.*)?$/i;
export const NPC_LINE_REGEX = /^((?:A|An|The|Some)?\s*[\w\s,-]+?)\s+(\w+s)\b\s*(.*)$/i;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let lastVibrateTime = 0;

export function useMessageLog(
    inCombatRef: React.RefObject<boolean>,
    isMobileBrevityMode: boolean,
    roomContext: { players: import('../types').GmcpOccupant[], npcs: import('../types').GmcpOccupant[], items: import('../types').GmcpOccupant[], roomName?: string | null },
    lastCommIdBySenderRef: React.MutableRefObject<Map<string, string>>
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
               lower.includes(' massacres ') || lower.includes(' obliterates ');
    }, []);

    const flushMessages = useCallback(() => {
        if (messageBufferRef.current.length === 0) return;

        batchIdRef.current += 1;
        const currentBatchId = batchIdRef.current;

        const pending = messageBufferRef.current.map(m => ({ ...m, batchId: currentBatchId }));
        messageBufferRef.current = [];
        // Move 'prompt' type messages to the end — server sends prompt before room info,
        // but we want it displayed after all room content in the same packet.
        const nonPrompts = pending.filter(m => m.type !== 'prompt');
        const prompts = pending.filter(m => m.type === 'prompt');
        const ordered = nonPrompts.length > 0 ? [...nonPrompts, ...prompts] : pending;
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
        const textOnly = precalculated?.textOnly || text.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const textLower = precalculated?.lower || textOnly.toLowerCase();

        // If combatOverride is provided directly (from parser), trust it.
        // The parser handles inCombat context for ambiguous verbs like 'dodge'.
        const isCombat = !!combatOverride;
        const combatSide = isCombat
            ? (providedCombatSide || ((textLower.startsWith('you ') || textLower.startsWith('your ')) ? 'player' : 'opponent'))
            : undefined;

        const isComm = type === 'comm' || !!replyCommand;

        const robustRoomAnsi = /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[0-9;]*3[0-7]m/.test(text) &&
            textOnly.length < 80 && !textOnly.includes(' - ');
        const curRoom = roomContext.roomName;
        const isActuallyRoomName = isRoomName || robustRoomAnsi || (curRoom && (
            textOnly === curRoom ||
            textLower === curRoom.toLowerCase() ||
            textOnly === curRoom + '.' ||
            textLower === curRoom.toLowerCase() + '.' ||
            (textOnly.length < curRoom.length + 8 && (textOnly.startsWith(curRoom) || textLower.startsWith(curRoom.toLowerCase())))
        ));

        if (textLower === 'you are hungry.' || textLower === 'you are thirsty.') {
            return;
        }

        if (isActuallyRoomName) {
            flushRoomBuffer();
            skipBrevity = true;
        }

        if (isMobileBrevityMode && type === 'game' && !isActuallyRoomName && !isCombat && !isComm && !skipBrevity) {
            if (textOnly.length === 0) return;
            const hereMatch = textOnly.match(HERE_REGEX);
            const npcMatch = textOnly.match(NPC_LINE_REGEX);

            if (hereMatch || npcMatch) {
                const subject = hereMatch ? hereMatch[1] : (npcMatch ? npcMatch[1] : "");
                const action = hereMatch ? hereMatch[2] : (npcMatch ? `${npcMatch[2]} ${npcMatch[3]}` : "");
                roomLineBufferRef.current.push({ subject, action: action.trim(), original: textOnly });
            } else {
                roomLineBufferRef.current.push({ subject: "", action: "text-chunk", original: textOnly });
            }

            if (roomBufferTimeoutRef.current) clearTimeout(roomBufferTimeoutRef.current);
            roomBufferTimeoutRef.current = setTimeout(flushRoomBuffer, 300);
            return;
        } else {
            flushRoomBuffer();
        }

        addMessageRef.current = addMessage;

        const isArriveLeave = ARRIVE_REGEX.test(textOnly) ||
            LEAVE_REGEX.test(textOnly) ||
            textLower.includes('arrives from') ||
            textLower.includes('has arrived from') ||
            textLower.includes(' leaves ') ||
            textLower.includes(' leave ');

        const isUrgent = isArriveLeave ||
            textLower.includes('strange incantations') ||
            textLower.includes('utters the words');

        const dimmedInCombat = inCombatRef.current && !isCombat && !isUrgent;
        let stackId = '';
        let subject = '', actionText = '', direction = '';

        if (isMobileBrevityMode) {
            const arriveMatch = textOnly.match(ARRIVE_REGEX);
            const leaveMatch = textOnly.match(LEAVE_REGEX);
            const hereMatch = textOnly.match(HERE_REGEX);
            const npcMatch = textOnly.match(NPC_LINE_REGEX);

            if (arriveMatch) { subject = arriveMatch[1]; actionText = arriveMatch[2]; direction = arriveMatch[4]; stackId = `arrive:${subject.toLowerCase()}:${actionText.toLowerCase()}:${direction.toLowerCase()}`; }
            else if (leaveMatch) { subject = leaveMatch[1]; actionText = 'leaves'; direction = leaveMatch[3]; stackId = `leave:${subject.toLowerCase()}:${direction.toLowerCase()}`; }
            else if (hereMatch) { subject = hereMatch[1]; actionText = hereMatch[2]; stackId = `here:${subject.toLowerCase()}:${actionText.toLowerCase()}`; }
            else if (npcMatch) { subject = npcMatch[1]; actionText = npcMatch[2]; direction = npcMatch[3]; stackId = `npc:${textOnly.toLowerCase()}`; }
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

        const html = ansiConvert.toHtml(text);

        const msg: Message = {
            id: mid || Math.random().toString(36).substring(7),
            html,
            textRaw: text,
            type,
            timestamp: Date.now(),
            isCombat,
            combatSide,
            dimmedInCombat,
            isUrgent,
            stackId: stackId || undefined,
            stackCount: 1,
            isComm,
            replyTarget,
            replyCommand,
            isRoomName: isActuallyRoomName,
            shopItem,
            practiceSkill,
            practiceHeader,
            commSender,
            commAction,
            commText,
            commColor
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
    }, [inCombatRef, setMessages, flushMessages, isMobileBrevityMode, roomContext, flushRoomBuffer]);

    return { messages, setMessages, addMessage, flushMessages, isCombatLine };
}
