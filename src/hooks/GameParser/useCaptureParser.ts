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
import { useShaperEntityStore } from '../../shaper/model/useShaperEntityStore';
import { useShaperLiveImportStore } from '../../shaper/import/useShaperLiveImportStore';
import { useUIStore } from '../../stores/useUIStore';

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
    const lastSilentCaptureEndedAtRef = useRef(0);
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
        else if (lower.includes('mobiles matching ') || lower.includes('matching mobiles')) type = 'shaper_mob_find';
        else if (lower.includes('objects matching ') || lower.includes('matching objects')) type = 'shaper_obj_find';
        else if (clean.match(/^Mobile\s+'[^']+',\s+vnum\s+\d+\./i)) type = 'shaper_mob_stat';
        else if (clean.match(/^Object\s+'[^']+',\s+vnum\s+\d+\./i)) type = 'shaper_obj_stat';
        else if (clean.match(/^Id:[{\[]\d+[}\]],\s+Instances:/i)) {
            const cmd = pendingFlagsRef.current.command ?? '';
            if (cmd.includes('stat o') || cmd.includes('stat object')) {
                type = 'shaper_obj_stat';
            } else {
                type = 'shaper_mob_stat';
            }
        }

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
                    : ['shaper_mob_stat', 'shaper_obj_stat', 'shaper_mob_info', 'shaper_obj_info', 'shaper_mob_find', 'shaper_obj_find',
                        'shaper_live_build_list', 'shaper_live_room_stat', 'shaper_live_com_list', 'shaper_live_lib_list'].includes(type)
                        ? { command: pendingFlagsRef.current.command }
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
            'book_read': 'book_read',
            'shaper_mob_find': 'shaper_mob_find',
            'shaper_obj_find': 'shaper_obj_find',
            'shaper_mob_stat': 'shaper_mob_stat',
            'shaper_obj_stat': 'shaper_obj_stat',
            'shaper_mob_info': 'shaper_mob_info',
            'shaper_obj_info': 'shaper_obj_info',
            'shaper_live_build_list': 'shaper_live_build_list',
            'shaper_live_room_stat': 'shaper_live_room_stat',
            'shaper_live_com_list': 'shaper_live_com_list',
            'shaper_live_lib_list': 'shaper_live_lib_list'
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
            lower.startsWith('in your') || cleanLine.toLowerCase().includes('<header>') ||
            lower.includes('matching mobiles') || lower.includes('matching objects') ||
            lower.includes('mobiles matching') || lower.includes('objects matching')) {
            isHeader = true;
        }

        const prefixMatch = ['board_list', 'board_read', 'mail_list', 'mail_read', 'book_read',
            'shaper_live_build_list', 'shaper_live_room_stat', 'shaper_live_com_list', 'shaper_live_lib_list'].includes(session.type)
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
                    {
                        const affectedBy = parseAffectedByLines(lines);
                        if (affectedBy) setCharacterInfo?.({ affectedBy });
                    }
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
                case 'examine': {
                    const store = useUIStore.getState();
                    const currentPopover = store.popoverState;
                    if (currentPopover) {
                        store.setPopoverState({
                            ...currentPopover,
                            capturedExamineLines: lines.map(l => l.html || l.text),
                            isCapturingExamine: false
                        });
                    }
                    break;
                }
                case 'consider': {
                    const store = useUIStore.getState();
                    const currentPopover = store.popoverState;
                    if (currentPopover) {
                        store.setPopoverState({
                            ...currentPopover,
                            capturedConsiderLines: lines.map(l => l.html || l.text),
                            isCapturingConsider: false
                        });
                    }
                    break;
                }
                case 'whois': {
                    const store = useUIStore.getState();
                    const currentPopover = store.popoverState;
                    if (currentPopover) {
                        store.setPopoverState({
                            ...currentPopover,
                            capturedWhoisLines: lines.map(l => l.html || l.text),
                            isCapturingWhois: false
                        });
                    }
                    break;
                }
                case 'self_title': {
                    const text = lines.map(l => l.text).join(' ');
                    const match = text.match(/current title is\s+(.+?)\.?\s*$/i) || text.match(/title is now\s+(.+?)\.?\s*$/i);
                    // If MUME refused the request (e.g. another edit session was
                    // still open), don't clobber the title with the error text.
                    if (!match) break;
                    const title = match[1].trim();
                    setCharacterInfo?.({ title: /^none$/i.test(title) ? '' : title });
                    break;
                }
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
                case 'shaper_mob_find': {
                    const parsed = lines
                        .filter(l => !l.isHeader && l.text.trim().length > 0)
                        .map(l => {
                            const text = l.text.trim();
                            // Match MUME format: 70: orc : an Ohurk-uai soldier
                            const match = text.match(/^\s*(\d+)\s*:\s*(?:([^:]+)\s*:\s*)?(.*)$/);
                            if (match) {
                                const vnum = parseInt(match[1], 10);
                                const name = (match[3] || match[2] || '').trim();
                                if (name && !name.toLowerCase().includes('no match') && !name.toLowerCase().includes('matching')) {
                                    return { vnum, name };
                                }
                            } else {
                                const fallbackMatch = text.match(/^\s*(?:\[?\s*(\d+)\s*\]?\.?\s+)?(.*)$/);
                                if (fallbackMatch) {
                                    const vnum = parseInt(fallbackMatch[1], 10);
                                    const name = fallbackMatch[2].trim();
                                    if (!isNaN(vnum) && name && !name.toLowerCase().includes('no match') && !name.toLowerCase().includes('matching')) {
                                        return { vnum, name };
                                    }
                                }
                            }
                            return null;
                        })
                        .filter((x): x is { vnum: number; name: string } => x !== null);
                    useShaperEntityStore.getState().setMobilesResult(parsed);
                    break;
                }
                case 'shaper_obj_find': {
                    const parsed = lines
                        .filter(l => !l.isHeader && l.text.trim().length > 0)
                        .map(l => {
                            const text = l.text.trim();
                            // Match MUME format: 70: orc : an Ohurk-uai soldier
                            const match = text.match(/^\s*(\d+)\s*:\s*(?:([^:]+)\s*:\s*)?(.*)$/);
                            if (match) {
                                const vnum = parseInt(match[1], 10);
                                const name = (match[3] || match[2] || '').trim();
                                if (name && !name.toLowerCase().includes('no match') && !name.toLowerCase().includes('matching')) {
                                    return { vnum, name };
                                }
                            } else {
                                const fallbackMatch = text.match(/^\s*(?:\[?\s*(\d+)\s*\]?\.?\s+)?(.*)$/);
                                if (fallbackMatch) {
                                    const vnum = parseInt(fallbackMatch[1], 10);
                                    const name = fallbackMatch[2].trim();
                                    if (!isNaN(vnum) && name && !name.toLowerCase().includes('no match') && !name.toLowerCase().includes('matching')) {
                                        return { vnum, name };
                                    }
                                }
                            }
                            return null;
                        })
                        .filter((x): x is { vnum: number; name: string } => x !== null);
                    useShaperEntityStore.getState().setObjectsResult(parsed);
                    break;
                }
                case 'shaper_mob_stat': {
                    const text = lines.map(l => l.text).join('\n');
                    const rawText = lines.map(l => l.rawText || l.text).join('\n');
                    let vnum = NaN;
                    let name = '';

                    for (const l of lines) {
                        const idMatch = l.text.match(/^Id:[{\[](\d+)[}\]]/i)
                            || l.text.match(/\bV-number:\s*\[?(\d+)\]?/i)
                            || l.text.match(/vnum\s+(\d+)\b/i);
                        if (idMatch) {
                            vnum = parseInt(idMatch[1], 10);
                        }

                        const nameMatch = l.text.match(/Short desc(?:ription)?:\s*(?:\[([^\]]*)\]|(.+))/i)
                            || l.text.match(/^Mobile\s+'([^']*)'/i);
                        if (nameMatch) {
                            name = (nameMatch[1] || nameMatch[2]).trim();
                        }
                    }

                    if (!isNaN(vnum)) {
                        let level = 0;
                        let mobClass = 'UNKNOWN';
                        let align = 0;

                        for (const l of lines) {
                            const lvlMatch = l.text.match(/Level:\s*(?:\[(\d+)\]|(\d+))/i);
                            if (lvlMatch) level = parseInt(lvlMatch[1] || lvlMatch[2], 10);

                            const classMatch = l.text.match(/Class:\s*(?:\[([^\]]+)\]|([^,\n]+))/i);
                            if (classMatch) mobClass = (classMatch[1] || classMatch[2]).trim();

                            const alignMatch = l.text.match(/(?:Align|Alignment):\s*(?:\[(-?\d+)\]|(-?\d+))/i);
                            if (alignMatch) align = parseInt(alignMatch[1] || alignMatch[2], 10);
                        }

                        useShaperEntityStore.getState().setMobileStatResult({
                            vnum,
                            name: name || 'UNKNOWN',
                            level,
                            class: mobClass,
                            align,
                            rawText
                        });
                    } else {
                        const cmdText = session.metadata?.command || '';
                        const cmdMatch = cmdText.match(/\/stat\s+[a-z]\s+(\d+)/i);
                        if (cmdMatch) {
                            const vnum = parseInt(cmdMatch[1], 10);
                            useShaperEntityStore.getState().setMobileStatResult({
                                vnum,
                                name: 'ERROR: Template not found',
                                level: 0,
                                class: 'UNKNOWN',
                                align: 0,
                                rawText: rawText || 'Template not found on MUD.'
                            });
                        }
                    }
                    break;
                }
                case 'shaper_obj_stat': {
                    const text = lines.map(l => l.text).join('\n');
                    const rawText = lines.map(l => l.rawText || l.text).join('\n');
                    let vnum = NaN;
                    let name = '';

                    for (const l of lines) {
                        const idMatch = l.text.match(/^Id:[{\[](\d+)[}\]]/i)
                            || l.text.match(/\bV-number:\s*\[?(\d+)\]?/i)
                            || l.text.match(/vnum\s+(\d+)\b/i);
                        if (idMatch) {
                            vnum = parseInt(idMatch[1], 10);
                        }

                        const nameMatch = l.text.match(/Short desc(?:ription)?:\s*(?:\[([^\]]*)\]|(.+))/i)
                            || l.text.match(/^Object\s+'([^']*)'/i);
                        if (nameMatch) {
                            name = (nameMatch[1] || nameMatch[2]).trim();
                        }
                    }

                    if (!isNaN(vnum)) {
                        let objType = 'UNKNOWN';
                        let weight = 0;
                        let value = 0;
                        let extraFlags: string[] = [];
                        let wearFlags: string[] = [];

                        for (const l of lines) {
                            const typeMatch = l.text.match(/Type:\s*(?:\[([^\]]+)\]|([^,\n]+))/i);
                            if (typeMatch) objType = (typeMatch[1] || typeMatch[2]).trim();

                            const extraMatch = l.text.match(/Extra flags:\s*(?:\[([^\]]+)\]|([^,\n]+))/i);
                            if (extraMatch) {
                                const flagsText = (extraMatch[1] || extraMatch[2]).trim();
                                if (flagsText.toLowerCase() !== 'none') {
                                    extraFlags = flagsText.split(/[\s,]+/).map(f => f.trim()).filter(Boolean);
                                }
                            }

                            const wearMatch = l.text.match(/Wear flags:\s*(?:\[([^\]]+)\]|([^.\n]+))/i);
                            if (wearMatch) {
                                const flagsText = (wearMatch[1] || wearMatch[2]).trim();
                                if (flagsText.toLowerCase() !== 'none') {
                                    wearFlags = flagsText.split(/[\s,]+/).map(f => f.trim()).filter(Boolean);
                                }
                            }

                            const weightMatch = l.text.match(/Weight:\s*(?:\[([\d.]+)(?:\s*kg)?\]|([\d.]+))/i);
                            if (weightMatch) weight = parseFloat(weightMatch[1] || weightMatch[2]);

                            const valueMatch = l.text.match(/Value:\s*(?:\[(\d+)\]|(\d+))/i);
                            if (valueMatch) value = parseInt(valueMatch[1] || valueMatch[2], 10);
                        }

                        useShaperEntityStore.getState().setObjectStatResult({
                            vnum,
                            name: name || 'UNKNOWN',
                            type: objType,
                            weight,
                            value,
                            extraFlags,
                            wearFlags,
                            rawText
                        });
                    } else {
                        const cmdText = session.metadata?.command || '';
                        const cmdMatch = cmdText.match(/\/stat\s+[a-z]\s+(\d+)/i);
                        if (cmdMatch) {
                            const vnum = parseInt(cmdMatch[1], 10);
                            useShaperEntityStore.getState().setObjectStatResult({
                                vnum,
                                name: 'ERROR: Template not found',
                                type: 'UNKNOWN',
                                weight: 0,
                                value: 0,
                                extraFlags: [],
                                wearFlags: [],
                                rawText: rawText || 'Template not found on MUD.'
                            });
                        }
                    }
                    break;
                }
                case 'shaper_mob_info': {
                    const text = lines.map(l => l.rawText || l.text).join('\n');
                    const cmdText = session.metadata?.command || '';
                    const cmdMatch = cmdText.match(/\/info\s+[a-z]\s+(\d+)/i);
                    if (cmdMatch) {
                        const vnum = parseInt(cmdMatch[1], 10);
                        useShaperEntityStore.getState().setMobileInfoResult(vnum, text);
                    }
                    break;
                }
                case 'shaper_obj_info': {
                    const text = lines.map(l => l.rawText || l.text).join('\n');
                    const cmdText = session.metadata?.command || '';
                    const cmdMatch = cmdText.match(/\/info\s+[a-z]\s+(\d+)/i);
                    if (cmdMatch) {
                        const vnum = parseInt(cmdMatch[1], 10);
                        useShaperEntityStore.getState().setObjectInfoResult(vnum, text);
                    }
                    break;
                }
                case 'shaper_live_build_list':
                case 'shaper_live_room_stat':
                case 'shaper_live_com_list':
                case 'shaper_live_lib_list': {
                    useShaperLiveImportStore.getState().receiveCapture({
                        type: session.type,
                        command: session.metadata?.command ?? '',
                        output: lines.map(l => l.text).join('\n')
                    });
                    break;
                }
            }
        } catch (err) {
            console.error(`[Capture] Error updating ${session.type} lines:`, err);
        }

        const endedSilentCapture = !!session.isSilent;
        if (endedSilentCapture) {
            lastSilentCaptureEndedAtRef.current = Date.now();
        }

        sessionRef.current = null;
        setCaptureSession(null);

        const currentStage = captureStage.current;
        const normalizedExpected = currentStage === 'eq' ? 'equipment'
            : currentStage === 'inv' ? 'inventory'
            : (currentStage === 'stat' || currentStage === 'status') ? 'stats'
            : currentStage === 'quest' ? 'quests'
            : currentStage === 'sc' ? 'score'
            : currentStage;

        if (normalizedExpected === session.type && !pendingFlagsRef.current.command) {
            captureStage.current = 'none';
        }
    }, [setInventoryLines, setEqLines, setStatsLines, setWhoLines, setWhoList, setScoreLines, setInfoLines, setPracticeLines, setQuestLines, setAchievementLines, setCaptureSession, captureStage, pendingFlagsRef, practiceHandler, setContainerContents, setCharacterInfo]);

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

    const shouldSuppressSilentBlank = useCallback((line: string) => {
        if (line.trim().length > 0) return false;
        if (sessionRef.current?.isSilent || pendingFlagsRef.current.isSilent) return true;
        return Date.now() - lastSilentCaptureEndedAtRef.current < 900;
    }, []);

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
        shouldSuppressSilentBlank,
        setLastRequestedContainerId,
        getSession
    };
}
