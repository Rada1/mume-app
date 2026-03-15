import { useState, useRef, useCallback } from 'react';
import { GameStats, DrawerLine, GameAction, MessageType, PopoverState, CaptureStage, CombatHealthStatus } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun, isItemContainer } from '../utils/gameUtils';
import { useTriggerProcessor } from './useTriggerProcessor';
import { useShopHandler } from './useShopHandler';
import { usePracticeHandler } from './usePracticeHandler';

export interface UseGameParserDeps {
    isItemsOpen: boolean; isCharacterOpen: boolean; isStatsOpen: boolean; mapperRef: React.RefObject<any>;
    btn: { buttonsRef: React.RefObject<any[]>; setButtons: React.Dispatch<React.SetStateAction<any[]>>; buttonTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>; setActiveSet: (setId: string) => void; };
    addMessage: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean) => void;
    playSound: (buffer: AudioBuffer) => void; triggerHaptic: (ms: number) => void;
    setWeather: (val: any) => void; setIsFoggy: (val: boolean) => void;
    setStats: (val: GameStats | ((prev: GameStats) => GameStats)) => void;
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setCharacterClass: (val: any) => void; setRumble: (val: boolean) => void;
    setHitFlash: (val: boolean) => void; setDeathStage: (val: any) => void;
    setInCombat: (val: boolean, force?: boolean) => void;
    inCombatRef: React.RefObject<boolean>;
    setLightningEnabled: (val: boolean) => void;
    setPlayerPosition: (val: string) => void; detectLighting: (light: string) => void;
    setCurrentTerrain?: (terrain: string) => void;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferName: (val: string | null) => void;
    isSoundEnabledRef: React.RefObject<boolean>; soundTriggersRef: React.RefObject<any[]>;
    actionsRef: React.RefObject<GameAction[]>;
    executeCommandRef: React.RefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>;
    setCharacterInfo: (val: import('../types').CharacterInfo | ((prev: import('../types').CharacterInfo) => import('../types').CharacterInfo)) => void;
    setInventoryLines: React.Dispatch<React.SetStateAction<import('../types').DrawerLine[]>>;
    setStatsLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setWhoList: React.Dispatch<React.SetStateAction<string[]>>;
    captureStage: React.MutableRefObject<CaptureStage>;
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
    setDiscoveredItems: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useGameParser(deps: UseGameParserDeps) {
    const { mapperRef, btn, addMessage, playSound, triggerHaptic, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, inCombatRef, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, executeCommandRef, setInventoryLines, setStatsLines, setEqLines, setWhoList, captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, roomNameRef, showDebugEchoes, addDiagnosticLog, popoverState, setPopoverState, setDiscoveredItems, setPlayerHealthStatus, setOpponentHealthStatus,    setOpponentName,
    setBufferHealthStatus,
    setBufferName,
    setCharacterInfo,
} = deps;

    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef });
    const { parseShopLine, isShopListingActive, setIsShopListingActive } = useShopHandler();

    const containerStackRef = useRef<{ depth: number, noun: string, context: string }[]>([]);
    const nounCountsRef = useRef<Record<string, number>>({});
    const counterRef = useRef(0);
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);

    const finalizeCapture = useCallback((targetStage?: CaptureStage) => {
        const currentStage = captureStage.current as CaptureStage;
        if (currentStage === 'none') return false;
        
        // If targetStage is provided, only finalize if we match
        if (targetStage && currentStage !== targetStage) return false;

        const stagesToTerminate: CaptureStage[] = ['who', 'where', 'inv', 'eq', 'stat', 'container', 'shop', 'practice'];
        if (stagesToTerminate.includes(currentStage as any)) {
            const eqLen = tempEqRef.current.length;
            const invLen = tempInvRef.current.length;
            
            console.log(`[Parser] Finalizing ${currentStage} capture. Buffers: eq=${eqLen}, inv=${invLen}`);
            addDiagnosticLog?.(`Finalizing ${currentStage} capture. Eq: ${eqLen}, Inv: ${invLen}`);
            
            if (currentStage === 'practice') {
                deps.practice.finalizePractice(addMessage);
                deps.practice.setIsPracticeActive(false);
                deps.practice.setIsUiRequested(false);
            } else if (currentStage === 'shop') {
                setIsShopListingActive(false);
            } else if (currentStage === 'eq' && eqLen > 0) {
                tempEqRef.current = []; 
            } else if (currentStage === 'inv' && invLen > 0) {
                tempInvRef.current = []; 
            }
            
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;
            containerStackRef.current = [];
            return true;
        }
        return false;
    }, [addDiagnosticLog, setEqLines, setInventoryLines, captureStage, isDrawerCapture, isSilentCapture, deps.practice, addMessage, setIsShopListingActive]);

    const processLine = useCallback((line: string) => {

        let cleanLine = line.replace(/\r$/, '').normalize('NFC');
        if (!cleanLine) return;

        // Perform ANSI stripping ONCE here and reuse the result everywhere.
        let textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        let lower = textOnly.toLowerCase();
        
        let content = textOnly;
        let contentLower = lower;

        const currentRoomName = roomNameRef.current;
        const textOnlyRaw = textOnly;
        const lowerRaw = lower;

        // Optimized Prompt and End Determination (Avoid nested quantifiers to prevent backtracking)
        const promptRegex = /^([^\r\n>]{0,120}>)\s*/;
        const textPMatch = textOnly.match(promptRegex);
        let attachedText = '';
        if (textPMatch) {
            attachedText = textOnly.slice(textPMatch[0].length).trim();
        }

        const isEndPrompt = (!!textPMatch && !attachedText && !['practice', 'who', 'shop', 'where'].includes(captureStage.current as any)) || 
            /^((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-]|\([^)]+\))\s*)*[>])\s*$/.test(textOnly) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:') && textOnly.includes('>'));

        // --- STAGE INITIALIZATION (Consolidated) ---
        // These check the fresh line to see if we should ENTER a new capture stage.
        if (lower.includes('skill') && lower.includes('knowledge') && lower.includes('difficulty')) {
            if (deps.practice.isUiRequested || lower.includes('class')) {
                if (captureStage.current === 'practice') return;
                if (captureStage.current !== 'none') finalizeCapture();
                console.log('[Parser] Entering Stage: practice'); addDiagnosticLog?.('Entering Stage: practice');
                (captureStage as any).current = 'practice';
                if (deps.practice.isUiRequested) isSilentCapture.current = 1;
            }
        }
        else if (textOnly === 'who:' || lower === 'allies' || lower === 'minions') {
            if (captureStage.current === 'who') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: who'); addDiagnosticLog?.('Entering Stage: who');
            (captureStage as any).current = 'who'; setWhoList([]);
        }
        else if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            if (captureStage.current === 'shop') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: shop'); addDiagnosticLog?.('Entering Stage: shop');
            (captureStage as any).current = 'shop'; setIsShopListingActive(true);
        }
        else if ((textOnly.startsWith('Player') && textOnly.includes('Room')) || (textOnly.startsWith('Who') && textOnly.includes('Location'))) {
            if (captureStage.current === 'where') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: where'); addDiagnosticLog?.('Entering Stage: where');
            (captureStage as any).current = 'where';
        }
        else if (/^In (.*?):$/.test(textOnly) && !textOnly.includes('equipment')) {
            if (captureStage.current === 'container') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: container'); addDiagnosticLog?.('Entering Stage: container');
            (captureStage as any).current = 'container';
            if (deps.pendingDrawerContainerRef?.current) isDrawerCapture.current = 1;
        }
        else if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) {
            if (captureStage.current === 'stat') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: stat'); addDiagnosticLog?.('Entering Stage: stat');
            isWaitingForStats.current = false; (captureStage as any).current = 'stat';
            if (deps.isCharacterOpen) isDrawerCapture.current = 1;
        }
        else if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            if (captureStage.current === 'eq') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: eq'); addDiagnosticLog?.('Entering Stage: eq');
            isWaitingForEq.current = false; (captureStage as any).current = 'eq';
            tempEqRef.current = []; if (deps.isCharacterOpen) isDrawerCapture.current = 1;
        }
        else if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains/i.test(lower)) {
            if (captureStage.current === 'inv') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: inv'); addDiagnosticLog?.('Entering Stage: inv');
            isWaitingForInv.current = false; (captureStage as any).current = 'inv';
            tempInvRef.current = []; if (deps.isItemsOpen) isDrawerCapture.current = 1;
        }

        if (textPMatch || captureStage.current === 'none') {
            nounCountsRef.current = {};
        }

        if (textPMatch) {
            const promptPart = textPMatch[0];
            attachedText = textOnly.slice(promptPart.length).trim();

            // Only finalize if this is a standalone prompt at the start of a line
            if (captureStage.current !== 'none' && !attachedText) {
                finalizeCapture();
            }

            const symbolMatch = promptPart.match(/[\*\)\!oO\.\[f%\~+WU:=O\#\?\(]/);
            if (symbolMatch) {
                const symbol = symbolMatch[0];
                if (detectLighting) detectLighting(symbol);
                if (deps.setCurrentTerrain && !['*', '!', ')', 'o', 'O', '?'].includes(symbol)) {
                    deps.setCurrentTerrain(symbol);
                }
            }


            // --- Combat Health Extraction ---
            // Example: [ cW HP:Fine *a Dwarf* (x):Hurt>
            // Example with buffer: [ cW HP:Fine (Buff:Fine) *a Dwarf* (x):Hurt>
            const healthMap: Record<string, CombatHealthStatus> = {
                'fine': 'Fine',
                'hurt': 'Hurt',
                'wounded': 'Wounded',
                'bad': 'Badly Wounded',
                'awful': 'Awful',
                'dying': 'Dying',
                'bleeding': 'Dying'
            };

            const findStatus = (str: string): CombatHealthStatus | null => {
                const s = str.toLowerCase();
                for (const [key, val] of Object.entries(healthMap)) {
                    if (s.includes(key)) return val;
                }
                return null;
            };

            // 1. Player Health
            const playerMatch = promptPart.match(/HP:(\w+)/i);
            if (playerMatch) {
                setPlayerHealthStatus(findStatus(playerMatch[1]));
            } else {
                setPlayerHealthStatus(null);
            }

            // 2. Buffer Health/Name
            const bufferMatch = promptPart.match(/\(([^:]+):(\w+)\)/); // Heuristic for (Name:Status)
            if (bufferMatch) {
                setBufferName(bufferMatch[1]);
                setBufferHealthStatus(findStatus(bufferMatch[2]));
            } else if (!promptPart.includes('Buff:')) {
                // We keep GMCP source for name if parser doesn't find it, but clear status if missing from prompt
                setBufferHealthStatus(null);
            }

            // 3. Opponent Health/Name
            // Pattern: *Name* (x):Status or Name :Status
            // Examples: *a Dwarf*:Fine>, a bee :Hurt>, *a Dwarf* (x):Wounded>
            const oppMatch = promptPart.match(/(?:\*([^*]+)\*|(?:\s+|^)([^:* \t]+?))\s*(?:\(x\))?[:](\w+)\s*>/);
            if (oppMatch) {
                const name = (oppMatch[1] || oppMatch[2] || "").trim();
                const status = findStatus(oppMatch[3]);
                const isVitalPrefix = /^(hp|m|v|t|e|w|move|mana|tired)$/i.test(name);
                
                if (status && !isVitalPrefix) {
                    setOpponentName(name);
                    setOpponentHealthStatus(status);
                    setInCombat(true);
                } else {
                    setOpponentHealthStatus(null);
                    setOpponentName(null);
                }
            } else {
                setOpponentHealthStatus(null);
                setOpponentName(null);
            }

            // Trigger combat only if we see a clear opponent pattern at the end
            // Ignore if it's just HP:Fine or T:Tired
            const hasExplicitOpponent = oppMatch && findStatus(oppMatch[3]) && !/^(hp|m|v|t|e|w|move|mana|tired)$/i.test((oppMatch[1] || oppMatch[2] || "").trim());
            if (hasExplicitOpponent) {
                setInCombat(true);
            }

            if (!attachedText) {
                return;
            }

            content = attachedText;
            contentLower = content.toLowerCase();

            // Strip the actual prompt part from the cleanLine
            const ansiStripRegex = /^((?:\x1b\[[0-9;]*m)*?((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-])\s*)*[>])\s*)/ ;
            cleanLine = cleanLine.replace(ansiStripRegex, '').trim();
            }

            // Global Status Parser for MUME (updates OB/DB/PB/Armour in real-time)
            // Ensure this runs BEFORE prompt stripping so we don't lose the context.
            if (contentLower.startsWith('your ob ') || contentLower.startsWith('your mood ') || contentLower.startsWith('your armor ') || contentLower.startsWith('your armour ') || contentLower.includes('ob:') || contentLower.includes('db:') || contentLower.includes('pb:')) {
            const obMatch = content.match(/Ob\s*(?::|is)?\s*(\d+)%/i);
            const dbMatch = content.match(/Db\s*(?::|is)?\s*(\d+)%/i);
            const pbMatch = content.match(/Pb\s*(?::|is)?\s*(\d+)%/i);
            const armorMatch = content.match(/(?:Armo?ur|Armor)\s*(?::|is)?\s*(\d+)%/i);

            if (obMatch || dbMatch || pbMatch || armorMatch) {
                setStats(prev => ({
                    ...prev,
                    ...(obMatch && { ob: parseInt(obMatch[1]) }),
                    ...(dbMatch && { db: parseInt(dbMatch[1]) }),
                    ...(pbMatch && { pb: parseInt(pbMatch[1]) }),
                    ...(armorMatch && { armour: parseInt(armorMatch[1]) }),
                }));
            }
            }

        // --- NEW: Priority Capture Handling ---
        if (captureStage.current !== 'none') {
            const stage = captureStage.current;
            if (stage === 'practice') {
                const practiceResult = deps.practice.parsePracticeLine(textOnly);
                if (practiceResult) {
                    if (typeof practiceResult === 'object' && practiceResult !== null && isSilentCapture.current === 0) {
                        if ('sessionsLeft' in (practiceResult as any)) deps.practice.addToLogBuffer('header', practiceResult, textOnly);
                        else deps.practice.addToLogBuffer('skill', practiceResult, textOnly);
                    }
                    return;
                }
            } else if (stage === 'who') {
                let cleanText = textOnly.trim();
                if (cleanText && !cleanText.startsWith('---') && cleanText !== 'who:' && lower !== 'allies' && lower !== 'minions') {
                    let lastLength = 0;
                    while (cleanText.length !== lastLength) {
                        lastLength = cleanText.length;
                        cleanText = cleanText.replace(/^\[.*?\]\s*/, '').replace(/^<.*?>\s*/, '').replace(/^\(.*?\)\s*/, '').replace(/^\*+/, '');
                    }
                    const nameCandidate = cleanText.split(/\s+/)[0].replace(/[.,:;!]+$/, '');
                    if (nameCandidate && /^[A-Z\u00C0-\u00DE]/.test(nameCandidate)) setWhoList(prev => prev.includes(nameCandidate) ? prev : [...prev, nameCandidate]);
                }
                if (isSilentCapture.current > 0) return;
            } else if (stage === 'shop') {
                const shopItem = parseShopLine(textOnly);
                if (shopItem) {
                    const stableId = `shop-${shopItem.id}-${Date.now()}-${counterRef.current++}`;
                    addMessage('shop-item', textOnly, undefined, stableId, false, { textOnly, lower }, shopItem, undefined, undefined, true);
                    return;
                }
            }
        }

        // --- ROOM DETECTION ---
        let isRoomMatched = !isSilentCapture.current && currentRoomName && (
            textOnly === currentRoomName || lower === currentRoomName.toLowerCase() ||
            textOnly === currentRoomName + '.' || lower === currentRoomName.toLowerCase() + '.' ||
            (textOnly.length < currentRoomName.length + 8 && (textOnly.startsWith(currentRoomName) || lower.startsWith(currentRoomName.toLowerCase())))
        );
        let isRoomAnsiMatch = !isSilentCapture.current && /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[01];3[26]m/.test(cleanLine);
        let isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ') && !/carrying|using|following|contains/i.test(lower)));

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

        if (isRoomName && captureStage.current === 'none' && !isWaitingForStats.current && !isWaitingForEq.current && !isWaitingForInv.current) {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;

            const isSameRoom = currentRoomName && (textOnly === currentRoomName || lower === currentRoomName.toLowerCase());
            if (!isSameRoom) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: false } }));
                }
            }
        } else if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
             if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: true } }));
            }
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
            lower.includes("is closed") ||
            lower.includes("is locked") ||
            lower.includes("is blocking the way") ||
            lower.includes("you are too tired") ||
            lower.includes("you're too tired") ||
            lower.includes("you can't go that way") ||
            lower.includes("you are already there") ||
            lower.includes("you stop following");

        if (stopMovementMsg) {
            setRumble(true);
            triggerHaptic(40);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail'));
            setTimeout(() => setRumble(false), 300);
        }


        // Refined isEndPrompt was already handled at the top of processLine.

        if (isEndPrompt) {
            console.log('[Parser] End-prompt detected:', { textOnly, stage: captureStage.current });
        }

        if (captureStage.current === 'inv' || captureStage.current === 'eq' || captureStage.current === 'stat' || captureStage.current === 'container') {
            const createLine = (l: string, tOnly: string, lLower: string, cmd: string): DrawerLine => {
                const leadingSpaces = l.replace(/\x1b\[[0-9;]*m/g, '').match(/^ */)?.[0].length || 0;
                const depth = Math.floor(leadingSpaces / 3);
                const isContainer = isItemContainer(l);
                const isHdr = /you are (carrying|using|equipped with)|contains|in your (.*?):/i.test(lLower);
                const isNothing = /nothing/i.test(lLower).valueOf();
                if (!isHdr && !isNothing && isContainer) addDiagnosticLog?.(`Detected container: ${textOnly}`);

                let prefix = ''; let prefixHtml = ''; let mainText = tOnly; let mainHtml = ansiConvert.toHtml(l);
                if (cmd === 'equipmentlist') {
                    const eqMatch = l.match(/^(\s*(?:\x1b\[[0-9;]*m)*<[^>]+>(?:\x1b\[[0-9;]*m)*\s*)(.*)/);
                    if (eqMatch) {
                        prefixHtml = ansiConvert.toHtml(eqMatch[1]);
                        prefix = tOnly.match(/^<[^>]+>\s*/)?.[0] || '';
                        mainHtml = ansiConvert.toHtml(eqMatch[2]);
                        mainText = tOnly.replace(/^<[^>]+>\s*/, '');
                    }
                }

                const noun = extractNoun(mainText || l);
                nounCountsRef.current[noun] = (nounCountsRef.current[noun] || 0) + 1;
                const count = nounCountsRef.current[noun];
                const stableId = count > 1 ? `${count}.${noun}` : noun;
                while (containerStackRef.current.length > 0 && containerStackRef.current[containerStackRef.current.length - 1].depth >= depth) containerStackRef.current.pop();
                let context = stableId;
                if (depth > 0 && containerStackRef.current.length > 0) context = `${stableId}.${containerStackRef.current[containerStackRef.current.length - 1].context}`;
                if (isContainer) containerStackRef.current.push({ depth, noun, context });
                return {
                    id: context || stableId || Math.random().toString(36).substring(7),
                    text: mainText, html: mainHtml, prefix, prefixHtml,
                    isItem: !isHdr && !isNothing, isHeader: isHdr, isContainer, depth, cmd, context
                };
            };

            if (captureStage.current === 'inv') {
                const line = createLine(cleanLine, textOnly, lower, 'inventorylist');
                tempInvRef.current.push(line);
                setInventoryLines(prev => [...prev, line]);
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) {
                    const line = createLine(cleanLine, textOnly, lower, 'equipmentlist');
                    tempEqRef.current.push(line);
                    setEqLines(prev => [...prev, line]);
                }
            } else if (captureStage.current === 'container') {
                if (textOnly.length > 0 && !lower.includes('contains:')) {
                    const containerLine = createLine(cleanLine, textOnly, lower, 'lookin');
                    const drawerPending = deps.pendingDrawerContainerRef?.current;
                    if (drawerPending) {
                        const { containerId, cmd } = drawerPending;
                        if (cmd === 'inventorylist') {
                            setInventoryLines(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) return prev;
                                const parent = prev[parentIdx];
                                const injectedLine: DrawerLine = {
                                    ...containerLine, id: `${containerLine.id}.${containerId}`, cmd,
                                    depth: (parent.depth || 0) + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id, parentItemNoun: parent.context || parent.id,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) return prev;
                                const next = [...prev]; next.splice(parentIdx + 1, 0, injectedLine); return next;
                            });
                        } else {
                            setEqLines(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) return prev;
                                const parent = prev[parentIdx];
                                const injectedLine: DrawerLine = {
                                    ...containerLine, id: `${containerLine.id}.${containerId}`, cmd,
                                    depth: (parent.depth || 0) + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id, parentItemNoun: parent.context || parent.id,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) return prev;
                                const next = [...prev]; next.splice(parentIdx + 1, 0, injectedLine); return next;
                            });
                        }
                    } else {
                        setPopoverState((prev: any) => prev ? { ...prev, type: 'container', containerItems: [...(prev.containerItems || []), containerLine] } : prev);
                    }
                    if (containerLine.isItem) {
                        const itmNoun = extractNoun(containerLine.text);
                        if (itmNoun) deps.setDiscoveredItems(prev => prev.includes(itmNoun) ? prev : [...prev, itmNoun]);
                    }
                }
                return;
            } else {
                setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
            }
        }

        const trackAction = () => {
            if (isSilentCapture.current > 0 || isDrawerCapture.current) return;
            const wearMatch = cleanLine.match(/You (wear|put on) (.*?)\./i);
            if (wearMatch) {
                const itemNoun = extractNoun(wearMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx]; setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                    return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const removeMatch = cleanLine.match(/You (remove|stop using) (.*?)\./i);
            if (removeMatch) {
                const itemNoun = extractNoun(removeMatch[2]);
                setEqLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx]; setInventoryLines(inv => [...inv, { ...item, cmd: 'inventorylist' }]);
                    return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const putMatch = cleanLine.match(/You put (.*?) in (.*?)\./i);
            if (putMatch) {
                const itemNoun = extractNoun(putMatch[1]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const getMatch = cleanLine.match(/You (get|take) (.*?)\.( from (.*?)\.)?/i);
            if (getMatch) {
                const itemText = getMatch[2];
                setInventoryLines(prev => [...prev, { id: Math.random().toString(36).substring(7), text: itemText, html: ansiConvert.toHtml(itemText), isItem: true, cmd: 'inventorylist', context: extractNoun(itemText) }]);
                return;
            }
            const receiveMatch = cleanLine.match(/(.*?) gives you (.*?)\./i);
            if (receiveMatch) {
                const itemText = receiveMatch[2];
                setInventoryLines(prev => [...prev, { id: Math.random().toString(36).substring(7), text: itemText, html: ansiConvert.toHtml(itemText), isItem: true, cmd: 'inventorylist', context: extractNoun(itemText) }]);
                return;
            }
            const giveMatch = cleanLine.match(/You (give|drop|junk) (.*?)\./i);
            if (giveMatch) {
                const itemNoun = extractNoun(giveMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const wieldMatch = cleanLine.match(/You (wield|hold) (.*?)\./i);
            if (wieldMatch) {
                const itemNoun = extractNoun(wieldMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx]; setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                    return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const consumeMatch = cleanLine.match(/You (eat|quaff|drink) (.*?)\./i);
            if (consumeMatch) {
                const itemNoun = extractNoun(consumeMatch[2]);
                if (!consumeMatch[0].includes('from')) {
                    setInventoryLines(prev => {
                        const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                        if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                    });
                } return;
            }
            if (lower.includes('gold coins')) {
                const goldMatch = textOnly.match(/(\d+) gold coins/i);
                if (goldMatch) {
                    const gold = parseInt(goldMatch[1]);
                    setCharacterInfo(prev => ({ ...prev, gold }));
                }
            }
        };

        trackAction(); processTriggers(textOnly);

        const isImportantMessage = /hits you|receive your share|is dead|tells you|say,|group:|mood:|alertness:|spell speed:|following/i.test(lower);
        
        // Drawer-aware hiding: Strictly hide if the relevant drawer is open AND it was a system-triggered capture
        let isDrawerHiding = false;
        const isSystemTriggered = isSilentCapture.current > 0 || isDrawerCapture.current > 0;

        if (isSystemTriggered) {
            const currentStage = captureStage.current as any;
            if (currentStage === 'inv' && deps.isItemsOpen) isDrawerHiding = true;
            else if ((currentStage === 'eq' || currentStage === 'stat' || currentStage === 'practice') && deps.isCharacterOpen) isDrawerHiding = true;
            else if (currentStage === 'container') isDrawerHiding = true; 
            else if (currentStage === 'none') {
                if (/you are carrying|your inventory contains/i.test(lower) && deps.isItemsOpen) isDrawerHiding = true;
                if ((/you are (using|equipped with)/i.test(lower) || /ob:|armor:|mood:|str:|exp:|level:/i.test(lower) || /practice sessions left/i.test(lower)) && deps.isCharacterOpen) isDrawerHiding = true;
            }
        }

        const shouldShow = (isSilentCapture.current === 0 && !isDrawerHiding) || isImportantMessage;

        // Diagnostic Visibility Logger
        if (!shouldShow && showDebugEchoes) {
            console.log(`[Parser] Suppressing line: "${textOnly.substring(0, 30)}${textOnly.length > 30 ? '...' : ''}" | Reasons: isSilent=${isSilentCapture.current}, isDrawerHiding=${isDrawerHiding}, stage=${captureStage.current}`);
        }

        if (shouldShow) {
            let finalRawText = cleanLine;
            if (isRoomName && !finalRawText.endsWith('\x1b[0m')) finalRawText += '\x1b[0m';
            let msgType: MessageType = 'game';
            if (captureStage.current === 'who' && textOnly !== 'who:' && lower !== 'allies' && lower !== 'minions' && !textOnly.startsWith('---')) msgType = 'who-list';
            else if (captureStage.current === 'where' && !textOnly.startsWith('Player') && !textOnly.startsWith('Who') && !textOnly.startsWith('---')) msgType = 'where-list';
            addMessage(msgType, finalRawText, undefined, `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`, isRoomName, { textOnly, lower }, undefined, undefined, undefined, false);
        }

        if (isEndPrompt) finalizeCapture();
    }, [addMessage, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, setInventoryLines, setStatsLines, setEqLines, setWhoList, triggerHaptic, mapperRef, deps, processTriggers, parseShopLine, isShopListingActive, setIsShopListingActive, roomNameRef, addDiagnosticLog, setPopoverState, finalizeCapture]);

    return { processLine, finalizeCapture };
}
