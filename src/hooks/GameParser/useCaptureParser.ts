/**
 * @file useCaptureParser.ts
 * @description Header-driven parser for the Reactive Capture Machine.
 */

import { useCallback, useRef } from 'react';
import { CaptureType, CaptureSession } from '../../types/capture';
import { DrawerLine } from '../../types';
import { Tokenizer } from '../../services/parser/Tokenizer';
import { buildPlayerLineTokens } from './playerLineTokens';
import { parseAffectedByLines } from '../../utils/affectUtils';
import { useArchiveStore } from '../../stores/useArchiveStore';
import { getArchiveListExpectedCount, mergeArchiveEntries, parseArchiveList, parseArchiveRead } from '../../utils/archiveAdapters';

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
    setAchievementLines: (lines: DrawerLine[]) => void;
    setCharacterInfo?: (info: Partial<import('../../types').CharacterInfo>) => void;
    setContainerContents?: React.Dispatch<React.SetStateAction<Record<string, DrawerLine[]>>>;
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
        setWhoLines, setWhoList, setScoreLines, setInfoLines, setQuestLines, setAchievementLines, registerEntity,
        practiceHandler,
        ansiConvert, captureStage, setContainerContents, setCharacterInfo
    } = deps;
    
    // We use a local ref to ensure synchronous updates while useGameParser 
    // is looping through lines. This avoids stale closures and state timing issues.
    const sessionRef = useRef<CaptureSession | null>(null);
    const pendingFlagsRef = useRef<{ isSilent: boolean, fromDrawer: boolean, command?: string }>({ isSilent: false, fromDrawer: false });
    const pendingSilentCommandsRef = useRef<string[]>([]);
    const lastRequestedContainerIdRef = useRef<string | null>(null);

    const setLastRequestedContainerId = useCallback((id: string | null) => {
        lastRequestedContainerIdRef.current = id;
    }, []);

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
        else if (/^(?:<header>)?\s*skill(?:\s*\/\s*spell)?\s+(?:sessions\s+)?knowledge\b/i.test(clean)) type = 'practice';
        else if (lower.includes('practice sessions left')) type = 'practice';
        else if (/^you have .+ achievements?:?$/i.test(clean)) type = 'achievement';
        else if (lower.includes('unfinished quest') || lower.includes('no unfinished quests') || lower.includes('not found any new quests') || (lower.includes('learnt of') && lower.includes('quest'))) type = 'quests';
        else if (lower.includes(', a level ') || lower.startsWith('you are a ') || lower.includes('real time')) type = 'info';
        else if (/\d+\/\d+ hits, \d+\/\d+ mana, and \d+\/\d+ moves/i.test(lower)) type = 'score';
        else if (clean.match(/^.{0,5}Score for /)) type = 'score';
        else if (lower.startsWith('when you look inside') || lower.startsWith('when you look in ')) type = 'container';
        else if (/^message\s+\d+\s+on\s+((?!mailbox|mail).)+:?$/i.test(clean)) type = 'board_read';
        else if (/^bulletin board for .+:$/i.test(clean)) type = 'board_list';
        else if (/^bulletin board:$/i.test(clean)) type = 'board_list';
        else if (lower.includes('board') && lower.includes('messages') && lower.includes('out of')) type = 'board_list';
        else if (/^message\s+\d+:/i.test(clean)) type = 'board_list';
        else if (/^-?\s*\d+(?:#:|\s+:).+\(.+\)$/i.test(clean)) type = 'board_list';
        else if (/^(?:mailbox|mail addressed to you|sent mail|your mail|you have \d+ mails?|mail\s+-\s+\d+\s+messages?)/i.test(clean)) type = 'mail_list';
        else if (/^(?:\+?\s*)?(?:mail|message)?\s*\d+(?:#|:|\.)\s+/i.test(clean) && lower.includes('@')) type = 'mail_list';
        else if (/^(?:mail|message)\s+\d+\s*(?::|\s+(?:in|from|on)\s+(?:your\s+)?(?:mailbox|mail|sent mail))/i.test(clean)) type = 'mail_read';

        return type;
    }, []);

    const startSession = useCallback((type: CaptureType) => {
        // console.log(`[Capture] Starting ${type} session`);
        if (sessionRef.current?.type === type && (Date.now() - sessionRef.current.startTime < 100)) {
            return;
        }

        const archiveView = useArchiveStore.getState().activeView;
        const newSession: CaptureSession = {
            type,
            lines: [],
            startTime: Date.now(),
            isSilent: pendingFlagsRef.current.isSilent,
            fromDrawer: pendingFlagsRef.current.fromDrawer,
            metadata: type === 'container'
                ? {
                    containerId: lastRequestedContainerIdRef.current,
                    command: pendingFlagsRef.current.command
                }
                : ['board_list', 'board_read', 'mail_list', 'mail_read', 'book_read'].includes(type)
                    ? { archiveView }
                    : undefined
        };
        if (type === 'container') {
            lastRequestedContainerIdRef.current = null;
        }
        sessionRef.current = newSession;
        setCaptureSession(newSession);
        console.log(`[Capture] Starting ${type} session. Silent flag from pending:`, newSession.isSilent);

        // Reset pending flags once session starts
        pendingFlagsRef.current = { isSilent: false, fromDrawer: false, command: undefined };

        const stageMap: Record<string, string> = {
            'inventory': 'inv',
            'equipment': 'eq',
            'who': 'who',
            'stats': 'stat',
            'practice': 'practice',
            'info': 'info',
            'score': 'score',
            'achievement': 'achievement',
            'board_list': 'board_list',
            'board_read': 'board_read',
            'mail_list': 'mail_list',
            'mail_read': 'mail_read',
            'book_read': 'book_read'
        };
        if (stageMap[type]) {
            captureStage.current = stageMap[type];
        }

        if (['board_list', 'mail_list'].includes(type)) {
            useArchiveStore.getState().setIsLoadingList(true);
            useArchiveStore.getState().setIsOpen(true);
        } else if (['board_read', 'mail_read', 'book_read'].includes(type)) {
            useArchiveStore.getState().setIsLoadingDetail(true);
            useArchiveStore.getState().setIsOpen(true);
        }
    }, [setCaptureSession, captureStage, sessionRef]);

    const decodeXmlEntities = (text: string) => text
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&');

    const stripXmlTags = (text: string) => decodeXmlEntities(text)
        .replace(/<prompt\b[^>]*>.*?<\/prompt>/gi, '')
        .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?>/g, (tag: string) => /^<[A-Z]>$/.test(tag) ? tag : '');

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
            lower.includes('visible players in your area') || lower.startsWith('distance') ||
            lower.startsWith('when you look inside') || lower.includes('it is empty.') ||
            lower.startsWith('in your') || cleanLine.toLowerCase().includes('<header>')) {
            isHeader = true;
        }

        const prefixMatch = ['board_list', 'board_read', 'mail_list', 'mail_read', 'book_read'].includes(session.type)
            ? null
            : cleanLine.match(/^(\s*(?:<|&lt;|\[|\*).*?(?:>|&gt;|\]|\*)\s*)(.*)/i);
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
        const objectText = (session.type === 'inventory' || session.type === 'equipment' || session.type === 'container') && !isHeader
            ? getObjectText(line)
            : null;

        // Entity registration for Items
        if ((session.type === 'inventory' || session.type === 'equipment' || session.type === 'container') && !isHeader) {
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
            isItem: !isHeader && (session.type === 'inventory' || session.type === 'equipment' || session.type === 'container'),
        };

        // Synchronous update of the ref so it's available for the next line
        session.lines.push(newLine);
        console.log(`[Capture] Accumulated line for ${session.type}: "${newLine.text}"`);
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
                    {
                        const affectedBy = parseAffectedByLines(lines);
                        if (affectedBy) setCharacterInfo?.({ affectedBy });
                    }
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
                case 'achievement':
                    setAchievementLines(lines);
                    break;
                case 'container': {
                    const containerId = session.metadata?.containerId;
                    if (containerId && setContainerContents) {
                        setContainerContents(prev => ({
                            ...prev,
                            [containerId]: lines
                        }));
                    }
                    break;
                }
                case 'board_list':
                case 'mail_list': {
                    const store = useArchiveStore.getState();
                    const view = session.metadata?.archiveView || store.activeView;
                    const parsedEntries = parseArchiveList(lines, view);
                    const expectedCount = getArchiveListExpectedCount(lines, view);
                    const isCompleteList = expectedCount !== null && parsedEntries.length >= expectedCount;
                    const nextEntries = isCompleteList
                        ? parsedEntries
                        : mergeArchiveEntries(store.entriesByView[view], parsedEntries);
                    store.setEntries(view, nextEntries);
                    store.setIsLoadingList(false);
                    break;
                }
                case 'board_read':
                case 'mail_read':
                case 'book_read': {
                    const store = useArchiveStore.getState();
                    const view = session.metadata?.archiveView || store.activeView;
                    store.setActiveDetail(parseArchiveRead(lines, view, store.activeDetail));
                    store.setIsLoadingDetail(false);
                    break;
                }
            }
        } catch (err) {
            console.error(`[Capture] Error updating ${session.type} lines:`, err);
        }

        sessionRef.current = null;
        setCaptureSession(null);
        captureStage.current = 'none';
    }, [setInventoryLines, setEqLines, setStatsLines, setWhoLines, setWhoList, setScoreLines, setInfoLines, setPracticeLines, setQuestLines, setAchievementLines, setCaptureSession, captureStage, practiceHandler, setContainerContents, setCharacterInfo]);

    const hasSession = useCallback(() => sessionRef.current !== null, [sessionRef]);
    const isSilent = useCallback(() => sessionRef.current?.isSilent || false, [sessionRef]);
    const isFromDrawer = useCallback(() => sessionRef.current?.fromDrawer || false, [sessionRef]);
    const getActiveType = useCallback(() => sessionRef.current?.type || 'none', [sessionRef]);
    const isPendingSilent = useCallback(() => pendingFlagsRef.current.isSilent, []);
    
    const normalizeCommandEcho = useCallback((value: string) => value
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/<\/?prompt[^>]*>/gi, '')
        .replace(/&gt;/gi, '>')
        .replace(/&lt;/gi, '<')
        .replace(/&amp;/gi, '&')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' '), []);

    const setPendingFlags = useCallback((isSilent: boolean, fromDrawer: boolean, command?: string) => {
        pendingFlagsRef.current = { isSilent, fromDrawer, command };
        if (!isSilent || !command?.trim()) return;

        pendingSilentCommandsRef.current.push(normalizeCommandEcho(command));
        if (pendingSilentCommandsRef.current.length > 20) {
            pendingSilentCommandsRef.current.shift();
        }
    }, [normalizeCommandEcho]);

    const shouldSuppressCommandEcho = useCallback((line: string, attachedText?: string) => {
        const pending = pendingSilentCommandsRef.current;
        if (pending.length === 0) return false;

        const candidates = [attachedText, line]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map(normalizeCommandEcho);

        const matchIndex = pending.findIndex(command => candidates.includes(command));
        if (matchIndex === -1) return false;

        pending.splice(matchIndex, 1);
        return true;
    }, [normalizeCommandEcho]);

    const getSession = useCallback(() => sessionRef.current, [sessionRef]);

    return {
        checkTriggers,
        startSession,
        accumulateLine,
        finalizeSession,
        hasSession,
        isSilent,
        isFromDrawer,
        getActiveType,
        setPendingFlags,
        isPendingSilent,
        shouldSuppressCommandEcho,
        setLastRequestedContainerId,
        getSession
    };
}
