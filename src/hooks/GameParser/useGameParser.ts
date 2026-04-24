/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
import { DrawerLine, GameEntity, PopoverState, MessageType } from '../../types';
import { useQuestsHandler } from '../useQuestsHandler';
import { useEntityRegistry } from '../useEntityRegistry';
import { useTriggerProcessor } from '../useTriggerProcessor';
import { useMessageRouter } from './useMessageRouter';
import { useCombatParser } from './useCombatParser';
import { useRoomParser } from './useRoomParser';
import { useCommParser } from './useCommParser';
import { useStatParser } from './useStatParser';
import { useAtmosphereParser } from './useAtmosphereParser';
import { usePromptParser } from './usePromptParser';
import { useAccountParser } from './useAccountParser';
import { useTimeParser } from './useTimeParser';
import { UseGameParserDeps } from './types';
import { useSpectateAutomator } from '../useSpectateAutomator';
import { useRoomStore } from '../../stores/useRoomStore';
import { PipelineOrchestrator } from '../../services/parser/PipelineOrchestrator';

export const useGameParser = (deps: UseGameParserDeps, session: any) => {
    // Map session setters to common names used in sub-parsers
    const { setStats, setTarget, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, setBufferHealthStatus, setBufferName, setCharacterInfo } = session.vitals as any;
    const { setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain, setInCombat, setPlayerPosition, setWeather, setIsFoggy, setLightningEnabled, setInventoryLines: sessionSetInventoryLines, setStatsLines: sessionSetStatsLines, setInfoLines, setScoreLines: sessionSetScoreLines, setQuestLines, setPracticeLines: sessionSetPracticeLines, setWhoLines, setWhereLines, setEqLines: sessionSetEqLines, setRoomPlayers, setRoomNpcs, setRoomItems: sessionSetRoomItems, setRoomExits, setGameTime } = session.game as any;

    const { processTriggers } = useTriggerProcessor({ 
        isSoundEnabledRef: deps.isSoundEnabledRef, 
        soundTriggersRef: deps.soundTriggersRef, 
        buttonsRef: deps.btn?.buttonsRef || { current: [] }, 
        setButtons: deps.btn?.setButtons || (() => {}), 
        buttonTimers: deps.btn?.buttonTimers || { current: {} }, 
        setActiveSet: deps.btn?.setActiveSet || (() => {}), 
        actionsRef: deps.actionsRef, 
        executeCommandRef: deps.executeCommandRef,
        playSound: (deps.playSound || (() => {})) as any,
        playRandomSound: (deps.playRandomSound || (() => {})) as any
    });

    const { setQuests } = deps;
    const { parseQuestLine, finalizeQuests } = useQuestsHandler(setQuests, deps.quests.activeQuests);
    const { detectCapabilities, extractNoun } = useEntityRegistry();

    // Shared Buffers/Refs
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);
    const tempStatsRef = useRef<DrawerLine[]>([]);
    const tempScoreRef = useRef<DrawerLine[]>([]);
    const tempInfoRef = useRef<DrawerLine[]>([]);
    const tempPracticeRef = useRef<DrawerLine[]>([]);

    const finalizeCapture = useCallback((owner: 'inv' | 'eq' | 'stat' | 'practice' | 'who' | 'where' | 'container' | 'none') => {
        if (owner === 'inv') deps.setInventoryLines([...tempInvRef.current]);
        else if (owner === 'eq') deps.setEqLines([...tempEqRef.current]);
        else if (owner === 'stat') deps.setStatsLines([...tempStatsRef.current]);
        else if (owner === 'practice') deps.setPracticeLines([...tempPracticeRef.current]);
        else if (owner === 'who') session.game.setWhoLines([...session.game.tempWhoLines]);
        else if (owner === 'where') session.game.setWhereLines([...session.game.tempWhereLines]);
        
        // Reset buffers
        if (owner === 'inv') tempInvRef.current = [];
        if (owner === 'eq') tempEqRef.current = [];
        if (owner === 'stat') tempStatsRef.current = [];
        if (owner === 'practice') tempPracticeRef.current = [];
    }, [deps.setInventoryLines, deps.setEqLines, deps.setStatsLines, deps.setPracticeLines, session.game]);


    const router = useMessageRouter({
        captureStage: deps.captureStage, 
        isSilentCapture: deps.isSilentCapture, 
        isDrawerCapture: deps.isDrawerCapture, 
        captureOwnerDrawer: deps.captureOwnerDrawer,
        isInventoryOpen: deps.isInventoryOpen, 
        isEquipmentOpen: deps.isEquipmentOpen, 
        isCharacterOpen: deps.isCharacterOpen, 
        isStatsOpen: deps.isStatsOpen, 
        isPlayersOpen: deps.isPlayersOpen,
        isWaitingForInv: deps.isWaitingForInv, 
        isWaitingForEq: deps.isWaitingForEq, 
        isWaitingForStats: deps.isWaitingForStats, 
        isWaitingForInfo: deps.isWaitingForInfo,
        setWhoList: session.game.setWhoList, 
        setWhereList: session.game.setWhereList, 
        setRoomItems: session.game.setRoomItems, 
        registerEntity: deps.registerEntity, 
        setCharacterInfo, 
        setDiscoveredItems: deps.setDiscoveredItems, 
        extractNoun, 
        ansiConvert: deps.ansiConvert,
        playerPosition: deps.playerPosition, 
        inlineCategories: deps.inlineCategories, 
        isSpectateMode: deps.isSpectateMode
    });

    const combat = useCombatParser({ 
        inCombatRef: deps.inCombatRef, 
        playHitImpactSound: deps.playHitImpactSound,
        playOofSound: deps.playOofSound, 
        playSlashSound: deps.playSlashSound, 
        playCleaveSound: deps.playSlashSound, // Fallback
        playSmiteSound: deps.playSlashSound, // Fallback
        playPierceSound: deps.playSlashSound, // Fallback
        playStabSound: deps.playSlashSound, // Fallback
        playArrowHitSound: deps.playSlashSound, // Fallback
        playKillSound: deps.playKillSound, 
        playLevelSound: deps.playLevelSound, 
        setInCombat,
        characterName: session.game.characterName, 
        spectateCharacterName: deps.spectateCharacterName,
        isSpectateMode: deps.isSpectateMode, 
        addMessage: deps.addMessage,
        groupMembers: deps.groupMembers,
        roomPlayers: deps.roomPlayers,
        setCharacterInfo,
        setOpponentHealthStatus,
        setOpponentName
    });

    const room = useRoomParser({
        roomNameRef: deps.roomNameRef, 
        roomDescRef: deps.roomDescRef as any,
        spectateRoomName: deps.spectateRoomName, 
        spectateRoomDesc: deps.spectateRoomDesc, 
        isSpectateMode: deps.isSpectateMode,
        captureStage: deps.captureStage,
        isWaitingForStats: deps.isWaitingForStats,
        isWaitingForEq: deps.isWaitingForEq,
        isWaitingForInv: deps.isWaitingForInv,
        isWaitingForInfo: deps.isWaitingForInfo,
        isDrawerCapture: deps.isDrawerCapture,
        isSilentCapture: deps.isSilentCapture
    });

    const comm = useCommParser({
        pendingGmcpCommRef: deps.pendingGmcpCommRef, 
        lastCommIdBySenderRef: deps.lastCommIdBySenderRef, 
        lastCommMsgIdRef: deps.lastCommMsgIdRef, 
        lastCommTimeRef: deps.lastCommTimeRef
    });

    const stat = useStatParser({
        setMood: deps.setMood, 
        setStats, 
        setCharacterInfo, 
        inCombatRef: deps.inCombatRef, 
        executeCommandRef: deps.executeCommandRef, 
        captureStage: deps.captureStage
    });

    const atmosphere = useAtmosphereParser({
        setWeather: deps.setWeather, 
        setIsFoggy: deps.setIsFoggy, 
        setLightningEnabled: deps.setLightningEnabled,
        triggerHaptic: deps.triggerHaptic,
        playDoorSound: deps.playDoorSound,
        setPlayerPosition,
        isSpectateMode: deps.isSpectateMode,
    });

    const prompt = usePromptParser({
        setStats, 
        setPlayerHealthStatus,
        setOpponentHealthStatus,
        setOpponentName,
        setBufferHealthStatus,
        setBufferName,
        finalizeCapture,
        isSpectateMode: deps.isSpectateMode, 
        setSpectateStats: deps.setSpectateStats, 
        captureStage: deps.captureStage
    });

    const account = useAccountParser({
        gameState: deps.gameState as any, 
        setGameState: deps.setGameState, 
        accountStageRef: deps.accountStageRef, 
        setAccountState: deps.setAccountState, 
        setIsPasswordMode: deps.setIsPasswordMode,
        accountState: deps.accountState, 
        executeCommandRef: deps.executeCommandRef,
        sendCommand: session.game.sendCommand || ((cmd: string) => {}),
        addMessage: deps.addMessage
    });

    const time = useTimeParser({
        setGameTime,
        gameTime: deps.gameTime
    });

    const automator = useSpectateAutomator({
        spectateQueue: session.game.spectateQueue || [],
        setSpectateQueue: session.game.setSpectateQueue || (() => {}),
        lastSnoopStartTime: session.game.lastSnoopStartTime || null,
        setLastSnoopStartTime: session.game.setLastSnoopStartTime || (() => {}),
        spectateCharacterName: deps.spectateCharacterName,
        setSpectateCharacterName: deps.setSpectateCharacterName,
        executeCommand: (cmd: string) => deps.executeCommandRef.current?.(cmd),
        addSystemMessage: deps.addSystemMessage,
        isSpectateMode: deps.isSpectateMode,
            });

    const processLine = useCallback((line: string, tokens?: any) => {
        if (line === null || line === undefined) return;

        const cleanLine = line.replace(/\r/g, '');
        const textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, '');
        const lower = textOnly.toLowerCase();

        // --- 1. System/Trigger Processing ---
        processTriggers(cleanLine);

        // --- 2. Visibility and Routing ---
        const isImportant = cleanLine.includes('\x1b[1m') || cleanLine.includes('\x1b[33m');
        const isRoom = cleanLine.includes('\x1b[32m') && textOnly.startsWith('  ');
        const isRoomDescription = isRoom && textOnly.length > 5;
        const isEndPrompt = textOnly.includes('>') || textOnly.includes(':');

        const isVisible = router.determineVisibility(lower, isImportant, isRoom, isRoomDescription, isEndPrompt, deps.isNewbieMode, cleanLine);
        
        // --- 3. Sub-Parser Dispatch ---
        let msgType: MessageType = 'game';
        
        // Combat
        const combatType = combat.parseCombatLine(textOnly, cleanLine);
        if (combatType) msgType = combatType;

        // Room/Movement
        const roomType = room.parseRoomLine(textOnly, cleanLine);
        if (roomType) msgType = roomType;

        // Stats/Account
        if (account.parseAccountLine(textOnly, tokens?.isPrompt ?? false)) return;
        if (stat.parseGlobalStatus(textOnly, lower)) msgType = 'info' as any;
        if (stat.parseDetailedScore(textOnly, lower)) msgType = 'info' as any;

        // --- 4. Prompt Parsing ---
        const promptInfo = prompt.parsePrompt(textOnly);
        if (promptInfo.isMatch) {
            msgType = 'prompt' as any;
        }

        // Atmosphere
        atmosphere.parseAtmosphere(lower);

        // Time
        if (time.parseTimeLine(lower)) msgType = 'info' as any;

        // Final Routing
        const trimmedLine = textOnly.trim();
        const lowerTrimmed = trimmedLine.toLowerCase();
        const isWhoTrigger = lowerTrimmed === 'players' || lowerTrimmed.startsWith('who:') || lower.includes('players online on mume:') || lowerTrimmed === 'allies' || lowerTrimmed === 'minions';
        const isWhereTrigger = lowerTrimmed.startsWith('who') && lower.includes('location');
        
        if (isWhoTrigger || isWhereTrigger) {
            deps.captureStage.current = isWhoTrigger ? 'who' : 'where';
            console.log(`[useGameParser] Explicit stage detected: ${deps.captureStage.current} from line: "${trimmedLine}"`);
        }

        const finalType = router.routeMessage(msgType, textOnly, lower, cleanLine, textOnly, isEndPrompt) as MessageType;
        console.log(`[useGameParser] Processed line: "${textOnly.substring(0, 20)}", stage=${deps.captureStage.current}, finalType=${finalType}`);

        // --- 4. Highlighting and Display ---
        if (isVisible) {
            const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const ansiHtml = deps.ansiConvert.toHtml(cleanLine);

            const rStore = useRoomStore.getState();
            const onlinePlayerNames = (rStore.whoList || []).map((entry: string) => 
                entry.includes('|') ? entry.split('|')[1] : entry
            );

            // For who-list and where-list, we MUST ensure the current line's name is included
            // in the highlighting candidates immediately, as the state update is asynchronous.
            if (finalType === 'who-list' || finalType === 'where-list') {
                const currentNameMatch = textOnly.match(/(?:[*<>|\s]|\[.*?\]|<.*?>)*([A-Z\u00C0-\u00DF][a-zA-Z\u00C0-\u00FF]+)/);
                if (currentNameMatch && currentNameMatch[1].length > 1) {
                    const name = currentNameMatch[1];
                    const lowerName = name.toLowerCase();
                    const exclusions = ['players', 'allies', 'minions', 'enemies', 'neutral', 'unknown'];
                    if (!exclusions.includes(lowerName)) {
                        if (!onlinePlayerNames.includes(name)) {
                            onlinePlayerNames.push(name);
                            console.log(`[useGameParser] Forced including ${name} in onlinePlayerNames for line tokenization`);
                        }
                    }
                }
            }

            // Now we use our orchestrator to produce the Message object directly!
            // First we need to build the context
            const tokenizerContext = {
                target: session.vitals.target,
                currentOccupants: deps.roomPlayers || [],
                roomNpcs: session.game.roomNpcs || [],
                activeGroupMembers: deps.groupMembers || [],
                roomItems: session.game.roomItems || [],
                discoveredItems: [], 
                inlineCategories: deps.inlineCategories || [],
                buttons: deps.btn?.buttonsRef?.current || [],
                selectedObjectIds: new Set<string>(),
                onlinePlayers: onlinePlayerNames
            };

            const messageObj = PipelineOrchestrator.processTextLine(cleanLine, ansiHtml, finalType, tokenizerContext);
            deps.addMessage(finalType, textOnly, undefined, mid, false, { textOnly, lower, html: messageObj as any });
        }

        // Emit to bus for DVR recording
        gmcpBus.emit('Game.Text', { type: finalType, text: textOnly });

        // Detect items for mapper discovery
        router.detectItemsInRoom(textOnly, cleanLine, !isVisible);

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, 
        deps.addMessage, deps.isNewbieMode, deps.roomPlayers, session.game, deps.groupMembers, deps.inlineCategories, deps.btn, session.vitals.target, deps.captureStage, deps.ansiConvert
    ]);

    return useMemo(() => ({
        processLine,
        finalizeCapture,
        addToQueue: automator.addToQueue,
        rotateQueue: automator.rotateQueue,
        removeFromQueue: automator.removeFromQueue
    }), [processLine, finalizeCapture, automator.addToQueue, automator.rotateQueue, automator.removeFromQueue]);
}
