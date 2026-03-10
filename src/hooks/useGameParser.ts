import { useState, useRef, useCallback } from 'react';
import { GameStats, DrawerLine, GameAction } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun } from '../utils/gameUtils';
import { usePracticeParser } from './usePracticeParser';
import { useTriggerProcessor } from './useTriggerProcessor';
import { useShopHandler } from './useShopHandler';
import { usePracticeHandler } from './usePracticeHandler';

export interface UseGameParserDeps {
    isItemsOpen: boolean; isCharacterOpen: boolean; mapperRef: React.RefObject<any>;
    btn: { buttonsRef: React.RefObject<any[]>; setButtons: React.Dispatch<React.SetStateAction<any[]>>; buttonTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>; setActiveSet: (setId: string) => void; };
    addMessage: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void;
    playSound: (buffer: AudioBuffer) => void; triggerHaptic: (ms: number) => void;
    setWeather: (val: any) => void; setIsFoggy: (val: boolean) => void;
    setStats: (val: GameStats | ((prev: GameStats) => GameStats)) => void;
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setCharacterClass: (val: any) => void; setRumble: (val: boolean) => void;
    setHitFlash: (val: boolean) => void; setDeathStage: (val: any) => void;
    setInCombat: (val: boolean, force?: boolean) => void;
    setLightningEnabled: (val: boolean) => void;
    setPlayerPosition: (val: string) => void; detectLighting: (light: string) => void;
    setCurrentTerrain?: (terrain: string) => void;
    isSoundEnabledRef: React.RefObject<boolean>; soundTriggersRef: React.RefObject<any[]>;
    actionsRef: React.RefObject<GameAction[]>;
    executeCommandRef: React.RefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>;
    setInventoryLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setStatsLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    captureStage: React.MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'shop' | 'none'>;
    practice: ReturnType<typeof usePracticeHandler>;
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    roomNameRef: React.RefObject<string | null>;
    roomName: string | null;
    showDebugEchoes?: boolean;
    addDiagnosticLog?: (msg: string) => void;
}

export function useGameParser(deps: UseGameParserDeps) {
    const { mapperRef, btn, addMessage, playSound, triggerHaptic, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, executeCommandRef, setInventoryLines, setStatsLines, setEqLines, captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, roomNameRef, showDebugEchoes, addDiagnosticLog } = deps;

    const { parsePracticeLine } = usePracticeParser(setAbilities, setCharacterClass);
    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef });
    const { parseShopLine, isShopListingActive, setIsShopListingActive } = useShopHandler();

    const containerStackRef = useRef<{ depth: number, noun: string }[]>([]);
    const counterRef = useRef(0);

    const processLine = useCallback((line: string) => {
        let cleanLine = line.replace(/\r$/, '');
        if (!cleanLine) return;

        let textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        let lower = textOnly.toLowerCase();

        const promptRegex = /^((?:(?:\x1b\[[0-9;]*m)*?(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(])\s*?)*[>:])\s*/;
        const textPMatch = textOnly.match(promptRegex);

        if (textPMatch) {
            const promptPart = textPMatch[1];
            const attachedText = textOnly.slice(textPMatch[0].length).trim();

            const symbolMatch = promptPart.match(/[\*\)\!oO\.\[f%\~+WU:=O\#\?\(]/);
            if (symbolMatch) {
                const symbol = symbolMatch[0];
                if (detectLighting) detectLighting(symbol);
                if (deps.setCurrentTerrain && !['*', '!', ')', 'o', 'O', '?'].includes(symbol)) {
                    deps.setCurrentTerrain(symbol);
                }
            }

            if (!attachedText) {
                captureStage.current = 'none';
                isDrawerCapture.current = 0;
                isSilentCapture.current = 0;
                containerStackRef.current = [];
                return;
            }

            textOnly = attachedText;
            lower = textOnly.toLowerCase();

            const ansiStripRegex = /^((?:\x1b\[[0-9;]*m)*?((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(])\s*)*[>:])\s*)/;
            cleanLine = cleanLine.replace(ansiStripRegex, '').trim();
        }

        const currentRoomName = roomNameRef.current;
        const textOnlyRaw = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const lowerRaw = textOnlyRaw.toLowerCase();

        // SPLIT logic: If the line starts with the room name followed by a dot/space, and it's a long line, split it.
        // This handles cases where the MUD sends the header and first description line in one go during movement.
        if (currentRoomName && (textOnlyRaw.startsWith(currentRoomName) || lowerRaw.startsWith(currentRoomName.toLowerCase()))) {
            const headerPart = textOnlyRaw.startsWith(currentRoomName) ? currentRoomName : textOnlyRaw.substring(0, currentRoomName.length);
            const remaining = textOnlyRaw.substring(headerPart.length);
            const nextChar = remaining[0];

            // If it's the exact match or followed by typical header terminators
            if (!nextChar || nextChar === '.' || nextChar === ' ' || nextChar === '[') {
                const headerEndIdx = cleanLine.indexOf(headerPart) + headerPart.length;
                let finalHeaderEndIdx = headerEndIdx;
                if (cleanLine[headerEndIdx] === '.') finalHeaderEndIdx++;

                // If there's significant text after the header, split and recurse
                if (cleanLine.substring(finalHeaderEndIdx).trim().length > 3) {
                    const headerText = cleanLine.substring(0, finalHeaderEndIdx);
                    const restText = cleanLine.substring(finalHeaderEndIdx).trim();
                    processLine(headerText);
                    processLine(restText);
                    return;
                }
            }
        }

        let isRoomMatched = currentRoomName && (
            textOnly === currentRoomName ||
            lower === currentRoomName.toLowerCase() ||
            textOnly === currentRoomName + '.' ||
            lower === currentRoomName.toLowerCase() + '.' ||
            (textOnly.length < currentRoomName.length + 8 && (textOnly.startsWith(currentRoomName) || lower.startsWith(currentRoomName.toLowerCase())))
        );
        let isRoomAnsiMatch = /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[01];3[26]m/.test(cleanLine);
        let isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ') && !/carrying|using|following|contains/i.test(lower)));

        if (isRoomName && captureStage.current === 'none' && !isWaitingForStats.current && !isWaitingForEq.current && !isWaitingForInv.current) {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;
        }

        if (captureStage.current === 'none') {
            containerStackRef.current = [];
        }

        if (lower.includes("starts to rain") || lower.includes("it is raining")) setWeather(lower.includes("heavily") ? 'heavy-rain' : 'rain');
        if (lower.includes("starts to snow") || lower.includes("it is snowing")) setWeather('snow');
        if (lower.includes("rain stops") || lower.includes("snow stops") || lower.includes("clouds disappear")) setWeather('none');
        if (lower.includes("thick fog")) setIsFoggy(true);
        if (lower.includes("fog thins") || lower.includes("fog dissipates")) setIsFoggy(false);

        if (lower.includes("flash of lightning") || lower.includes("lightning illuminates")) {
            setLightningEnabled(true);
            setTimeout(() => setLightningEnabled(false), 200);
            setTimeout(() => setLightningEnabled(true), 350);
            setTimeout(() => setLightningEnabled(false), 450);
        }

        if (lower.includes("alas, you cannot go that way") ||
            lower.includes("there is no exit") ||
            lower.includes("you bump into")) {
            setRumble(true);
            triggerHaptic(40);
            setTimeout(() => setRumble(false), 300);
        }

        if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) {
            isWaitingForStats.current = false; captureStage.current = 'stat'; containerStackRef.current = [];
        }
        if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            isWaitingForEq.current = false; captureStage.current = 'eq'; containerStackRef.current = [];
            setEqLines([]);
        }
        if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains/i.test(lower)) {
            isWaitingForInv.current = false; captureStage.current = 'inv'; containerStackRef.current = [];
            setInventoryLines([]);
        }
        if (lower.includes('skill / spell') || lower.includes('knowledge') || (lower.includes('sessions') && lower.includes('practice'))) {
            if (deps.practice.isUiRequested) {
                captureStage.current = 'practice';
                isSilentCapture.current = 1;
            }
        }

        if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            captureStage.current = 'shop';
            setIsShopListingActive(true);
            addDiagnosticLog?.('Shop parsing activated');
        }

        // Detect end of shop listing (prompt)
        const isPrompt = /^((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(])\s*)*[>:])\s*$/.test(textOnly) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:') && textOnly.includes('>'));

        if (isPrompt && (captureStage.current === 'shop' || isShopListingActive)) {
            captureStage.current = 'none';
            setIsShopListingActive(false);
            addDiagnosticLog?.('Shop parsing terminated by prompt');
        }

        if (isPrompt && (captureStage.current === 'practice' || deps.practice.isPracticeActive)) {
            captureStage.current = 'none';
            deps.practice.setIsPracticeActive(false);
            deps.practice.setIsUiRequested(false);
        }

        if (captureStage.current === 'inv' || captureStage.current === 'eq' || captureStage.current === 'stat') {
            const createLine = (l: string, cmd: string): DrawerLine => {
                const lowerLine = l.toLowerCase();
                const textOnlyLine = l.replace(/\x1b\[[0-9;]*m/g, '').trim();

                const leadingSpaces = l.replace(/\x1b\[[0-9;]*m/g, '').match(/^ */)?.[0].length || 0;
                const depth = Math.floor(leadingSpaces / 3);

                const isHdr = /you are (carrying|using|equipped with)|contains/i.test(lowerLine);
                const isNothing = /nothing/i.test(lowerLine).valueOf();
                const isContainer = lowerLine.includes('(containing)') || lowerLine.endsWith(':');

                const noun = extractNoun(l);

                while (containerStackRef.current.length > 0 && containerStackRef.current[containerStackRef.current.length - 1].depth >= depth) {
                    containerStackRef.current.pop();
                }

                let context = noun;
                if (depth > 0 && containerStackRef.current.length > 0) {
                    context = `${noun}.${containerStackRef.current[containerStackRef.current.length - 1].noun}`;
                }

                if (isContainer) {
                    containerStackRef.current.push({ depth, noun });
                }

                return {
                    id: Math.random().toString(36).substring(7),
                    text: textOnlyLine,
                    html: ansiConvert.toHtml(l),
                    isItem: !isHdr && !isNothing,
                    isHeader: isHdr,
                    isContainer,
                    depth,
                    cmd,
                    context
                };
            };

            if (captureStage.current === 'inv') {
                setInventoryLines(p => [...p, createLine(cleanLine, 'inventorylist')]);
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) {
                    setEqLines(p => [...p, createLine(cleanLine, 'equipmentlist')]);
                }
            } else setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
        } else if (captureStage.current === 'shop') {
            const shopItem = parseShopLine(textOnly);
            if (shopItem) {
                const stableId = `shop-${shopItem.id}-${Date.now()}-${counterRef.current++}`;
                addMessage('shop-item', textOnly, undefined, stableId, false, { textOnly, lower }, shopItem, undefined, undefined, true);
                return;
            }
        }

        // Practice updates can happen outside of captureStage (after table is closed)
        const practiceResult = deps.practice.parsePracticeLine(textOnly);
        if (captureStage.current === 'practice') {
            if (typeof practiceResult === 'object' && practiceResult !== null) {
                if ('sessionsLeft' in practiceResult) {
                    addMessage('practice-header', textOnly, undefined, `prac-hdr-${Date.now()}`, false, { textOnly, lower }, undefined, undefined, practiceResult, true);
                } else {
                    const stableId = `prac-${practiceResult.name}-${Date.now()}-${counterRef.current++}`;
                    addMessage('practice-skill', textOnly, undefined, stableId, false, { textOnly, lower }, undefined, practiceResult);
                }
                return;
            } else if (practiceResult === true) {
                return; // Suppress header/sessions text
            }
            parsePracticeLine(textOnly); // Still update the abilities in state
            return; // Suppress ANY other line while in practice capture stage
        }

        const trackAction = () => {
            if (isSilentCapture.current > 0 || isDrawerCapture.current) return;

            const wearMatch = cleanLine.match(/You (wear|put on) (.*?)\./i);
            if (wearMatch) {
                const itemNoun = extractNoun(wearMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx];
                    setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                    return prev.filter((_, i) => i !== idx);
                });
                return;
            }

            const removeMatch = cleanLine.match(/You (remove|stop using) (.*?)\./i);
            if (removeMatch) {
                const itemNoun = extractNoun(removeMatch[2]);
                setEqLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx];
                    setInventoryLines(inv => [...inv, { ...item, cmd: 'inventorylist' }]);
                    return prev.filter((_, i) => i !== idx);
                });
                return;
            }

            const putMatch = cleanLine.match(/You put (.*?) in (.*?)\./i);
            if (putMatch) {
                const itemNoun = extractNoun(putMatch[1]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    return prev.filter((_, i) => i !== idx);
                });
                return;
            }

            const getMatch = cleanLine.match(/You (get|take) (.*?)\.( from (.*?)\.)?/i);
            if (getMatch) {
                const itemText = getMatch[2];
                const newItem: DrawerLine = {
                    id: Math.random().toString(36).substring(7),
                    text: itemText,
                    html: ansiConvert.toHtml(itemText),
                    isItem: true,
                    cmd: 'inventorylist',
                    context: extractNoun(itemText)
                };
                setInventoryLines(prev => [...prev, newItem]);
                return;
            }

            const receiveMatch = cleanLine.match(/(.*?) gives you (.*?)\./i);
            if (receiveMatch) {
                const itemText = receiveMatch[2];
                const newItem: DrawerLine = {
                    id: Math.random().toString(36).substring(7),
                    text: itemText,
                    html: ansiConvert.toHtml(itemText),
                    isItem: true,
                    cmd: 'inventorylist',
                    context: extractNoun(itemText)
                };
                setInventoryLines(prev => [...prev, newItem]);
                return;
            }

            const giveMatch = cleanLine.match(/You (give|drop|junk) (.*?)\./i);
            if (giveMatch) {
                const itemNoun = extractNoun(giveMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    return prev.filter((_, i) => i !== idx);
                });
                return;
            }

            const wieldMatch = cleanLine.match(/You (wield|hold) (.*?)\./i);
            if (wieldMatch) {
                const itemNoun = extractNoun(wieldMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx];
                    setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                    return prev.filter((_, i) => i !== idx);
                });
                return;
            }

            const consumeMatch = cleanLine.match(/You (eat|quaff|drink) (.*?)\./i);
            if (consumeMatch) {
                const itemNoun = extractNoun(consumeMatch[2]);
                if (!consumeMatch[0].includes('from')) {
                    setInventoryLines(prev => {
                        const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                        if (idx === -1) return prev;
                        return prev.filter((_, i) => i !== idx);
                    });
                }
                return;
            }
        };

        trackAction();
        processTriggers(textOnly);

        isRoomMatched = currentRoomName && (
            textOnly === currentRoomName ||
            lower === currentRoomName.toLowerCase() ||
            textOnly === currentRoomName + '.' ||
            lower === currentRoomName.toLowerCase() + '.' ||
            (textOnly.length < currentRoomName.length + 8 && (textOnly.startsWith(currentRoomName) || lower.startsWith(currentRoomName.toLowerCase())))
        );
        isRoomAnsiMatch = /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[01];3[26]m/.test(cleanLine);
        isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ') && !/carrying|using|following|contains/i.test(lower)));

        const isImportantMessage = /hits you|receive your share|is dead|tells you|say,|group:|mood:|alertness:|spell speed:|following/i.test(lower);
        const shouldShow = (isSilentCapture.current === 0 || isImportantMessage);

        if (shouldShow) {
            const finalRawText = cleanLine;
            const precalculated = { textOnly: textOnly, lower: lower };
            const stableId = `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`;
            addMessage('game', finalRawText, undefined, stableId, isRoomName, precalculated, undefined, undefined, undefined, false);
        }
    }, [addMessage, setStats, setRumble, setHitFlash, setDeathStage, setInventoryLines, setStatsLines, setEqLines, triggerHaptic, mapperRef, parsePracticeLine, processTriggers, roomNameRef, executeCommandRef, captureStage, isDrawerCapture, isSilentCapture]);

    return { processLine };
}
