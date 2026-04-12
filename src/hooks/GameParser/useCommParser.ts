/**
 * @file useCommParser.ts
 * @description Parses communication channels, GMCP comms, and multi-line continuation handling.
 */

import { useCallback, useRef } from 'react';
import { MessageType } from '../../types';

export interface CommParserDeps {
    pendingGmcpCommRef?: React.MutableRefObject<{ sender: string; chan: string; msg?: string } | null>;
    lastCommIdBySenderRef?: React.MutableRefObject<Map<string, string>>;
}

export function useCommParser(deps: CommParserDeps) {
    const { pendingGmcpCommRef, lastCommIdBySenderRef } = deps;
    const ignoredCommBufferRef = useRef<string | null>(null);
    const lastCommMsgIdRef = useRef<string | null>(null);
    const lastCommTimeRef = useRef<number>(0);
    const openCommRef = useRef(false); // true when last comm line had no closing quote (server-wrapped message)

    const parseComm = useCallback((line: string, textOnly: string, lower: string) => {
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

        // Extract color
        const colorNames = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
        const ansiMatches = Array.from(line.matchAll(/\x1b\[([\d;]+)m/g));
        for (const match of ansiMatches) {
            const codes = match[1].split(';').map(n => parseInt(n, 10));
            let isBright = codes.includes(1);
            for (const code of codes) {
                if (code >= 30 && code <= 37) {
                    commColor = isBright ? `var(--ansi-bright-${colorNames[code - 30]})` : `var(--ansi-${colorNames[code - 30]})`;
                    break;
                }
                if (code >= 90 && code <= 97) {
                    commColor = `var(--ansi-bright-${colorNames[code - 90]})`;
                    break;
                }
            }
            if (commColor) break;
        }

        const sanitizeExtractedText = (text: string): string => {
            // Strips literal garbage like line wraps, residual ANSI fragments, and carriage returns
            // specifically at the end of the line where MUME appends them.
            return text
                .replace(/[\s\r\n\x00-\x1F+-]*(?:\[0m)?[\s\r\n\x00-\x1F]*$/, '')
                .replace(/[\r\x00-\x08\x0B-\x1A\x1C-\x1F]/g, ''); // Strip all other non-ANSI control chars, PRESERVING \x1b (27)
        };

        const getRawRange = (textIdx: number, length: number): string => {
            let tIdx = 0;
            let rIdx = 0;
            let startR = -1;
            let rawResult = '';
            
            while (rIdx < line.length) {
                if (line[rIdx] === '\x1b' && line[rIdx + 1] === '[') {
                    const mEnd = line.indexOf('m', rIdx);
                    if (mEnd !== -1) {
                        const ansiCode = line.substring(rIdx, mEnd + 1);
                        if (tIdx >= textIdx && tIdx < textIdx + length) {
                            rawResult += ansiCode;
                        }
                        rIdx = mEnd + 1;
                        continue;
                    }
                }
                
                if (tIdx >= textIdx && tIdx < textIdx + length) {
                    if (startR === -1) startR = rIdx;
                    rawResult += line[rIdx];
                    tIdx++;
                } else if (tIdx >= textIdx + length) {
                    return sanitizeExtractedText(rawResult);
                } else {
                    tIdx++;
                }
                rIdx++;
            }
            return sanitizeExtractedText(rawResult);
        };

        if (gmcpComm) {
            replyTarget = gmcpComm.sender || undefined;
            const chanMap: Record<string, string> = { 
                tell: 'tell', say: 'say', asks: 'say', exclaims: 'say', ask: 'say', exclaim: 'say',
                narrate: 'narrate', shout: 'shout', yell: 'yell', sing: 'sing', whisper: 'whisper', pray: 'pray' 
            };
            replyCommand = chanMap[gmcpComm.chan.toLowerCase()] ?? gmcpComm.chan.toLowerCase();
            commSender = replyTarget;
            commAction = replyCommand;
            
            if (gmcpComm.msg) {
                commText = gmcpComm.msg;
                const prefixMatch = textOnly.match(/^(.*?)\s+(?:says|tells|narrates|yells|shouts|exclaims|sings|whispers|prays|asks)(?:.*?)[,\s:]+\s*/i);
                const lineContentText = prefixMatch ? textOnly.substring(prefixMatch[0].length) : textOnly;
                
                if (commText.length > lineContentText.length) {
                    ignoredCommBufferRef.current = commText.substring(lineContentText.length).trim();
                }
            } else {
                const prefixMatch = textOnly.match(/^(.*?)\s+(?:says|tells|narrates|yells|shouts|exclaims|sings|whispers|prays|asks)(?:.*?)[,\s:]+\s*/i);
                if (prefixMatch) {
                    commSender = getRawRange(0, prefixMatch[1].length);
                    commText = getRawRange(prefixMatch[0].length, textOnly.length - prefixMatch[0].length);
                } else {
                    commText = sanitizeExtractedText(line);
                }
            }
        } else {
            const commPatterns: [RegExp, string, boolean][] = [
                // Allow optional space before the colon or opening quote
                [/^(.+?)\s+(tells? you|tells?|whispers?)(?:\s+|:\s*|,\s*)(?:(['"].*)|)$/i, 'tell', true],
                [/^(.+?)\s+(says?|asks?(?:\s+you)?|exclaims?)(?:\s+|:\s*|,\s*)(?:(['"].*)|)$/i, 'say', true],
                [/^(.+?)\s+(narrates?)(?:\s+|:\s*|,\s*)(?:(['"].*)|)$/i, 'narrate', true],
                [/^(.+?)\s+(shouts?|yells?)(?:\s+|:\s*|,\s*)(?:(['"].*)|)$/i, 'shout', true],
                [/^(.+?)\s+(sings?)(?:\s+|:\s*|,\s*)(?:(['"].*)|)$/i, 'sing', true],
                [/^(.+?)\s+(prays?)(?:\s+|:\s*|,\s*)(?:(['"].*)|)$/i, 'pray', true],
            ];
            for (const [re, cmd, hasSender] of commPatterns) {
                const m = textOnly.match(re);
                if (m) {
                    replyCommand = cmd;
                    if (hasSender) {
                        replyTarget = m[1];
                        commSender = getRawRange(0, m[1].length);
                        commAction = m[2];
                        if (m[3]) {
                            const textStartIdx = m[0].indexOf(m[3]);
                            commText = getRawRange(textStartIdx, m[3].length);
                        } else {
                            commText = '';
                            openCommRef.current = true;
                        }
                    }
                    break;
                }
            }

            if (replyCommand && commText !== undefined) {
                // Determine if a quote was opened and not closed on this line.
                const trimmedComm = commText.trim();
                const q = trimmedComm.startsWith("'") ? "'" : trimmedComm.startsWith('"') ? '"' : null;

                if (q) {
                    // It's considered "open" if there isn't a corresponding closing quote at the end of the line.
                    const closingRegex = new RegExp(`${q}[\\.\\?\\!\\)\\s]*$`);
                    openCommRef.current = !closingRegex.test(textOnly.trim());
                } else if (textOnly.trim() === '' || textOnly.endsWith(':')) {
                    openCommRef.current = true;
                } else {
                    openCommRef.current = false;
                }
            }

            if (!replyCommand && lastCommMsgIdRef.current && (Date.now() - lastCommTimeRef.current < 500)) {
                const lowerOnly = textOnly.toLowerCase().trim();
                // KILL SWITCH: If the line looks like game protocol, combat, or room info, 
                // it CANNOT be a communication continuation.
                const isCombat = /^\d+(\/\d+)? (hits|mana|move)/i.test(lowerOnly) || lowerOnly.includes(' smites ') || lowerOnly.includes(' pounds ') || lowerOnly.includes(' hits ');
                const isMap = lowerOnly.startsWith('exits:') || lowerOnly.includes(' - [') || lowerOnly.includes(' is here.') || lowerOnly.includes(' are here.');
                const isProtocol = lowerOnly.startsWith('core.') || lowerOnly.startsWith('comm.') || lowerOnly.startsWith('room.');
                
                if (isCombat || isMap || isProtocol) {
                    openCommRef.current = false;
                }

                // Treat as continuation when the previous comm line had an unclosed quote.
                const isLikelyContinuation = openCommRef.current;

                if (isLikelyContinuation) {
                    msgType = 'comm-continue';
                    commText = getRawRange(0, textOnly.length);
                    
                    // If this line contains a quote, assume it closes the block.
                    if (textOnly.includes("'") || textOnly.includes('"')) {
                        openCommRef.current = false;
                    }
                }
            }
        }
        if (replyCommand) msgType = 'comm';

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
