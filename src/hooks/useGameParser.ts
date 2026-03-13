import { useState, useRef, useCallback } from 'react';
import { GameStats, DrawerLine, GameAction, MessageType, PopoverState, CaptureStage } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun, isItemContainer } from '../utils/gameUtils';
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
    setWhoList: React.Dispatch<React.SetStateAction<string[]>>;
    captureStage: React.MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'shop' | 'who' | 'where' | 'container' | 'none'>;
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
    popoverState: PopoverState | null;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    pendingDrawerContainerRef?: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
}

export function useGameParser(deps: UseGameParserDeps) {
    const { mapperRef, btn, addMessage, playSound, triggerHaptic, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, executeCommandRef, setInventoryLines, setStatsLines, setEqLines, setWhoList, captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, roomNameRef, showDebugEchoes, addDiagnosticLog, popoverState, setPopoverState } = deps;

    const { parsePracticeLine } = usePracticeParser(setAbilities, setCharacterClass);
    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef });
    const { parseShopLine, isShopListingActive, setIsShopListingActive } = useShopHandler();

    const containerStackRef = useRef<{ depth: number, noun: string, context: string }[]>([]);
    const nounCountsRef = useRef<Record<string, number>>({});
    const counterRef = useRef(0);
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);

    const processLine = useCallback((line: string) => {
        const finalizeCapture = () => {
            const stagesToTerminate: CaptureStage[] = ['who', 'where', 'inv', 'eq', 'stat', 'container', 'shop', 'practice'];
            if (stagesToTerminate.includes(captureStage.current as any)) {
                const currentStage = captureStage.current as CaptureStage;
                console.log(`[Parser] Finalizing ${currentStage} capture. Buffers: eq=${tempEqRef.current.length}, inv=${tempInvRef.current.length}`);
                if (currentStage === 'eq') {
                    setEqLines([...tempEqRef.current]);
                } else if (currentStage === 'inv') {
                    setInventoryLines([...tempInvRef.current]);
                }
                captureStage.current = 'none';
                isDrawerCapture.current = 0;
                isSilentCapture.current = 0;
                containerStackRef.current = [];
            }
        };

        let cleanLine = line.replace(/\r$/, '').normalize('NFC');
        if (!cleanLine) return;

        // Perform ANSI stripping ONCE here and reuse the result everywhere.
        let textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        let lower = textOnly.toLowerCase();

        // Use the ALREADY STRIPPED text for the prompt regex. It's much faster.
        const promptRegex = /^((?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-]|\([^)]+\))\s*)*[>:]\s*/;
        const textPMatch = textOnly.match(promptRegex);

        if (textPMatch || captureStage.current === 'none') {
            nounCountsRef.current = {};
        }

        if (textPMatch) {
            const promptPart = textPMatch[0];
            const attachedText = textOnly.slice(promptPart.length).trim();

            const symbolMatch = promptPart.match(/[\*\)\!oO\.\[f%\~+WU:=O\#\?\(]/);
            if (symbolMatch) {
                const symbol = symbolMatch[0];
                if (detectLighting) detectLighting(symbol);
                if (deps.setCurrentTerrain && !['*', '!', ')', 'o', 'O', '?'].includes(symbol)) {
                    deps.setCurrentTerrain(symbol);
                }
            }

            if (!attachedText) {
                finalizeCapture();
                return;
            }

            textOnly = attachedText;
            lower = textOnly.toLowerCase();

            // Strip the actual prompt part from the cleanLine so the ANSI HTML doesn't render it
            const ansiStripRegex = /^((?:\x1b\[[0-9;]*m)*?((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-])\s*)*[>:])\s*)/ ;
            cleanLine = cleanLine.replace(ansiStripRegex, '').trim();
        }

        const currentRoomName = roomNameRef.current;
        const textOnlyRaw = textOnly;
        const lowerRaw = lower;

        // SPLIT logic
        if (currentRoomName && (textOnlyRaw.startsWith(currentRoomName) || lowerRaw.startsWith(currentRoomName.toLowerCase()))) {
            const headerPart = textOnlyRaw.startsWith(currentRoomName) ? currentRoomName : textOnlyRaw.substring(0, currentRoomName.length);
            const remaining = textOnlyRaw.substring(headerPart.length);
            const nextChar = remaining[0];
            if (!nextChar || nextChar === '.' || nextChar === ' ' || nextChar === '[') {
                const headerEndIdx = cleanLine.indexOf(headerPart) + headerPart.length;
                let finalHeaderEndIdx = headerEndIdx;
                if (cleanLine[headerEndIdx] === '.') finalHeaderEndIdx++;
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

        const stopMovementMsg = lower.includes("alas, you cannot go that way") ||
            lower.includes("there is no exit") ||
            lower.includes("you bump into") ||
            lower.includes("maybe you should get on your feet") ||
            lower.includes("nah, you're too exhausted") ||
            lower.includes("you are too exhausted") ||
            lower.includes("you're too exhausted") ||
            lower.includes("in your condition?") ||
            lower.includes("you're too stunned") ||
            lower.includes("you are too stunned") ||
            lower.includes("is blocking the way");

        if (stopMovementMsg) {
            setRumble(true);
            triggerHaptic(40);
            mapperRef.current?.handleMoveFailure();
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail'));
            setTimeout(() => setRumble(false), 300);
        }

        if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) {
            isWaitingForStats.current = false; (captureStage as any).current = 'stat'; containerStackRef.current = [];
        }
        if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            isWaitingForEq.current = false; (captureStage as any).current = 'eq'; containerStackRef.current = [];
            tempEqRef.current = [];
            isDrawerCapture.current = 1;
        }
        if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains/i.test(lower)) {
            isWaitingForInv.current = false; (captureStage as any).current = 'inv'; containerStackRef.current = [];
            tempInvRef.current = [];
            isDrawerCapture.current = 1;
        }
        if (lower.includes('skill / spell') || lower.includes('knowledge') || (lower.includes('sessions') && lower.includes('practice'))) {
            if (deps.practice.isUiRequested) {
                (captureStage as any).current = 'practice';
                isSilentCapture.current = 1;
            }
        }

        if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            (captureStage as any).current = 'shop';
            setIsShopListingActive(true);
            addDiagnosticLog?.('Shop parsing activated');
        }

        if (textOnly === 'who:' || lower === 'allies' || lower === 'minions') {
            (captureStage as any).current = 'who';
            setWhoList([]); // Clear when list starts
        }

        if ((textOnly.startsWith('Player') && textOnly.includes('Room')) || (textOnly.startsWith('Who') && textOnly.includes('Location'))) {
            (captureStage as any).current = 'where';
        }

        // Detect container header: "In a large sack (in inventory):"
        if (/^In (.*?):$/.test(textOnly) && !textOnly.includes('equipment')) {
            console.log('[Parser] Detected container header, triggering container capture');
            (captureStage as any).current = 'container';
            // Sync isDrawerCapture if we are expanding a container in a drawer
            if (deps.pendingDrawerContainerRef?.current) {
                isDrawerCapture.current = 1;
            }
        }

        // Detect end of shop listing (prompt)
        const isPrompt = /^((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-]|\([^)]+\))\s*)*[>:])\s*$/.test(textOnly) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:') && textOnly.includes('>'));

        if (isPrompt) {
            console.log('[Parser] isPrompt=true', { textOnly, captureStage: captureStage.current });
        }

        if (isPrompt && (captureStage.current === 'shop' || isShopListingActive)) {
            setIsShopListingActive(false);
            addDiagnosticLog?.('Shop parsing terminated by prompt');
        }

        if (isPrompt && (captureStage.current === 'practice' || deps.practice.isPracticeActive)) {
            deps.practice.setIsPracticeActive(false);
            deps.practice.setIsUiRequested(false);
        }

        if (captureStage.current === 'inv' || captureStage.current === 'eq' || captureStage.current === 'stat' || captureStage.current === 'container') {
            const createLine = (l: string, tOnly: string, lLower: string, cmd: string): DrawerLine => {
                const leadingSpaces = l.replace(/\x1b\[[0-9;]*m/g, '').match(/^ */)?.[0].length || 0;
                const depth = Math.floor(leadingSpaces / 3);

                const isContainer = isItemContainer(l);
                
                const isHdr = /you are (carrying|using|equipped with)|contains|in your (.*?):/i.test(lLower);
                const isNothing = /nothing/i.test(lLower).valueOf();

                if (!isHdr && !isNothing && isContainer) {
                    addDiagnosticLog?.(`Detected container: ${textOnly}`);
                }

                let prefix = '';
                let prefixHtml = '';
                let mainText = tOnly;
                let mainHtml = ansiConvert.toHtml(l);

                if (cmd === 'equipmentlist') {
                    // Match pattern like " <worn as shield> " or "<worn as shield>"
                    const eqMatch = l.match(/^(\s*(?:\x1b\[[0-9;]*m)*<[^>]+>(?:\x1b\[[0-9;]*m)*\s*)(.*)/);
                    if (eqMatch) {
                        prefixHtml = ansiConvert.toHtml(eqMatch[1]);
                        prefix = tOnly.match(/^<[^>]+>\s*/)?.[0] || '';
                        mainHtml = ansiConvert.toHtml(eqMatch[2]);
                        mainText = tOnly.replace(/^<[^>]+>\s*/, '');
                    }
                }

                const noun = extractNoun(mainText || l);
                
                // Track stable IDs within this capture session
                nounCountsRef.current[noun] = (nounCountsRef.current[noun] || 0) + 1;
                const count = nounCountsRef.current[noun];
                const stableId = count > 1 ? `${count}.${noun}` : noun;

                while (containerStackRef.current.length > 0 && containerStackRef.current[containerStackRef.current.length - 1].depth >= depth) {
                    containerStackRef.current.pop();
                }

                let context = stableId;
                if (depth > 0 && containerStackRef.current.length > 0) {
                    context = `${stableId}.${containerStackRef.current[containerStackRef.current.length - 1].context}`;
                }

                if (isContainer) {
                    containerStackRef.current.push({ depth, noun, context });
                }

                return {
                    id: context || stableId || Math.random().toString(36).substring(7),
                    text: mainText,
                    html: mainHtml,
                    prefix,
                    prefixHtml,
                    isItem: !isHdr && !isNothing,
                    isHeader: isHdr,
                    isContainer,
                    depth,
                    cmd,
                    context
                };
            };

            if (captureStage.current === 'inv') {
                console.log('[Parser] Capturing to inventory buffer:', textOnly);
                tempInvRef.current.push(createLine(cleanLine, textOnly, lower, 'inventorylist'));
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) {
                    console.log('[Parser] Capturing to equipment buffer:', textOnly);
                    tempEqRef.current.push(createLine(cleanLine, textOnly, lower, 'equipmentlist'));
                }
            } else if (captureStage.current === 'container') {
                if (textOnly.length > 0 && !lower.includes('contains:')) {
                    const containerLine = createLine(cleanLine, textOnly, lower, 'lookin');
                    const drawerPending = deps.pendingDrawerContainerRef?.current;
                    if (drawerPending) {
                        // Inject into the correct drawer list right after the container item
                        const { containerId, cmd, afterId } = drawerPending;
                        const injectedLine: DrawerLine = {
                            ...containerLine,
                            cmd,
                            // Depth is at minimum one level inside the container
                            depth: Math.max(containerLine.depth, 1)
                        };
                        if (cmd === 'inventorylist') {
                            setInventoryLines(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) {
                                    console.log('[Parser] Injection failed: parent not found in inventoryLines', containerId);
                                    return prev;
                                }
                                
                                const parent = prev[parentIdx];
                                const parentDepth = parent.depth || 0;
                                const injectedLine: DrawerLine = {
                                    ...containerLine,
                                    id: `${containerLine.id}.${containerId}`,
                                    cmd,
                                    depth: parentDepth + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id,
                                    parentItemNoun: parent.context || parent.id,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };

                                console.log('[Parser] Injecting into inventory:', {
                                    item: injectedLine.id,
                                    parent: containerId,
                                    depth: injectedLine.depth
                                });

                                // Prevent duplicates
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) {
                                    return prev;
                                }

                                const next = [...prev];
                                next.splice(parentIdx + 1, 0, injectedLine);
                                return next;
                            });
                        } else {
                            setEqLines(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) {
                                    console.log('[Parser] Injection failed: parent not found in eqLines', containerId);
                                    return prev;
                                }

                                const parent = prev[parentIdx];
                                const parentDepth = parent.depth || 0;
                                const injectedLine: DrawerLine = {
                                    ...containerLine,
                                    id: `${containerLine.id}.${containerId}`,
                                    cmd,
                                    depth: parentDepth + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id,
                                    parentItemNoun: parent.context || parent.id,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };

                                console.log('[Parser] Injecting into equipment:', {
                                    item: injectedLine.id,
                                    parent: containerId,
                                    depth: injectedLine.depth
                                });

                                // Prevent duplicates
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) {
                                    return prev;
                                }

                                const next = [...prev];
                                next.splice(parentIdx + 1, 0, injectedLine);
                                return next;
                            });
                        }
                    } else {
                        console.log('[Parser] drawerPending is null, falling back to popover mode');
                        // Fall back to popover for standalone look in commands
                        // @ts-ignore - containerItems added to type
                        setPopoverState((prev: any) => {
                            if (!prev) return prev;
                            const next = {
                                ...prev,
                                type: 'container',
                                containerItems: [...(prev.containerItems || []), containerLine]
                            };
                            return next;
                        });
                    }
                }
                
                return; // Prevent fall-through to log
            } else {
                setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
            }
            return; // Suppress from log
        } else if (captureStage.current === 'shop') {
            const shopItem = parseShopLine(textOnly);
            if (shopItem) {
                const stableId = `shop-${shopItem.id}-${Date.now()}-${counterRef.current++}`;
                addMessage('shop-item', textOnly, undefined, stableId, false, { textOnly, lower }, shopItem, undefined, undefined, true);
                return;
            }
        } else if (captureStage.current === 'who') {
            // Extract player names from WHO list
            let cleanText = textOnly.trim();
            if (cleanText && !cleanText.startsWith('---') && cleanText !== 'who:' && lower !== 'allies' && lower !== 'minions') {
                let lastLength = 0;
                while (cleanText.length !== lastLength) {
                    lastLength = cleanText.length;
                    cleanText = cleanText.replace(/^\[.*?\]\s*/, '');
                    cleanText = cleanText.replace(/^<.*?>\s*/, '');
                    cleanText = cleanText.replace(/^\(.*?\)\s*/, '');
                    cleanText = cleanText.replace(/^\*+/, '');
                }
                // Extract player name as the first word
                const nameCandidate = cleanText.split(/\s+/)[0].replace(/[.,:;!]+$/, '');
                // Basic validation: MUME names start with A-Z or accented equivalent
                if (nameCandidate && /^[A-Z\u00C0-\u00DE]/.test(nameCandidate)) {
                    setWhoList(prev => prev.includes(nameCandidate) ? prev : [...prev, nameCandidate]);
                }
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
        const shouldShow = (isSilentCapture.current === 0 && !isDrawerCapture.current) || isImportantMessage;

        if (shouldShow) {
            let finalRawText = cleanLine;
            // Prevent color bleeding from room names into room descriptions by ensuring a reset
            if (isRoomName && !finalRawText.endsWith('\x1b[0m')) {
                finalRawText += '\x1b[0m';
            }

            let msgType: MessageType = 'game';
            if (captureStage.current === 'who' && textOnly !== 'who:' && lower !== 'allies' && lower !== 'minions' && !textOnly.startsWith('---')) msgType = 'who-list';
            else if (captureStage.current === 'where' && !textOnly.startsWith('Player') && !textOnly.startsWith('Who') && !textOnly.startsWith('---')) msgType = 'where-list';

            const precalculated = { textOnly: textOnly, lower: lower };
            const stableId = `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`;
            addMessage(msgType, finalRawText, undefined, stableId, isRoomName, precalculated, undefined, undefined, undefined, false);
        }

        // --- Post-processing Capture Termination ---
        if (isPrompt) {
            finalizeCapture();
        }
    }, [addMessage, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, setInventoryLines, setStatsLines, setEqLines, setWhoList, triggerHaptic, mapperRef, deps, parsePracticeLine, processTriggers, parseShopLine, isShopListingActive, setIsShopListingActive, roomNameRef, addDiagnosticLog, setPopoverState]);

    return { processLine };
}
