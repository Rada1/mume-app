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
                commText = prefixMatch ? textOnly.substring(prefixMatch[0].length) : textOnly;
            }
        } else {
            const commPatterns: [RegExp, string, boolean][] = [
                // In MUME, all speech channels (tells, says, yells, etc.) always enclose the message in single quotes.
                // By enforcing the (['"].*['"]) pattern, we avoid matching lists in help files or game tables.
                [/^(.+?)\s+(tells? you|tells?|whispers?)\s+(['"].*['"])$/i, 'tell', true],
                [/^(.+?)\s+(says?|asks?(?:\s+you)?|exclaims?)\s+(['"].*['"])$/i, 'say', true],
                [/^(.+?)\s+(narrates?)\s+(['"].*['"])$/i, 'narrate', true],
                [/^(.+?)\s+(shouts?|yells?)\s+(['"].*['"])$/i, 'shout', true],
                [/^(.+?)\s+(sings?)\s+(['"].*['"])$/i, 'sing', true],
                [/^(.+?)\s+(prays?)\s+(['"].*['"])$/i, 'pray', true],
            ];
            for (const [re, cmd, hasSender] of commPatterns) {
                const m = textOnly.match(re);
                if (m) { 
                    replyCommand = cmd; 
                    if (hasSender) {
                        replyTarget = m[1];
                        commSender = m[1];
                        commAction = m[2];
                        commText = m[3];
                    }
                    break; 
                }
            }

            if (!replyCommand && lastCommMsgIdRef.current && (Date.now() - lastCommTimeRef.current < 500)) {
                const isLikelyContinuation = textOnly.length > 0 && (
                    /^[a-z0-9'"]/.test(textOnly) || 
                    textOnly.endsWith("'") || 
                    textOnly.endsWith('"') ||
                    textOnly.endsWith("'!") ||
                    textOnly.endsWith('"!') ||
                    textOnly.endsWith("'.") ||
                    textOnly.endsWith('".')
                );

                if (isLikelyContinuation) {
                    msgType = 'comm-continue';
                    commText = textOnly;
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
