/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 * COMPLETELY REFACTORED: Removed all legacy capture/drawer logic in favor of the Reactive Capture Machine.
 */

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { gmcpBus } from '../../events/gmcpBus';
import { DrawerLine, EntityCapability, MessageType } from '../../types';
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

const decodeTextEntities = (text: string) => text
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");

const extractXmlRoomTitle = (line: string): string | null => {
    if (!/<\/?name\b/i.test(line)) return null;

    const nameMatch = line.match(/<name\b[^>]*>(.*?)<\/name>/i);
    const rawTitle = nameMatch?.[1]?.trim();
    if (!rawTitle) return null;

    return decodeTextEntities(rawTitle.replace(/<[^>]+>/g, '')).trim() || null;
};

const extractXmlTagText = (line: string, tagName: string): string | null => {
    const tagPattern = new RegExp(`<${tagName}\\b[^>]*>(.*?)<\\/${tagName}>`, 'i');
    const rawText = line.match(tagPattern)?.[1]?.trim();
    if (!rawText) return null;

    return decodeTextEntities(rawText.replace(/<[^>]+>/g, '')).trim() || null;
};

const extractXmlRoomInfo = (line: string): { num: number; area?: string; terrain?: string } | null => {
    if (!/<room\b/i.test(line)) return null;
    const roomAttrs = line.match(/<room\b([^>]*)/i)?.[1];
    if (!roomAttrs) return null;
    const idStr = roomAttrs.match(/\bid=["']?(\d+)["']?/i)?.[1];
    if (!idStr) return null;
    const num = parseInt(idStr, 10);
    if (isNaN(num)) return null;
    const area = roomAttrs.match(/\barea=["']([^"']*)["']/i)?.[1];
    const terrain = roomAttrs.match(/\bterrain=["']?(\w+)["']?/i)?.[1];
    return { num, area, terrain };
};

const stripAnsiCodes = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '');

const isPromptBoundaryLine = (text: string): boolean => {
    const clean = stripAnsiCodes(text).trim();
    if (!clean) return false;

    return (
        /(?:^|[\s\[\]!(*>])(?:HP|MA|MV|SP):\w+/i.test(clean) ||
        /^[!*[(][^\r\n]{0,24}\bHP:\w+/i.test(clean) ||
        /^[^\r\n]{0,48}>\s*$/.test(clean)
    );
};

const stripInlineMarkup = (text: string): string => text
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s+[^>]*)?\/?>|&lt;|&gt;|&amp;/g, (match: string) => {
        if (match === '&lt;') return '<';
        if (match === '&gt;') return '>';
        if (match === '&amp;') return '&';
        return '';
    });

const isWhereTableLine = (text: string): boolean => {
    const clean = stripInlineMarkup(text).trim();
    if (!clean) return false;
    if (/^player\s+distance\s+direction\s+room$/i.test(clean)) return true;
    if (/^-{5,}$/.test(clean)) return true;
    if (/^no-?one\s+(?:is\s+)?(?:nearby|around|visible)/i.test(clean)) return true;
    return /^[A-Z\u00C0-\u00DE][\w\u00C0-\u00FF'`-]{1,20}\s{2,}.+/.test(clean);
};

const createWhereLine = (rawText: string, ansiConvert: any): DrawerLine => {
    const text = stripInlineMarkup(rawText).trimEnd();
    return {
        id: `where-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: text.trim(),
        rawText,
        html: ansiConvert.toHtml(text),
        tokens: [{ type: 'text', content: text }],
        isHeader: /^player\s+distance\s+direction\s+room$/i.test(text.trim()) || /^-{5,}$/.test(text.trim()),
        isItem: false
    };
};

const normalizeStageToCaptureType = (stage: unknown) => {
    const normalized = String(stage || 'none').toLowerCase();
    if (normalized === 'eq') return 'equipment';
    if (normalized === 'inv') return 'inventory';
    if (normalized === 'stat' || normalized === 'status') return 'stats';
    if (normalized === 'quest') return 'quests';
    if (normalized === 'sc') return 'score';
    return normalized;
};

const addSnoopedPlainLine = (
    addMessage: UseGameParserDeps['addMessage'],
    ansiConvert: UseGameParserDeps['ansiConvert'],
    text: string,
    html?: string
) => {
    const textOnly = stripAnsiCodes(text);
    const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addMessage(
        'game',
        text,
        undefined,
        mid,
        false,
        {
            textOnly,
            lower: textOnly.toLowerCase(),
            html: html || ansiConvert.toHtml(text)
        },
        undefined,
        undefined,
        undefined,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true
    );
    gmcpBus.emit('Game.Text', { type: 'game', text: textOnly });
};

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
    const nearbyCaptureRef = useRef<{ active: boolean; lines: DrawerLine[] }>({ active: false, lines: [] });
    const finalizeNearbyCapture = useCallback(() => {
        if (!nearbyCaptureRef.current.active) return;
        setWhereLines([...nearbyCaptureRef.current.lines]);
        nearbyCaptureRef.current = { active: false, lines: [] };
        if (deps.captureStage.current === 'where') deps.captureStage.current = 'none' as any;
    }, [setWhereLines, deps.captureStage]);
    
    // 3. The Reactive Capture Machine (The only capture system left)
    const capture = useCaptureParser({
        captureSession: deps.captureSession,
        setCaptureSession: deps.setCaptureSession,
        setInventoryLines: sessionSetInventoryLines,
        setEqLines: sessionSetEqLines,
        setStatsLines: sessionSetStatsLines,
        setPracticeLines: sessionSetPracticeLines,
        setWhoLines,
        setWhoList: session.game.setWhoList,
        setScoreLines: sessionSetScoreLines,
        setInfoLines,
        setQuestLines,
        practiceHandler: deps.practiceHandler,
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
        triggerXpTicker: deps.triggerXpTicker,
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
            if (lineToParse.includes('<prompt')) {
                lineToParse = lineToParse
                    .replace(/<prompt[^>]*>|<\/prompt>/g, '')
                    .replace(/&gt;/gi, '>')
                    .replace(/&lt;/gi, '<')
                    .replace(/&amp;/gi, '&')
                    .trim();
            }
        }

        const snoopedRoomInfo = isSnoop ? extractXmlRoomInfo(lineToParse) : null;
        if (snoopedRoomInfo) {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-spectate-room-update', {
                    detail: { ...snoopedRoomInfo, spectating: true }
                }));
            }
            gmcpBus.emit('Room.Info', { ...snoopedRoomInfo, spectating: true } as any);
        }

        const snoopedRoomTitle = isSnoop ? extractXmlRoomTitle(lineToParse) : null;
        if (snoopedRoomTitle) {
            addSnoopedPlainLine(deps.addMessage, deps.ansiConvert, snoopedRoomTitle);
            return;
        }

        const snoopedMagicText = isSnoop ? extractXmlTagText(lineToParse, 'magic') : null;
        if (snoopedMagicText) {
            addSnoopedPlainLine(
                deps.addMessage,
                deps.ansiConvert,
                snoopedMagicText,
                `<span style="color: var(--ansi-magenta)">${deps.ansiConvert.toHtml(snoopedMagicText)}</span>`
            );
            return;
        }

        if (parseLogGmcp(cleanLine, isSnoop)) return;

        // --- Fast Path: Skip heavy tokenization during 'where' capture ---
        // The capture parser strips all tokens for 'where' lines anyway (useCaptureParser:134-137),
        // so running the full tokenizer (which rebuilds a growing player-name regex per line)
        // causes an O(N²) feedback loop that freezes the browser.
        const activeCapture = capture.getActiveType();
        const expectedCaptureBeforeTokenize = normalizeStageToCaptureType(deps.captureStage.current) as any;
        const isWhereCapture = !isSnoop && (activeCapture === 'where' || expectedCaptureBeforeTokenize === 'where');

        let tokenizerContext: any;
        let derivedTokens: any[];
        let textOnly: string;
        let lower: string;

        if (isWhereCapture) {
            // Lightweight path: extract text without full tokenization
            const stripped = stripInlineMarkup(lineToParse);
            tokenizerContext = {};
            derivedTokens = [{ type: 'text', content: stripped }];
            textOnly = stripped;
            lower = stripped.toLowerCase();
        } else {
            const tokenizer = Tokenizer.getInstance();
            tokenizer.reset('room');
            
            tokenizerContext = {
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

            const locationHint = activeCapture === 'inventory'
                ? 'carried'
                : activeCapture === 'equipment'
                    ? 'worn'
                    : undefined;
            const effectiveTokens = isSnoop || locationHint ? null : tokens;
            derivedTokens = effectiveTokens || tokenizer.tokenize(lineToParse, tokenizerContext, locationHint);
            textOnly = derivedTokens.map((t: any) => t.content).join('');
            lower = textOnly.toLowerCase();
        }

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

        const roomType = isSnoop ? null : room.parseRoomLine(textOnly, lineToParse, isSnoop);
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

        const expectedCaptureType = normalizeStageToCaptureType(deps.captureStage.current) as any;
        const isCaptureBoundary = isPromptResolved || promptInfo.isMatch || isPromptBoundaryLine(textOnly);

        // Nearby is intentionally separate from the generic capture machine.
        // It records only the tiny `where` table and never touches entity
        // registration, account parsing, TokenRenderer data, or CaptureSession.
        if (!isSnoop && (nearbyCaptureRef.current.active || expectedCaptureType === 'where')) {
            if (isCaptureBoundary) {
                finalizeNearbyCapture();
            } else if (isWhereTableLine(textOnly)) {
                if (!nearbyCaptureRef.current.active) {
                    nearbyCaptureRef.current = { active: true, lines: [] };
                }
                nearbyCaptureRef.current.lines.push(createWhereLine(lineToParse, deps.ansiConvert));
                if (nearbyCaptureRef.current.lines.length >= 40) {
                    finalizeNearbyCapture();
                }
                return;
            } else if (nearbyCaptureRef.current.active) {
                finalizeNearbyCapture();
            } else if (expectedCaptureType === 'where') {
                deps.captureStage.current = 'none' as any;
            }
        }

        if (account.parseAccountLine(textOnly, isPromptResolved)) return;
        if (stat.parseCompactCombatInfo(textOnly)) return;
        if (stat.parseGlobalStatus(textOnly, lower)) msgType = 'info' as any;
        if (stat.parseDetailedScore(textOnly, lower)) msgType = 'info' as any;

        // Action Tracking (for manual inventory updates)
        actionTracker.trackAction(lineToParse, textOnly, lower);
        router.detectItemsInRoom(textOnly, lineToParse, false);
        router.trackRoomItemAction(textOnly, lineToParse, false);
        
        // --- Capture Boundary Handling ---
        // Prompt lines end list-style captures and should never be stored as
        // drawer content. A new drawer header can also arrive before the previous
        // capture sees a prompt, so switch sessions at the header boundary.
        let skipCaptureAccumulation = isCaptureBoundary;
        if (!isSnoop && isCaptureBoundary && capture.hasSession()) {
            capture.finalizeSession();
        }

        const incomingCaptureType = !isSnoop && !isCaptureBoundary
            ? capture.checkTriggers(textOnly, (promptInfo as any).attachedText)
            : null;
        if (incomingCaptureType && capture.hasSession() && incomingCaptureType !== capture.getActiveType()) {
            capture.finalizeSession();
        }

        if (
            !isSnoop &&
            capture.hasSession() &&
            ['who', 'equipment', 'inventory'].includes(expectedCaptureType) &&
            expectedCaptureType !== capture.getActiveType()
        ) {
            capture.finalizeSession();
        }

        // --- Explicit Capture Bootstrap ---
        // Some MUME list commands do not always start with a stable header. If the
        // command middleware marked an expected capture type, begin on first output.
        const canStartExpectedCapture = (
            !isSnoop &&
            !isCaptureBoundary &&
            !capture.hasSession() &&
            !incomingCaptureType &&
            expectedCaptureType === 'who'
        );
        if (canStartExpectedCapture) {
            capture.startSession(expectedCaptureType);
        }

        let finalTokens = derivedTokens;
        // Only build player tokens for 'who' in the main parser. Nearby/where
        // uses the dedicated plain-table capture above.
        if (!isSnoop && activeCapture === 'who') {
            finalTokens = buildPlayerLineTokens(textOnly, registerEntity) || finalTokens;
        }

        // 3.5 Capture Buffer Population
        if (capture.hasSession() && !isSnoop && !skipCaptureAccumulation) {
            capture.accumulateLine(lineToParse, finalTokens, tokenizerContext);
        }

        // 5. Reactive Capture Machine Logic
        if (!isSnoop) {
            // 5.2 Trigger new session
            if (incomingCaptureType && !capture.hasSession()) {
                capture.startSession(incomingCaptureType as any);
                // Accumulate the header line immediately
                capture.accumulateLine(lineToParse, finalTokens, tokenizerContext);
            }
        }
        
        // 6. Prompt UI Finalization
        if (isPromptResolved || promptInfo.isMatch) {
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

        if (finalType === 'snoop-command') {
            const stripped = textOnly.replace(/^>\s*/, '');
            textOnly = stripped;
            lower = stripped.toLowerCase();
            lineToParse = lineToParse.replace(/^((?:\x1b\[[0-9;]*m|\s)*)>\s*/, '$1');
            // Only play click when actively watching the spectated player's view
            if (!deps.isSpectateMode || deps.activeView === 'target') {
                deps.playClickSound?.();
            }
        }

        // Suppress response lines from silent capture sessions (e.g. drawer auto-commands like eq/who)
        if (!isSnoop && capture.hasSession() && capture.isSilent()) {
            isVisible = false;
        }

        if (isVisible) {
            const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const ansiHtml = deps.ansiConvert.toHtml(lineToParse);
            const messageObj = PipelineOrchestrator.processTextLine(lineToParse, ansiHtml, finalType, tokenizerContext, finalTokens);
            const tokenizeFresh = (text: string) => {
                const freshTokenizer = Tokenizer.getInstance();
                freshTokenizer.reset('room');
                return freshTokenizer.tokenize(text, tokenizerContext);
            };
            
            const hasHitTag = lineToParse.includes('<hit>');
            const hasDamageTag = lineToParse.includes('<damage>');
            deps.addMessage(
                finalType, textOnly, undefined, mid, false, 
                { textOnly, lower, html: messageObj.html, tokens: messageObj.tokens },
                undefined, undefined, undefined, false, 
                commResult.replyTarget, commResult.replyCommand, commResult.commSender, commResult.commAction, commResult.commText, commResult.commColor,
                commResult.commSender ? tokenizeFresh(commResult.commSender) : undefined,
                commResult.commText ? tokenizeFresh(commResult.commText) : undefined,
                undefined, hasHitTag, hasDamageTag, undefined, isSnoop
            );
        }

        gmcpBus.emit('Game.Text', { type: finalType, text: textOnly });

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, parseLogGmcp, actionTracker,
        deps.addMessage, deps.isNewbieMode, session.game, deps.groupMembers, deps.inlineCategories, deps.btn, session.vitals.target, deps.captureStage, deps.ansiConvert, capture, finalizeNearbyCapture
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
