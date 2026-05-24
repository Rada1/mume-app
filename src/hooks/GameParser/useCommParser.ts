/**
 * @file useCommParser.ts
 * @description Parses XML-tagged communication lines for comm bubbles.
 */

import { useCallback } from 'react';
import { MessageType } from '../../types';

export interface CommParserDeps {
    pendingGmcpCommRef?: React.MutableRefObject<{ sender: string; chan: string; msg?: string } | null>;
    lastCommIdBySenderRef?: React.MutableRefObject<Map<string, string>>;
    lastCommMsgIdRef?: React.MutableRefObject<string | null>;
    lastCommTimeRef?: React.MutableRefObject<number>;
}

export function useCommParser(deps: CommParserDeps) {
    const parseComm = useCallback((line: string, _textOnly: string, _lower: string) => {
        let replyTarget: string | undefined;
        let replyCommand: string | undefined;
        let commSender: string | undefined;
        let commAction: string | undefined;
        let commText: string | undefined;
        let commColor: string | undefined;
        let msgType: MessageType = 'game';

        const colorNames = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

        const extractColorAtRawIndex = (rawIdx: number): string | undefined => {
            let activeColor: string | undefined;
            const ansiMatches = Array.from(line.matchAll(/\x1b\[([\d;]+)m/g));
            for (const match of ansiMatches) {
                if (match.index! > rawIdx) break;
                const codes = match[1].split(';').map(n => parseInt(n, 10));
                let isBright = codes.includes(1);
                for (const code of codes) {
                    if (code >= 30 && code <= 37) {
                        activeColor = isBright ? `var(--ansi-bright-${colorNames[code - 30]})` : `var(--ansi-${colorNames[code - 30]})`;
                    }
                    if (code >= 90 && code <= 97) {
                        activeColor = `var(--ansi-bright-${colorNames[code - 90]})`;
                    }
                    if (code === 0) {
                        activeColor = undefined;
                    }
                }
            }
            return activeColor;
        };

        const sanitizeExtractedText = (text: string): string => {
            // Strips literal garbage like line wraps, residual ANSI fragments, and carriage returns
            // specifically at the end of the line where MUME appends them.
            return text
                .replace(/[\s\r\n\x00-\x1F+-]*(?:\[0m)?[\s\r\n\x00-\x1F]*$/, '')
                .replace(/[\r\x00-\x08\x0B-\x1A\x1C-\x1F]/g, ''); // Strip all other non-ANSI control chars, PRESERVING \x1b (27)
        };

        const stripMarkup = (text: string): string => text
            .replace(/\x1b\[[0-9;]*m/g, '')
            .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '')
            .replace(/&gt;/gi, '>')
            .replace(/&lt;/gi, '<')
            .replace(/&amp;/gi, '&')
            .replace(/&quot;/gi, '"')
            .replace(/&apos;/gi, "'");

        const textIndexToRawIndex = (raw: string, textIdx: number): number => {
            let tIdx = 0;
            let rIdx = 0;

            while (rIdx < raw.length && tIdx < textIdx) {
                if (raw[rIdx] === '\x1b' && raw[rIdx + 1] === '[') {
                    const ansiEnd = raw.indexOf('m', rIdx);
                    if (ansiEnd !== -1) {
                        rIdx = ansiEnd + 1;
                        continue;
                    }
                }

                if (raw[rIdx] === '<') {
                    const tagEnd = raw.indexOf('>', rIdx);
                    if (tagEnd !== -1 && /^<\/?[a-zA-Z][a-zA-Z0-9_-]*/.test(raw.substring(rIdx, tagEnd + 1))) {
                        rIdx = tagEnd + 1;
                        continue;
                    }
                }

                tIdx++;
                rIdx++;
            }

            return rIdx;
        };

        const parseXmlComm = () => {
            const commTags = ['tell', 'say', 'narrate', 'shout', 'yell', 'song', 'sing', 'pray', 'whisper'];
            const tagPattern = commTags.join('|');
            const tagMatch = line.match(new RegExp(`<(${tagPattern})(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/\\1>`, 'i'));
            if (!tagMatch) return false;

            const tag = tagMatch[1].toLowerCase();
            const innerRaw = tagMatch[2];
            const innerPlain = stripMarkup(innerRaw);
            const leadingOffset = innerPlain.search(/\S/);
            const innerText = leadingOffset === -1 ? '' : innerPlain.substring(leadingOffset).trim();
            const actionMatch = innerText.match(/^(.+?)\s+(tells?\s+the\s+group|tells? you|tells?|whispers?|says?|asks?(?:\s+you)?|exclaims?|narrates?|shouts?|yells?|sings?|prays?)(?:\s+.*?|:\s*|,\s*)(.*)$/i);
            
            const chanMap: Record<string, string> = { song: 'sing' };
            replyCommand = chanMap[tag] ?? tag;

            if (actionMatch && actionMatch.index !== undefined) {
                const actionStart = leadingOffset + innerText.indexOf(actionMatch[2], actionMatch[1].length);
                const textStart = leadingOffset + actionMatch[0].length - actionMatch[3].length;
                const rawActionStart = textIndexToRawIndex(innerRaw, actionStart);
                const rawTextStart = textIndexToRawIndex(innerRaw, textStart);
                const rawActionIndex = tagMatch.index + tagMatch[0].indexOf(actionMatch[2]);

                replyTarget = actionMatch[1].trim();
                commSender = sanitizeExtractedText(innerRaw.substring(0, rawActionStart)).trim();
                commAction = actionMatch[2];
                commText = sanitizeExtractedText(innerRaw.substring(rawTextStart)).trim();
                commColor = extractColorAtRawIndex(rawActionIndex >= tagMatch.index ? rawActionIndex : line.length);
                if (/^tells?\s+the\s+group$/i.test(commAction)) {
                    replyCommand = 'group';
                    replyTarget = undefined;
                }
            } else {
                replyTarget = undefined;
                commSender = undefined;
                commAction = undefined;
                commText = innerText;
                commColor = extractColorAtRawIndex(tagMatch.index);
            }
            return true;
        };

        const parseTaggedPlainComm = () => {
            if (!/<[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/.test(line)) return false;
            // Skip lines containing formatting/structural tags — these are UI output, not comm messages.
            // Matching on comm verb words inside <code>, <highlight>, <em> etc. is always a false positive.
            if (/<(?:code|highlight|em|prompt|status|xml|object|room|exits|move|weather|magic|hp|mana|move|exp|align|prac|gold|bank|affect|group|help|item|info|object|rune|score|stats|zone|quiet|noquest|notell|noshout|narrate)\b/i.test(line)) return false;

            const plain = stripMarkup(line).trim();
            const actionMatch = plain.match(/^(.+?)\s+(tells?\s+the\s+group|tells? you|tells?|whispers?|says?|asks?(?:\s+you)?|exclaims?|narrates?|shouts?|yells?|sings?|prays?)(?:\s+.*?|:\s*|,\s*)(.*)$/i);
            if (!actionMatch) return false;

            const action = actionMatch[2].toLowerCase();
            const commandMap: Record<string, string> = {
                tells: 'tell',
                tell: 'tell',
                'tells you': 'tell',
                'tells the group': 'group',
                'tell the group': 'group',
                whispers: 'whisper',
                whisper: 'whisper',
                says: 'say',
                say: 'say',
                narrates: 'narrate',
                narrate: 'narrate',
                shouts: 'shout',
                shout: 'shout',
                yells: 'yell',
                yell: 'yell',
                sings: 'sing',
                sing: 'sing',
                prays: 'pray',
                pray: 'pray'
            };

            replyCommand = commandMap[action] ?? action.replace(/s$/, '');
            replyTarget = action === 'tells the group' || action === 'tell the group'
                ? undefined
                : actionMatch[1].trim();
            commSender = replyTarget;
            if (!commSender) commSender = actionMatch[1].trim();
            commAction = actionMatch[2];
            commText = actionMatch[3].trim();
            commColor = extractColorAtRawIndex(line.length);
            return true;
        };

        parseXmlComm();
        if (!replyCommand) parseTaggedPlainComm();

        if (replyCommand) {
            msgType = 'comm';
        }

        return {
            isSuppressed: false,
            msgType,
            replyTarget,
            replyCommand,
            commSender,
            commAction,
            commText,
            commColor,
            lastCommMsgIdRef: deps.lastCommMsgIdRef,
            lastCommTimeRef: deps.lastCommTimeRef,
            lastCommIdBySenderRef: deps.lastCommIdBySenderRef
        };
    }, [deps.lastCommIdBySenderRef, deps.lastCommMsgIdRef, deps.lastCommTimeRef]);

    return { parseComm };
}
