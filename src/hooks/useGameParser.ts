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
    isSilentCapture: React.MutableRefObject<boolean>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    roomNameRef: React.RefObject<string | null>;
}

export function useGameParser(deps: UseGameParserDeps) {
    const { mapperRef, btn, addMessage, playSound, triggerHaptic, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, executeCommandRef, setInventoryLines, setStatsLines, setEqLines, captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, roomNameRef } = deps;

    const { parsePracticeLine } = usePracticeParser(setAbilities, setCharacterClass);
    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef });

    const processLine = useCallback((line: string) => {
        const cleanLine = line.replace(/\r$/, '');
        if (!cleanLine) return;
        const textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        const lower = textOnly.toLowerCase();


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

        if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) { isWaitingForStats.current = false; captureStage.current = 'stat'; }
        if ((isWaitingForEq.current || captureStage.current !== 'none') && /you are using|you are equipped with/i.test(lower)) { isWaitingForEq.current = false; captureStage.current = 'eq'; }
        if ((isWaitingForInv.current || captureStage.current !== 'none') && /you are carrying|your inventory contains/i.test(lower)) { isWaitingForInv.current = false; captureStage.current = 'inv'; }
        if (/you have the following|you can practice|practice sessions|skill \/ spell|skill.*knowledge.*difficulty/i.test(lower)) { if (captureStage.current !== 'practice') setAbilities({}); captureStage.current = 'practice'; }

        if (/^[\*\)\!oO\.\[f\<%\~+WU:=O:\(]\s*[>:]\s*$/.test(textOnly) || (/[>:]\s*$/.test(textOnly) && textOnly.length < 60 && !/ob:|armor:|str:|exp:|level:|using|carrying|contains|following/i.test(lower))) {
            captureStage.current = 'none'; isSilentCapture.current = false; isWaitingForStats.current = false; isWaitingForEq.current = false; isWaitingForInv.current = false;

            // Extract the prompt for lighting and terrain detection
            const promptMatch = textOnly.match(/^([\*\)\!oO\.\[f\<%\~+WU:=O\#\?\(])/);
            if (promptMatch) {
                const symbol = promptMatch[1];
                if (detectLighting) detectLighting(symbol);
                if (deps.setCurrentTerrain) deps.setCurrentTerrain(symbol);
            }
            return;
        }

        if (captureStage.current === 'inv' || captureStage.current === 'eq' || captureStage.current === 'stat') {
            const createLine = (l: string, cmd: string): DrawerLine => {
                const lowerLine = l.toLowerCase();
                const isHdr = /you are (carrying|using|equipped with)|contains/i.test(lowerLine);
                const isNothing = /nothing/i.test(lowerLine).valueOf();
                return {
                    id: Math.random().toString(36).substring(7),
                    text: l.replace(/\x1b\[[0-9;]*m/g, ''),
                    html: ansiConvert.toHtml(l),
                    isItem: !isHdr && !isNothing,
                    isHeader: isHdr,
                    cmd,
                    context: extractNoun(l)
                };
            };
            if (captureStage.current === 'inv') setInventoryLines(p => [...p, createLine(cleanLine, 'inventorylist')]);
            else if (captureStage.current === 'eq') setEqLines(p => [...p, createLine(cleanLine, 'equipmentlist')]);
            else setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
        } else if (captureStage.current === 'practice') parsePracticeLine(textOnly);

        const scoreMatch = textOnly.match(/(\d+)\/(\d+)\s+hits.*(\d+)\/(\d+)\s+mana.*(\d+)\/(\d+)\s+moves/i);
        if (scoreMatch) setStats(p => ({ ...p, hp: parseInt(scoreMatch[1]), maxHp: parseInt(scoreMatch[2]), mana: parseInt(scoreMatch[3]), maxMana: parseInt(scoreMatch[4]), move: parseInt(scoreMatch[5]), maxMove: parseInt(scoreMatch[6]) }));

        if (/alas, you cannot go|no exit|is closed|too exhausted|too tired|cannot go there|blocks your/i.test(lower)) { setRumble(true); triggerHaptic(50); setTimeout(() => setRumble(false), 400); mapperRef.current?.handleMoveFailure(); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail')); }
        if (/pitch black|too dark|cannot see/i.test(lower)) { mapperRef.current?.handleMoveFailure(); if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail')); addMessage('system', "[Mapper] Darkness detected."); }
        if (/hits you|crushes you|pierces you/i.test(lower)) { setHitFlash(true); triggerHaptic(50); setTimeout(() => setHitFlash(false), 150); }
        if (/you have been killed|you are dead/i.test(lower)) { setDeathStage('fade_to_black'); setInCombat(false); setTimeout(() => setDeathStage('flash'), 2000); }
        if (/is dead! r.i.p.|receive your share of experience|you flee head over heels|you stop fighting/i.test(lower)) { setInCombat(false); }

        processTriggers(textOnly);
        if (lower.includes("wimpy")) { const m = textOnly.match(/wimpy.*(\d+)/i); if (m) setStats(p => ({ ...p, wimpy: parseInt(m[1]) })); }


        const isRoomMatched = roomNameRef.current && (textOnly === roomNameRef.current || lower === roomNameRef.current.toLowerCase());
        const isRoomAnsiMatch = cleanLine.includes('\x1b[1;32m') || cleanLine.includes('\x1b[0;32m');
        const isRoomName = !!(isRoomMatched || (isRoomAnsiMatch && textOnly.length < 100 && !textOnly.includes(' - ')));

        const pMatch = cleanLine.match(/^([\*\)\!oO\.\[f<%\~+WU:=O\#\?\(].*?>\s*)(.*)$/);
        const shouldShow = (captureStage.current === 'none' || (!isDrawerCapture.current && !isSilentCapture.current)) || /carrying|using|following|contains/i.test(lower);
        if (shouldShow && !isSilentCapture.current) addMessage('game', pMatch ? pMatch[2] : cleanLine, undefined, undefined, isRoomName);
    }, [addMessage, setStats, setRumble, setHitFlash, setDeathStage, setInventoryLines, setStatsLines, setEqLines, triggerHaptic, mapperRef, parsePracticeLine, processTriggers, roomNameRef]);

    return { processLine };
}
