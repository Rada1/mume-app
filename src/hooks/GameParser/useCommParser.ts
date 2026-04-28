/**
 * @file useCommParser.ts
 * @description Parses GMCP communication channels and XML-tagged comm lines.
 */

import { useCallback, useRef } from 'react';
import { MessageType } from '../../types';

export interface CommParserDeps {
    pendingGmcpCommRef?: React.MutableRefObject<{ sender: string; chan: string; msg?: string } | null>;
    lastCommIdBySenderRef?: React.MutableRefObject<Map<string, string>>;
    lastCommMsgIdRef?: React.MutableRefObject<string | null>;
    lastCommTimeRef?: React.MutableRefObject<number>;
}

export function useCommParser(deps: CommParserDeps) {
    const { pendingGmcpCommRef, lastCommIdBySenderRef } = deps;
    const ignoredCommBufferRef = useRef<string | null>(null);
    const lastCommMsgIdRef = deps.lastCommMsgIdRef || useRef<string | null>(null);
    const lastCommTimeRef = deps.lastCommTimeRef || useRef<number>(0);

    const parseComm = useCallback((line: string, textOnly: string, _lower: string) => {
        const gmcpComm = pendingGmcpCommRef?.current ?? null;
        if (gmcpComm) pendingGmcpCommRef!.current = null;

        if (ignoredCommBufferRef.current && !gmcpComm) {
            const cleanLineTxt = textOnly.trim();
            const currentBuffer = ignoredCommBufferRef.current.trim();
            
            if (currentBuffer.startsWith(cleanLineTxt) || cleanLineTxt.startsWith(currentBuffer.substring(0, Math.min(10, currentBuffer.length)))) {
                if (cleanLineTxt.length > 0) {
                    ignoredCommBufferRef.current = currentBuffer.substring(cleanLineTxt.length).trim();
                    if (ignoredCommBufferRef.current.length === 0) {
                        ignoredCommBufferRef.current = null;
                    }
                    return { isSuppressed: true };
                }
            } else {
                ignoredCommBufferRef.current = null;
            }
        }

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
            const actionMatch = innerText.match(/^(.+?)\s+(tells? you|tells?|whispers?|says?|asks?(?:\s+you)?|exclaims?|narrates?|shouts?|yells?|sings?|prays?)(?:\s+.*?|:\s*|,\s*)(.*)$/i);
            if (!actionMatch || actionMatch.index === undefined) return false;

            const actionStart = leadingOffset + innerText.indexOf(actionMatch[2], actionMatch[1].length);
            const textStart = leadingOffset + actionMatch[0].length - actionMatch[3].length;
            const rawActionStart = textIndexToRawIndex(innerRaw, actionStart);
            const rawTextStart = textIndexToRawIndex(innerRaw, textStart);
            const chanMap: Record<string, string> = { song: 'sing' };
            const rawActionIndex = tagMatch.index + tagMatch[0].indexOf(actionMatch[2]);

            replyCommand = chanMap[tag] ?? tag;
            replyTarget = actionMatch[1].trim();
            commSender = sanitizeExtractedText(innerRaw.substring(0, rawActionStart)).trim();
            commAction = actionMatch[2];
            commText = sanitizeExtractedText(innerRaw.substring(rawTextStart)).trim();
            commColor = extractColorAtRawIndex(rawActionIndex >= tagMatch.index ? rawActionIndex : line.length);
            return true;
        };

        if (gmcpComm) {
            replyTarget = gmcpComm.sender || undefined;
            const chanMap: Record<string, string> = { 
                tell: 'tell', tells: 'tell', say: 'say', says: 'say',
                narrate: 'narrate', narrates: 'narrate', shout: 'shout', shouts: 'shout',
                yell: 'yell', yells: 'yell', sing: 'sing', sings: 'sing',
                whisper: 'whisper', whispers: 'whisper', pray: 'pray', prays: 'pray',
                ask: 'say', asks: 'say', exclaim: 'say', exclaims: 'say'
            };
            replyCommand = chanMap[gmcpComm.chan.toLowerCase()] ?? gmcpComm.chan.toLowerCase();
            commSender = replyTarget;
            commAction = replyCommand;
            
            // For GMCP, we don't have a specific raw index for the action, 
            // so we take the first color in the line as a fallback, 
            // or if it's a known channel, we could hardcode.
            // But let's try the first color first.
            commColor = extractColorAtRawIndex(line.length);
            
            if (gmcpComm.msg) {
                commText = gmcpComm.msg;
                const prefixMatch = textOnly.match(/^(.*?)\s+(?:says|tells|narrates|yells|shouts|exclaims|sings|whispers|prays|asks)(?:.*?)[,\s:]+\s*/i);
                const lineContentText = prefixMatch ? textOnly.substring(prefixMatch[0].length) : textOnly;
                
                if (commText.length > lineContentText.length) {
                    ignoredCommBufferRef.current = commText.substring(lineContentText.length).trim();
                }
            } else {
                commText = sanitizeExtractedText(line);
            }
        } else {
            parseXmlComm();
        }

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
            lastCommMsgIdRef,
            lastCommTimeRef,
            lastCommIdBySenderRef
        };
    }, [pendingGmcpCommRef, lastCommIdBySenderRef]);

    return { parseComm };
}
