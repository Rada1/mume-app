import { useState, useRef, useCallback } from 'react';
import { GameStats, DrawerLine, GameAction } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun } from '../utils/gameUtils';
import { usePracticeParser } from './usePracticeParser';
import { useTriggerProcessor } from './useTriggerProcessor';

export interface UseGameParserDeps {
    isItemsOpen: boolean; isCharacterOpen: boolean; mapperRef: React.RefObject<any>;
    btn: { buttonsRef: React.RefObject<any[]>; setButtons: React.Dispatch<React.SetStateAction<any[]>>; buttonTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>; setActiveSet: (setId: string) => void; };
    addMessage: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }) => void;
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
    captureStage: React.MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'none'>;
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    roomNameRef: React.RefObject<string | null>;
    showDebugEchoes?: boolean;
}

export function useGameParser(deps: UseGameParserDeps) {
    const { mapperRef, btn, addMessage, playSound, triggerHaptic, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, executeCommandRef, setInventoryLines, setStatsLines, setEqLines, captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, roomNameRef, showDebugEchoes } = deps;

    const { parsePracticeLine } = usePracticeParser(setAbilities, setCharacterClass);
    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef });

    const containerStackRef = useRef<{ depth: number, noun: string }[]>([]);
    const counterRef = useRef(0);

    const processLine = useCallback((line: string) => {
        let cleanLine = line.replace(/\r$/, '');
        if (!cleanLine) return;

        // 1. Initial Prompt & Text Separation
        let textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        let lower = textOnly.toLowerCase();

        // Consolidated Regex for all MUME prompt variations (pure or with attached text)
        // It now handles move prefixes, stat brackets, and leading ANSI codes.
        const promptRegex = /^((?:(?:\x1b\[[0-9;]*m)*?(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(])\s*?)*[>:])\s*/;
        const textPMatch = textOnly.match(promptRegex);

        if (textPMatch) {
            const promptPart = textPMatch[1];
            const attachedText = textOnly.slice(textPMatch[0].length).trim();

            // Extract metadata from prompt (lighting, terrain)
            const symbolMatch = promptPart.match(/[\*\)\!oO\.\[f%\~+WU:=O\#\?\(]/);
            if (symbolMatch) {
                const symbol = symbolMatch[0];
                if (detectLighting) detectLighting(symbol);
                if (deps.setCurrentTerrain && !['*', '!', ')', 'o', 'O', '?'].includes(symbol)) {
                    deps.setCurrentTerrain(symbol);
                }
            }

            // If there's no attached text, this is a pure prompt. 
            // We just update states and return.
            if (!attachedText) {
                captureStage.current = 'none';
                isDrawerCapture.current = 0;
                isSilentCapture.current = 0;
                containerStackRef.current = [];
                return;
            }

            // If there IS attached text, strip the prompt from the line and continue processing
            textOnly = attachedText;
            lower = textOnly.toLowerCase();
            
            // For cleanLine (ANSI version), we strip the prompt part. 
            // We use a robust regex that handles the prompt chars and all leading ANSI.
            const ansiStripRegex = /^((?:\x1b\[[0-9;]*m)*?((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(])\s*)*[>:])\s*)/;
            cleanLine = cleanLine.replace(ansiStripRegex, '').trim();
        }

        // 2. Room Name Detection (Now using cleaned text)
        let isRoomMatched = roomNameRef.current && (textOnly === roomNameRef.current || lower === roomNameRef.current.toLowerCase());
        let isRoomAnsiMatch = cleanLine.includes('\x1b[1;32m') || cleanLine.includes('\x1b[0;32m');
        let isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ') && !/carrying|using|following|contains/i.test(lower)));

        if (isRoomName && captureStage.current === 'none' && !isWaitingForStats.current && !isWaitingForEq.current && !isWaitingForInv.current) {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;
        }

        // Reset stack if we're not in a capture stage or just starting one
        if (captureStage.current === 'none') {
            containerStackRef.current = [];
        }

        // Weather & Fog Detection
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

        // Wall bump detection (screen jiggle + haptic)
        if (lower.includes("alas, you cannot go that way") || 
            lower.includes("there is no exit") || 
            lower.includes("you bump into")) {
            setRumble(true);
            triggerHaptic(40);
            setTimeout(() => setRumble(false), 300);
        }

        if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) { isWaitingForStats.current = false; captureStage.current = 'stat'; containerStackRef.current = []; }
        if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            isWaitingForEq.current = false; captureStage.current = 'eq'; containerStackRef.current = [];
            setEqLines([]); // Clear when starting fresh eq list
        }
        if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains/i.test(lower)) {
            isWaitingForInv.current = false; captureStage.current = 'inv'; containerStackRef.current = [];
            setInventoryLines([]); // Clear when starting fresh inv list
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

                // Track containers to build nested context (e.g. item.bag)
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
                // Ensure the line has content and isn't just whitespace
                if (textOnly.length > 0) {
                    setEqLines(p => [...p, createLine(cleanLine, 'equipmentlist')]);
                }
            } else setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
        } else {
            if (captureStage.current === 'practice') parsePracticeLine(textOnly);
        }

        // Local Inventory Tracking
        const trackAction = () => {
            if (isSilentCapture.current > 0 || isDrawerCapture.current) return;

            // 1. Wear / Put On
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

            // 2. Remove / Stop Using
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

            // 3. Put in Container
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

            // 4. Get from Container / Ground
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

            // 5. Receiving from someone
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

            // 6. Giving away / Dropping
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

            // 7. Wielding / Holding
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

            // 8. Eating / Quaffing / Drinking
            const consumeMatch = cleanLine.match(/You (eat|quaff|drink) (.*?)\./i);
            if (consumeMatch) {
                // In MUME, drinks from a container might not consume the container,
                // but quaff/eat usually consumes the item. For simplicity, we just
                // remove the item from inventory if it's not a container-style drink.
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

        isRoomMatched = roomNameRef.current && (textOnly === roomNameRef.current || lower === roomNameRef.current.toLowerCase());
        isRoomAnsiMatch = cleanLine.includes('\x1b[1;32m') || cleanLine.includes('\x1b[0;32m');
        
        // A line is a room name if it matches the MUME room color OR matches our GMCP room name
        isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ') && !/carrying|using|following|contains/i.test(lower)));

        const pMatch = cleanLine.match(/^((?:[\*\)\!oO\.\[f%\~+WU:=O\#\?\(]\s*?>|<.*?:.*?>)\s*)(.*)$/);
        
        // Final visibility logic:
        // We simplified this: only hide lines during explicit silent background captures.
        const isImportantMessage = /hits you|receive your share|is dead|tells you|say,|group:|mood:|alertness:|spell speed:|following|practice|sessions/i.test(lower);
        const shouldShow = (isSilentCapture.current === 0 || isImportantMessage);

        if (shouldShow) {
            // Use textPMatch[2] if it exists (prompt with attached text), otherwise cleanLine
            const finalRawText = textPMatch ? textPMatch[2] : cleanLine;
            // Use stripped text only for precalculation as well
            const precalculated = { 
                textOnly: textOnly, 
                lower: lower 
            };
            
            // Create a semi-stable ID based on content + timestamp to avoid random 'randomness'
            const stableId = `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`;
            
            addMessage('game', finalRawText, undefined, stableId, isRoomName, precalculated);
        }
    }, [addMessage, setStats, setRumble, setHitFlash, setDeathStage, setInventoryLines, setStatsLines, setEqLines, triggerHaptic, mapperRef, parsePracticeLine, processTriggers, roomNameRef, executeCommandRef, captureStage, isDrawerCapture, isSilentCapture]);

    return { processLine };
}
