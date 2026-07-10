/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 * COMPLETELY REFACTORED: Removed all legacy capture/drawer logic in favor of the Reactive Capture Machine.
 */

import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { gmcpBus } from '../../events/gmcpBus';
import { DrawerLine, EntityCapability, MessageType } from '../../types';
import { Token, EntityToken, TextToken } from '../../types/tokens';
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
import { useUIStore } from '../../stores/useUIStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { parseEffectTimerLine } from '../../services/timers/effectTimerParser';
import { parseActionTimerLine } from '../../services/timers/actionTimerParser';
import { useActionTimerStore } from '../../stores/useActionTimerStore';
import { parseMagicKeyLine, upsertMagicKeyTarget } from '../../utils/magicKeyUtils';
import { consumeTextMapperLine, createTextMapperState, extractXmlMovementDir } from './textMapperEvents';
import { useShaperLiveImportStore } from '../../shaper/import/useShaperLiveImportStore';
import { canBootstrapExpectedCapture } from './captureBootstrap';

const decodeTextEntities = (text: string) => text
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");

const decodeAccountDisplayEntities = (html: string) => html
    .replace(/&amp;(lt|gt|quot|apos);/gi, '&$1;')
    .replace(/&amp;(#(?:39|34|x27|x22));/gi, '&$1;');

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
const SNOOP_PREFIX_REGEX = /^((?:\x1b\[[0-9;]*m|\s)*)(?:&amp;|&|mp;)[A-Za-z](?:\x1b\[[0-9;]*m)*(?:\s|$)/;
const COMM_XML_OPEN_REGEX = /<(tell|say|narrate|shout|yell|song|sing|pray|whisper|social|emote)(?:\s+[^>]*)?>/i;

const redactAccountDisplayLine = (line: string): string => line
    .replace(/\s+Host\s*$/, '')
    .replace(/\s+(?:\d{1,3}(?:[.-]\d{1,3}){2,}[\w.-]*|[\w-]+(?:\.[\w-]+){2,})\s*$/, '');

const getUnclosedCommXmlTag = (text: string): string | null => {
    const match = text.match(COMM_XML_OPEN_REGEX);
    if (!match) return null;
    const tag = match[1].toLowerCase();
    const closeRegex = new RegExp(`<\\/${tag}>`, 'i');
    return closeRegex.test(text.slice(match.index || 0)) ? null : tag;
};

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
        if (/^<[A-Z]>$/.test(match)) return match;
        if (match === '&lt;') return '<';
        if (match === '&gt;') return '>';
        if (match === '&amp;') return '&';
        return '';
    });

const isGameplayXmlLine = (text: string): boolean => {
    const clean = stripInlineMarkup(text).trim().toLowerCase();
    if (!clean) return false;
    if (clean.endsWith('account>')) return false;
    if (clean.includes('by what name do you wish') || clean.includes('account password:') || clean === 'password:') return false;

    return /<\/?(?:room|name|description|character|player|object|exit|prompt|movement|header|status|enemy|movein|moveout|move_in|move_out)\b/i.test(text) ||
        /&lt;\/?(?:room|name|description|character|player|object|exit|prompt|movement|header|status|enemy|movein|moveout|move_in|move_out)\b/i.test(text);
};

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
    const isHeader = /^player\s+distance\s+direction\s+room$/i.test(text.trim()) || /^-{5,}$/.test(text.trim());
    return {
        id: `where-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: text.trim(),
        rawText,
        html: ansiConvert.toHtml(text),
        tokens: isHeader ? [{ type: 'text', content: text }] : (buildPlayerLineTokens(text) || [{ type: 'text', content: text }]),
        isHeader,
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
    html?: string,
    messageType: MessageType = 'game',
    isRoomName: boolean = false
) => {
    const textOnly = stripAnsiCodes(text);
    const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    addMessage(
        messageType,
        text,
        undefined,
        mid,
        isRoomName,
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
        undefined,
        undefined,
        undefined,
        true
    );
    gmcpBus.emit('Game.Text', { type: messageType, text: textOnly });
};

const buildHelpTermTokens = (prefix: string, termsStr: string, splitOnComma: boolean): Token[] => {
    const tokens: Token[] = [];
    if (prefix) tokens.push({ type: 'text', content: prefix } as TextToken);
    const terms = splitOnComma
        ? termsStr.split(/\s*,\s*/).map(t => t.trim()).filter(Boolean)
        : termsStr.split(/\s+/).filter(Boolean);
    terms.forEach((term, i) => {
        tokens.push({
            type: 'entity',
            content: term,
            entityId: `help-term-${term.toLowerCase()}`,
            metadata: { cmd: 'help', category: 'cat-help-term', context: term, action: 'command' },
        } as EntityToken);
        if (i < terms.length - 1) {
            tokens.push({ type: 'text', content: splitOnComma ? ', ' : ' ' } as TextToken);
        }
    });
    return tokens;
};

export const useGameParser = (deps: UseGameParserDeps, session: any) => {
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const loginName = useSettingsStore(s => s.loginName);
    const loginPassword = useSettingsStore(s => s.loginPassword);

    // 1. Session Destructuring
    const { setStats, setTarget, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName, setBufferHealthStatus, setBufferName, setCharacterInfo } = session.vitals as any;
    const { 
        setRoomName, setRoomDesc, setRoomZone, setCurrentTerrain, setInCombat, 
        setPlayerPosition, setIsRiding, setWeather, setIsFoggy, setLightningEnabled, 
        setInventoryLines: sessionSetInventoryLines, setStatsLines: sessionSetStatsLines, 
        setInfoLines, setScoreLines: sessionSetScoreLines, setQuestLines, setAchievementLines,
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
    const shopCaptureRef = useRef<{ active: boolean; items: import('../../types').ShopItem[] }>({ active: false, items: [] });
    const pendingHelpInterestRef = useRef(false);
    const pendingCommXmlRef = useRef<{ tag: string; line: string; isSnoop: boolean } | null>(null);
    const textMapperStateRef = useRef(createTextMapperState());
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
        setAchievementLines,
        setContainerContents: session.game.setContainerContents,
        practiceHandler: deps.practiceHandler,
        registerEntity,
        ansiConvert: deps.ansiConvert,
        captureStage: deps.captureStage,
        setCharacterInfo
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
        playSpectateHitImpactSound: deps.playSpectateHitImpactSound,
        playSpectateOofSound: deps.playSpectateOofSound,
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
        triggerTpTicker: deps.triggerTpTicker,
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
        ansiConvert: deps.ansiConvert,
        onWear: deps.playWearSound,
        onRemove: deps.playRemoveSound
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
        playRideSound: deps.playRideSound,
        playStopRidingSound: deps.playStopRidingSound,
        setPlayerPosition,
        setIsRiding,
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
        sendCommand: deps.sendCommand || session.game.sendCommand || ((cmd: string) => {}),
        addMessage: deps.addMessage,
        clearLog: deps.clearLog,
        captureStage: deps.captureStage,
        rememberLogin,
        loginName,
        loginPassword,
        setInput: deps.setInput,
        isMobile: deps.isMobile,
    });

    const time = useTimeParser({
        setGameTime,
        gameTime: deps.gameTime
    });

    const automator = useSpectateAutomator({
        spectateQueue: deps.spectateQueue,
        setSpectateQueue: deps.setSpectateQueue,
        lastSnoopStartTime: deps.lastSnoopStartTime,
        setLastSnoopStartTime: deps.setLastSnoopStartTime,
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
        const snoopMatch = cleanLine.match(SNOOP_PREFIX_REGEX);
        if (snoopMatch) {
            isSnoop = true;
            lineToParse = cleanLine.replace(SNOOP_PREFIX_REGEX, '$1');
            if (lineToParse.includes('<prompt')) {
                lineToParse = lineToParse
                    .replace(/<prompt[^>]*>|<\/prompt>/g, '')
                    .replace(/&gt;/gi, '>')
                    .replace(/&lt;/gi, '<')
                    .replace(/&amp;/gi, '&')
                    .trim();
            }
        }

        const pendingCommXml = pendingCommXmlRef.current;
        if (pendingCommXml) {
            lineToParse = `${pendingCommXml.line} ${lineToParse.trimStart()}`;
            isSnoop = pendingCommXml.isSnoop;
            const closeRegex = new RegExp(`<\\/${pendingCommXml.tag}>`, 'i');
            if (!closeRegex.test(lineToParse)) {
                pendingCommXmlRef.current = { ...pendingCommXml, line: lineToParse };
                return;
            }
            pendingCommXmlRef.current = null;
        } else {
            const unclosedCommTag = getUnclosedCommXmlTag(lineToParse);
            if (unclosedCommTag) {
                pendingCommXmlRef.current = { tag: unclosedCommTag, line: lineToParse, isSnoop };
                return;
            }
        }
        
        // --- Help Response Capture ---
        // Intercept help headers, buffer help output until the next prompt, suppress from log, and show in a popup card
        const lowerLine = lineToParse.toLowerCase();
        const isHeaderLine = !isSnoop && (lowerLine.includes('<header') || lowerLine.includes('&lt;header'));
        const isPromptLine = isPromptResolved || 
            lowerLine.includes('<prompt') || 
            lowerLine.includes('&lt;prompt') || 
            isPromptBoundaryLine(lineToParse) || 
            prompt.parsePrompt(stripAnsiCodes(lineToParse), isSnoop).isMatch;
        const isEndPromptLine = isPromptLine && !isHeaderLine;

        if (deps.help.isUiRequestedRef.current) {
            if (isHeaderLine) {
                deps.help.setIsHelpActive(true);
                deps.help.setIsUiRequested(false);
            } else if (isEndPromptLine) {
                deps.help.setIsUiRequested(false);
                if (deps.help.handleNoHelpFound) {
                    deps.help.handleNoHelpFound();
                }
            }
        }

        if (deps.help.isHelpActiveRef.current) {
            if (isEndPromptLine) {
                if (deps.setPopoverState) {
                    deps.help.scheduleFinalizeHelp(deps.setPopoverState);
                }
            } else {
                // Strip the prompt tag and its contents if present on the header line
                const cleanHelpLine = lineToParse
                    .replace(/<(prompt)\b[^>]*>.*?<\/\1>/gi, '')
                    .replace(/&lt;(prompt)\b[^&]*&gt;.*?&lt;\/\1&gt;/gi, '')
                    .replace(/<\/?(?:header|help)\b[^>]*>/gi, '')
                    .replace(/&lt;\/?(?:header|help)\b[^&]*&gt;/gi, '');

                deps.help.parseHelpLine(cleanHelpLine);
                if (deps.setPopoverState && /^\s*See also:\s*.+/i.test(stripAnsiCodes(cleanHelpLine))) {
                    deps.help.finalizeHelp(deps.setPopoverState);
                }
                return;
            }
        }

        if (!isSnoop && deps.gameState === 'account' && isGameplayXmlLine(lineToParse)) {
            deps.accountStageRef.current = 'none' as any;
            deps.setAccountState(prev => ({
                ...prev,
                stage: 'none',
                currentPrompt: undefined,
                creationPrompt: undefined,
                selectedMenuCommand: null,
                selectedCharacter: null,
                charSelectTab: null,
                charCapture: null,
                isGathering: false
            }));
            useUIStore.getState().setUI({ drawer: !deps.isMobile ? 'status' : 'none', isDrawerPeeking: false, mapExpanded: true });
            deps.setIsPasswordMode(false);
            deps.setGameState('playing');
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
        
        // --- Enter/Exit Sound Triggers ---
        // MUME does not send <movein>/<moveout> wrapper tags.
        // Movement messages arrive as: "A <character>Name</character> leaves east."
        // or: "A <character>Name</character> has arrived from the north."
        // We detect these by the presence of a <character> tag plus movement verb patterns.
        {
            const lowerLine = lineToParse.toLowerCase();
            const hasCharTag = /<character>|&lt;character/i.test(lineToParse);
            if (hasCharTag) {
                if (lowerLine.includes(' arrived from ') || lowerLine.includes(' arrives from ')) {
                    deps.playEffect?.('enter', { skipJitter: true });
                } else if (/\bleaves\b/.test(lowerLine) || lowerLine.includes(' flees ') || lowerLine.includes(' fled ')) {
                    deps.playEffect?.('exit', { skipJitter: true });
                }
            }
        }

        if (!isSnoop) {
            const xmlMoveDir = extractXmlMovementDir(lineToParse);
            if (xmlMoveDir !== null && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', {
                    detail: { dir: xmlMoveDir || undefined, source: 'xml' }
                }));
            }
            const textMapperResult = consumeTextMapperLine(
                textMapperStateRef.current,
                lineToParse,
                isEndPromptLine
            );
            if (textMapperResult.roomName) setRoomName(textMapperResult.roomName);
            if (textMapperResult.roomDesc !== undefined) {
                setRoomDesc(textMapperResult.roomDesc);
                deps.roomDescRef.current = textMapperResult.roomDesc;
            }
            if (textMapperResult.roomZone) setRoomZone(textMapperResult.roomZone);
            if (textMapperResult.terrain) setCurrentTerrain(textMapperResult.terrain);
            if (textMapperResult.exits) setRoomExits(textMapperResult.exits);

            const event = textMapperResult.event;
            if (event && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-gmcp-room-info', { detail: event }));
            }
        }

        const snoopedRoomTitle = isSnoop ? extractXmlRoomTitle(lineToParse) : null;
        if (snoopedRoomTitle) {
            addSnoopedPlainLine(deps.addMessage, deps.ansiConvert, snoopedRoomTitle, undefined, 'room-name', true);
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

        if (parseLogGmcp(lineToParse, isSnoop)) return;

        // --- Fast Path: Skip heavy tokenization during 'where' capture ---
        // The capture parser strips all tokens for 'where' lines anyway (useCaptureParser:134-137),
        // so running the full tokenizer (which rebuilds a growing player-name regex per line)
        // causes an O(N²) feedback loop that freezes the browser.
        const activeCapture = capture.getActiveType();
        const expectedCaptureBeforeTokenize = normalizeStageToCaptureType(deps.captureStage.current) as any;
        const isWhereCapture = !isSnoop && (activeCapture === 'where' || expectedCaptureBeforeTokenize === 'where');
        // Skip entity tokenization during account phase — account text is pure terminal output
        // and inline-btn padding/bold/letter-spacing break monospace column alignment.
        const isAccountPhase = !isSnoop && deps.gameState === 'account' && !isGameplayXmlLine(lineToParse);

        let tokenizerContext: any;
        let derivedTokens: any[];
        let textOnly: string;
        let lower: string;

        if (isAccountPhase) {
            // Account text is raw terminal output. We trim leading/trailing whitespace
            // to ensure consistent alignment in the mobile log container.
            const ansiStripped = lineToParse.replace(/\x1b\[[0-9;]*m/g, '');
            let normalized = decodeTextEntities(ansiStripped.trimEnd());

            // --- Privacy: Strip the "Host" column from `list` output ---
            // Matches the column header "Host" at the end of the header line.
            normalized = normalized.replace(/\s+Host\s*$/, '');
            // Matches trailing IP addresses in dashed notation (e.g. 162-236-88-200)
            // and fully qualified domain names (e.g. 112.lightspeed.moblal.sbcglobal.net)
            // that appear after the delete/rent fields in character list entries.
            normalized = redactAccountDisplayLine(normalized);

            tokenizerContext = {};
            derivedTokens = [];
            textOnly = normalized;
            lower = normalized.toLowerCase();
        } else if (isWhereCapture) {
            // Lightweight path: extract text without full tokenization
            const stripped = stripInlineMarkup(lineToParse);
            tokenizerContext = {};
            derivedTokens = [{ type: 'text', content: stripped }];
            textOnly = stripped;
            lower = stripped.toLowerCase();
        } else {
            const tokenizer = Tokenizer.getInstance();
            tokenizer.reset('room');
            
            const containerCmd = (activeCapture === 'container' && capture.getSession) 
                ? (capture.getSession()?.metadata?.command || '') 
                : '';
            const lowerCmd = containerCmd.toLowerCase().trim();
            let parent: string | undefined = undefined;
            if (lowerCmd.startsWith('look in ')) {
                parent = containerCmd.slice('look in '.length).trim();
            } else if (lowerCmd.startsWith('look inside ')) {
                parent = containerCmd.slice('look inside '.length).trim();
            }

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
                roomColor: deps.roomColor,
                parent
            };

            const lowerLine = lineToParse.toLowerCase();
            const isHeaderLine = lowerLine.includes('in your') || 
                                 lowerLine.includes('in the') ||
                                 lowerLine.includes('in a ') ||
                                 lowerLine.includes('when you look inside') ||
                                 lowerLine.includes('when you look in') ||
                                 lowerLine.includes('it is empty.') ||
                                 lowerLine.includes('<header>');

            const objectCaptureContext = activeCapture !== 'none' ? activeCapture : expectedCaptureBeforeTokenize;
            const locationHint = objectCaptureContext === 'inventory'
                ? 'carried'
                : objectCaptureContext === 'equipment'
                    ? 'worn'
                    : (objectCaptureContext === 'container' && !isHeaderLine)
                        ? 'container'
                        : undefined;
            const effectiveTokens = isSnoop || locationHint ? null : tokens;
            derivedTokens = effectiveTokens || tokenizer.tokenize(lineToParse, tokenizerContext, locationHint);
            textOnly = derivedTokens.map((t: any) => t.content).join('');
            lower = textOnly.toLowerCase();
        }

        if (isSnoop && textOnly.trim().length === 0) return;
        if (!isSnoop && capture.shouldSuppressSilentBlank(textOnly)) return;

        if (!isSnoop) {
            const magicTarget = parseMagicKeyLine(textOnly, deps.roomNameRef.current, useRoomStore.getState().roomZone);
            if (magicTarget) {
                const settings = useSettingsStore.getState();
                settings.setTeleportTargets(upsertMagicKeyTarget(settings.teleportTargets, magicTarget));
            }
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
        if (
            !isSnoop &&
            commResult.msgType === 'comm' &&
            (commResult.replyCommand === 'tell' || commResult.replyCommand === 'whisper') &&
            /(?:<\s*spectateme\s*>|&lt;\s*spectateme\s*&gt;)/i.test(commResult.commText || '')
        ) {
            const requestedName = commResult.commSender || commResult.replyTarget;
            if (requestedName) {
                automator.addToQueue(requestedName);
            }
        }
        if (
            !isSnoop &&
            commResult.msgType === 'comm' &&
            (commResult.replyCommand === 'tell' || commResult.replyCommand === 'whisper') &&
            /(?:<\s*stop\s*>|&lt;\s*stop\s*&gt;)/i.test(commResult.commText || '')
        ) {
            const requestedName = commResult.commSender || commResult.replyTarget;
            if (requestedName) {
                automator.stopSpectatingName(requestedName);
            }
        }

        const promptInfo = prompt.parsePrompt(textOnly, isSnoop);
        if (!isSnoop && promptInfo.isMatch) {
            const active = useActionTimerStore.getState().activeTimer;
            if (active && !active.isFinished && Date.now() - active.startedAt > 400) {
                useActionTimerStore.getState().completeTimer(false);
            }
        }
        if (!isSnoop && capture.shouldSuppressCommandEcho(textOnly, promptInfo.attachedText)) {
            return;
        }

        const isAccountRelatedStage = ['login', 'account-menu', 'character-creation', 'stat-editing'].includes(deps.accountState.stage);

        if (!isSnoop && deps.gameState === 'account' && promptInfo.isMatch) {
            if (promptInfo.promptPart.trim() !== 'Account>' && !isAccountRelatedStage) {
                deps.accountStageRef.current = 'none' as any;
                deps.setAccountState(prev => ({
                    ...prev,
                    stage: 'none',
                    currentPrompt: undefined,
                    creationPrompt: undefined,
                    selectedMenuCommand: null,
                    selectedCharacter: null,
                    charSelectTab: null,
                    charCapture: null,
                    isGathering: false
                }));
                useUIStore.getState().setUI({ drawer: !deps.isMobile ? 'status' : 'none', isDrawerPeeking: false, mapExpanded: true });
                deps.setGameState('playing');
            }
        }

        const expectedCaptureType = normalizeStageToCaptureType(deps.captureStage.current) as any;
        // `/misc build <zone> list` rows are `[zone:room] ...`, which the prompt
        // parser mistakes for a bracket prompt (e.g. `[0:0]`). While the build-list
        // capture is expected or active, treat those rows as data, not boundaries.
        const isBuildListRow = (expectedCaptureType === 'shaper_live_build_list' ||
            capture.getActiveType() === 'shaper_live_build_list') &&
            /^\s*\[\d+:\d+\]/.test(textOnly);
        const isCaptureBoundary = !isBuildListRow &&
            (isPromptResolved || promptInfo.isMatch || isPromptBoundaryLine(textOnly));
        // While a live import runs, feed every output line to the dedicated
        // collector (it ignores `/at` teleport movement and resolves on the first
        // prompt after real content) instead of the fragile capture session.
        if (!isSnoop && useShaperLiveImportStore.getState().importing) {
            useShaperLiveImportStore.getState().collectLine(textOnly, isCaptureBoundary && !promptInfo.attachedText);
        }
        const archiveCaptureTypes = ['board_list', 'board_read', 'mail_list', 'mail_read', 'book_read'];
        const isArchiveCapture = archiveCaptureTypes.includes(expectedCaptureType) || archiveCaptureTypes.includes(capture.getActiveType());
        const captureAttachedText = (promptInfo as any).attachedText?.trim();
        const effectiveCaptureText = isArchiveCapture && captureAttachedText ? captureAttachedText : textOnly;
        const effectiveCaptureBoundary = isCaptureBoundary && !(isArchiveCapture && captureAttachedText);
        const shouldHidePendingSilentCapture = !isSnoop &&
            !effectiveCaptureBoundary &&
            capture.isPendingSilent() &&
            expectedCaptureType !== 'none';

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

        const accountParserLine = isAccountPhase ? redactAccountDisplayLine(lineToParse.trimEnd()) : textOnly;
        if (account.parseAccountLine(accountParserLine, isPromptResolved)) return;
        if (stat.parseCompactCombatInfo(textOnly)) return;
        if (stat.parseGlobalStatus(textOnly, lower)) msgType = 'info' as any;
        if (stat.parseDetailedScore(textOnly, lower)) msgType = 'info' as any;

        // --- Shop List Capture ---
        if (!isSnoop && !isAccountPhase) {
            const shopStore = useUIStore.getState();
            if (shopCaptureRef.current.active) {
                if (isCaptureBoundary) {
                    if (shopCaptureRef.current.items.length > 0) {
                        shopStore.setShopItems(shopCaptureRef.current.items);
                    }
                    shopCaptureRef.current = { active: false, items: [] };
                } else {
                    const m = textOnly.match(/^\s*(\d+)\.\s+(.+?)\s+up to\s+(.+?)(?:\s+<([^>]+)>)?\s*\.?\s*$/);
                    if (m) {
                        shopCaptureRef.current.items.push({
                            num: parseInt(m[1], 10),
                            name: m[2].trim(),
                            price: m[3].trim(),
                            vnum: m[4]
                        });
                        return;
                    } else if (textOnly.trim() === '' && shopCaptureRef.current.items.length > 0) {
                        shopStore.setShopItems(shopCaptureRef.current.items);
                        shopCaptureRef.current = { active: false, items: [] };
                    }
                }
            } else {
                const speakerMatch = textOnly.match(/^([A-Z][a-zA-Z\s\'-]+?)\s+(?:says|tells you|asks|whispers|says\s+to\s+you),?\s+['"]?(you can buy:|items? (?:for sale|matching)|\d+ items? for sale)/i);
                const isShopStart = 
                    /^you can buy:/i.test(lower) ||
                    /^items? (?:for sale|matching)/i.test(lower) ||
                    /^\d+ items? for sale/i.test(lower) ||
                    !!speakerMatch;

                if (isShopStart) {
                    let parsedShopkeeperName: string | null = null;
                    if (speakerMatch) {
                        parsedShopkeeperName = speakerMatch[1].trim();
                        const matchingNpc = deps.roomNpcs?.find(npc => 
                            npc.name?.toLowerCase() === parsedShopkeeperName!.toLowerCase()
                        );
                        if (matchingNpc) {
                            deps.registerEntity(`roomchars:${matchingNpc.id}`, matchingNpc.name, 'room', 'shopkeeper');
                        }
                    }
                    shopStore.setShopkeeperName(parsedShopkeeperName);
                    shopCaptureRef.current = { active: true, items: [] };
                    shopStore.setIsShopOpen(true);
                    return;
                }
            }

            // Parse 'info %r' money line while shop is open
            if (shopStore.isShopOpen) {
                const moneyMatch = textOnly.match(/^([\d,]+\s+gold coins?(?:,\s+[\d,]+\s+silver penn(?:ies|y))?(?:(?:,?\s+and\s+|,\s+)[\d,]+\s+copper penn(?:ies|y))?)\s*\.?\s*$/i);
                if (moneyMatch) {
                    shopStore.setShopBalance(moneyMatch[1].trim());
                }
            }
        }

        // Action Tracking (for manual inventory updates)
        actionTracker.trackAction(lineToParse, textOnly, lower);
        router.detectItemsInRoom(textOnly, lineToParse, false, {
            isRoomContext: isRoomDescription || /<room\b/i.test(lineToParse),
            expectedCaptureType: expectedCaptureBeforeTokenize
        });
        router.trackRoomItemAction(textOnly, lineToParse, false);

        // Play buy/sell sound on buy/sell notifications
        if (!isSnoop && (
            lower.includes('you now have a') ||
            lower.includes('you now have an') ||
            lower.includes('you sell a') ||
            lower.includes('you sell an')
        )) {
            deps.playBuySellSound?.();
        }
        
        // --- Capture Boundary Handling ---
        // Prompt lines end list-style captures and should never be stored as
        // drawer content. A new drawer header can also arrive before the previous
        // capture sees a prompt, so switch sessions at the header boundary.
        let skipCaptureAccumulation = effectiveCaptureBoundary;
        if (!isSnoop && effectiveCaptureBoundary && capture.hasSession()) {
            capture.finalizeSession();
        }

        const incomingCaptureType = !isSnoop && !effectiveCaptureBoundary && !isAccountPhase
            ? capture.checkTriggers(effectiveCaptureText, captureAttachedText)
            : null;
        if (incomingCaptureType && capture.hasSession() && incomingCaptureType !== capture.getActiveType()) {
            const activeType = capture.getActiveType();
            const isInfoSession = activeType === 'shaper_mob_info' || activeType === 'shaper_obj_info';
            const isStatTrigger = incomingCaptureType === 'shaper_mob_stat' || incomingCaptureType === 'shaper_obj_stat';
            if (!(isInfoSession && isStatTrigger)) {
                capture.finalizeSession();
            }
        }

        if (
            !isSnoop &&
            capture.hasSession() &&
            ['who', 'equipment', 'inventory', 'container'].includes(expectedCaptureType) &&
            expectedCaptureType !== capture.getActiveType()
        ) {
            capture.finalizeSession();
        }

        // --- Explicit Capture Bootstrap ---
        // Some MUME list commands do not always start with a stable header. If the
        // command middleware marked an expected capture type, begin on first output.
        const canStartExpectedCapture = (
            !isSnoop &&
            !effectiveCaptureBoundary &&
            !capture.hasSession() &&
            !incomingCaptureType &&
            canBootstrapExpectedCapture(expectedCaptureType)
        );
        if (canStartExpectedCapture) {
            capture.startSession(expectedCaptureType);
        }

        let finalTokens = derivedTokens;

        if (!isSnoop) {
            const seeAlsoMatch = textOnly.match(/^See also:\s*(.+?)\.?\s*$/i);
            if (seeAlsoMatch) {
                finalTokens = buildHelpTermTokens('See also: ', seeAlsoMatch[1], true);
            } else if (pendingHelpInterestRef.current && !promptInfo.isMatch && textOnly.trim().length > 0) {
                pendingHelpInterestRef.current = false;
                finalTokens = buildHelpTermTokens('', textOnly.trim(), false);
            } else if (/^Perhaps you were interested in one of the following:/i.test(textOnly)) {
                pendingHelpInterestRef.current = true;
            } else if (pendingHelpInterestRef.current && (promptInfo.isMatch || textOnly.trim().length === 0)) {
                pendingHelpInterestRef.current = false;
            }
        }

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
        if (!isSnoop) {
            parseEffectTimerLine(textOnly);
            parseActionTimerLine(textOnly);
        }
        if (time.parseTimeLine(lower)) msgType = 'info' as any;

        // --- Magic Sound Effects ---
        /*
        if (!isSnoop && lineToParse.toLowerCase().includes('<magic>')) {
            deps.playMagicExplosionSound();
        }
        */
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
        if (shouldHidePendingSilentCapture) {
            isVisible = false;
        }
        // A live Shaper import streams hundreds of god-command output lines; keep
        // them out of the log entirely (progress is shown in the Shaper topbar).
        if (!isSnoop && useShaperLiveImportStore.getState().importing) {
            isVisible = false;
        }

        if (isVisible) {
            const mid = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            let lineToConvert = isAccountPhase ? lineToParse.trimEnd() : lineToParse;
            if (isAccountPhase) {
                // Mirror the privacy redaction on the raw ANSI string so the
                // rendered HTML also hides the Host column from `list` output.
                lineToConvert = redactAccountDisplayLine(lineToConvert);
            }
            const ansiHtml = deps.ansiConvert.toHtml(lineToConvert);

            // Account phase: render raw ANSI HTML, no entity pipeline, no tokens.
            // ansi-to-html is configured with escapeXML:true so <name>/<sort>/etc. become &lt;name&gt;.
            let messageHtml: string;
            let messageTokens: any[] | undefined;
            if (isAccountPhase) {
                messageHtml = decodeAccountDisplayEntities(ansiHtml);
                messageTokens = undefined;
            } else {
                const messageObj = PipelineOrchestrator.processTextLine(lineToParse, ansiHtml, finalType, tokenizerContext, finalTokens);
                messageHtml = messageObj.html;
                messageTokens = messageObj.tokens;
            }

            const tokenizeFresh = (text: string) => {
                const freshTokenizer = Tokenizer.getInstance();
                freshTokenizer.reset('room');
                return freshTokenizer.tokenize(text, tokenizerContext);
            };

            const hasHitTag = lineToParse.includes('<hit>');
            const hasDamageTag = lineToParse.includes('<damage>');
            const hasAvoidDamageTag = lineToParse.includes('<avoid_damage>');
            const hasMissTag = lineToParse.includes('<miss>');
            const isRipMessage = !isSnoop && /\bis dead!\s*r\.?i\.?p/i.test(textOnly);
            if (!isSnoop && (hasHitTag || hasDamageTag)) {
                const eventTime = Date.now();
                if (hasHitTag) gmcpBus.emit('Game.CombatPulse', { direction: 'outgoing', time: eventTime });
                if (hasDamageTag) gmcpBus.emit('Game.CombatPulse', { direction: 'incoming', time: eventTime });
            }
            deps.addMessage(
                finalType, textOnly, undefined, mid, false,
                { textOnly, lower, html: messageHtml, tokens: messageTokens },
                undefined, undefined, undefined, false, 
                commResult.replyTarget, commResult.replyCommand, commResult.commSender, commResult.commAction, commResult.commText, commResult.commColor,
                commResult.commSender ? tokenizeFresh(commResult.commSender) : undefined,
                commResult.commText ? tokenizeFresh(commResult.commText) : undefined,
                undefined, hasHitTag, hasDamageTag, hasAvoidDamageTag, hasMissTag, undefined, isSnoop, undefined, isRipMessage
            );
        }

        gmcpBus.emit('Game.Text', { type: finalType, text: textOnly });

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, parseLogGmcp, actionTracker,
        deps.addMessage, deps.isNewbieMode, session.game, deps.groupMembers, deps.inlineCategories, deps.btn, session.vitals.target, deps.captureStage, deps.ansiConvert, deps.practiceHandler, capture, finalizeNearbyCapture,
        automator.addToQueue, automator.stopSpectatingName
    ]);

    return useMemo(() => ({
        processLine,
        finalizeCapture: capture.finalizeSession,
        setPendingFlags: capture.setPendingFlags,
        setLastRequestedContainerId: capture.setLastRequestedContainerId,
        addToQueue: automator.addToQueue,
        rotateQueue: automator.rotateQueue,
        removeFromQueue: automator.removeFromQueue
    }), [processLine, capture.finalizeSession, capture.setPendingFlags, capture.setLastRequestedContainerId, automator.addToQueue, automator.rotateQueue, automator.removeFromQueue]);
}
