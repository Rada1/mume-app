import { useState, useRef, useCallback, RefObject } from 'react';
import { GameStats, MessageType, SoundTrigger, CustomButton } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun } from '../utils/gameUtils';


// ------------------------------------------------------------------
// Deps injected from MudClient
// ------------------------------------------------------------------
interface UseGameParserDeps {
    addMessage: (type: MessageType, text: string, combatOverride?: boolean) => void;
    playSound: (buffer: AudioBuffer) => void;
    triggerHaptic: (ms: number) => void;
    setWeather: React.Dispatch<React.SetStateAction<'none' | 'cloud' | 'rain' | 'heavy-rain' | 'snow'>>;
    setIsFoggy: React.Dispatch<React.SetStateAction<boolean>>;
    setStats: React.Dispatch<React.SetStateAction<GameStats>>;
    setAbilities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    setCharacterClass: (val: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none') => void;
    setRumble: React.Dispatch<React.SetStateAction<boolean>>;
    setHitFlash: React.Dispatch<React.SetStateAction<boolean>>;
    setDeathStage: React.Dispatch<React.SetStateAction<any>>;
    setPlayerPosition: React.Dispatch<React.SetStateAction<string>>;
    isInventoryOpen: boolean;
    isCharacterOpen: boolean;
    soundTriggersRef: RefObject<SoundTrigger[]>;
    isSoundEnabledRef: RefObject<boolean>;
    mapperRef: RefObject<any>;
    // Button trigger access  (via ref to avoid stale closures)
    btn: {
        buttonsRef: RefObject<CustomButton[]>;
        setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
        buttonTimers: RefObject<Record<string, ReturnType<typeof setTimeout>>>;
        setActiveSet: (setId: string) => void;
    };
}

// ------------------------------------------------------------------
// Hook
// ------------------------------------------------------------------
export function useGameParser({
    addMessage,
    playSound,
    triggerHaptic,
    setWeather,
    setIsFoggy,
    setStats,
    setAbilities,
    setCharacterClass,
    setRumble,
    setHitFlash,
    setDeathStage,
    setPlayerPosition,
    isInventoryOpen,
    isCharacterOpen,
    soundTriggersRef,
    isSoundEnabledRef,
    mapperRef,
    btn,
}: UseGameParserDeps) {
    // Drawer capture state
    const [inventoryHtml, setInventoryHtml] = useState('');
    const [statsHtml, setStatsHtml] = useState('');
    const [eqHtml, setEqHtml] = useState('');
    const promptTerrainRef = useRef<string | null>(null);

    // Capture flow refs
    const captureStage = useRef<'stat' | 'eq' | 'inv' | 'practice' | 'none'>('none');
    const isDrawerCapture = useRef(false);
    const isWaitingForStats = useRef(false);
    const isWaitingForEq = useRef(false);
    const isWaitingForInv = useRef(false);

    const PROFICIENCY_MAP: Record<string, number> = {
        'awful': 15,
        'bad': 30,
        'poor': 45,
        'average': 60,
        'fair': 70,
        'good': 80,
        'very good': 90,
        'excellent': 100,
        'superb': 101,
    };

    // Helper: extract meaningful noun from item description (for drawer buttons)
    const extractNoun = (text: string) => {
        let clean = text.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').trim();
        clean = clean.replace(/[.,:;!]+$/, '');
        const words = clean.split(/[\s,.-]+/).filter(w => w.length > 1 && !/^(a|an|the|of|in|on|at|to|some|several)$/i.test(w));
        return words.length > 0 ? words[words.length - 1].toLowerCase().replace(/[^\w]/g, '') : '';
    };

    const processLine = useCallback((line: string) => {
        const cleanLine = line.replace(/\r$/, '');
        if (!cleanLine) return;

        const textOnlyForCapture = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        const lowerCapture = textOnlyForCapture.toLowerCase();

        // 1. Detect start of capture based on specific MUME response markers
        if (isWaitingForStats.current && (lowerCapture.includes('ob:') || lowerCapture.includes('armor:') || lowerCapture.includes('mood:') || lowerCapture.includes('str:') || lowerCapture.includes('exp:') || lowerCapture.includes('level:'))) {
            isWaitingForStats.current = false;
            captureStage.current = 'stat';
        }
        if ((isWaitingForEq.current || captureStage.current !== 'none') && lowerCapture.includes('you are using:')) {
            isWaitingForEq.current = false;
            captureStage.current = 'eq';
        }
        if ((isWaitingForInv.current || captureStage.current !== 'none') && lowerCapture.includes('you are carrying:')) {
            isWaitingForInv.current = false;
            captureStage.current = 'inv';
        }
        if (lowerCapture.includes('you have the following') ||
            lowerCapture.includes('you can practice the following') ||
            lowerCapture.includes('practice sessions left') ||
            lowerCapture.includes('skill / spell     knowledge')) {
            captureStage.current = 'practice';
            const classMatch = lowerCapture.match(/(ranger|warrior|mage|cleric|thief)\s+(skills|spells)/i);
            if (classMatch) {
                setCharacterClass(classMatch[1].toLowerCase() as 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief');
            }
        }

        // 2. Prompt detection (terminates capture)
        const isPurePrompt = /^[\*\)\!oO\.\[f\<%\~+WU:=O:\(]\s*[>:]\s*$/.test(textOnlyForCapture);
        const startsWithPrompt = /^[\*\)\!oO\.\[f\<%\~+WU:=O:\(]/.test(textOnlyForCapture);
        const endsWithPromptIndicator = /[>:]\s*$/.test(textOnlyForCapture);
        const isLikelyPrompt = (startsWithPrompt && endsWithPromptIndicator && textOnlyForCapture.length < 60);

        const shouldStopCapture = isPurePrompt || (isLikelyPrompt && !lowerCapture.includes('ob:') && !lowerCapture.includes('armor:') && !lowerCapture.includes('str:') && !lowerCapture.includes('exp:') && !lowerCapture.includes('level:') && !lowerCapture.includes('you are using:') && !lowerCapture.includes('needed:') && !lowerCapture.includes('carrying:'));

        if (shouldStopCapture) {
            captureStage.current = 'none';
            isWaitingForStats.current = false;
            isWaitingForEq.current = false;
            isWaitingForInv.current = false;
        }

        // 3. Perform capture (skip if it's the prompt that just ended it)
        if (!shouldStopCapture) {
            const wrapDrawerItem = (line: string, setName: string) => {
                const textOnly = line.replace(/\x1b\[[0-9;]*m/g, '').replace(/^.*?([a-zA-Z<>\[(])/, '$1').trimRight();
                const trimmed = textOnly.trim();
                const lowerTrimmed = trimmed.toLowerCase();

                const html = ansiConvert.toHtml(line);

                if (!trimmed || lowerTrimmed.includes('you are carrying') || lowerTrimmed.includes('you are using') || lowerTrimmed.includes('nothing.')) {
                    return `<div style="padding: 4px 0; opacity: 0.7; white-space: pre-wrap;">${ansiConvert.toHtml(line.replace(/^.*?([a-zA-Z<>\[(])/, '$1'))}</div>`;
                }

                let itemMatch = textOnly;
                const eqMatch = textOnly.match(/^(<[^>]+>\s+|\[[^\]]+\]:?\s+)(.*)$/);
                if (eqMatch) {
                    itemMatch = eqMatch[2];
                } else {
                    itemMatch = textOnly.trimStart();
                }

                let contextName = extractNoun(itemMatch);

                return `<div class="inline-btn auto-item" data-cmd="${setName}" data-context="${contextName.replace(/"/g, '&quot;')}" data-action="menu" style="background-color: rgba(100, 255, 100, 0.08); border-bottom: 1px solid rgba(255,255,255,0.1); padding: 8px 12px; border-radius: 4px; margin-bottom: 4px; cursor: pointer;">${html}</div>`;
            };

            if (captureStage.current === 'inv') {
                setInventoryHtml(prev => prev + wrapDrawerItem(cleanLine, 'inventorylist'));
            } else if (captureStage.current === 'stat') {
                setStatsHtml(prev => prev + (prev ? '<br/>' : '') + ansiConvert.toHtml(cleanLine));
            } else if (captureStage.current === 'eq') {
                setEqHtml(prev => prev + wrapDrawerItem(cleanLine, 'equipmentlist'));
            } else if (captureStage.current === 'practice') {
                // Skip headers and separators
                if (lowerCapture.includes('skill / spell') || lowerCapture.includes('---')) return;

                let ability = '';
                let proficiency = 0;
                let detectedClass = '';

                // 1. Try Dotted Format: "bash ........................................ very good"
                const dottedMatch = textOnlyForCapture.match(/^([a-zA-Z\s\-]+)\s+\.{3,}\s+([a-zA-Z\s%\d\(\)]+)$/);
                if (dottedMatch) {
                    ability = dottedMatch[1].trim().toLowerCase();
                    const valuePart = dottedMatch[2].trim().toLowerCase();

                    // Check if there's a percentage in parentheses or directly
                    const pctMatch = valuePart.match(/(\d+)%/);
                    if (pctMatch) {
                        proficiency = parseInt(pctMatch[1]);
                    } else {
                        // Look for literals
                        for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                            if (valuePart.includes(lit)) {
                                proficiency = val;
                                break;
                            }
                        }
                    }
                }
                // 2. Try Table Format: "Bandage           Fair       Easy        None"
                else {
                    const parts = textOnlyForCapture.trim().split(/\s{2,}/);
                    if (parts.length >= 2) {
                        ability = parts[0].trim().toLowerCase();
                        const knowledge = parts[1].trim().toLowerCase();

                        // Detect proficiency from knowledge column
                        if (knowledge.includes('%')) {
                            proficiency = parseInt(knowledge) || 0;
                        } else {
                            for (const [lit, val] of Object.entries(PROFICIENCY_MAP)) {
                                if (knowledge === lit || knowledge.startsWith(lit)) {
                                    proficiency = val;
                                    break;
                                }
                            }
                        }

                        // Detect class if present (usually 4th column)
                        if (parts.length >= 4) {
                            const cls = parts[3].trim().toLowerCase();
                            if (['ranger', 'warrior', 'mage', 'cleric', 'thief'].includes(cls)) {
                                detectedClass = cls;
                            }
                        }
                    }
                }

                if (ability && proficiency > 0) {
                    setAbilities(prev => ({ ...prev, [ability]: proficiency }));
                    if (detectedClass) {
                        setCharacterClass(detectedClass as any);
                    }
                }
            }
        }

        const textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        const lower = textOnly.toLowerCase();

        // Stats, Terrain, and Environment parsing removed in favor of GMCP handling in useTelnet.ts
        // BUT: Re-adding a fallback for the "score" command to handle cases where GMCP might be incomplete
        const scoreMatch = textOnly.match(/(\d+)\/(\d+)\s+hits\s*,?\s+(\d+)\/(\d+)\s+mana\s*,?\s+and\s+(\d+)\/(\d+)\s+moves/i);
        if (scoreMatch) {
            setStats(prev => ({
                ...prev,
                hp: parseInt(scoreMatch[1]),
                maxHp: parseInt(scoreMatch[2]),
                mana: parseInt(scoreMatch[3]),
                maxMana: parseInt(scoreMatch[4]),
                move: parseInt(scoreMatch[5]),
                maxMove: parseInt(scoreMatch[6])
            }));
        }

        // Movement failures → rumble + mapper notification
        if (lower.includes("alas, you cannot go that way") ||
            lower.includes("no exit that way") ||
            lower.includes("is closed") ||
            lower.includes("you are too exhausted") ||
            lower.includes("too tired") ||
            lower.includes("cannot go there") ||
            lower.includes("must be standing") ||
            lower.includes("blocks your way") ||
            lower.includes("blocks your path") ||
            lower.includes("blocks your exit") ||
            lower.includes("caught in") ||
            lower.includes("locked") ||
            lower.includes("need a boat") ||
            lower.includes("would drown") ||
            lower.includes("too deep") ||
            lower.includes("cannot climb") ||
            lower.includes("not allowed") ||
            lower.includes("need a light") ||
            lower.includes("already there") ||
            lower.includes("mount is too exhausted")) {
            setRumble(true);
            triggerHaptic(50);
            setTimeout(() => setRumble(false), 400);
            mapperRef.current?.handleMoveFailure();
        }

        const darkStrings = ["pitch black", "too dark", "cannot see"];
        if (darkStrings.some(msg => lower.includes(msg))) {
            mapperRef.current?.handleMoveFailure();
            addMessage('system', "[Mapper] Darkness detected. Room not mapped.");
        }
        // detectLighting removed - relying on GMCP
        if (lower.includes("hits you") || lower.includes("crushes you") || lower.includes("pierces you")) { setHitFlash(true); triggerHaptic(50); setTimeout(() => setHitFlash(false), 150); }
        if (lower.includes("you have been killed") || lower.includes("you are dead")) { setDeathStage('fade_to_black'); setTimeout(() => setDeathStage('flash'), 2000); }

        // Sound Triggers
        soundTriggersRef.current?.forEach(trig => {
            if (!trig.pattern || !trig.buffer) return;
            const match = trig.isRegex ? new RegExp(trig.pattern, 'i').test(textOnly) : textOnly.includes(trig.pattern);
            if (match && isSoundEnabledRef.current) playSound(trig.buffer);
        });

        // Button Triggers
        btn.buttonsRef.current?.forEach(b => {
            if (!b.trigger?.enabled || !b.trigger.pattern) return;
            const match = b.trigger.isRegex ? new RegExp(b.trigger.pattern).test(textOnly) : textOnly.includes(b.trigger.pattern);
            if (match) {
                if (b.display === 'floating') {
                    btn.setButtons(prev => prev.map(x => x.id === b.id ? { ...x, isVisible: true } : x));
                    if (b.trigger.duration > 0) {
                        if (btn.buttonTimers.current[b.id]) clearTimeout(btn.buttonTimers.current[b.id]);
                        btn.buttonTimers.current[b.id] = setTimeout(() => {
                            btn.setButtons(prev => prev.map(x => x.id === b.id ? { ...x, isVisible: false } : x));
                        }, b.trigger.duration * 1000);
                    }
                }
                if (b.trigger.type === 'switch_set' && b.trigger.targetSet) btn.setActiveSet(b.trigger.targetSet);
            }
        });

        // Wimpy Detection
        if (lower.includes("wimpy")) {
            const wimpyMatch = textOnly.match(/wimpy\s+(?:is|set to)?\s*(\d+)/i);
            if (wimpyMatch) {
                const w = parseInt(wimpyMatch[1]);
                setStats(prev => ({ ...prev, wimpy: w }));
            }
        }

        const mumePromptRegex = /^([\*\)\!oO\.\[f<%\~+WU:=O\#\?\(].*[>:]\s*)(.*)$/;
        const pMatch = cleanLine.match(mumePromptRegex);

        const isCapturing = captureStage.current !== 'none' && isDrawerCapture.current;

        if (pMatch) {
            const messagePart = pMatch[2];
            if (messagePart && !isCapturing) addMessage('game', messagePart);
        } else {
            if (!isCapturing) addMessage('game', cleanLine);
        }
    }, [addMessage, btn, isInventoryOpen, isCharacterOpen,
        setWeather, setIsFoggy, setStats, setRumble, setHitFlash, setDeathStage,
        playSound, triggerHaptic, soundTriggersRef, isSoundEnabledRef, promptTerrainRef, mapperRef]);

    return {
        // Drawer state
        inventoryHtml, setInventoryHtml,
        statsHtml, setStatsHtml,
        eqHtml, setEqHtml,
        // Capture refs (still needed by effects in MudClient that reset them on drawer close)
        captureStage,
        isDrawerCapture,
        isWaitingForStats,
        isWaitingForEq,
        isWaitingForInv,
        // The main callback
        processLine,
    };
}
