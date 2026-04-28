/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 * COMPLETELY REFACTORED: Removed all legacy capture/drawer logic in favor of the Reactive Capture Machine.
 */

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
import { EntityCapability, MessageType } from '../../types';
import { useQuestsHandler } from '../useQuestsHandler';
import { useEntityRegistry } from '../useEntityRegistry';
import { useCaptureParser } from './useCaptureParser';
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
import { useLogGmcpParser } from './useLogGmcpParser';
import { UseGameParserDeps } from './types';
import { useSpectateAutomator } from '../useSpectateAutomator';
import { PipelineOrchestrator } from '../../services/parser/PipelineOrchestrator';
import { Tokenizer } from '../../services/parser/Tokenizer';
import { useActionTracker } from './useActionTracker';
import { buildPlayerLineTokens } from './playerLineTokens';

export const useGameParser = (deps: UseGameParserDeps, session: any) => {
    // 1. Session Destructuring
    const { setStats, setTarget, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, setBufferHealthStatus, setBufferName, setCharacterInfo } = session.vitals as any;
    const { 
        setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain, setInCombat, 
        setPlayerPosition, setWeather, setIsFoggy, setLightningEnabled, 
        setInventoryLines: sessionSetInventoryLines, setStatsLines: sessionSetStatsLines, 
        setInfoLines, setScoreLines: sessionSetScoreLines, setQuestLines, 
        setPracticeLines: sessionSetPracticeLines, setWhoLines, setWhereLines, 
        setEqLines: sessionSetEqLines, setRoomExits, setGameTime 
    } = session.game as any;

    // 2. Core Logic Hooks
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
    const { finalizeQuests } = useQuestsHandler(setQuests, deps.quests.activeQuests);
    const { registerEntity, extractNoun } = useEntityRegistry();
    
    // 3. The Reactive Capture Machine (The only capture system left)
    const capture = useCaptureParser({
        captureSession: deps.captureSession,
        setCaptureSession: deps.setCaptureSession,
        setInventoryLines: sessionSetInventoryLines,
        setEqLines: sessionSetEqLines,
        setStatsLines: sessionSetStatsLines,
        setPracticeLines: sessionSetPracticeLines,
        setWhoLines,
        setWhereLines,
        setScoreLines: sessionSetScoreLines,
        setInfoLines,
        setQuestLines,
        registerEntity,
        ansiConvert: deps.ansiConvert,
        captureStage: deps.captureStage
    });

    // Share executeCommandRef update
    useEffect(() => {
        if (deps.executeCommandRef) {
            (deps.executeCommandRef as any).current = (deps.executeCommandRef.current || {}) as any;
            (deps.executeCommandRef.current as any).setPendingFlags = capture.setPendingFlags;
        }
    }, [capture.setPendingFlags, deps.executeCommandRef]);

    const { parseLogGmcp, resetSpectateContext } = useLogGmcpParser({
        isSpectateMode: deps.isSpectateMode,
        sessionMode: deps.sessionMode,
        addMessage: deps.addMessage,
        setSpectateStats: deps.setSpectateStats,
        setSpectateWaiting: deps.setSpectateWaiting,
        setSpectateCharacterName: deps.setSpectateCharacterName,
        spectateCharacterName: deps.spectateCharacterName,
        characterName: session.game.characterName,
        mapperRef: deps.mapperRef,
        setRoomName: deps.setSpectateRoomName,
        setRoomDesc: deps.setSpectateRoomDesc,
        setRoomZone: deps.setSpectateRoomZone,
        setRoomNum: deps.setSpectateRoomNum, 
        setCurrentTerrain,
        setRoomExits,
        detectLighting: deps.detectLighting,
        setWeather: deps.setWeather,
        setIsFoggy: deps.setIsFoggy,
        setSpectateWeather: deps.setSpectateWeather,
        setSpectateIsFoggy: deps.setSpectateIsFoggy,
        playMovementSound: deps.playMovementSound,
        playDoorSound: deps.playDoorSound
    });

    const router = useMessageRouter({
        capture,
        drawer: deps.drawer,
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
        setOpponentName,
        setSpectateInCombat: deps.setSpectateInCombat,
        setSpectateOpponentName: deps.setSpectateOpponentName,
        setSpectateOpponentStatus: deps.setSpectateOpponentStatus
    });

    const room = useRoomParser({
        roomNameRef: deps.roomNameRef, 
        roomDescRef: deps.roomDescRef as any,
        capture,
        spectateRoomName: deps.spectateRoomName, 
        spectateRoomDesc: deps.spectateRoomDesc, 
        isSpectateMode: deps.isSpectateMode
    });

    const actionTracker = useActionTracker({
        capture,
        setInventoryLines: sessionSetInventoryLines,
        setEqLines: sessionSetEqLines,
        setCharacterInfo,
        extractNoun,
        ansiConvert: deps.ansiConvert
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
        capture
    });

    const atmosphere = useAtmosphereParser({
        setWeather: deps.setWeather, 
        setIsFoggy: deps.setIsFoggy, 
        setSpectateWeather: deps.setSpectateWeather,
        setSpectateIsFoggy: deps.setSpectateIsFoggy,
        setLightningEnabled: deps.setLightningEnabled,
        setSpectateLightningEnabled: deps.setSpectateLightningEnabled,
        triggerHaptic: deps.triggerHaptic,
        playDoorSound: deps.playDoorSound,
        setPlayerPosition,
        isSpectateMode: deps.isSpectateMode,
        setSpectatePosition: deps.setSpectatePosition,
    });

    const prompt = usePromptParser({
        capture,
        setStats,
        setPlayerHealthStatus,
        setOpponentHealthStatus,
        setOpponentName,
        setBufferHealthStatus,
        setBufferName,
        finalizeCapture: capture.finalizeSession,
        isSpectateMode: deps.isSpectateMode,
        setSpectateStats: deps.setSpectateStats,
        captureStage: deps.captureStage,
        setSpectateOpponentName: deps.setSpectateOpponentName,
        setSpectateOpponentStatus: deps.setSpectateOpponentStatus,
        inCombatRef: deps.inCombatRef
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
        resetSpectateContext
    });

    // 4. Main Processing Pipeline
    const processLine = useCallback((line: string, tokensOrOptions?: any) => {
        if (line === null || line === undefined) return;

        const tokens = Array.isArray(tokensOrOptions) ? tokensOrOptions : undefined;
        const options = !Array.isArray(tokensOrOptions) ? tokensOrOptions : undefined;
        const isPromptResolved = options?.isPrompt || (tokens as any)?.isPrompt;

        const cleanLine = line.replace(/\r/g, '');

        let strippedLine = cleanLine;
        if (isPromptResolved && cleanLine.includes('<prompt')) {
            strippedLine = cleanLine
                .replace(/<prompt[^>]*>|<\/prompt>/g, '')
                .replace(/&gt;/gi, '>')
                .replace(/&lt;/gi, '<')
                .replace(/&amp;/gi, '&');
        }
        
        let isSnoop = false;
        let lineToParse = strippedLine;
        const snoopRegex = /^((?:\x1b\[[0-9;]*m|\s)*)(?:&|mp;)[A-Z](?: |$)/;
        const snoopMatch = cleanLine.match(snoopRegex);
        if (snoopMatch) {
            isSnoop = true;
            lineToParse = cleanLine.replace(snoopRegex, '$1');
        }

        if (parseLogGmcp(cleanLine, isSnoop)) return;

        const tokenizer = Tokenizer.getInstance();
        if (!tokens) tokenizer.reset('room');
        
        const tokenizerContext = {
            target: session.vitals.target,
            buttons: deps.btn?.buttonsRef?.current || [],
            registeredPlayers: Object.values(deps.entitiesRef.current || {})
                .filter(e => e.capabilities.includes(EntityCapability.Player))
                .map(p => p.name),
            inlineCategories: deps.inlineCategories || [],
            npcColor: deps.npcColor,
            playerColor: deps.playerColor,
            objectColor: deps.objectColor,
            roomColor: deps.roomColor
        };

        const effectiveTokens = isSnoop ? null : tokens;
        const derivedTokens = effectiveTokens || tokenizer.tokenize(lineToParse, tokenizerContext);
        const textOnly = derivedTokens.map((t: any) => t.content).join('');
        const lower = textOnly.toLowerCase();

        // 1. System/Trigger Processing
        processTriggers(lineToParse);

        // 2. Visibility and Routing
        const isImportant = lineToParse.includes('\x1b[1m') || lineToParse.includes('\x1b[33m');
        const isRoom = lineToParse.includes('\x1b[32m') && textOnly.startsWith('  ');
        const isRoomDescription = isRoom && textOnly.length > 5;
        const isEndPrompt = textOnly.includes('>') || textOnly.includes(':');

        let isVisible = router.determineVisibility(lower, isImportant, isRoom, isRoomDescription, isEndPrompt, deps.isNewbieMode, lineToParse, undefined, isSnoop);
        
        // 3. Sub-Parser Dispatch
        let msgType: MessageType = 'game';
        
        const combatType = combat.parseCombatLine(textOnly, lineToParse, isSnoop);
        if (combatType) msgType = combatType;

        const roomType = room.parseRoomLine(textOnly, lineToParse, isSnoop);
        if (roomType) msgType = roomType;

        const commResult = comm.parseComm(lineToParse, textOnly, lower);
        if (commResult.isSuppressed) return;
        if (commResult.msgType !== 'game') msgType = commResult.msgType;

        const promptInfo = prompt.parsePrompt(textOnly, isSnoop);
        if (!isSnoop && deps.gameState === 'account' && promptInfo.isMatch) {
            if (promptInfo.promptPart.trim() !== 'Account>') {
                deps.setGameState('playing');
            }
        }

        if (account.parseAccountLine(textOnly, isPromptResolved)) return;
        if (stat.parseGlobalStatus(textOnly, lower)) msgType = 'info' as any;
        if (stat.parseDetailedScore(textOnly, lower)) msgType = 'info' as any;

        // Action Tracking (for manual inventory updates)
        actionTracker.trackAction(lineToParse, textOnly, lower);
        router.detectItemsInRoom(textOnly, lineToParse, false);
        
        // --- Explicit Capture Bootstrap ---
        // Some MUME list commands do not always start with a stable header. If the
        // command middleware marked an expected capture type, begin on first output.
        const expectedCaptureType = deps.captureStage.current as any;
        const canStartExpectedCapture = (
            !isSnoop &&
            !promptInfo.isMatch &&
            !capture.hasSession() &&
            ['who', 'where'].includes(expectedCaptureType)
        );
        if (canStartExpectedCapture) {
            capture.startSession(expectedCaptureType);
        }

        // --- Highlighting Refresh ---
        tokenizerContext.registeredPlayers = Object.values(deps.entitiesRef.current || {})
            .filter(e => e.capabilities.includes(EntityCapability.Player))
            .map(p => p.name);
            
        let finalTokens = tokenizer.tokenize(lineToParse, tokenizerContext);
        if (!isSnoop && (capture.getActiveType() === 'who' || capture.getActiveType() === 'where')) {
            finalTokens = buildPlayerLineTokens(textOnly, registerEntity) || finalTokens;
        }

        // 3.5 Capture Buffer Population
        // CRITICAL: Accumulate BEFORE finalization if a prompt is detected
        // to ensure attached data lines are saved.
        if (capture.hasSession() && !isSnoop) {
            capture.accumulateLine(lineToParse, finalTokens, tokenizerContext);
        }

        // 5. Reactive Capture Machine Logic
        if (!isSnoop) {
            // 5.1 Finalize previous session on prompt AFTER accumulation
            if (promptInfo.isMatch && capture.hasSession()) {
                capture.finalizeSession();
            }

            // 5.2 Trigger new session
            const triggeredType = !capture.hasSession()
                ? capture.checkTriggers(textOnly, promptInfo.isMatch ? (promptInfo as any).attachedText : undefined)
                : null;
            if (triggeredType) {
                capture.startSession(triggeredType as any);
                // Accumulate the header line immediately
                capture.accumulateLine(lineToParse, finalTokens, tokenizerContext);
            }
        }
        
        // 6. Prompt UI Finalization
        if (promptInfo.isMatch) {
            msgType = 'prompt' as any;
            if (isSnoop && deps.setSpectateActivePrompt) {
                deps.setSpectateActivePrompt(lineToParse);
            }
        }

        atmosphere.parseAtmosphere(lower, isSnoop);
        if (time.parseTimeLine(lower)) msgType = 'info' as any;

        // --- Magic Sound Effects ---
        if (!isSnoop && lineToParse.toLowerCase().includes('<magic>')) {
            deps.playMagicExplosionSound();
        }
        if (!isSnoop && lower.includes('you start to concentrate...')) {
            deps.playIncantationSound();
        }

        const finalType = router.routeMessage(msgType, textOnly, lower, lineToParse, textOnly, isEndPrompt, isSnoop) as MessageType;

        // Suppress response lines from silent capture sessions (e.g. drawer auto-commands like eq/who)
        if (!isSnoop && capture.hasSession() && capture.isSilent()) {
            isVisible = false;
        }

        if (isVisible) {
            const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const ansiHtml = deps.ansiConvert.toHtml(lineToParse);
            const messageObj = PipelineOrchestrator.processTextLine(lineToParse, ansiHtml, finalType, tokenizerContext);
            messageObj.tokens = finalTokens;
            
            deps.addMessage(
                finalType, textOnly, undefined, mid, false, 
                { textOnly, lower, html: messageObj.html, tokens: messageObj.tokens },
                undefined, undefined, undefined, false, 
                commResult.replyTarget, commResult.replyCommand, commResult.commSender, commResult.commAction, commResult.commText, commResult.commColor,
                commResult.commSender ? Tokenizer.getInstance().tokenize(commResult.commSender, tokenizerContext) : undefined,
                commResult.commText ? Tokenizer.getInstance().tokenize(commResult.commText, tokenizerContext) : undefined,
                undefined, undefined, undefined, isSnoop
            );
        }

        gmcpBus.emit('Game.Text', { type: finalType, text: textOnly });

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, parseLogGmcp, actionTracker,
        deps.addMessage, deps.isNewbieMode, session.game, deps.groupMembers, deps.inlineCategories, deps.btn, session.vitals.target, deps.captureStage, deps.ansiConvert, capture
    ]);

    return useMemo(() => ({
        processLine,
        finalizeCapture: capture.finalizeSession,
        setPendingFlags: capture.setPendingFlags,
        addToQueue: automator.addToQueue,
        rotateQueue: automator.rotateQueue,
        removeFromQueue: automator.removeFromQueue
    }), [processLine, capture.finalizeSession, capture.setPendingFlags, automator.addToQueue, automator.rotateQueue, automator.removeFromQueue]);
}
