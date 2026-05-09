/**
 * @file useCaptureParser.ts
 * @description Header-driven parser for the Reactive Capture Machine.
 */

import { useCallback, useRef, useEffect } from 'react';
import { CaptureType, CaptureSession } from '../../types/capture';
import { DrawerLine } from '../../types';
import { Tokenizer } from '../../services/parser/Tokenizer';
import { buildPlayerLineTokens } from './playerLineTokens';

export interface CaptureParserDeps {
    captureSession: CaptureSession | null;
    setCaptureSession: (val: CaptureSession | null) => void;
    // Drawer setters
    setInventoryLines: (lines: DrawerLine[]) => void;
    setEqLines: (lines: DrawerLine[]) => void;
    setStatsLines: (lines: DrawerLine[]) => void;
    setPracticeLines: (lines: DrawerLine[]) => void;
    setWhoLines: (lines: DrawerLine[]) => void;
    setWhoList: (list: string[]) => void;
    setScoreLines: (lines: DrawerLine[]) => void;
    setInfoLines: (lines: DrawerLine[]) => void;
    setQuestLines: (lines: DrawerLine[]) => void;
    practiceHandler?: {
        parsePracticeLine: (text: string) => unknown;
        finalizePractice: () => void;
    };
    registerEntity: (id: string, name: string, location: any, category?: string) => void;
    ansiConvert: any;
    captureStage: React.MutableRefObject<string>;
}

export function useCaptureParser(deps: CaptureParserDeps) {
    const {
        setCaptureSession,
        setInventoryLines, setEqLines, setStatsLines, setPracticeLines,
        setWhoLines, setWhoList, setScoreLines, setInfoLines, setQuestLines, registerEntity,
        practiceHandler,
        ansiConvert, captureStage
    } = deps;
    
    // We use a local ref to ensure synchronous updates while useGameParser 
    // is looping through lines. This avoids stale closures and state timing issues.
    const sessionRef = useRef<CaptureSession | null>(null);
    const pendingFlagsRef = useRef<{ isSilent: boolean, fromDrawer: boolean }>({ isSilent: false, fromDrawer: false });

    const checkTriggers = useCallback((line: string, attachedText?: string): CaptureType | null => {
        const clean = (attachedText || line).trim();
        const lower = clean.toLowerCase();
        
        let type: CaptureType | null = null;
        if (lower.includes('you are using:') || lower.includes('you are using ...') || lower.includes('you are using\x1b')) type = 'equipment';
        else if (lower.includes('you are equipped with:')) type = 'equipment';
        else if (lower.startsWith('players in the world:') || lower.startsWith('players online') || lower.startsWith('allies online') || lower.startsWith('minions online') || clean === 'Players') type = 'who';
        else if (clean === 'Players' && lower.includes('ob:') && lower.includes('db:')) type = 'equipment'; 
        else if (lower.includes('you are carrying:') || lower.includes('you are carrying ...') || lower.includes('you are carrying\x1b')) type = 'inventory';
        else if (lower.includes('your inventory contains:')) type = 'inventory';
        else if (lower.includes('character name:') || lower.includes('character information for')) type = 'stats';
        else if (clean.startsWith('[stat]')) type = 'stats';
        else if (lower.includes('skill') && lower.includes('knowledge')) type = 'practice';
        else if (lower.includes('practice sessions left')) type = 'practice';
        else if (lower.includes('unfinished quest') || lower.includes('no unfinished quests') || lower.includes('not found any new quests') || (lower.includes('learnt of') && lower.includes('quest'))) type = 'quests';
        else if (lower.includes(', a level ') || lower.startsWith('you are a ') || lower.includes('real time')) type = 'info';
        else if (/\d+\/\d+ hits, \d+\/\d+ mana, and \d+\/\d+ moves/i.test(lower)) type = 'score';
        else if (clean.match(/^.{0,5}Score for /)) type = 'score';

        if (type) {
            console.log(`[Capture] Trigger matched: ${type} for line: "${clean.substring(0, 40)}"`);
        }
        return type;
    }, []);

    const startSession = useCallback((type: CaptureType) => {
        console.log(`[Capture] Starting ${type} session`);
        if (sessionRef.current?.type === type && (Date.now() - sessionRef.current.startTime < 100)) {
            return;
        }

        const newSession: CaptureSession = {
            type,
            lines: [],
            startTime: Date.now(),
            isSilent: pendingFlagsRef.current.isSilent,
            fromDrawer: pendingFlagsRef.current.fromDrawer
        };
        sessionRef.current = newSession;
        setCaptureSession(newSession);

        // Reset pending flags once session starts
        pendingFlagsRef.current = { isSilent: false, fromDrawer: false };

        const stageMap: Record<string, string> = {
            'inventory': 'inv',
            'equipment': 'eq',
            'who': 'who',
            'stats': 'stat',
            'practice': 'practice',
            'info': 'info',
            'score': 'score'
        };
        if (stageMap[type]) {
            captureStage.current = stageMap[type];
        }
    }, [setCaptureSession, captureStage, sessionRef]);

    const decodeXmlEntities = (text: string) => text
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');

    const stripXmlTags = (text: string) => decodeXmlEntities(text)
        .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, '');

    const getObjectText = (line: string): string | null => {
        const decoded = decodeXmlEntities(line);
        const match = decoded.match(/<object[^>]*>(.*?)<\/object>/i);
        return match ? stripXmlTags(match[1]).trim() : null;
    };

    const accumulateLine = useCallback((line: string, tokens?: any[], context?: any) => {
        const session = sessionRef.current;
        if (!session) return;

        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        const headerLine = stripXmlTags(cleanLine);
        const hasHeaderTag = headerLine !== cleanLine;
        
        let prefix = '';
        let text = hasHeaderTag ? headerLine : cleanLine;
        let rawText = line;
        let isHeader = false;
        let finalTokens = hasHeaderTag ? [] : (tokens || []);

        const lower = text.toLowerCase();
        if (lower.includes('you are using') || lower.includes('you are carrying') || 
            lower.includes('inventory contains') || lower.includes('equipped with') || 
            lower.includes('players online') || lower.includes('players in the world') ||
            lower.includes('player distance') || lower.startsWith('players') ||
            lower.includes('visible players in your area') || lower.startsWith('distance')) {
            isHeader = true;
        }

        const prefixMatch = cleanLine.match(/^(\s*(?:<|&lt;|\[|\*).*?(?:>|&gt;|\]|\*)\s*)(.*)/i);
        if (prefixMatch && !isHeader) {
            prefix = prefixMatch[1]
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
            text = prefixMatch[2];
            rawText = line.slice(prefixMatch[1].length);
            
            const tokenizer = Tokenizer.getInstance();
            const locationHint = session.type === 'equipment' ? 'worn' : 'none';
            finalTokens = tokenizer.tokenize(text, context || {}, locationHint);
        }

        // Entity registration for Who names (immediate — small lists)
        if (session.type === 'who' && !isHeader) {
            finalTokens = buildPlayerLineTokens(text, registerEntity) || finalTokens;
        }

        // Entity extraction for Where names (deferred — batched at finalization)
        const objectText = (session.type === 'inventory' || session.type === 'equipment') && !isHeader
            ? getObjectText(line)
            : null;

        // Entity registration for Items
        if ((session.type === 'inventory' || session.type === 'equipment') && !isHeader) {
            if (objectText) {
                const itemName = objectText;
                const loc = session.type === 'equipment' ? 'worn' : 'carried';
                registerEntity(`item:${itemName.toLowerCase()}`, itemName, loc, session.type === 'equipment' ? 'cat-worn-object' : 'cat-inventory-object');
            } else {
                // Fallback for plain text items
                const itemName = text.trim();
                if (itemName.length > 3) {
                    const loc = session.type === 'equipment' ? 'worn' : 'carried';
                    registerEntity(`item:${itemName.toLowerCase()}`, itemName, loc, session.type === 'equipment' ? 'cat-worn-object' : 'cat-inventory-object');
                }
            }
        }

        const newLine: DrawerLine = {
            id: Math.random().toString(36).substr(2, 9),
            text: text.trim(),
            rawText,
            html: ansiConvert.toHtml(stripXmlTags(line)),
            prefix,
            tokens: finalTokens,
            isHeader,
            isItem: !isHeader && (session.type === 'inventory' || session.type === 'equipment'),
        };

        // Synchronous update of the ref so it's available for the next line
        session.lines.push(newLine);
        console.log(`[Capture] Accumulated line for ${session.type}: ${newLine.text.substring(0, 30)}... Total: ${session.lines.length}`);
    }, [registerEntity, ansiConvert, sessionRef]);

    const finalizeSession = useCallback(() => {
        const session = sessionRef.current;
        if (!session) {
            return;
        }

        const lines = [...session.lines];
        console.log(`[Capture] Finalizing ${session.type} session with ${lines.length} lines`);

        try {
            switch (session.type) {
                case 'inventory':
                    setInventoryLines(lines);
                    break;
                case 'equipment':
                    setEqLines(lines);
                    break;
                case 'stats':
                    setStatsLines(lines);
                    break;
                case 'who':
                    setWhoLines(lines);
                    setWhoList(
                        lines
                            .filter(l => !l.isHeader && l.text.trim().length > 0)
                            .map(l => l.text.trim().split(/\s+/)[0])
                            .filter(name => /^[A-Z][a-zA-ZÀ-ÿ'-]{1,19}$/.test(name))
                    );
                    break;
                case 'score':
                    setScoreLines(lines);
                    break;
                case 'info':
                    setInfoLines(lines);
                    break;
                case 'practice':
                    lines.forEach(line => practiceHandler?.parsePracticeLine(line.text));
                    practiceHandler?.finalizePractice();
                    setPracticeLines(lines);
                    break;
                case 'quests':
                    setQuestLines(lines);
                    break;
            }
        } catch (err) {
            console.error(`[Capture] Error updating ${session.type} lines:`, err);
        }

        sessionRef.current = null;
        setCaptureSession(null);
        captureStage.current = 'none';
    }, [setInventoryLines, setEqLines, setStatsLines, setWhoLines, setWhoList, setScoreLines, setInfoLines, setPracticeLines, setQuestLines, setCaptureSession, captureStage, practiceHandler]);

    const hasSession = useCallback(() => sessionRef.current !== null, [sessionRef]);
    const isSilent = useCallback(() => sessionRef.current?.isSilent || false, [sessionRef]);
    const isFromDrawer = useCallback(() => sessionRef.current?.fromDrawer || false, [sessionRef]);
    const getActiveType = useCallback(() => sessionRef.current?.type || 'none', [sessionRef]);
    
    const setPendingFlags = useCallback((isSilent: boolean, fromDrawer: boolean) => {
        pendingFlagsRef.current = { isSilent, fromDrawer };
    }, []);

    return {
        checkTriggers,
        startSession,
        accumulateLine,
        finalizeSession,
        hasSession,
        isSilent,
        isFromDrawer,
        getActiveType,
        setPendingFlags
    };
}
