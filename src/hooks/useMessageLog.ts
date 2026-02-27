import { useState, useCallback, useRef } from 'react';
import { MessageType, Message } from '../types';
import { ansiConvert } from '../utils/ansi';

// ---------------------------------------------------------------------------
// Helper functions (previously top-level in index.tsx)
// ---------------------------------------------------------------------------

const numToWord = (n: number) => {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
    return words[n] || n.toString();
};

const pluralizeMumeSubject = (subject: string) => {
    let s = subject.trim();
    const prefixMatch = s.match(/^(A|An|The)\s+(.+)$/i);
    let rest = s;
    if (prefixMatch) rest = prefixMatch[2];

    const lower = rest.toLowerCase();
    if (lower.endsWith('wolf')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('elf')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('thief')) return rest.slice(0, -1) + 'ves';
    if (lower.endsWith('man')) return rest.slice(0, -2) + 'en';
    if (lower.endsWith('woman')) return rest.slice(0, -2) + 'en';
    if (lower.endsWith('child')) return rest + 'ren';
    if (lower.endsWith('y') && !/[aeiou]y$/i.test(lower)) return rest.slice(0, -1) + 'ies';
    if (/[sxz]$|ch$|sh$/i.test(lower)) return rest + 'es';
    return rest + 's';
};

const pluralizeVerb = (verb: string) => {
    const v = verb.toLowerCase();
    if (v === 'is') return 'are';
    if (v === 'has') return 'have';
    if (v === 'was') return 'were';
    if (v.endsWith('es')) {
        const base = v.slice(0, -2);
        if (base.endsWith('sh') || base.endsWith('ch') || base.endsWith('s') || base.endsWith('x') || base.endsWith('z')) {
            return verb.slice(0, -2);
        }
    }
    if (v.endsWith('s') && !v.endsWith('ss')) return verb.slice(0, -1);
    return verb;
};

const pluralizeRest = (text: string) => {
    return text.replace(/\bits\b/g, 'their')
        .replace(/\bhimself\b/g, 'themselves')
        .replace(/\bherself\b/g, 'themselves')
        .replace(/\bitself\b/g, 'themselves')
        .replace(/\bhis\b/g, 'their')
        .replace(/\bher\b/g, 'their');
};

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

    const isCombatLine = useCallback((text: string): boolean => {
        const t = text.toLowerCase();
        const combatVerbs = [
            'hit', 'miss', 'wound', 'slay', 'kill', 'scratch', 'bruise', 'maul', 'decimate',
            'devastate', 'obliterate', 'massacre', 'mutilate', 'eviscerate', 'pierce',
            'cleave', 'stab', 'slash', 'pound', 'crush', 'smite', 'shoot', 'blast', 'burn',
            'freeze', 'choke', 'strike'
        ];

        const hasCombatVerb = combatVerbs.some(v => t.includes(` ${v}s `) || t.includes(` ${v} `) || t.includes(`${v}s you`) || t.includes(`${v} you`));

        return (
            hasCombatVerb ||
            ((t.includes('cast a spell') || t.includes('casts a spell') || t.includes('strange incantations')) && inCombatRef.current) ||
            t.includes('you dodge') || t.includes('you parry') ||
            t.includes('you flee') || t.includes('you rescue') ||
            t.includes('you disarm') || t.includes('you bash') ||
            t.includes('you kick') || t.includes('you bite') ||
            t.includes('your arm') || t.includes('your head') ||
            t.includes('your leg') || t.includes('your body') ||
            t.includes('your chest') || t.includes('your neck') ||
            t.includes('is dead!') || t.includes('is slain') ||
            t.includes('you have been killed') || t.includes('you are dead') ||
            t.includes('you feel less protected') ||
            t.includes('your opponent') || t.includes('your foe') ||
            /^\s*(k|kill|f|flee|b|bash|c|cast|u|use|rescue|disarm|kick|bite)\b/i.test(t) ||
            /^\w+ (dodges|parries|flees|rescues|disarms|bashes|kicks|bites|hits|stabs|cleaves|slashes|pounds|crushes|smites|shoots)/.test(t)
        );
    }, [inCombatRef]);

    const isCommunicationLine = useCallback((text: string): boolean => {
        const t = text.toLowerCase();
        return (
            t.includes(' says ') || t.includes(' narrate ') || t.includes(' narrates ') ||
            t.includes(' tell ') || t.includes(' tells ') || t.includes(' whisper ') ||
            t.includes(' whispers ') || t.includes(' yell ') || t.includes(' yells ') ||
            t.includes(' states ') || t.includes(' state ') ||
            /^you (tell|say|whisper|yell|narrate|state)\b/i.test(t) ||
            /^\w+ (says|narrates|tells|whispers|yells|states)\b/i.test(t)
        );
    }, []);

    const addMessage = useCallback((type: MessageType, text: string, combatOverride?: boolean) => {
        if (type === 'prompt') return; // Prompts are handled by activePrompt state, not history

        setMessages(prev => {
            let nextMessages = [...prev];

            const isThisCombat = combatOverride ?? (type === 'game' ? isCombatLine(text) : type === 'user');
            const isComm = type === 'game' && isCommunicationLine(text);
            const dimmedInCombat = inCombatRef.current && !isThisCombat;

            const stripAnsi = (t: string) => t.replace(/\x1b\[[0-9;]*m/g, '');
            const textOnly = stripAnsi(text).trim();

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

            if (stackId && nextMessages.length > 0) {
                const lastMsg = nextMessages[nextMessages.length - 1];
                if (lastMsg.stackId === stackId && lastMsg.type === type) {
                    const newCount = (lastMsg.stackCount || 1) + 1;
                    const pluralSubject = pluralizeMumeSubject(subject);
                    let verb = '';
                    let rest = direction;

                    if (actionText.includes('arrive')) verb = 'have arrived';
                    else if (actionText.includes('leave')) verb = 'leave';
                    else if (actionText.toLowerCase().startsWith('is ')) {
                        verb = 'are ' + actionText.slice(3);
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

                    return [...nextMessages.slice(0, -1), updatedMsg];
                }
            }

            let html = ansiConvert.toHtml(text);
            if (type === 'game' && text.toLowerCase().includes("key: '")) {
                const keyMatch = textOnly.match(/key:\s*'([^']*)'/i);
                if (keyMatch) {
                    const roomId = keyMatch[1];
                    const escapedKey = roomId.replace(/'/g, '(&apos;|&#39;|\')');
                    const pattern = new RegExp(`key:\\s*(&apos;|&#39;|')(${escapedKey})(&apos;|&#39;|')`, 'i');
                    html = html.replace(pattern, (_match, _p1, _p2, _p3) => {
                        return `<span class="inline-btn teleport-key" data-teleport-id="${roomId}" data-action="save-teleport" style="background-color: rgba(255, 255, 100, 0.2); border-bottom: 1px dashed gold; padding: 0 4px; border-radius: 2px; cursor: pointer; display: inline-block;">key: '${roomId}'</span>`;
                    });
                }
            }

            const msg: Message = {
                id: Math.random().toString(36).substring(7),
                html,
                textRaw: text,
                type,
                timestamp: Date.now(),
                isCombat: isThisCombat,
                dimmedInCombat,
                stackId: stackId || undefined,
                stackCount: 1,
                isComm
            };

            if (nextMessages.length >= 500) {
                return [...nextMessages.slice(nextMessages.length - 499), msg];
            }
            return [...nextMessages, msg];
        });
    }, [isCombatLine, isCommunicationLine, inCombatRef]);

    return {
        messages,
        setMessages,
        addMessage,
        isCombatLine,
        isCommunicationLine,
    };
}
