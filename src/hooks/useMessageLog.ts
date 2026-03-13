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

export function useMessageLog(
    inCombatRef: React.RefObject<boolean>,
    isMobileBrevityMode: boolean,
    roomContext: { players: string[], npcs: string[], items: string[], roomName?: string | null }
) {
    const [messages, setMessages] = useState<Message[]>([]);
    const lastMessageRef = useRef<Message | null>(null);
    const messageBufferRef = useRef<Message[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const roomLineBufferRef = useRef<{ subject: string, action: string, original: string }[]>([]);
    const roomBufferTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isCombatLine = useCallback((textLower: string): boolean => {
        const combatVerbs = [
            'hit', 'miss', 'wound', 'slay', 'kill', 'scratch', 'bruise', 'maul', 'decimate',
            'devastate', 'obliterate', 'massacre', 'mutilate', 'eviscerate', 'pierce',
            'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'shoot', 'blast', 'burn',
            'freeze', 'choke', 'strike'
        ];
        return combatVerbs.some(v => textLower.includes(` ${v}s `) || textLower.includes(` ${v} `) || textLower.includes(`${v}s you`) || textLower.includes(`${v} you`)) ||
            ((textLower.includes('dodge') || textLower.includes('parry') || textLower.includes('flee')) && inCombatRef.current);
    }, [inCombatRef]);

    const isCommunicationLine = useCallback((textLower: string): boolean => {
        return textLower.includes(' says ') || textLower.includes(' tell ') || textLower.includes(' whisper ') || textLower.includes(' group-tell ') ||
            /^you (tell|say|whisper|yell|narrate|state|gtell)\b/i.test(textLower);
    }, []);

    const flushMessages = useCallback(() => {
        if (messageBufferRef.current.length === 0) return;
        const pending = [...messageBufferRef.current];
        messageBufferRef.current = [];
        setMessages(prev => {
            const nextMessages = [...prev, ...pending];
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
            addMessageRef.current?.('game', msgText, false, undefined, false, { textOnly: finalParagraph, lower: finalParagraph.toLowerCase() }, undefined, undefined, undefined, true);
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
        skipBrevity: boolean = false
    ) => {
        const textOnly = precalculated?.textOnly || text.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const textLower = precalculated?.lower || textOnly.toLowerCase();

        const isCombat = combatOverride ?? (type === 'game' ? isCombatLine(textLower) : false);
        const isComm = type === 'game' && isCommunicationLine(textLower);

        const robustRoomAnsi = /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[01];3[26]m/.test(text);
        const curRoom = roomContext.roomName;
        const isActuallyRoomName = isRoomName || robustRoomAnsi || (curRoom && (
            textOnly === curRoom ||
            textLower === curRoom.toLowerCase() ||
            textOnly === curRoom + '.' ||
            textLower === curRoom.toLowerCase() + '.' ||
            (textOnly.length < curRoom.length + 8 && (textOnly.startsWith(curRoom) || textLower.startsWith(curRoom.toLowerCase())))
        ));

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

        const dimmedInCombat = inCombatRef.current && !isCombat;
        let stackId = '';
        let subject = '', actionText = '', direction = '';

        const arriveMatch = textOnly.match(ARRIVE_REGEX);
        const leaveMatch = textOnly.match(LEAVE_REGEX);
        const hereMatch = textOnly.match(HERE_REGEX);
        const npcMatch = textOnly.match(NPC_LINE_REGEX);

        if (arriveMatch) { subject = arriveMatch[1]; actionText = arriveMatch[2]; direction = arriveMatch[4]; stackId = `arrive:${subject.toLowerCase()}:${actionText.toLowerCase()}:${direction.toLowerCase()}`; }
        else if (leaveMatch) { subject = leaveMatch[1]; actionText = 'leaves'; direction = leaveMatch[3]; stackId = `leave:${subject.toLowerCase()}:${direction.toLowerCase()}`; }
        else if (hereMatch) { subject = hereMatch[1]; actionText = hereMatch[2]; stackId = `here:${subject.toLowerCase()}:${actionText.toLowerCase()}`; }
        else if (npcMatch) { subject = npcMatch[1]; actionText = npcMatch[2]; direction = npcMatch[3]; stackId = `npc:${textOnly.toLowerCase()}`; }

        const lastMsg = lastMessageRef.current;
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

        let html = ansiConvert.toHtml(text);
        if (textLower.includes('strange incantations') || textLower.includes('utters the words')) html = `<span class="spell-incant">${html}</span>`;

        const msg: Message = { id: mid || Math.random().toString(36).substring(7), html, textRaw: text, type, timestamp: Date.now(), isCombat, dimmedInCombat, stackId: stackId || undefined, stackCount: 1, isComm, isRoomName: isActuallyRoomName, shopItem, practiceSkill, practiceHeader };
        
        if (isCombat) {
            // Haptic feedback for combat
            try {
                if (window.navigator?.vibrate) window.navigator.vibrate(15);
            } catch (e) {}
        }

        lastMessageRef.current = msg;
        messageBufferRef.current.push(msg);

        // If it's a user command, flush immediately for zero latency feel.
        if (type === 'user') {
            if (flushTimeoutRef.current) {
                clearTimeout(flushTimeoutRef.current);
                flushTimeoutRef.current = null;
            }
            flushMessages();
        } else if (!flushTimeoutRef.current) {
            // Batch at ~20fps (50ms) to reduce React render thrashing on the main thread
            flushTimeoutRef.current = setTimeout(flushMessages, 50);
        }
    }, [isCombatLine, isCommunicationLine, inCombatRef, setMessages, flushMessages, isMobileBrevityMode, roomContext, flushRoomBuffer]);

    return { messages, setMessages, addMessage, flushMessages, isCombatLine, isCommunicationLine };
}
