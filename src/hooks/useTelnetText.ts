/** @file useTelnetText.ts — Streamed text, prompts, pagers and snoop boundaries. */
import React from 'react';
import type { TelnetConfig } from './useTelnet';
import { useTelnetTextQueue } from './useTelnetTextQueue';
import { commandLatency } from '../utils/commandLatency';
import { isPagerPrompt } from '../utils/pagerPrompt';

// --- Text Framing Section ---
export function useTelnetText(configRef: React.MutableRefObject<TelnetConfig>) {
    const bufferRef = React.useRef("");
    const lastProcessedPromptRef = React.useRef("");
    const snoopBlockRef = React.useRef<{ symbol: string; type: string } | null>(null);
    const snoopPrefixRegex = /^(?:&amp;|&|mp;)[A-Za-z](?:\s|$)/;
    const enqueueText = useTelnetTextQueue(configRef);
    const processText = (text: string) => {
        if (text.trim()) commandLatency.recordText();
        bufferRef.current += text;

        const currentBuffer = bufferRef.current;
        const redrawMarker = '\u0000';
        const normalized = currentBuffer.replace(/\r\n/g, '\n').replace(/\r/g, `\n${redrawMarker}`);
        const rawLines = normalized.split('\n');
        let lastLine = rawLines.pop() || '';

        const processedLines: (string | { line: string, isPrompt: boolean; isRedrawPrompt?: boolean })[] = [];

        const isPrompt = (line: string) => {
            const noAnsi = line.replace(/\x1b\[[0-9;]*m/g, '');
            const clean = noAnsi.trim();
            if (!clean) return false;

            // Snooped lines (prefixed with &E, &F, etc.) must not update the user's own HUD.
            // Pass them straight through to processLine, which strips the prefix and routes
            // any embedded prompt to the spectate view via setSpectateActivePrompt.
            if (snoopPrefixRegex.test(clean)) return false;

            // In XML mode, prompts are explicitly tagged and should be the entire line
            if (clean.startsWith('<prompt') && clean.endsWith('</prompt>')) return true;

            // In XML mode, lines often end with a closing tag like </object> or </header>
            // (whose final `>` is part of the tag, not a prompt symbol). Don't treat those
            // as prompts — they are normal game text (e.g. equipment lines).
            if (/<\/[a-zA-Z][a-zA-Z0-9_-]*>$/.test(clean)) return false;

            // Basic MUME prompt heuristics for non-XML or legacy prompts
            return (clean.endsWith('>') ||
                isPagerPrompt(clean));
        };

        const isAccountLoginQuestion = (line: string) => {
            const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim().toLowerCase();
            return clean.includes('by what name do you wish') ||
                clean.includes('account password:') ||
                clean === 'password:' ||
                clean.includes('do you have another account') ||
                clean.includes('enter new account name:') ||
                clean.includes('verify:');
        };

        const decodePromptText = (line: string) => line
            .replace(/<prompt[^>]*>|<\/prompt>/gi, '')
            .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '')
            .replace(/&gt;/gi, '>')
            .replace(/&lt;/gi, '<')
            .replace(/&amp;/gi, '&')
            .trim();

        const handlePromptDetected = (line: string, isRedrawPrompt = false) => {
            let displayPrompt = line;
            if (line.includes('<')) {
                // Strip XML tags and decode entities for the UI display/log prompt.
                displayPrompt = decodePromptText(line);
            }

            // The compact HUD omits the delimiter, while the raw log preserves
            // it so the server prompt reads exactly as it does in-game.
            const hudPrompt = displayPrompt.endsWith('>')
                ? displayPrompt.substring(0, displayPrompt.length - 1).trim()
                : displayPrompt;

            const promptKey = hudPrompt.replace(/\s+/g, ' ').trim();
            const isNewPrompt = promptKey !== lastProcessedPromptRef.current;
            if (isNewPrompt) {
                lastProcessedPromptRef.current = promptKey;
                configRef.current.setPrompt(hudPrompt);

                const cleanLine = hudPrompt.replace(/\x1b\[[0-9;]*m/g, '').trim();
                if (configRef.current.handlers.detectLighting) {
                    configRef.current.handlers.detectLighting(cleanLine);
                }
            }

            // Every prompt is a meaningful output boundary. Even identical prompts
            // can represent a later command response during fast input bursts.
            processedLines.push({ line: displayPrompt, isPrompt: true, isRedrawPrompt });
        };

        // Splits a physical line that contains an XML <prompt>...</prompt> tag
        // anywhere within it into (preText | prompt | postText) so that:
        //  - the prompt updates the HUD
        //  - any other text on the same line (e.g. "<prompt>&gt;</prompt><header>...</header>")
        //    is still processed as a normal game line and shows up in the log.
        const splitXmlPrompt = (line: string) => {
            const re = /<prompt[^>]*>[\s\S]*?<\/prompt>/;
            const m = line.match(re);
            if (!m || m.index === undefined) return null;
            return {
                preText: line.substring(0, m.index),
                promptPart: m[0],
                postText: line.substring(m.index + m[0].length),
            };
        };

        const normalizeSnoopLine = (value: string, symbol: string) => {
            // MUME sends symbol=L (bare letter), &L, or &amp;L — normalize all to &X format
            const rawLetter = symbol.replace(/^&amp;/i, '').replace(/^&/, '').trim().charAt(0).toUpperCase();
            const normalizedSymbol = rawLetter ? `&${rawLetter}` : '&?';
            const normalizedLine = value.replace(/^((?:\x1b\[[0-9;]*m|\s)*)&amp;([A-Z]) /, '$1&$2 ');
            const cleanLine = normalizedLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (snoopPrefixRegex.test(cleanLine)) return normalizedLine;
            return `${normalizedSymbol} ${normalizedLine}`;
        };

        const splitSnoopXmlBlocks = (line: string): string[] => {
            if (line.length === 0) return [''];

            const out: string[] = [];
            let rest = line;

            while (rest.length > 0) {
                if (snoopBlockRef.current) {
                    const closeIdx = rest.indexOf('</snoop>');
                    const chunk = closeIdx === -1 ? rest : rest.substring(0, closeIdx);
                    const normalized = normalizeSnoopLine(chunk, snoopBlockRef.current.symbol);
                    if (normalized.trim()) out.push(normalized);
                    if (closeIdx === -1) return out;
                    snoopBlockRef.current = null;
                    rest = rest.substring(closeIdx + '</snoop>'.length);
                    continue;
                }

                const openIdx = rest.indexOf('<snoop');
                if (openIdx === -1) {
                    if (rest.length > 0) out.push(rest);
                    return out;
                }

                if (openIdx > 0) out.push(rest.substring(0, openIdx));
                rest = rest.substring(openIdx);

                const openMatch = rest.match(/^<snoop\s+symbol=([^;>\s]+)(?:;type=([^>\s]*))?>/);
                if (!openMatch) {
                    out.push(rest);
                    return out;
                }

                const symbol = openMatch[1];
                snoopBlockRef.current = { symbol, type: openMatch[2] || '' };
                rest = rest.substring(openMatch[0].length);
            }

            return out;
        };

        for (const rawLine of rawLines) {
            const isRedrawPrompt = rawLine.startsWith(redrawMarker);
            const lineWithoutMarker = isRedrawPrompt ? rawLine.slice(redrawMarker.length) : rawLine;
            const lineSegments = splitSnoopXmlBlocks(lineWithoutMarker);
            for (const line of lineSegments) {
                const cleanForSnoopSegment = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
                if (snoopPrefixRegex.test(cleanForSnoopSegment)) {
                    processedLines.push(line);
                    continue;
                }

            // Snooped lines (prefixed with &E, &F, etc.) must bypass ALL prompt detection.
            // splitXmlPrompt runs before snoop detection, so a snooped line like
            // "&E <prompt>&gt;north</prompt>" would have its <prompt> tag extracted and
            // passed to handlePromptDetected — flickering the user's HUD with snooped commands.
            // Push straight to processedLines; processLine handles prefix stripping and routing.
            const cleanForSnoop = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
            if (snoopPrefixRegex.test(cleanForSnoop)) {
                if (line.length > 0) processedLines.push(line);
                continue;
            }

            // Priority 1: Explicit XML Prompt Tag anywhere in the line (MUME's "change xml on" output)
            const xmlSplit = splitXmlPrompt(line);

            // Priority 2: Legacy MUME prompt at end of line
            // Stricter check: must look like a real prompt (vitals, account prompt, or standalone >)
            // This prevents matching the > at the end of XML tags.
            const legacyPromptMatch = !xmlSplit ? line.match(/^(.*?)((?:!\[.*?\]\s*>|(?:\d+H\s+\d+M\s+\d+V\s+>)|(?:^> ))\s*)$/) : null;

            if (xmlSplit) {
                if (xmlSplit.preText.length > 0) processedLines.push(xmlSplit.preText);
                handlePromptDetected(xmlSplit.promptPart, isRedrawPrompt);
                if (xmlSplit.postText.length > 0) processedLines.push(xmlSplit.postText);
            } else if (legacyPromptMatch) {
                const preText = legacyPromptMatch[1];
                const promptPart = legacyPromptMatch[2];
                if (preText.length > 0) processedLines.push(preText);
                handlePromptDetected(promptPart, isRedrawPrompt);
            } else if (isPrompt(line)) {
                handlePromptDetected(line, isRedrawPrompt);
            } else {
                processedLines.push(line);
            }
            }
        }

        // Handle text remaining in buffer (the part after the last newline)
        // Snooped partial lines stay buffered for the next chunk — no prompt detection needed.
        const isLastLineRedraw = lastLine.startsWith(redrawMarker);
        const lastLineText = isLastLineRedraw ? lastLine.slice(redrawMarker.length) : lastLine;
        const lastLineClean = lastLineText.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (snoopBlockRef.current || /^<snoop[\s>]/.test(lastLineClean) || snoopPrefixRegex.test(lastLineClean)) {
            bufferRef.current = lastLine;
        } else {
            const xmlSplitLast = splitXmlPrompt(lastLineText);
            const legacyPromptMatch = !xmlSplitLast ? lastLineText.match(/^(.*?)((?:!\[.*?\]\s*>|(?:\d+H\s+\d+M\s+\d+V\s+>)|(?:^> ))\s*)$/) : null;

            if (isAccountLoginQuestion(lastLineText)) {
                processedLines.push(lastLineText);
                bufferRef.current = '';
            } else if (xmlSplitLast) {
                if (xmlSplitLast.preText.length > 0) processedLines.push(xmlSplitLast.preText);
                handlePromptDetected(xmlSplitLast.promptPart, isLastLineRedraw);
                // postText after the prompt may still be a partial line — keep it buffered so
                // the next chunk can complete it instead of pushing a half-line into the log.
                bufferRef.current = xmlSplitLast.postText;
            } else if (legacyPromptMatch) {
                const preText = legacyPromptMatch[1];
                const promptPart = legacyPromptMatch[2];
                if (preText.length > 0) processedLines.push(preText);
                handlePromptDetected(promptPart, isLastLineRedraw);
                bufferRef.current = '';
            } else if (isPrompt(lastLineText)) {
                handlePromptDetected(lastLineText, isLastLineRedraw);
                bufferRef.current = '';
            } else {
                bufferRef.current = lastLineText.length === 0 && isLastLineRedraw ? redrawMarker : lastLineText;
            }
        }

        enqueueText(processedLines);
    };
    return processText;
}
