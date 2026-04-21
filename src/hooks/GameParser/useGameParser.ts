/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 */

import React, { useCallback, useRef, useMemo } from 'react';
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

export const useGameParser = (deps: UseGameParserDeps, session: any) => {
    // Map session setters to common names used in sub-parsers
    const { setStats, setTarget, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, setBufferHealthStatus, setBufferName, setCharacterInfo } = session.vitals as any;
    const { setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain, setInCombat, setPlayerPosition, setWeather, setIsFoggy, setLightningEnabled, setInventoryLines: sessionSetInventoryLines, setStatsLines: sessionSetStatsLines, setInfoLines, setScoreLines: sessionSetScoreLines, setQuestLines, setPracticeLines: sessionSetPracticeLines, setWhoLines, setWhereLines, setEqLines: sessionSetEqLines, setRoomPlayers, setRoomNpcs, setRoomItems: sessionSetRoomItems, setRoomExits, setGameTime } = session.game as any;

    const { processTriggers } = useTriggerProcessor({ 
        isSoundEnabledRef: deps.isSoundEnabledRef, 
        soundTriggersRef: deps.soundTriggersRef, 
        buttonsRef: deps.btn.buttonsRef, 
        setButtons: deps.btn.setButtons, 
        buttonTimers: deps.btn.buttonTimers, 
        setActiveSet: deps.btn.setActiveSet, 
        actionsRef: deps.actionsRef, 
        executeCommandRef: deps.executeCommandRef,
        playEffect: deps.playEffect,
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
        triggerHitFlash: deps.triggerHitFlash, 
        triggerOppHitFlash: deps.triggerOppHitFlash, 
        playHitImpactSound: deps.playHitImpactSound,
        playOofSound: deps.playOofSound, 
        playSlashSound: deps.playSlashSound, 
        playCleaveSound: deps.playCleaveSound, 
        playSmiteSound: deps.playSmiteSound, 
        playPierceSound: deps.playPierceSound,
        playStabSound: deps.playStabSound, 
        playArrowHitSound: deps.playArrowHitSound, 
        playKillSound: deps.playKillSound, 
        playLevelSound: deps.playLevelSound, 
        setInCombat,
        characterName: session.game.characterName, 
        spectateCharacterName: deps.spectateCharacterName,
        isSpectateMode: deps.isSpectateMode, 
        setSpectateInCombat: deps.setSpectateInCombat, 
        setSpectateOpponentName: deps.setSpectateOpponentName, 
        setSpectateOpponentStatus: deps.setSpectateOpponentStatus,
        addMessage: deps.addMessage
    });

    const room = useRoomParser({
        setRoomName, setRoomDesc, setRoomExits, setRoomZone, 
        mapperRef: deps.mapperRef, 
        roomNameRef: deps.roomNameRef, 
        roomDescRef: deps.roomDescRef,
        spectateRoomName: deps.spectateRoomName, 
        spectateRoomDesc: deps.spectateRoomDesc, 
        isSpectateMode: deps.isSpectateMode,
        setSpectateRoomName: deps.setSpectateRoomName, 
        setSpectateRoomDesc: deps.setSpectateRoomDesc, 
        setSpectateRoomZone: deps.setSpectateRoomZone
    });

    const comm = useCommParser({
        pendingGmcpCommRef: deps.pendingGmcpCommRef, 
        lastCommIdBySenderRef: deps.lastCommIdBySenderRef, 
        lastCommMsgIdRef: deps.lastCommMsgIdRef, 
        lastCommTimeRef: deps.lastCommTimeRef,
        characterName: session.game.characterName, 
        playCommMessageSound: deps.playCommMessageSound, 
        isSpectateMode: deps.isSpectateMode,
        addMessage: deps.addMessage
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
        detectLighting: deps.detectLighting,
        isSpectateMode: deps.isSpectateMode, 
        setSpectateWeather: deps.setSpectateWeather, 
        setSpectateIsFoggy: deps.setSpectateIsFoggy, 
        setSpectateLighting: deps.setSpectateLighting
    });

    const prompt = usePromptParser({
        setStats, 
        setInCombat, 
        setPlayerPosition, 
        inCombatRef: deps.inCombatRef, 
        triggerHaptic: deps.triggerHaptic,
        isSpectateMode: deps.isSpectateMode, 
        setSpectateStats: deps.setSpectateStats, 
        setSpectatePosition: deps.setSpectatePosition, 
        setSpectateInCombat: deps.setSpectateInCombat, 
        setSpectateWaiting: deps.setSpectateWaiting,
        setTarget: session.vitals.setTarget
    });

    const account = useAccountParser({
        gameState: deps.gameState as any, 
        setGameState: deps.setGameState, 
        accountStageRef: deps.accountStageRef, 
        setAccountState: deps.setAccountState, 
        setIsPasswordMode: deps.setIsPasswordMode,
        accountState: deps.accountState, 
        executeCommandRef: deps.executeCommandRef,
        sendCommand: (cmd: string) => deps.executeCommandRef.current?.(cmd)
    });

    const time = useTimeParser({
        setGameTime,
        gameTime: deps.gameTime
    });

    const automator = useSpectateAutomator({
        activeGroupMembers: deps.activeGroupMembers,
        isSpectateMode: deps.isSpectateMode,
        spectateTarget: deps.spectateTarget,
        executeCommand: (cmd: string) => deps.executeCommandRef.current?.(cmd),
        setIsSpectateMode: deps.setIsSpectateMode
    });

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

    const processLine = useCallback((line: string) => {
        if (line === null || line === undefined) return;

        const cleanLine = line.replace(/\r/g, '');
        const textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]*>/g, '');
        const lower = textOnly.toLowerCase();

        // --- 1. System/Trigger Processing ---
        const skipLine = processTriggers(cleanLine);
        if (skipLine) return;

        // --- 2. Visibility and Routing ---
        const isImportant = cleanLine.includes('\x1b[1m') || cleanLine.includes('\x1b[33m');
        const isRoom = cleanLine.includes('\x1b[32m') && textOnly.startsWith('  ');
        const isRoomDescription = isRoom && textOnly.length > 5;
        const isEndPrompt = textOnly.includes('>') || textOnly.includes(':');

        const isVisible = router.determineVisibility(lower, isImportant, isRoom, isRoomDescription, isEndPrompt, deps.isNewbieMode);
        
        // --- 3. Sub-Parser Dispatch ---
        let msgType: MessageType = 'game';
        
        // Combat
        const combatType = (combat as any).parseCombatLine(textOnly, cleanLine);
        if (combatType) msgType = combatType;

        // Room/Movement
        const roomType = (room as any).parseRoomLine(textOnly, cleanLine);
        if (roomType) msgType = roomType;

        // Stats/Account
        if (account.parseAccountLine(textOnly, true)) msgType = 'account-prompt';
        if (stat.parseGlobalStatus(textOnly, lower)) msgType = 'info' as any;

        // Atmosphere
        (atmosphere as any).parseAtmosphere(lower);

        // Time
        if ((time as any).parseTimeLine(lower)) msgType = 'info' as any;

        // Final Routing
        const finalType = router.routeMessage(msgType, textOnly, lower, cleanLine, textOnly, isEndPrompt) as MessageType;

        // --- 4. Highlighting and Display ---
        if (isVisible) {
            const html = deps.processMessageHtml(cleanLine, Math.random().toString(36), false, finalType);
            deps.addMessage(finalType, html);
        }

        // Detect items for mapper discovery
        router.detectItemsInRoom(textOnly, cleanLine, !isVisible);

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, 
        deps.processMessageHtml, deps.addMessage, deps.isNewbieMode
    ]);

    return useMemo(() => ({
        processLine,
        finalizeCapture,
        addToQueue: automator.addToQueue,
        rotateQueue: automator.rotateQueue,
        removeFromQueue: automator.removeFromQueue
    }), [processLine, finalizeCapture, automator.addToQueue, automator.rotateQueue, automator.removeFromQueue]);
}
