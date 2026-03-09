import { useState, useCallback, useRef } from 'react';
import { MessageType, Message } from '../types';
import { ansiConvert } from '../utils/ansi';
import { numToWord, pluralizeMumeSubject, pluralizeVerb, pluralizeRest } from '../utils/gameUtils';

// ---------------------------------------------------------------------------
// Helper functions (previously top-level in index.tsx)
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Regex constants (previously top-level in index.tsx)
// ---------------------------------------------------------------------------

export const ARRIVE_REGEX = /^(.+)\s+(has arrived from|arrives from)\s+(the\s+)?(.+)\.?$/i;
export const LEAVE_REGEX = /^(.+)\s+leaves\s+(the\s+)?(.+)\.?$/i;
export const HERE_REGEX = /^(.+)\s+(is here|is standing here|is resting here|is sleeping here|is sitting here)\s*\.?$/i;
export const NPC_LINE_REGEX = /^((?:A|An|The)\s+[\w\s-]+?)\s+(\w+s)\b\s*(.*)$/i;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMessageLog(inCombatRef: React.RefObject<boolean>) {
    const [messages, setMessages] = useState<Message[]>([]);

    // Performance optimization: batch rapid incoming messages into a single React render
    const messageBufferRef = useRef<Message[]>([]);
    const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isCombatLine = useCallback((textLower: string): boolean => {
        const t = textLower;
        const combatVerbs = [
            'hit', 'miss', 'wound', 'slay', 'kill', 'scratch', 'bruise', 'maul', 'decimate',
            'devastate', 'obliterate', 'massacre', 'mutilate', 'eviscerate', 'pierce',
            'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'shoot', 'blast', 'burn',
            'freeze', 'choke', 'strike'
        ];

        const hasCombatVerb = combatVerbs.some(v => t.includes(` ${v}s `) || t.includes(` ${v} `) || t.includes(`${v}s you`) || t.includes(`${v} you`));

        return (
            hasCombatVerb ||
            ((t.includes('dodge') || t.includes('parry') || t.includes('flee')) && inCombatRef.current) ||
            t.includes('you dodge') || t.includes('you parry') ||
            t.includes('you flee') || t.includes('you rescue') ||
            t.includes('you disarm') || t.includes('you bash') ||
            t.includes('you bite') ||
            t.includes('your arm') || t.includes('your head') ||
            t.includes('your leg') || t.includes('your body') ||
            t.includes('your chest') || t.includes('your neck') ||
            t.includes('is dead!') || t.includes('is slain') ||
            t.includes('you have been killed') || t.includes('you are dead') ||
            t.includes('you feel less protected') ||
            t.includes('your opponent') || t.includes('your foe') ||
            // Spellcasting is always combat-relevant
            t.includes('strange incantations') ||
            t.includes('utters the words') ||
            t.includes('cast a spell') || t.includes('casts a spell') ||
            /^\s*(k|kill|f|flee|b|bash|c|cast|u|use|rescue|disarm|kick|bite)\b/i.test(t) ||
            /^\w+ (dodges|parries|flees|rescues|disarms|bashes|kicks|bites|hits|stabs|cleaves|slashes|pounds|crushes|smites|shoots)/.test(t)
        );
    }, [inCombatRef]);

    const isCommunicationLine = useCallback((textLower: string): boolean => {
        const t = textLower;
        return (
            t.includes(' says ') || t.includes(' narrate ') || t.includes(' narrates ') ||
            t.includes(' tell ') || t.includes(' tells ') || t.includes(' whisper ') ||
            t.includes(' whispers ') || t.includes(' yell ') || t.includes(' yells ') ||
            t.includes(' states ') || t.includes(' state ') ||
            t.includes(' gtell ') || t.includes(' group-tell ') || t.includes(' tells the group ') ||
            /^you (tell|say|whisper|yell|narrate|state|gtell|group-tell)\b/i.test(t) ||
            /^\w+ (says|narrates|tells|whispers|yells|states|gtells)\b/i.test(t)
        );
    }, []);

    const flushMessages = useCallback(() => {
        if (messageBufferRef.current.length === 0) return;

        // Take a snapshot of the buffer so we don't clear it in an impure state update.
        const pending = [...messageBufferRef.current];
        messageBufferRef.current = [];

        setMessages(prev => {
            const nextMessages = [...prev, ...pending];
            if (nextMessages.length >= 500) {
                return nextMessages.slice(nextMessages.length - 500);
            }
            return nextMessages;
        });

        if (flushTimeoutRef.current) {
            clearTimeout(flushTimeoutRef.current);
            flushTimeoutRef.current = null;
        }
    }, [setMessages]);

    // We must track the absolute last message added (even if it's already in state)
    // to properly handle stack stacking when the buffer is empty.
    const lastMessageRef = useRef<Message | null>(null);

    const addMessage = useCallback((type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }) => {
        if (type === 'prompt') return;

        const textOnly = precalculated ? precalculated.textOnly : text.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const textLower = precalculated ? precalculated.lower : textOnly.toLowerCase();

        const isThisCombat = combatOverride ?? (type === 'game' ? isCombatLine(textLower) : type === 'user');
        const isComm = type === 'game' && isCommunicationLine(textLower);
        const dimmedInCombat = inCombatRef.current && !isThisCombat;

        let stackId = '';
        let subject = '';
        let actionText = '';
        let direction = '';

        const arriveMatch = textOnly.match(ARRIVE_REGEX);
        const leaveMatch = textOnly.match(LEAVE_REGEX);
        const hereMatch = textOnly.match(HERE_REGEX);
        const npcMatch = textOnly.match(NPC_LINE_REGEX);

        if (arriveMatch) {
            subject = arriveMatch[1];
            actionText = arriveMatch[2];
            direction = arriveMatch[4];
            stackId = `arrive:${subject.toLowerCase()}:${actionText.toLowerCase()}:${direction.toLowerCase()}`;
        } else if (leaveMatch) {
            subject = leaveMatch[1];
            actionText = 'leaves';
            direction = leaveMatch[3];
            stackId = `leave:${subject.toLowerCase()}:${direction.toLowerCase()}`;
        } else if (hereMatch) {
            subject = hereMatch[1];
            actionText = hereMatch[2];
            stackId = `here:${subject.toLowerCase()}:${actionText.toLowerCase()}`;
        } else if (npcMatch) {
            subject = npcMatch[1];
            actionText = npcMatch[2];
            direction = npcMatch[3];
            stackId = `npc:${textOnly.toLowerCase()}`;
        }

        const lastMsg = lastMessageRef.current;

        if (stackId && lastMsg && lastMsg.stackId === stackId && lastMsg.type === type) {
            const newCount = (lastMsg.stackCount || 1) + 1;
            const pluralSubject = pluralizeMumeSubject(subject);
            let verb = '';
            let rest = direction;

            if (actionText.includes('arrive')) verb = 'have arrived';
            else if (actionText.includes('leave')) verb = 'leave';
            else if (actionText.toLowerCase().startsWith('is ')) {
                if (actionText.toLowerCase().includes('standing')) verb = 'stand ' + actionText.slice(12);
                else if (actionText.toLowerCase().includes('resting')) verb = 'rest ' + actionText.slice(11);
                else if (actionText.toLowerCase().includes('sleeping')) verb = 'sleep ' + actionText.slice(12);
                else if (actionText.toLowerCase().includes('sitting')) verb = 'sit ' + actionText.slice(11);
                else verb = 'are ' + actionText.slice(3);
            } else {
                verb = pluralizeVerb(actionText);
                rest = pluralizeRest(direction);
            }

            const newTextRaw = `${numToWord(newCount).charAt(0).toUpperCase() + numToWord(newCount).slice(1)} ${pluralSubject} ${verb}${actionText.includes('arrive') ? ' from ' : ''}${rest}${rest || actionText.includes('is ') ? '' : ' '}.`.replace(/\s+/g, ' ').replace(/\.\./g, '.');

            const updatedMsg: Message = {
                ...lastMsg,
                textRaw: newTextRaw,
                html: ansiConvert.toHtml(`\x1b[1;37m${newTextRaw}\x1b[0m`),
                stackCount: newCount,
                timestamp: Date.now()
            };

            lastMessageRef.current = updatedMsg;

            if (messageBufferRef.current.length > 0) {
                // If it's in the buffer, just update the last item in the buffer
                messageBufferRef.current[messageBufferRef.current.length - 1] = updatedMsg;
            } else {
                // If the buffer is empty, it means the message was already flushed to state.
                // We must update it directly in state.
                setMessages(prev => {
                    const nextMessages = [...prev];
                    if (nextMessages.length > 0) {
                        nextMessages[nextMessages.length - 1] = updatedMsg;
                    }
                    return nextMessages;
                });
            }
            return;
        }

        let html = ansiConvert.toHtml(text);
        
        // Wrap spellcasting incantations to ensure they appear "bright"
        if (textLower.includes('strange incantations') || textLower.includes('utters the words')) {
            html = `<span class="spell-incant">${html}</span>`;
        }
        if (type === 'game' && text.toLowerCase().includes("key: '")) {
            const keyMatch = textOnly.match(/key:\s*'([^']*)'/i);
            if (keyMatch) {
                const roomId = keyMatch[1];
                const escapedKey = roomId.replace(/'/g, '(&apos;|&#39;|\')');
                const pattern = new RegExp(`key:\\s*(&apos;|&#39;|')(${escapedKey})(&apos;|&#39;|')`, 'i');
                html = html.replace(pattern, (_match, _p1, _p2, _p3) => {
                    return `<span class="inline-btn teleport-key" data-teleport-id="${roomId}" data-action="save-teleport" style="--glow-color: rgba(255, 255, 100, 0.6); border-bottom: 1px dashed gold; padding: 0 4px; border-radius: 2px; cursor: pointer; display: inline-block;">key: '${roomId}'</span>`;
                });
            }
        }

        const msg: Message = {
            id: mid || Math.random().toString(36).substring(7),
            html,
            textRaw: text,
            type,
            timestamp: Date.now(),
            isCombat: isThisCombat,
            dimmedInCombat,
            stackId: stackId || undefined,
            stackCount: 1,
            isComm,
            isRoomName
        };

        lastMessageRef.current = msg;
        messageBufferRef.current.push(msg);

        if (!flushTimeoutRef.current) {
            flushTimeoutRef.current = setTimeout(flushMessages, 32);
        }

    }, [isCombatLine, isCommunicationLine, inCombatRef, setMessages, flushMessages]);

    return {
        messages,
        setMessages,
        addMessage,
        flushMessages,
        isCombatLine,
        isCommunicationLine,
    };
}
