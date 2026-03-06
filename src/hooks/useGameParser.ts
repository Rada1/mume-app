import { useState, useRef, useCallback } from 'react';
import { GameStats, DrawerLine, GameAction } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun } from '../utils/gameUtils';
import { usePracticeParser } from './usePracticeParser';
import { useTriggerProcessor } from './useTriggerProcessor';

export interface UseGameParserDeps {
    isItemsOpen: boolean; isCharacterOpen: boolean; mapperRef: React.RefObject<any>;
    btn: { buttonsRef: React.RefObject<any[]>; setButtons: React.Dispatch<React.SetStateAction<any[]>>; buttonTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>; setActiveSet: (setId: string) => void; };
    addMessage: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean) => void;
    playSound: (buffer: AudioBuffer) => void; triggerHaptic: (ms: number) => void;
    setWeather: (val: any) => void; setIsFoggy: (val: boolean) => void;
    setStats: (val: GameStats | ((prev: GameStats) => GameStats)) => void;
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setCharacterClass: (val: any) => void; setRumble: (val: boolean) => void;
    setHitFlash: (val: boolean) => void; setDeathStage: (val: any) => void;
    setInCombat: (val: boolean) => void;
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
    isDrawerCapture: React.MutableRefObject<boolean>;
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

    const processLine = useCallback((line: string) => {
        let cleanLine = line.replace(/\r$/, '');
        if (!cleanLine) return;
        let textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        let lower = textOnly.toLowerCase();

        // Reset stack if we're not in a capture stage or just starting one
        if (captureStage.current === 'none') {
            containerStackRef.current = [];
        }

        // 1. Initial Prompt Check - handles both pure prompts and prompts with attached text
        const purePromptRegex = /^[\*\)\!oO\.\[f\<%\~+WU:=O:\(\#\?]\s*[>:]\s*$/;
        const promptWithTextRegex = /^([\*\)\!oO\.\[f<%\~+WU:=O\#\?\(].*?>\s*)(.*)$/;

        const isPurePrompt = purePromptRegex.test(textOnly) || (/[>:]\s*$/.test(textOnly) && textOnly.length < 60 && !/ob:|armor:|str:|exp:|level:|using|carrying|contains|following/i.test(lower));
        const textPMatch = textOnly.match(promptWithTextRegex);

        const originalCleanLine = cleanLine;

        if (isPurePrompt || textPMatch) {
            if (isPurePrompt || (textPMatch && !textPMatch[2].trim())) {
                captureStage.current = 'none';
                isWaitingForStats.current = false;
                isWaitingForEq.current = false;
                isWaitingForInv.current = false;
                isDrawerCapture.current = false;

                if (isSilentCapture.current > 0) {
                    isSilentCapture.current--;
                }

                containerStackRef.current = [];

                const symbolString = isPurePrompt ? textOnly : textPMatch?.[1];
                const promptSymbolMatch = symbolString?.match(/^([\*\)\!oO\.\[f\<%\~+WU:=O\#\?\(])/);
                if (promptSymbolMatch) {
                    if (detectLighting) detectLighting(promptSymbolMatch[1]);
                    if (deps.setCurrentTerrain) deps.setCurrentTerrain(promptSymbolMatch[1]);
                }
                return; // Nothing else to process
            } else if (textPMatch) {
                // Extract prompt symbols
                const promptSymbolMatch = textPMatch[1].match(/^([\*\)\!oO\.\[f\<%\~+WU:=O\#\?\(])/);
                if (promptSymbolMatch) {
                    if (detectLighting) detectLighting(promptSymbolMatch[1]);
                    if (deps.setCurrentTerrain) deps.setCurrentTerrain(promptSymbolMatch[1]);
                }

                // Redefine text variables to only contain the attached text
                textOnly = textPMatch[2];
                lower = textOnly.toLowerCase();
            }
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

        if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) { isWaitingForStats.current = false; captureStage.current = 'stat'; containerStackRef.current = []; }
        if ((isWaitingForEq.current || captureStage.current !== 'none') && /you are using|you are equipped with/i.test(lower)) {
            isWaitingForEq.current = false; captureStage.current = 'eq'; containerStackRef.current = [];
            setEqLines([]); // Clear when starting fresh eq list
        }
        if ((isWaitingForInv.current || captureStage.current !== 'none') && /you are carrying|your inventory contains/i.test(lower)) {
            isWaitingForInv.current = false; captureStage.current = 'inv'; containerStackRef.current = [];
            setInventoryLines([]); // Clear when starting fresh inv list
        }

        if (captureStage.current === 'inv' || captureStage.current === 'eq' || captureStage.current === 'stat') {
            const createLine = (l: string, cmd: string): DrawerLine => {
                const lowerLine = l.toLowerCase();
                const textOnlyLine = l.replace(/\x1b\[[0-9;]*m/g, '');

                const leadingSpaces = textOnlyLine.match(/^ */)?.[0].length || 0;
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
                    text: textOnlyLine.trim(),
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
                setEqLines(p => [...p, createLine(cleanLine, 'equipmentlist')]);
            } else setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
        } else {
            if (captureStage.current === 'practice') parsePracticeLine(textOnly);
        }

        const scoreMatch = textOnly.match(/(\d+)\/(\d+)\s+hits.*(\d+)\/(\d+)\s+(mana|spirit).*(\d+)\/(\d+)\s+(moves|vitality)/i);
        if (scoreMatch) setStats(p => ({ ...p, hp: parseInt(scoreMatch[1]), maxHp: parseInt(scoreMatch[2]), mana: parseInt(scoreMatch[3]), maxMana: parseInt(scoreMatch[4]), move: parseInt(scoreMatch[6]), maxMove: parseInt(scoreMatch[7]) }));

        if (/alas, you cannot go|no exit|is closed|too exhausted|too tired|cannot go there|blocks your|too dark to see/i.test(lower)) {
            setRumble(true);
            triggerHaptic(50);
            setTimeout(() => setRumble(false), 400);
            mapperRef.current?.handleMoveFailure();
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail'));
        }

        if (/pitch black|too dark|cannot see/i.test(lower)) {
            // In MUME, 'pitch black' usually means you arrived in a dark room.
            // Only 'too dark to see' (handled above) is a movement failure.
            if (showDebugEchoes) {
                addMessage('system', "[Mapper] Room is dark.");
            }
        }

        if (/hits you|crushes you|pierces you/i.test(lower)) { setHitFlash(true); triggerHaptic(50); setTimeout(() => setHitFlash(false), 150); }
        if (/you have been killed|you are dead/i.test(lower)) { setDeathStage('fade_to_black'); setInCombat(false); setTimeout(() => setDeathStage('flash'), 2000); }
        if (/is dead! r.i.p.|receive your share of experience|you flee head over heels|you stop fighting/i.test(lower)) { setInCombat(false); }

        processTriggers(textOnly);
        if (lower.includes("wimpy")) { const m = textOnly.match(/wimpy.*(\d+)/i); if (m) setStats(p => ({ ...p, wimpy: parseInt(m[1]) })); }

        // Local Inventory Tracking
        const trackAction = () => {
            if (isSilentCapture.current > 0 || isDrawerCapture.current) return;

            const sync = () => {
                // Background sync just in case
                setTimeout(() => {
                    executeCommandRef.current?.('inv', true, true, true, true);
                    setTimeout(() => {
                        executeCommandRef.current?.('eq', true, true, true, true);
                    }, 400);
                }, 1500);
            };

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
                sync();
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
                sync();
                return;
            }

            // 3. Put in Container
            const putMatch = cleanLine.match(/You put (.*?) in (.*?)\./i);
            if (putMatch) {
                const itemNoun = extractNoun(putMatch[1]);
                setInventoryLines(prev => prev.filter(l => !(l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)))));
                sync();
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
                sync();
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
                sync();
                return;
            }

            // 6. Giving away / Dropping
            const giveMatch = cleanLine.match(/You (give|drop|junk) (.*?)\./i);
            if (giveMatch) {
                const itemNoun = extractNoun(giveMatch[2]);
                setInventoryLines(prev => prev.filter(l => !(l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)))));
                sync();
                return;
            }
        };

        trackAction();

        const isRoomMatched = roomNameRef.current && (textOnly === roomNameRef.current || lower === roomNameRef.current.toLowerCase());
        const isRoomAnsiMatch = cleanLine.includes('\x1b[1;32m') || cleanLine.includes('\x1b[0;32m');
        const isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ') && !/carrying|using|following|contains/i.test(lower)));

        const pMatch = cleanLine.match(/^([\*\)\!oO\.\[f<%\~+WU:=O\#\?\(].*?>\s*)(.*)$/);
        // Safety: Always show if counter is stuck high or if it's clearly a player-relevant line (combat, chat, etc)
        const isForceVisible = /hits you|receive your share|is dead|tells you|say,|group:|mood:|alertness:|spell speed:|following|practice|sessions/i.test(lower);

        // Final visibility logic:
        // 1. Never show if it's a drawer-triggered capture (unless forced visible by combat/comms)
        // 2. Never show if it's a silent capture (ref-based counter)
        // 3. Always show if forced visible
        const shouldShow = (!isDrawerCapture.current && isSilentCapture.current === 0) || isForceVisible;

        if (shouldShow) {
            addMessage('game', pMatch ? pMatch[2] : cleanLine, undefined, undefined, isRoomName);
        }
    }, [addMessage, setStats, setRumble, setHitFlash, setDeathStage, setInventoryLines, setStatsLines, setEqLines, triggerHaptic, mapperRef, parsePracticeLine, processTriggers, roomNameRef, executeCommandRef, captureStage, isDrawerCapture, isSilentCapture]);

    return { processLine };
}
