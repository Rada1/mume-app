/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 */

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { DrawerLine, GameEntity } from '../../types';
import { UseGameParserDeps } from './types';

import { ansiConvert } from '../../utils/ansi';
import { useTriggerProcessor } from '../useTriggerProcessor';
import { useQuestsHandler } from '../useQuestsHandler';
import { useEntityRegistry } from '../useEntityRegistry';

// Specialized Sub-Hooks
import { useStageManager } from './useStageManager';
import { usePromptParser } from './usePromptParser';
import { useCombatParser } from './useCombatParser';
import { useStatParser } from './useStatParser';
import { useRoomParser } from './useRoomParser';
import { useAtmosphereParser } from './useAtmosphereParser';
import { useActionTracker } from './useActionTracker';
import { useCommParser } from './useCommParser';
import { useLineProcessor } from './useLineProcessor';
import { useStageInitializer } from './useStageInitializer';
import { useMessageRouter } from './useMessageRouter';
import { useAccountParser } from './useAccountParser';
import { useTimeParser } from './useTimeParser';
import { useLogGmcpParser } from './useLogGmcpParser';
import { useSpectateAutomator } from '../useSpectateAutomator';
import { occupantAnims, getOccupantKey, DIR_WORD_TO_CODE } from '../../components/Mapper/occupantAnimStore';

import { SessionContextType } from '../../context/GameContext/types';

export function useGameParser(deps: UseGameParserDeps, session: SessionContextType) {
    const { 
        mapperRef, btn, addMessage, playSound, playHitImpactSound,
        playOofSound, playSlashSound, playCleaveSound, playSmiteSound,
        playPierceSound, playStabSound, playArrowHitSound, playKillSound,
        playLevelSound, playCommMessageSound, playBashSound, loadBashSound,
        playIncantationSound, playBuySellSound, stopIncantationSound,
        primeSpellSuccess, playMagicExplosionSound, playRandomSound,
        playDoorSound, triggerHaptic, actionsRef, executeCommandRef,
        keywordOverrides, showDebugEchoes, addDiagnosticLog, popoverState,
        setPopoverState, setDiscoveredItems, quests, setQuests, mumeEditState,
        setMumeEditState, isPlayersOpen, isInventoryOpen, isEquipmentOpen,
        triggerXpTicker, triggerHitFlash, triggerOppHitFlash, pendingGmcpCommRef, lastCommIdBySenderRef,
        lastCommMsgIdRef, lastCommTimeRef,
        shop, practice, registerEntity, setEntities, isCharacterOpen, isStatsOpen,
        accountState, setAccountState, accountStageRef, setGameState, setMessages,
        isSpectateMode, spectateCharacterName, processMessageHtml, sessionMode, help,
        setIsPasswordMode, spectateQueue, setSpectateQueue, lastSnoopStartTime,
        setLastSnoopStartTime, addSystemMessage, setGameTime, gameTime,
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, captureOwnerDrawer,
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName,
        setSpectateOpponentStatus, setSpectatePosition, setSpectateWaiting,
        setSpectateRoomName, setSpectateTerrain, setSpectateRoomZone,
        setSpectateLighting, setSpectateWeather, setSpectateIsFoggy,
        setSpectateInCombat, setSpectateCharacterName, setSpectateGroupMembers,
        setSpectateRoomDesc, inCombatRef, groupMembers, setDeathRoomId, roomPlayers,
        roomNpcs, roomItems, roomNameRef, roomDescRef,
        spectateRoomName, spectateRoomDesc,
        setWhoList, setWhereList, setRoomItems
    } = deps;

    // Map session setters to common names used in sub-parsers
    const { setStats, setTarget, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, setBufferHealthStatus, setBufferName, setCharacterInfo } = session.vitals as any;
    const { setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain, setInCombat, setPlayerPosition, setWeather, setIsFoggy, setLightningEnabled, setInventoryLines, setStatsLines, setInfoLines, setScoreLines, setQuestLines, setPracticeLines, setWhoLines, setWhereLines, setEqLines, setRoomPlayers, setRoomNpcs, setRoomItems: sessionSetRoomItems, setRoomExits } = session.game as any;
    const { addMessage: sessionAddMessage } = session.log;

    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef, playRandomSound });
    const { parseQuestLine, finalizeQuests } = useQuestsHandler(setQuests, quests.activeQuests);
    const { detectCapabilities, extractNoun } = useEntityRegistry();

    // Shared Buffers/Refs
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);
    const tempStatsRef = useRef<DrawerLine[]>([]);
    const tempScoreRef = useRef<DrawerLine[]>([]);
    const tempInfoRef = useRef<DrawerLine[]>([]);
    const tempPracticeRef = useRef<DrawerLine[]>([]);
    const tempQuestRef = useRef<DrawerLine[]>([]);
    const tempWhoRef = useRef<DrawerLine[]>([]);
    const tempWhereRef = useRef<DrawerLine[]>([]);
    const tempEntitiesRef = useRef<Record<string, GameEntity>>({});
    const counterRef = useRef(0);
    const shopPagerSeenRef = useRef(false);
    const lastRoomChangeTimeRef = useRef(0);


    // Initialize Specialized Hooks
    const { finalizeCapture } = useStageManager({
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, captureOwnerDrawer,
        addDiagnosticLog, addMessage,
        setPopoverState, setEqLines, setInventoryLines,
        setStatsLines, setInfoLines, setScoreLines, setQuestLines, setPracticeLines, setWhoLines, setWhereLines,
        registerEntity, setEntities,
        practice, shop, help, quests, finalizeQuests,
        tempEqRef, tempInvRef, tempStatsRef, tempScoreRef, tempInfoRef, tempPracticeRef, tempQuestRef, tempWhoRef, tempWhereRef, tempEntitiesRef,
        isMobile: deps.isMobile
    });

    const { parsePrompt } = usePromptParser({
        captureStage, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName,
        setBufferHealthStatus, setBufferName, finalizeCapture,
        isSpectateMode: deps.isSpectateMode,
        setStats, setSpectateStats, setSpectateHealthStatus,
        setSpectateOpponentName, setSpectateOpponentStatus, setSpectateInCombat
    });

    const { parseLogGmcp, resetSpectateContext } = useLogGmcpParser({
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName,
        setSpectateOpponentStatus, setSpectatePosition, setSpectateWaiting, setSpectateRoomName, setSpectateRoomDesc: setSpectateRoomDesc as any,
        setSpectateTerrain, setSpectateRoomZone, setSpectateLighting, setSpectateWeather, setSpectateIsFoggy,
        setSpectateInCombat, setSpectateCharacterName,
        setSpectateGroupMembers: deps.setSpectateGroupMembers,
        setRoomPlayers: deps.setRoomPlayers, setRoomNpcs: deps.setRoomNpcs,
        setRoomItems: deps.setRoomItems,
        setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain, setRoomExits: deps.setRoomExits,
        characterName: deps.characterName,
        mapperRef,
        detectLighting: deps.detectLighting,
        setWeather: deps.setWeather,
        setIsFoggy: deps.setIsFoggy,
        spectateCharacterName: deps.spectateCharacterName,
        isSpectateMode: deps.isSpectateMode,
        sessionMode,
        playMovementSound: deps.playMovementSound,
        playDoorSound: deps.playDoorSound
    });

    const { checkCombatMatch, handleCombatExit, handleXpTicker } = useCombatParser({
        inCombatRef, setOpponentHealthStatus, setOpponentName, setCharacterInfo,
        triggerXpTicker, groupMembers, mapperRef, setDeathRoomId: deps.setDeathRoomId,
        spectateCharacterName, roomPlayers, playKillSound, playLevelSound,
        setSpectateInCombat, setSpectateOpponentName, setSpectateOpponentStatus
    });

    const { parseGlobalStatus, parseDetailedScore } = useStatParser({
        setMood: deps.setMood, setStats, setCharacterInfo, inCombatRef, executeCommandRef, captureStage
    });

    const { detectRoom } = useRoomParser({
        roomNameRef, roomDescRef, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, isDrawerCapture, isSilentCapture,
        isSpectateMode: deps.isSpectateMode,
        spectateRoomName, spectateRoomDesc
        // Using roomDescRef from useLogGmcpParser might need an explicit spectateRoomDesc ref or state string if MUME sends it, but for now we just pass what we have
    });

    const { parseAtmosphere } = useAtmosphereParser({
        setWeather, setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, setPlayerPosition,
        setSpectatePosition: deps.setSpectatePosition, 
        isSpectateMode: deps.isSpectateMode
    });

    const { trackAction } = useActionTracker({
        isSilentCapture, isDrawerCapture, setInventoryLines, setEqLines, setCharacterInfo, extractNoun, ansiConvert
    });

    const { parseComm } = useCommParser({
        pendingGmcpCommRef, lastCommIdBySenderRef
    });

    const { createLines, resetNounCounts, resetContainerStack } = useLineProcessor({
        captureStage, keywordOverrides, extractNoun, detectCapabilities, ansiConvert, addDiagnosticLog, tempEntitiesRef,
        inlineCategories: deps.inlineCategories
    });

    const { initializeStage } = useStageInitializer({
        captureStage, isSilentCapture, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo,
        captureOwnerDrawer,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState,
        setScoreLines, setStatsLines, setInfoLines,
        tempStatsRef, tempScoreRef, tempInfoRef, tempPracticeRef, tempQuestRef, tempWhoRef, tempWhereRef,
        finalizeCapture, help,
        executeCommand: (cmd, silent, isSystem) => executeCommandRef.current?.(cmd, silent, isSystem),
        isMobile: deps.isMobile
    });


    const { routeMessage, determineVisibility, detectItemsInRoom } = useMessageRouter({
        captureStage, isSilentCapture, isDrawerCapture,
        captureOwnerDrawer,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        isWaitingForInv, isWaitingForInfo, isWaitingForEq, isWaitingForStats,
        setWhoList, setWhereList, setRoomItems, registerEntity, setCharacterInfo, setDiscoveredItems, extractNoun, ansiConvert,
        playerPosition: deps.playerPosition,
        inlineCategories: deps.inlineCategories
    });

    const { parseAccountLine } = useAccountParser({
        accountState,
        setAccountState,
        accountStageRef,
        gameState: deps.gameState,
        setGameState,
        sendCommand: (cmd: string) => executeCommandRef.current?.(cmd),
        executeCommandRef,
        isMobile: deps.isMobile,
        addDiagnosticLog,
        addMessage,
        setMessages,
        clearLog: deps.clearLog,
        setIsPasswordMode
    });
    
    const { parseTimeLine } = useTimeParser({ setGameTime, gameTime });
    
    const automator = useSpectateAutomator({
        spectateQueue,
        setSpectateQueue,
        lastSnoopStartTime,
        setLastSnoopStartTime,
        spectateCharacterName,
        setSpectateCharacterName,
        executeCommand: (cmd, silent, isSystem) => executeCommandRef.current?.(cmd, silent, isSystem),
        addSystemMessage,
        isSpectateMode,
        setIsSpectateMode: deps.setIsSpectateMode,
        resetSpectateContext
    });

    // NOTE: Account parsing is handled entirely inside processLine() via the
    // parseAccountLine call below. The old activePrompt watcher was removed because
    // useTelnet already calls processLine() on any incomplete buffer ending with '>',
    // so the same prompt was being parsed twice — causing the duplicate account-prompt spam.
    
    // --- Room Transition Tracking ---
    useEffect(() => {
        const onMove = () => { lastRoomChangeTimeRef.current = Date.now(); };
        window.addEventListener('mume-mapper-move-confirmed', onMove);
        window.addEventListener('mume-mapper-room-info', onMove);
        return () => {
            window.removeEventListener('mume-mapper-move-confirmed', onMove);
            window.removeEventListener('mume-mapper-room-info', onMove);
        };
    }, []);

    // Emergency Spectate Sync: If we start spectating, we are definitely NOT stuck in account menu.
    useEffect(() => {
        if (isSpectateMode && deps.gameState === 'account') {
            setGameState('playing');
            setAccountState(prev => ({ ...prev, stage: 'none' }));
        }
    }, [isSpectateMode, deps.gameState, setGameState, setAccountState]);

    const processLine = useCallback((line: string) => {
        try {
            let cleanLine = line.replace(/\r$/, '').normalize('NFC');
        // We no longer return early on empty lines to allow "compact off" (blank lines) to be visible.
        // This is crucial for properly rendering the game's spacing when compact mode is disabled.

        // --- GMCP Text Leak Suppression ---
        // Some modes (like spectating or server bugs) may cause GMCP to bleed through as text.
        // We always try to parse and suppress these lines to avoid log pollution.
        if (parseLogGmcp(cleanLine)) {
            // Emergency sync: If we are in account mode but receiving gameplay GMCP, we've transitioned.
            if (deps.gameState === 'account') {
                setGameState('playing');
                setAccountState(prev => ({ ...prev, stage: 'none' }));
            }
            return null;
        }

        // In spectate mode, snooped GMCP bleed often comes wrapped in surrounding blank lines.
        // Those empty lines would otherwise fall through and pollute the log with phantom gaps,
        // so we drop them entirely while spectating.
        if (isSpectateMode && cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim().length === 0) {
            return null;
        }

        // Snoop prefixes typically look like '&I ' (Input/Command) or '&O ' (Output)
        // In some cases (or tightly packed streams), the space might be missing if followed by '>'
        // We allow for leading whitespace or 'junk' characters (\uFFFD diamonds, etc.) often found in snoop streams.
        const snoopRegex = /^(?:[\s\uFFFD\x00-\x1F\x7F-\xFF]*((?:\x1b\[[0-9;]*m)*))&([a-zA-Z])(?:\s|(?=>))/;
        let isSnoopInput = false;
        let isSnoop = false;
        
        if (isSpectateMode) {
            let snoopMatch;
            while ((snoopMatch = cleanLine.match(snoopRegex))) {
                isSnoop = true;
                const snoopType = snoopMatch[2].toUpperCase();
                if (snoopType === 'I') isSnoopInput = true;
                // Preserve the ANSI codes (group 1) but remove the junk and the snoop prefix
                cleanLine = cleanLine.replace(snoopRegex, (_, g1) => g1 || '');
            }
        }

        let textOnlyWithSpaces = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        let textOnly = textOnlyWithSpaces;
        
        // Final safety catch for commands: if it was snooped and the text starts with '>', it's a command.
        // We ignore leading junk characters here as well.
        if (isSnoop && textOnly.trim().replace(/^[\s\uFFFD\x00-\x1F\x7F-\xFF]*/, '').startsWith('>')) {
            isSnoopInput = true;
            
            // Trigger 2: Detect snooped player sending <stop>
            const trimmedCmd = textOnly.trim().substring(1).trim().toLowerCase(); // Remove the '>' and trim
            if (trimmedCmd === '<stop>' || trimmedCmd === "'<stop>'" || trimmedCmd === '"<stop>"') {
                automator.stopSnoop(true);
            }
        }

        let lower = textOnly.trim().toLowerCase();
        
        if (captureStage.current !== 'practice' && textOnly.trim().length > 0) {
            practice.parsePracticeLine(textOnly);
        }
        
        let content = textOnly;
        let contentLower = content.toLowerCase();

        const currentRoomName = roomNameRef.current;
        const textOnlyRaw = textOnly;
        const lowerRaw = lower;
        
        const promptInfo = parsePrompt(textOnly);
        let attachedText = promptInfo.attachedText || "";
        const isPromptMatch = promptInfo.isMatch;

        if (isPromptMatch || captureStage.current === 'none') {
            resetNounCounts();
        }

        if (isPromptMatch) {
            // Support spectate lighting sync from snooped prompts
            if (isSpectateMode && isSnoop && deps.setSpectateLighting) {
                const cleanForSearch = promptInfo.promptPart.replace(/\[.*?\]/g, '');
                let type: import('../../types').LightingType = 'none';
                if (cleanForSearch.includes('!')) type = 'artificial';
                else if (cleanForSearch.includes('*')) type = 'sun';
                else if (cleanForSearch.includes(')') || cleanForSearch.includes('(')) type = 'moon';
                else if (/\bo\b/i.test(cleanForSearch) || cleanForSearch.includes(' o ') || cleanForSearch.endsWith(' o>')) type = 'dark';

                if (type !== 'none') {
                    deps.setSpectateLighting(type);
                }
            }

            // --- Snooped Prompt Stat Parsing ---
            // Parse HP/MA/MV status words from the spectated player's prompt as an additional
            // reference to update spectate stat bars, acting as a fallback when exact GMCP
            // current values haven't arrived yet.
            if (isSpectateMode && isSnoop) {
                const SNOOP_HP_STATUS: Record<string, import('../../types').CombatHealthStatus> = {
                    'healthy': 'Healthy', 'fine': 'Fine', 'hurt': 'Hurt',
                    'wounded': 'Wounded', 'bad': 'Bad', 'awful': 'Awful',
                    'stunned': 'Stunned', 'dying': 'Dying', 'bleeding': 'Dying'
                };
                const SNOOP_HP_PCT: Record<string, number> = {
                    'healthy': 100, 'fine': 90, 'hurt': 70, 'wounded': 45,
                    'bad': 25, 'awful': 12, 'stunned': 25, 'dying': 5, 'bleeding': 5
                };
                // Mana (MA / SP): Full→100, Aflame/Burning→88, Flowing→75, Warm→50, Cool→30, Cold→15, Icy→5, Empty→0
                const SNOOP_MANA_PCT: Record<string, number> = {
                    'full': 100, 'aflame': 88, 'burning': 88, 'flowing': 75,
                    'warm': 50, 'cool': 30, 'cold': 15, 'icy': 5, 'empty': 0
                };
                // Move (MV): Full→100, Fresh→88, Alert→75, Tired→50, Winded→30, Weary→15, Fainting→5, Exhausted→0
                const SNOOP_MOVE_PCT: Record<string, number> = {
                    'full': 100, 'fresh': 88, 'alert': 75, 'tired': 50,
                    'winded': 30, 'weary': 15, 'fainting': 5, 'exhausted': 0
                };

                const hpWord = promptInfo.promptPart.match(/HP:(\w+)/i)?.[1]?.toLowerCase();
                const maWord = promptInfo.promptPart.match(/(?:MA|SP):(\w+)/i)?.[1]?.toLowerCase();
                const mvWord = promptInfo.promptPart.match(/MV:(\w+)/i)?.[1]?.toLowerCase();

                if (hpWord) {
                    const status = SNOOP_HP_STATUS[hpWord] ?? null;
                    if (status) deps.setSpectateHealthStatus(status);
                    const hpPct = SNOOP_HP_PCT[hpWord];
                    if (hpPct !== undefined) {
                        deps.setSpectateStats(prev =>
                            // Only apply estimate if current hp is 0 but max is known (GMCP not yet received)
                            prev.hp === 0 && prev.maxHp > 0
                                ? { ...prev, hp: Math.round((hpPct / 100) * prev.maxHp) }
                                : prev
                        );
                    }
                }

                if (maWord) {
                    const manaPct = SNOOP_MANA_PCT[maWord];
                    if (manaPct !== undefined) {
                        deps.setSpectateStats(prev =>
                            prev.mana === 0 && prev.maxMana > 0
                                ? { ...prev, mana: Math.round((manaPct / 100) * prev.maxMana) }
                                : prev
                        );
                    }
                }

                if (mvWord) {
                    const movePct = SNOOP_MOVE_PCT[mvWord];
                    if (movePct !== undefined) {
                        deps.setSpectateStats(prev =>
                            prev.move === 0 && prev.maxMove > 0
                                ? { ...prev, move: Math.round((movePct / 100) * prev.maxMove) }
                                : prev
                        );
                    }
                }
            }

            if (!attachedText) {
                if (isSnoop) {
                    // Snooped standalone prompt — this is the spectated player's '>' prompt,
                    // which is part of the spectated POV and should be shown.
                    // NOTE: must pass undefined for providedIsHitterImpact (param 19) so that
                    // isSnoop lands on providedIsSnoop (param 20), not one position early.
                    addMessage('prompt', cleanLine, false, undefined, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, isSnoop, isSnoopInput);
                }
                // User's own standalone prompt is not part of the spectated POV — drop silently.
                return;
            }
            
            // If we have attached text on the SAME LINE as a prompt, we MUST process it.
            if (parseLogGmcp(attachedText)) return;

            // If the attached text starts an 'info' capture, we need to capture it.
            initializeStage(attachedText, attachedText.toLowerCase(), attachedText, attachedText.toLowerCase(), attachedText);

            content = attachedText;
            contentLower = content.toLowerCase();
            
            // For OUR prompts, we strip the prompt text to show only the description/message.
            // For SNOOPED inputs, we keep the prompt (>) as it identifies the command.
            if (!isSnoopInput) {
                cleanLine = cleanLine.replace(/^(?:[\s\uFFFD\x00-\x1F\x7F-\xFF\x1b\[0-9;]*m)*[^>]*>/, '').trim();
                textOnly = attachedText;
                lower = attachedText.toLowerCase();
            }

            // Emergency sync: if we see a gameplay prompt, we are definitely in-game.
            if (promptInfo.isGameplayPrompt && deps.gameState === 'account') {
                setGameState('playing');
                setAccountState(prev => ({ ...prev, stage: 'none' }));
            }
        }

        // --- Verbose Stat Parsing (standalone score line in spectate mode) ---
        // e.g. "70/98 hits, 75/130 mana, and 106/106 moves."
        // Also handles "487/522 hits and 142/160 moves." (no mana for non-caster classes)
        // These lines in snoops usually have the &G prefix already stripped.
        // We only parse this if we're in spectate mode and the line is a snoop.
        if (isSnoop) {
            const verboseRegex = /(\d+)\/(\d+)\s+hits(?:,?\s+(\d+)\/(\d+)\s+mana)?,?\s+and\s+(\d+)\/(\d+)\s+moves/i;
            const vm = textOnly.match(verboseRegex);
            if (vm) {
                const hasMana = vm[3] !== undefined;
                setSpectateStats(prev => ({
                    ...prev,
                    hp: parseInt(vm[1]),
                    maxHp: parseInt(vm[2]),
                    move: parseInt(vm[5]),
                    maxMove: parseInt(vm[6]),
                    ...(hasMana ? { mana: parseInt(vm[3]), maxMana: parseInt(vm[4]) } : {})
                }));
            }
        }

        // --- Movement Direction Parsing (for occupant dot animations) ---
        // Parse "X has arrived from the west." and "X leaves west." to seed directional anims.
        if (lower.includes(' leaves ') || lower.includes(' arrived from ') || lower.includes(' arrives from ')) {
            const exitMatch = textOnly.match(/^(.+?) leaves (north|south|east|west|up|down|northeast|northwest|southeast|southwest)\b/i);
            if (exitMatch) {
                const rawName = exitMatch[1].trim();
                const dirWord = exitMatch[2].toLowerCase();
                const dir = DIR_WORD_TO_CODE[dirWord];
                if (dir) {
                    // Strip leading article so text-parsed key matches GMCP name (e.g. "a pack horse" → "pack horse")
                    const name = rawName.replace(/^(a|an|the)\s+/i, '').trim();
                    const key = getOccupantKey(null, name);
                    if (occupantAnims) occupantAnims.set(key, { dir, type: 'exit', startTime: Date.now(), name, isPlayer: false });
                    mapperRef?.current?.triggerRender?.();
                }
            }
            const enterMatch = textOnly.match(/^(.+?) (?:has arrived|arrives?) from (?:the )?(north|south|east|west|up|down|northeast|northwest|southeast|southwest|above|below)\b/i);
            if (enterMatch) {
                const rawName = enterMatch[1].trim();
                const dirWord = enterMatch[2].toLowerCase();
                const dir = DIR_WORD_TO_CODE[dirWord];
                // Suppress animation if we just arrived in the room
                if (dir && (Date.now() - lastRoomChangeTimeRef.current) > 300) {
                    // Strip leading article so text-parsed key matches GMCP name (e.g. "a pack horse" → "pack horse")
                    const name = rawName.replace(/^(a|an|the)\s+/i, '').trim();
                    const key = getOccupantKey(null, name);
                    if (occupantAnims) occupantAnims.set(key, { dir, type: 'enter', startTime: Date.now(), name, isPlayer: false });
                    mapperRef?.current?.triggerRender?.();
                }
            }
        }

        // --- Optimistic Item Management (Get/Drop) ---
        // Instantly update the map dots when items are picked up or dropped.
        const stripArticles = (s: string) => s.replace(/^(a|an|the)\s+/i, '').trim();

        // 1. Get/Take match: "You get a sword." or "Luthien gets a sword."
        const getMatch = textOnly.match(/^\s*(.+?) (?:gets?|takes?) (.+?)(?:\.|\s)*$/i);
        if (getMatch) {
            const rawItemName = getMatch[2];
            const cleanName = stripArticles(rawItemName).toLowerCase();
            setRoomItems(prev => prev.filter(item => {
                const fields = [item.name, item.keyword, item.short, (item as any).shortdesc];
                const isMatch = fields.some(val => {
                    if (typeof val !== 'string') return false;
                    const v = val.toLowerCase().trim();
                    return v.includes(cleanName) || cleanName.includes(v);
                });
                return !isMatch;
            }));
        }

        // 2. Drop match: "You drop a sword." or "Luthien drops a sword."
        const dropMatch = textOnly.match(/^\s*(.+?) drops? (.+?)(?:\.|\s)*$/i);
        if (dropMatch) {
            const rawItemName = dropMatch[2];
            const cleanName = stripArticles(rawItemName);
            setRoomItems(prev => [...prev, { name: cleanName, keyword: cleanName, short: cleanName }]);
        }

        initializeStage(textOnly, lower, content, contentLower, attachedText || undefined);
        
        const combatInfo = checkCombatMatch(lower, isSnoop);
        const isCombatMatch = combatInfo.isMatch;

        if (isCombatMatch && combatInfo.isImpact) {
            // NOTE: setInCombat is intentionally NOT called here.
            // Combat mode is driven exclusively by GMCP position data (GmcpDecoder / useGmcpVitals).
            // Text-based detection is unreliable — combat verbs appear in bystander messages,
            // flavor text, and group combat, which all caused false triggers.

            const VOLUME_MAP: Record<string, number> = {
                'extremely hard': 2.4,
                'very hard': 1.8,
                'hard': 1.35,
                'strongly': 1.0,
                'lightly': 0.5,
                'barely': 0.3
            };
            const volume = (combatInfo.modifier && VOLUME_MAP[combatInfo.modifier]) || 0.8;
            const pitch = 1.0; 
            
            // Differentiate sounds in spectate mode (quieter)
            if (isSnoop) volume *= 0.75;

            if (combatInfo.isMainActor) {
                // We allow the sound to play if we just started combat (isMatch) 
                // to avoid missing the very first hit sound.
                console.log(`[Parser] Processing player hit: "${combatInfo.verb}" (Modifier: ${combatInfo.modifier || 'none'})`);
                if (lower.match(/\bcleaves?\b/i)) {
                    playCleaveSound?.({ pitch, volume });
                } else if (lower.match(/\bsmites?\b/i)) {
                    playSmiteSound?.({ pitch, volume });
                } else if (lower.match(/\bpierces?\b/i)) {
                    playPierceSound?.({ pitch, volume });
                } else if (lower.match(/\bstabs?\b/i)) {
                    playStabSound?.({ pitch, volume });
                } else if (lower.match(/\bslash(?:es)?\b/i)) {
                    playSlashSound?.({ pitch, volume });
                } else if (lower.match(/\bbash(?:es)?\b/i)) {
                    playBashSound?.({ pitch, volume });
                } else if (lower.match(/\bshoots?\b/i)) {
                    playArrowHitSound?.({ pitch, volume });
                } else {
                    console.log(`[Parser] No specialized match for "${combatInfo.verb}", using generic impact.`);
                    playHitImpactSound?.({ pitch, volume });
                }
                triggerOppHitFlash?.();
            } else if (combatInfo.side === 'opponent') {
                // Only play "oof" if the message confirmed the player was the target (isPlayerTarget)
                if (combatInfo.isPlayerTarget) {
                    console.log(`[Parser] Processing opponent hit on player: "${combatInfo.verb}" (Modifier: ${combatInfo.modifier || 'none'})`);
                    playOofSound?.({ pitch, volume: volume * 1.2 });
                    triggerHitFlash?.();
                }
            }
        }

        // Check for Account/Login prompts
        if (parseAccountLine(line, false)) return;

        // --- Game Time Parsing ---
        if (parseTimeLine(line)) return;

        // --- Spell Casting Sounds ---
        // We trigger the starting sound via text parsing to ensure they sync with the log message.
        // We handle both second-person (player) and third-person (spectated player) variants.
        const matchesIncantationText = 
            lower.includes('you begin some strange incantations') ||
            lower.includes('you start to concentrate') ||
            lower.includes('you muster all of your concentration');

        if (matchesIncantationText) {
            // In spectate mode, we play if it's snooped OR if it's the target's name in the room line
            const isTargetActing = !isSpectateMode || isSnoop || (spectateCharacterName && lower.includes(spectateCharacterName.toLowerCase()));
            
            if (isTargetActing) {
                console.log(`[GameParser] Incantation match: snoop=${isSnoop}, text="${textOnly.substring(0, 40)}..."`);
                playIncantationSound?.();
            }
        }

        const isSpellSuccess = lower.startsWith('ok.') || 
                               lower.includes('you utter the words') ||
                               lower.startsWith('you feel ') ||
                               lower.startsWith('you create ') ||
                               lower.includes('is filled with a sudden warmth') ||
                               lower.includes('a shield of light') ||
                               lower.includes('you call a lightning') ||
                               lower.includes('you wish for ') ||
                               lower.includes('scratches and bruises disappear');

        if (isSpellSuccess) {
            if (isSpectateMode) {
                // In spectate mode, we prime the success but wait for the position switch to stop
                if (isSnoop) primeSpellSuccess?.(true);
            } else {
                primeSpellSuccess?.(true);
                stopIncantationSound?.(true);
            }
        } else if (lower.includes('lose your concentration') || 
                   lower.includes('lost your concentration') ||
                   lower.includes('stop your incantations') ||
                   lower.includes('are interrupted') ||
                   lower.includes('concentration is broken') ||
                   lower.includes('too dazed to concentrate') ||
                   lower.includes('too stunned to concentrate')) {
            if (isSpectateMode) {
                // Interruptions in spectate mode are often immediate, but we also clear the success prime
                if (isSnoop) {
                    primeSpellSuccess?.(false);
                    stopIncantationSound?.(false);
                }
            } else {
                primeSpellSuccess?.(false);
                stopIncantationSound?.(false);
            }
        }



        if (lower.includes('type %e on an empty line to save') || 
                 lower.includes('type %q to abandon') ||
                 /^(enter new |editing )\w+/i.test(textOnly)) {
            if (!mumeEditState.isOpen) {
                setMumeEditState({ isOpen: true, title: textOnly.trim(), text: '', key: 'text-editor' });
            }
        }

        parseGlobalStatus(content, contentLower);
        handleCombatExit(lower, isSnoop);
        handleXpTicker(lower, isSnoop);

        if (captureStage.current !== 'none') {
            if (captureStage.current === 'quest') {
                const textToParse = attachedText || textOnly;
                if (textToParse.length > 0) {
                    parseQuestLine(textToParse);
                    const html = processMessageHtml ? processMessageHtml(ansiConvert.toHtml(cleanLine), 'quest-line-' + Math.random(), false, 'quest-list') : ansiConvert.toHtml(cleanLine);
                    tempQuestRef.current.push({ id: Math.random().toString(36).substring(7), text: textToParse, html });
                }
                if (promptInfo.isEndPrompt && !attachedText) finalizeCapture();
                if (isDrawerCapture.current || isSilentCapture.current) return;
            }
            parseDetailedScore(textOnly, lower);
        }

        const { isRoomName, isRoomDescription, isRoomWindow } = detectRoom(textOnly, lower, isPromptMatch);

        if (currentRoomName && (textOnlyRaw.startsWith(currentRoomName) || lowerRaw.startsWith(currentRoomName.toLowerCase()))) {
            const headerPart = textOnlyRaw.startsWith(currentRoomName) ? currentRoomName : textOnlyRaw.substring(0, currentRoomName.length);
            const remaining = textOnlyRaw.substring(headerPart.length);
            const nextChar = remaining[0];
            if (!nextChar || nextChar === '.' || nextChar === ' ' || nextChar === '[') {
                const headerEndIdx = cleanLine.indexOf(headerPart) + headerPart.length;
                let finalHeaderEndIdx = headerEndIdx;
                if (cleanLine[headerEndIdx] === '.') finalHeaderEndIdx++;
                if (cleanLine.substring(finalHeaderEndIdx).trim().length > 3) {
                    processLine(cleanLine.substring(0, finalHeaderEndIdx));
                    processLine(cleanLine.substring(finalHeaderEndIdx).trim());
                    return;
                }
            }
        }

        if (captureStage.current === 'none') {
            resetContainerStack();
            resetNounCounts();
        }
        parseAtmosphere(lower, isSnoop);

        if (/\b(you buy|you sell|you sold)\b/i.test(lower)) {
            playBuySellSound?.();
        }

        if (['inv', 'eq', 'stat', 'container', 'practice', 'shop', 'shop-detail', 'info', 'whois', 'who', 'where', 'help'].includes(captureStage.current)) {
            if (captureStage.current === 'inv') {
                tempInvRef.current.push(...createLines(cleanLine, textOnly, lower, 'inventorylist'));
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) tempEqRef.current.push(...createLines(cleanLine, textOnly, lower, 'equipmentlist'));
            } else if (captureStage.current === 'practice') {
                if (textOnly.trim().length > 0) {
                    const skill = practice.parsePracticeLine(textOnly);
                    const practiceSkill = (typeof skill === 'object' && skill !== null && !('sessionsLeft' in skill)) ? skill : undefined;
                    tempPracticeRef.current.push({ 
                        id: Math.random().toString(36).substring(7), 
                        text: textOnly, 
                        html: ansiConvert.toHtml(cleanLine),
                        practiceSkill
                    });
                }
            } else if (captureStage.current === 'who' || captureStage.current === 'where') {
                if (textOnly.trim().length > 0) {
                    const isHeader = lower.startsWith('player') || lower.startsWith('---');
                    const html = (processMessageHtml && !isHeader)
                        ? processMessageHtml(ansiConvert.toHtml(cleanLine), 'players-line-' + Math.random(), false, captureStage.current === 'who' ? 'who-list' : 'where-list') 
                        : ansiConvert.toHtml(cleanLine);
                    const targetRef = captureStage.current === 'who' ? tempWhoRef : tempWhereRef;
                    targetRef.current.push({ id: Math.random().toString(36).substring(7), text: textOnly, html, isHeader });
                }
            } else if (captureStage.current === 'shop') {
                if (textOnly.trim().length > 0) {
                    if (textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return')) shopPagerSeenRef.current = true;
                    shop.parseShopLine(textOnly);
                }
            } else if (captureStage.current === 'shop-detail') {
                if (textOnly.trim().length > 0) shop.parseShopDetailLine(textOnly);
            } else if (captureStage.current === 'container') {
                if (textOnly.length > 0 && !lower.includes('contains:')) {
                    const containerLines = createLines(cleanLine, textOnly, lower, 'lookin');
                    const drawerPending = deps.pendingDrawerContainerRef?.current;
                    if (isDrawerCapture.current === 1 && drawerPending) {
                        const { containerId, cmd } = drawerPending;
                        const linesSetter = cmd === 'inventorylist' ? setInventoryLines : setEqLines;
                        
                        containerLines.forEach(containerLine => {
                            linesSetter(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) return prev;
                                const parent = prev[parentIdx];
                                const injectedLine: DrawerLine = {
                                    ...containerLine, id: `${containerLine.id}.${containerId}`, cmd,
                                    depth: (parent.depth || 0) + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id, parentItemNoun: parent.stableId,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) return prev;
                                const next = [...prev];
                                let lastSiblingIdx = -1;
                                for (let i = prev.length - 1; i > parentIdx; i--) { if (prev[i].parentItemId === containerId) { lastSiblingIdx = i; break; } }
                                next.splice(lastSiblingIdx !== -1 ? lastSiblingIdx + 1 : parentIdx + 1, 0, injectedLine);
                                return next;
                            });
                        });
                    } else {
                        containerLines.forEach(containerLine => {
                            if (containerLine.isItem && !containerLine.isHeader) {
                                setPopoverState((prev: any) => prev ? { ...prev, type: 'container', containerItems: [...(prev.containerItems || []), containerLine] } : null);
                            }
                        });
                    }
                    containerLines.forEach(containerLine => {
                        if (containerLine.isItem) {
                            const itmNoun = extractNoun(containerLine.text);
                            if (itmNoun) setDiscoveredItems(prev => prev.includes(itmNoun) ? prev : [...prev, itmNoun]);
                        }
                    });
                }
                if (isDrawerCapture.current || isSilentCapture.current) return;
            } else if (captureStage.current === 'stat' || captureStage.current === 'score') {
                const isVitals = /\d+\/\d+ hits, \d+\/\d+ mana, and \d+\/\d+ moves/i.test(lower) || /\d+\/\d+ hits, \d+\/\d+ mana/.test(lower);
                const targetRef = isVitals ? tempScoreRef : tempStatsRef;
                const bufferName = isVitals ? 'scoreRef' : 'statsRef';
                
                // Filter out common tags and terminators to keep the UI clean
                if (lower.includes('[/at]') || lower.includes('[at]') || lower.includes('[/stat]') || lower.trim() === 'ok.' || lower.trim() === 'at') {
                    return;
                }

                targetRef.current.push({ id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) });
            } else if (captureStage.current === 'info') {
                tempInfoRef.current.push({ id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) });
            } else if (captureStage.current === 'help') {
                deps.help.parseHelpLine(cleanLine);
            }
        }

        trackAction(cleanLine, textOnly, lower);
        processTriggers(textOnly);
        parseAtmosphere(cleanLine, textOnly, lower);
        parseTimeLine(cleanLine);

        const isSnoopCommand = isSnoop && textOnly.trim().startsWith('>');
        const isImportantMessage = isCombatMatch || isSnoopCommand || /hits you|receive your share|is dead|tells you|say,|group:|following/i.test(lower);
        
        // If Newbie Mode is OFF, we want to see descriptions and exits in the log.
        // Room content (NPCs, exits, items) should be preserved even during silent captures.
        // Room content (NPCs, exits, items) should be preserved even during silent captures.
        const isRoomContent = isRoomName || lower.startsWith('exits:') || lower.includes(' is here.') || lower.includes(' are here.') || lower.includes('standing here') || lower.includes('resting here') || lower.includes('sitting here') || lower.includes('sleeping here') || lower.includes(' leaves ') || lower.includes(' arrives from ') || lower.includes(' arrived from ') || lower.includes(' followed ') || lower.includes(' follows ') || lower.includes(' following ') || lower.includes(' flees ') || lower.includes(' fled ') || lower.includes(' panics') || lower.includes(' attempts');
        const shouldShow = determineVisibility(lower, isImportantMessage, isRoomContent, isRoomDescription, promptInfo.isEndPrompt, deps.isNewbieMode, isRoomWindow);

        const commInfo = parseComm(cleanLine, textOnly, lower);
        if (commInfo.isSuppressed) return;

        // Trigger 1 & 2: Detect incoming tells containing <spectateme> or <stop>
        const isTell = commInfo.replyCommand === 'tell' || commInfo.commAction?.toLowerCase().includes('tell');
        if (isTell && (commInfo.commSender || commInfo.replyTarget) && commInfo.commText) {
            const cleanCommText = commInfo.commText.trim().replace(/^['"](.*)['"]$/, '$1').trim();
            const rawSender = commInfo.commSender || commInfo.replyTarget || '';
            const cleanSender = rawSender.replace(/\x1b\[[0-9;]*m/g, '').trim();

            if (cleanCommText === '<spectateme>') {
                automator.addToQueue(cleanSender);
            } else if (cleanCommText === '<stop>') {
                const targetCharName = spectateCharacterName?.toLowerCase() || '';
                const senderNameLower = cleanSender.toLowerCase();
                
                console.log('[Automator] Stop Request from:', cleanSender, 'Current Target:', spectateCharacterName);
                
                if (targetCharName === senderNameLower) {
                    console.log('[Automator] Stopping snoop for current target');
                    automator.stopSnoop(true);
                } else {
                    console.log('[Automator] Removing sender from queue');
                    automator.removeFromQueue(cleanSender);
                }
            }
        }

        let msgType = routeMessage(commInfo.msgType, textOnlyWithSpaces, lower, cleanLine, attachedText, isPromptMatch);
        if (isRoomDescription) msgType = 'room-description';
        if (isSnoopInput) msgType = 'snoop-command';
        detectItemsInRoom(textOnly, cleanLine, !shouldShow);


        let targetMid: string | undefined = undefined;
        if (msgType === 'comm-continue') {
            const senderKey = commInfo.commSender || commInfo.lastCommMsgIdRef?.current?.split(':')[1] || 'last';
            targetMid = commInfo.lastCommIdBySenderRef?.current?.get(senderKey) || commInfo.lastCommMsgIdRef?.current || undefined;
        }

        if (shouldShow) {
            let finalRawText = cleanLine;
            if (isRoomName && !finalRawText.endsWith('\x1b[0m')) finalRawText += '\x1b[0m';

            // For snooped commands, we want to hide the leading '>' prompt to keep the bubble clean.
            if (msgType === 'snoop-command') {
                finalRawText = finalRawText.replace(/^([\s\uFFFD\x00-\x1F\x7F-\xFF]*((?:\x1b\[[0-9;]*m)*))>/, (_, g1) => g1 || '').trim();
            }

            const currentMid = msgType === 'comm-continue' ? targetMid! : `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`;
            if (msgType === 'comm' || commInfo.replyCommand) {
                if (commInfo.lastCommMsgIdRef) commInfo.lastCommMsgIdRef.current = currentMid;
                commInfo.lastCommTimeRef.current = Date.now();
                if (commInfo.commSender && commInfo.lastCommIdBySenderRef) commInfo.lastCommIdBySenderRef.current.set(commInfo.commSender, currentMid);
                
                // Play comm sound for incoming messages (not from "You")
                const isIncoming = commInfo.commSender?.toLowerCase() !== 'you' && !textOnly.toLowerCase().startsWith('you ');
                if (isIncoming && msgType === 'comm') {
                    playCommMessageSound?.();
                }
            }
            addMessage(msgType, finalRawText, isCombatMatch, currentMid, isRoomName, { textOnly, lower }, undefined, undefined, undefined, false, commInfo.replyTarget, commInfo.replyCommand, commInfo.commSender, commInfo.commAction, commInfo.commText, commInfo.commColor, combatInfo.side, combatInfo.isImpact && combatInfo.isPlayerTarget, combatInfo.isImpact && combatInfo.isMainActor, isSnoop, isSnoopInput);

        }


            if (promptInfo.isEndPrompt) finalizeCapture();
        } catch (error) {
            console.error('[GameParser] Fatal error parsing line:', line, error);
            // Fallback: Add the raw line to the log so the user at least sees the game text
            addMessage('log', line, false, `err-${Date.now()}`, false);
        }
    }, [addMessage, setInventoryLines, setStatsLines, setPracticeLines, setWhoLines, setWhereLines, setEqLines, setWhoList, setWhereList, deps, processTriggers, roomNameRef, setPopoverState, finalizeCapture, parsePrompt, checkCombatMatch, handleCombatExit, handleXpTicker, parseGlobalStatus, parseDetailedScore, detectRoom, parseAtmosphere, trackAction, parseComm, createLines, resetNounCounts, resetContainerStack, practice, shop, quests, setCharacterInfo, setDiscoveredItems, executeCommandRef, captureStage, ansiConvert, extractNoun, initializeStage, determineVisibility, routeMessage, detectItemsInRoom, mumeEditState.isOpen, setMumeEditState, 
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName, setSpectateOpponentStatus,
        setSpectatePosition, setSpectateWaiting, setSpectateRoomName,
        setSpectateTerrain, setSpectateRoomZone, setSpectateLighting, setSpectateWeather, setSpectateIsFoggy,
        setSpectateInCombat, setSpectateCharacterName]);

    return { 
        processLine, 
        finalizeCapture,
        addToQueue: automator.addToQueue,
        rotateQueue: automator.rotateQueue,
        removeFromQueue: automator.removeFromQueue
    };
}
