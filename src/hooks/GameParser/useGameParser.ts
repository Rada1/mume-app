/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 */

import React, { useCallback, useRef, useMemo } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
import { DrawerLine, GameEntity, PopoverState, MessageType, EntityCapability } from '../../types';
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
import { useLogGmcpParser } from './useLogGmcpParser';
import { useLineProcessor } from './useLineProcessor';
import { useStageInitializer } from './useStageInitializer';
import { useStageManager } from './useStageManager';
import { UseGameParserDeps } from './types';
import { useSpectateAutomator } from '../useSpectateAutomator';
import { useRoomStore } from '../../stores/useRoomStore';
import { PipelineOrchestrator } from '../../services/parser/PipelineOrchestrator';
import { Tokenizer } from '../../services/parser/Tokenizer';

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
    const { detectCapabilities, registerEntity, extractNoun } = useEntityRegistry();

    // Shared Buffers/Refs
    const tempEntitiesRef = useRef<Record<string, GameEntity>>({});
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);
    const tempStatsRef = useRef<DrawerLine[]>([]);
    const tempScoreRef = useRef<DrawerLine[]>([]);
    const tempInfoRef = useRef<DrawerLine[]>([]);
    const tempPracticeRef = useRef<DrawerLine[]>([]);
    const tempQuestRef = useRef<DrawerLine[]>([]);
    const tempWhoRef = useRef<DrawerLine[]>([]);
    const tempWhereRef = useRef<DrawerLine[]>([]);

    const lineProcessor = useLineProcessor({
        captureStage: deps.captureStage,
        keywordOverrides: deps.keywordOverrides || {},
        extractNoun,
        detectCapabilities,
        ansiConvert: deps.ansiConvert,
        addDiagnosticLog: deps.addDiagnosticLog,
        tempEntitiesRef,
        inlineCategories: deps.inlineCategories || []
    });

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
        setRoomNum: deps.setSpectateRoomNum, // Correctly route snooped room updates to spectate state
        setCurrentTerrain,
        setRoomExits,
        setRoomPlayers,
        setRoomNpcs,
        setRoomItems: sessionSetRoomItems,
        detectLighting: deps.detectLighting,
        setWeather: deps.setWeather,
        setIsFoggy: deps.setIsFoggy,
        playMovementSound: deps.playMovementSound,
        playDoorSound: deps.playDoorSound
    });

    const { finalizeCapture } = useStageManager({
        captureStage: deps.captureStage,
        isDrawerCapture: deps.isDrawerCapture,
        isSilentCapture: deps.isSilentCapture,
        isWaitingForStats: deps.isWaitingForStats,
        isWaitingForEq: deps.isWaitingForEq,
        isWaitingForInv: deps.isWaitingForInv,
        isWaitingForInfo: deps.isWaitingForInfo,
        captureOwnerDrawer: deps.captureOwnerDrawer,
        addDiagnosticLog: deps.addDiagnosticLog,
        addMessage: deps.addMessage,
        setPopoverState: (deps.setPopoverState || (() => {})) as any,
        setEqLines: sessionSetEqLines,
        setInventoryLines: sessionSetInventoryLines,
        setStatsLines: sessionSetStatsLines,
        setInfoLines,
        setScoreLines: sessionSetScoreLines,
        setQuestLines,
        setPracticeLines: sessionSetPracticeLines,
        setWhoLines,
        setWhereLines,
        setEntities: deps.setEntities,
        registerEntity,
        practice: deps.practice,
        shop: deps.shop,
        help: deps.help,
        quests: deps.quests,
        finalizeQuests,
        tempEqRef,
        tempInvRef,
        tempStatsRef,
        tempScoreRef,
        tempInfoRef,
        tempPracticeRef,
        tempQuestRef,
        tempWhoRef,
        tempWhereRef,
        tempEntitiesRef,
        isMobile: deps.isMobile ?? false,
    });

    const { initializeStage } = useStageInitializer({
        captureStage: deps.captureStage,
        isSilentCapture: deps.isSilentCapture,
        isDrawerCapture: deps.isDrawerCapture,
        isWaitingForStats: deps.isWaitingForStats,
        isWaitingForEq: deps.isWaitingForEq,
        isWaitingForInv: deps.isWaitingForInv,
        isWaitingForInfo: deps.isWaitingForInfo,
        captureOwnerDrawer: deps.captureOwnerDrawer,
        isInventoryOpen: deps.isInventoryOpen,
        isEquipmentOpen: deps.isEquipmentOpen,
        isCharacterOpen: deps.isCharacterOpen,
        isStatsOpen: deps.isStatsOpen,
        isPlayersOpen: deps.isPlayersOpen,
        practice: deps.practice,
        quests: deps.quests,
        setCharacterInfo,
        setWhoList: session.game.setWhoList,
        setWhereList: session.game.setWhereList,
        setPopoverState: deps.setPopoverState,
        setScoreLines: session.game.setScoreLines,
        setStatsLines: session.game.setStatsLines,
        setInfoLines: session.game.setInfoLines,
        tempStatsRef,
        tempScoreRef,
        tempInfoRef,
        tempPracticeRef,
        tempQuestRef,
        tempWhoRef,
        tempWhereRef,
        help: deps.help,
        finalizeCapture,
        executeCommand: (cmd: string, s?: boolean, sys?: boolean) => deps.executeCommandRef.current?.(cmd, s, sys),
        isMobile: deps.isMobile
    });


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
        setOpponentName,
        setSpectateInCombat: deps.setSpectateInCombat,
        setSpectateOpponentName: deps.setSpectateOpponentName,
        setSpectateOpponentStatus: deps.setSpectateOpponentStatus
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
        setSpectatePosition: deps.setSpectatePosition,
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
        captureStage: deps.captureStage,
        setSpectateOpponentName: deps.setSpectateOpponentName,
        setSpectateOpponentStatus: deps.setSpectateOpponentStatus
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

    const processLine = useCallback((line: string, tokensOrOptions?: any) => {
        if (line === null || line === undefined) return;

        // Normalize tokens vs options object
        const tokens = Array.isArray(tokensOrOptions) ? tokensOrOptions : undefined;
        const options = !Array.isArray(tokensOrOptions) ? tokensOrOptions : undefined;
        const isPromptResolved = options?.isPrompt || (tokens as any)?.isPrompt;

        const cleanLine = line.replace(/\r/g, '');
        
        // --- Snoop Prefix Detection ---
        // MUME snoops prefix lines with &<UPPERCASE letter> followed by a space (e.g. "&E ").
        // Require the trailing space (or end of line) so we don't mis-detect XML-encoded
        // entities like "&lt;" or "&amp;" as snoop markers — that would corrupt the line
        // and route the message into the spectate log, hiding it from the main view.
        let isSnoop = false;
        let lineToParse = cleanLine;
        const snoopRegex = /^((?:\x1b\[[0-9;]*m|\s)*)(?:&|mp;)[A-Z](?: |$)/;
        const snoopMatch = cleanLine.match(snoopRegex);
        if (snoopMatch) {
            isSnoop = true;
            lineToParse = cleanLine.replace(snoopRegex, '$1');
        }

        // Process Log GMCP (which handles &E Core.Ping etc.)
        if (parseLogGmcp(cleanLine, isSnoop)) return;

        // Use pre-calculated tokens if available to derive textOnly
        const tokenizer = Tokenizer.getInstance();
        if (!tokens) {
            tokenizer.reset('room');
        }
        
        // --- Alignment Fix for Snoop Lines ---
        // If it's a snoop line, the provided `tokens` from useTelnet are calculated against 
        // the original UNSTRIPPED line (e.g. including "&E "). Since we stripped it from 
        // `lineToParse`, we must re-tokenize here to ensure `textOnly` and `lineToParse` 
        // are strictly aligned for index-based sub-parsers (like CommParser).
        const effectiveTokens = isSnoop ? null : tokens;
        const derivedTokens = effectiveTokens || tokenizer.tokenize(lineToParse, { buttons: [] } as any);
        const textOnly = derivedTokens.map((t: any) => t.content).join('');
        const lower = textOnly.toLowerCase();

        // --- 1. System/Trigger Processing ---
        processTriggers(lineToParse);

        // --- 2. Visibility and Routing ---
        const isImportant = lineToParse.includes('\x1b[1m') || lineToParse.includes('\x1b[33m');
        const isRoom = lineToParse.includes('\x1b[32m') && textOnly.startsWith('  ');
        const isRoomDescription = isRoom && textOnly.length > 5;
        const isEndPrompt = textOnly.includes('>') || textOnly.includes(':');

        let isVisible = router.determineVisibility(lower, isImportant, isRoom, isRoomDescription, isEndPrompt, deps.isNewbieMode, lineToParse, undefined, isSnoop);
        
        // --- 3. Sub-Parser Dispatch ---
        let msgType: MessageType = 'game';
        
        // Combat
        const combatType = combat.parseCombatLine(textOnly, lineToParse, isSnoop);
        if (combatType) msgType = combatType;

        // Room/Movement
        const roomType = room.parseRoomLine(textOnly, lineToParse, isSnoop);
        if (roomType) msgType = roomType;

        // Communication
        const commResult = comm.parseComm(lineToParse, textOnly, lower);
        if (commResult.isSuppressed) return;
        if (commResult.msgType !== 'game') msgType = commResult.msgType;

        // Stats/Account
        if (account.parseAccountLine(textOnly, isPromptResolved)) return;
        if (stat.parseGlobalStatus(textOnly, lower)) msgType = 'info' as any;
        if (stat.parseDetailedScore(textOnly, lower)) msgType = 'info' as any;

        // --- 4. Prompt Parsing ---
        // A snooped line starting with > is the snooped player's command echo (e.g. "> kill orc"),
        // not a prompt. The promptRegex would match the leading > as a prompt delimiter and
        // misclassify it as msgType='prompt', preventing bubble rendering in the spectate log.
        const isSnoopedCommandEcho = isSnoop && textOnly.trim().startsWith('>') && textOnly.trim().length > 1;
        const promptInfo = isSnoopedCommandEcho ? { isMatch: false } : prompt.parsePrompt(textOnly, isSnoop);
        if (promptInfo.isMatch) {
            msgType = 'prompt' as any;
            if (isSnoop && deps.setSpectateActivePrompt) {
                deps.setSpectateActivePrompt(lineToParse);
            }
        }

        // Atmosphere
        atmosphere.parseAtmosphere(lower, isSnoop);

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

        initializeStage(textOnly, lower, lineToParse, lower, textOnly);
        const stage = deps.captureStage.current;

        const finalType = router.routeMessage(msgType, textOnly, lower, lineToParse, textOnly, isEndPrompt, isSnoop) as MessageType;
        console.log(`[useGameParser] Processed line: "${textOnly.substring(0, 20)}", stage=${stage}, finalType=${finalType}, isSnoop=${isSnoop}`);

        // --- 4. Highlighting and Display ---
        const tokenizerContext = {
            target: session.vitals.target,
            buttons: deps.btn?.buttonsRef?.current || [],
            registeredPlayers: Object.values(deps.entities || {})
                .filter(e => e.capabilities.includes(EntityCapability.Player))
                .map(p => p.name),
            inlineCategories: deps.inlineCategories || [],
            npcColor: deps.npcColor,
            playerColor: deps.playerColor,
            objectColor: deps.objectColor,
            roomColor: deps.roomColor
        };

        // --- 3.5 Capture Buffer Population ---
        if (stage !== 'none') {
            const lines = lineProcessor.createLines(lineToParse, textOnly, lower, stage === 'eq' ? 'equipmentlist' : (stage === 'inv' ? 'inventorylist' : finalType));
            
            // Set Tokenizer location context so objects are categorized correctly (worn/carried/room)
            const tokenizer = Tokenizer.getInstance();
            let locationHint = 'room';
            if (stage === 'eq') locationHint = 'worn';
            else if (stage === 'inv') locationHint = 'carried';
            else if (stage === 'container') locationHint = 'container';
            
            tokenizer.reset(locationHint);

            // Shared tokenization for all captured lines to enable interactive menus and tag support
            const tokenizedLines = lines.map(l => {
                // Ensure we start each line with the correct location context for the drawer
                return {
                    ...l,
                    tokens: tokenizer.tokenize(l.rawText || l.text, tokenizerContext, locationHint)
                };
            });

            if (stage === 'inv') tempInvRef.current.push(...tokenizedLines);
            else if (stage === 'eq') tempEqRef.current.push(...tokenizedLines);
            else if (stage === 'stat') tempStatsRef.current.push(...tokenizedLines);
            else if (stage === 'practice') tempPracticeRef.current.push(...tokenizedLines);
            else if (stage === 'who' || stage === 'where') {
                // Extract player name for broad highlighting
                const nameMatch = textOnly.match(/^\s*(?:(?:\*?\[.*?\]|<[A-Z]>|\*)\s*)*([A-Z][^\s\*\[\]\(\)\!\,\.\:\;\?\/\\\|]+)/);
                if (nameMatch) {
                    const playerName = nameMatch[1];
                    registerEntity(playerName.toLowerCase(), playerName, 'none', 'inline-player');
                    
                    // Immediate injection for current tokenization
                    if (!tokenizerContext.registeredPlayers.includes(playerName)) {
                        tokenizerContext.registeredPlayers.push(playerName);
                    }
                    
                    // Re-tokenize since we have a new player to highlight
                    tokenizedLines.forEach(l => {
                        l.tokens = Tokenizer.getInstance().tokenize(l.text, tokenizerContext);
                    });
                }

                if (stage === 'who') tempWhoRef.current.push(...tokenizedLines);
                else tempWhereRef.current.push(...tokenizedLines);
            }
        }

        if (isVisible) {
            const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const ansiHtml = deps.ansiConvert.toHtml(lineToParse);

            const messageObj = PipelineOrchestrator.processTextLine(lineToParse, ansiHtml, finalType, tokenizerContext);
            
            deps.addMessage(
                finalType, 
                textOnly, 
                undefined, 
                mid, 
                false, 
                { textOnly, lower, html: messageObj.html },
                undefined, // shopItem
                undefined, // practiceSkill
                undefined, // practiceHeader
                false,     // isSystem
                commResult.replyTarget,
                commResult.replyCommand,
                commResult.commSender,
                commResult.commAction,
                commResult.commText,
                commResult.commColor,
                commResult.commSender ? Tokenizer.getInstance().tokenize(commResult.commSender, tokenizerContext) : undefined,
                commResult.commText ? Tokenizer.getInstance().tokenize(commResult.commText, tokenizerContext) : undefined,
                undefined, // providedCombatSide
                undefined, // providedIsHitImpact
                undefined, // providedIsHitterImpact
                isSnoop    // providedIsSnoop
            );
        }

        // Emit to bus for DVR recording
        gmcpBus.emit('Game.Text', { type: finalType, text: textOnly });

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, parseLogGmcp,
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
