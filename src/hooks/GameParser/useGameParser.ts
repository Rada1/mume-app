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
import { useSpellCompletionTracker } from './useSpellCompletionTracker';
import { buildPlayerLineTokens } from './playerLineTokens';
import { formatCombatLineTokens } from './combatLineTokens';
import { useUIStore } from '../../stores/useUIStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { getEndedEffectTimerEntry, parseEffectTimerLine } from '../../services/timers/effectTimerParser';
import { parseActionTimerLine } from '../../services/timers/actionTimerParser';
import { parseMagicKeyLine, upsertMagicKeyTarget } from '../../utils/magicKeyUtils';
import { parseResourceGainLine } from '../../utils/resourceGainUtils';
import { consumeTextMapperLine, createTextMapperState, extractXmlMovementDir } from './textMapperEvents';
import { useShaperLiveImportStore } from '../../shaper/import/useShaperLiveImportStore';
import { canBootstrapExpectedCapture } from './captureBootstrap';
import { consumeCommandCompletionSound } from '../../services/audio/commandCompletionSounds';
import { changesCombatStatsFromSpell } from '../../utils/spellCombatStatUtils';
import { parseShopVariant } from '../../utils/shopVariantParser';

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

const isWhereTableHeader = (text: string): boolean => {
    const clean = stripInlineMarkup(text).trim();
    return /^player\s+distance\s+direction\s+room$/i.test(clean);
};

const isWhereTableLine = (text: string): boolean => {
    const clean = stripInlineMarkup(text).trim();
    if (!clean) return false;
    if (isWhereTableHeader(clean)) return true;
    if (/^-{5,}$/.test(clean)) return true;
    if (/^(?:no-?one|nobody)\s+(?:is\s+)?(?:nearby|around|visible)/i.test(clean)) return true;
    return /^(?:[!*=+?~-]+\s*)?[A-Z\u00C0-\u00DE][\w\u00C0-\u00FF'`-]{1,20}[*!~]?\s{2,}.+/.test(clean);
};

const createWhereLine = (
    rawText: string,
    ansiConvert: any,
    registerEntity?: (id: string, name: string, location: any, category?: string) => void
): DrawerLine => {
    const text = stripInlineMarkup(rawText).trimEnd();
    const isHeader = isWhereTableHeader(text) || /^-{5,}$/.test(text.trim());
    return {
        id: `where-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: text.trim(),
        rawText,
        html: ansiConvert.toHtml(text),
        tokens: isHeader ? [{ type: 'text', content: text }] : (buildPlayerLineTokens(text, registerEntity) || [{ type: 'text', content: text }]),
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
    const nearbyCaptureRef = useRef<{ active: boolean; isSilent: boolean; lines: DrawerLine[] }>({ active: false, isSilent: false, lines: [] });
    const shopCaptureRef = useRef<{ active: boolean; items: import('../../types').ShopItem[] }>({ active: false, items: [] });
    const shopVariantCaptureRef = useRef<import('../../types').ShopVariant[]>([]);
    const shopVariantLineRef = useRef<string | null>(null);
    const pendingHelpInterestRef = useRef(false);
    const pendingCommXmlRef = useRef<{ tag: string; line: string; isSnoop: boolean } | null>(null);
    const textMapperStateRef = useRef(createTextMapperState());
    const finalizeNearbyCapture = useCallback(() => {
        if (!nearbyCaptureRef.current.active) return;
        setWhereLines([...nearbyCaptureRef.current.lines]);
        nearbyCaptureRef.current = { active: false, isSilent: false, lines: [] };
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
        playEffect: deps.playEffect,
        playArrowHitSound: deps.playArrowHitSound,
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

    const refreshEquipmentCombatStats = useCallback(() => {
        // Equipment changes affect the prompt's OB, DB, PB, and armour values.
        // Request the same compact info payload used after a mood change.
        deps.executeCommandRef.current?.('info %O %D %k %A', false, true, true, false);
    }, [deps.executeCommandRef]);

    const actionTracker = useActionTracker({
        capture,
        setInventoryLines: sessionSetInventoryLines,
        setEqLines: sessionSetEqLines,
        setCharacterInfo,
        extractNoun,
        ansiConvert: deps.ansiConvert,
        onWear: () => {
            deps.playWearSound();
            refreshEquipmentCombatStats();
        },
        onRemove: () => {
            deps.playRemoveSound();
            refreshEquipmentCombatStats();
        },
        onGet: () => deps.playEffect?.('get'),
        onDrop: () => deps.playEffect?.('drop')
    });

    const spellCompletion = useSpellCompletionTracker({
        playIncantationSound: deps.playIncantationSound,
        playEffect: deps.playEffect
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
        playEffect: deps.playEffect,
        setPlayerPosition,
        setIsRiding,
        refreshCombatStats: refreshEquipmentCombatStats,
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
            lineToParse = `${pendingCommXml.line}${lineToParse}`;
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

        // Command feedback belongs to the reply, not the outgoing command. A MUME
        // prompt is the reliable boundary that marks that reply as complete.
        if (!isSnoop && isEndPromptLine) {
            const completionEffect = consumeCommandCompletionSound();
            if (completionEffect && deps.isSoundEnabledRef.current) deps.playEffect(completionEffect);
        }

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
        if (!isSnoop || deps.isSpectateMode) {
            const cleanLower = stripAnsiCodes(lineToParse)
                .replace(/<[^>]+>|&lt;[^&]+&gt;/g, '')
                .toLowerCase()
                .trim();
            if (!cleanLower.startsWith('you ') && !cleanLower.startsWith("you're ") && !cleanLower.startsWith("you've ")) {
                const hasCharTag = /<character>|&lt;character/i.test(lineToParse);
                const isEnter = (hasCharTag && (cleanLower.includes(' arrived from ') || cleanLower.includes(' arrives from ') || cleanLower.includes(' rides in from '))) ||
                    /\b(arrived\s+from|arrives\s+from|rides\s+in\s+from)\b/i.test(cleanLower);
                const isExit = (hasCharTag && (/\bleaves\b/i.test(cleanLower) || cleanLower.includes(' flees ') || cleanLower.includes(' fled ') || cleanLower.includes(' rides '))) ||
                    /\b(leaves|flees|fled|rides)\s+(north|south|east|west|up|down|towards|into|to the)\b/i.test(cleanLower);

                if (isEnter) {
                    deps.playEffect?.('enter', { skipJitter: true });
                } else if (isExit) {
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
        const isWhereCapture = !isSnoop && (
            activeCapture === 'where' ||
            expectedCaptureBeforeTokenize === 'where' ||
            nearbyCaptureRef.current.active ||
            isWhereTableHeader(lineToParse)
        );
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
                currentOccupants: [
                    ...Object.values(useRoomStore.getState().chars || {}),
                    ...(Array.isArray(deps.roomPlayers) ? deps.roomPlayers : []),
                    ...(Array.isArray(deps.roomNpcs) ? deps.roomNpcs : []),
                    ...Object.values(deps.entitiesRef.current || {})
                        .filter(e => e.capabilities.includes(EntityCapability.Npc))
                        .map(e => ({ id: e.id, name: e.name, type: 'npc' as const }))
                ],
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

        // Practice confirmations arrive after the practice-list capture has closed,
        // so the live line stream is the reliable place to trigger this effect.
        if (!isSnoop && /You took \d+ out of \d+ sessions?.*knowledge is now \d+%/i.test(textOnly)) {
            deps.playEffect('practice');
        }

        if (!isSnoop) {
            const magicTarget = parseMagicKeyLine(textOnly, deps.roomNameRef.current, useRoomStore.getState().roomZone);
            if (magicTarget) {
                const settings = useSettingsStore.getState();
                settings.setTeleportTargets(upsertMagicKeyTarget(settings.teleportTargets, magicTarget));
            }
        }

        // 2. Room Detection & Trigger Processing
        const isImportant = lineToParse.includes('\x1b[1m') || lineToParse.includes('\x1b[33m');
        const isRoom = lineToParse.includes('\x1b[32m') && textOnly.startsWith('  ');
        const isRoomDescription = isRoom && textOnly.length > 5;
        const roomType = isSnoop ? null : room.parseRoomLine(textOnly, lineToParse, isSnoop);
        const isEffectivelyRoomDesc = isRoomDescription || roomType === 'room-description';

        // 1. System/Trigger Processing (skip sound triggers for room descriptions)
        processTriggers(lineToParse, isEffectivelyRoomDesc);

        const isEndPrompt = textOnly.includes('>') || textOnly.includes(':');

        let isVisible = router.determineVisibility(lower, isImportant, isRoom, isRoomDescription, isEndPrompt, deps.isNewbieMode, lineToParse, undefined, isSnoop);
        
        // 3. Sub-Parser Dispatch
        let msgType: MessageType = 'game';
        const resourceGain = parseResourceGainLine(textOnly);
        
        const combatType = isEffectivelyRoomDesc ? null : combat.parseCombatLine(textOnly, lineToParse, isSnoop);
        if (combatType) msgType = combatType;

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

        // Nearby capture records the `where` table for the Nearby roster drawer tab.
        // When triggered silently (e.g. from drawer refresh), it suppresses lines from the log.
        // When triggered manually (e.g. user typed `where`), lines flow to the log with inline ally buttons.
        const isWhereStart = isWhereTableHeader(textOnly);
        if (!isSnoop && (nearbyCaptureRef.current.active || expectedCaptureType === 'where' || isWhereStart)) {
            if (isCaptureBoundary) {
                finalizeNearbyCapture();
            } else if (isWhereTableLine(textOnly)) {
                if (!nearbyCaptureRef.current.active) {
                    const isSilent = capture.isPendingSilent();
                    nearbyCaptureRef.current = { active: true, isSilent, lines: [] };
                    if (isSilent) {
                        capture.clearPendingFlags();
                    }
                }
                nearbyCaptureRef.current.lines.push(createWhereLine(lineToParse, deps.ansiConvert, registerEntity));
                if (nearbyCaptureRef.current.lines.length >= 40) {
                    finalizeNearbyCapture();
                }
                if (nearbyCaptureRef.current.isSilent) {
                    return;
                }
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
            const variantProduct = shopStore.shopVariantRequest;
            if (variantProduct !== null) {
                const candidate = shopVariantLineRef.current
                    ? `${shopVariantLineRef.current} ${textOnly.trim()}` : textOnly;
                const variant = parseShopVariant(candidate);
                if (variant) {
                    if (/\band$/i.test(variant.price)) {
                        shopVariantLineRef.current = candidate;
                    } else {
                        shopVariantCaptureRef.current.push(variant);
                        shopVariantLineRef.current = null;
                    }
                    return;
                }
                if (isCaptureBoundary || (textOnly.trim() === '' && shopVariantCaptureRef.current.length > 0)) {
                    shopStore.setShopVariants(variantProduct, shopVariantCaptureRef.current);
                    shopStore.setShopVariantRequest(null);
                    shopVariantCaptureRef.current = [];
                    shopVariantLineRef.current = null;
                }
            }
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
        if (!isSnoop && !isEffectivelyRoomDesc && (
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
        if (!isSnoop && effectiveCaptureBoundary) {
            if (capture.hasSession()) {
                capture.finalizeSession();
            } else if (['whois', 'examine', 'consider'].includes(expectedCaptureType)) {
                const uiStore = useUIStore.getState();
                const currentPopover = uiStore.popoverState;
                if (currentPopover?.isCapturingWhois && expectedCaptureType === 'whois') {
                    uiStore.setPopoverState({
                        ...currentPopover,
                        capturedWhoisLines: [],
                        isCapturingWhois: false
                    });
                } else if (currentPopover?.isCapturingExamine && expectedCaptureType === 'examine') {
                    uiStore.setPopoverState({
                        ...currentPopover,
                        capturedExamineLines: [],
                        isCapturingExamine: false
                    });
                } else if (currentPopover?.isCapturingConsider && expectedCaptureType === 'consider') {
                    uiStore.setPopoverState({
                        ...currentPopover,
                        capturedConsiderLines: [],
                        isCapturingConsider: false
                    });
                }
            }
            capture.clearPendingFlags?.();
            if (deps.captureStage.current !== 'none') {
                deps.captureStage.current = 'none' as any;
            }
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

        // Build player tokens for 'who' and 'where' in the main parser.
        if (!isSnoop && (activeCapture === 'who' || nearbyCaptureRef.current.active || expectedCaptureType === 'where')) {
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
        if ((!isSnoop || deps.isSpectateMode) && /^(?:you are hungry|you are thirsty)\.$/i.test(textOnly.trim())) {
            deps.playEffect?.('hungrythirsty');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            textOnly.includes('You finish gathering the wood into a pile and set it on fire.') ||
            textOnly.includes('You put some wood in the fire.')
        )) {
            deps.playEffect?.('campfire');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('alas, you cannot go that way') || 
            lower.includes('arglebargle, glop-glyf') || 
            lower.startsWith("you don't have any") || 
            lower.includes('seems to be closed') ||
            lower.includes('seems to be too large') ||
            lower.includes('seems to be too small')
        )) {
            deps.playEffect?.('error');
        }
        if ((!isSnoop || deps.isSpectateMode) && (lower.includes('your spell backfired') || lower.includes('mispronounced the magical words') || lower.includes('spell backfired'))) {
            deps.playEffect?.('backfire');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.includes('you carefully examine the ground around you, looking for tracks')) {
            deps.playEffect?.('tracking');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.startsWith('you wear ') || lower.includes('you wear ') ||
            lower.startsWith('you cover your ') || lower.includes('you cover your ') ||
            lower.startsWith('you place ') || lower.startsWith('you put on ')
        )) {
            deps.playEffect?.('wear');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.startsWith('you eat ')) {
            deps.playEffect?.('eat');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.startsWith('you drink ')) {
            deps.playEffect?.('drink');
        }
        if ((!isSnoop || deps.isSpectateMode) && /\bgives\s+you\b/i.test(lower)) {
            deps.playEffect?.('get');
        }
        if ((!isSnoop || deps.isSpectateMode) && (lower.startsWith('you put ') || lower.includes('you put '))) {
            deps.playEffect?.('drop');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.includes('bash at ') && lower.includes('sends') && lower.includes('sprawling')) {
            deps.playEffect?.('bash');
        }
        if ((!isSnoop || deps.isSpectateMode) && (lower === 'you stored it.' || lower.includes('your mind is too full to store it') || lower.includes('stored it.'))) {
            deps.playEffect?.('magiccomplete');
        }
        if ((!isSnoop || deps.isSpectateMode) && /the lightning bolts?\s+hits?\b.*with full impact/i.test(lower)) {
            deps.playEffect?.('lightningbolt');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            (lower.includes('energy in') && lower.includes('legs') && lower.includes('refresh')) ||
            lower.includes('energy begins to flow within')
        )) {
            deps.playEffect?.('bob');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.includes('the earth trembles beneath your feet')) {
            deps.playEffect?.('earthquake');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('you begin to feel the light of aman shine upon you') ||
            lower.includes('you feel a renewed light shine upon you')
        )) {
            deps.playEffect?.('bless');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.includes('scratches and bruises disappear')) {
            deps.playEffect?.('curelight');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.includes('scars fade away and a feeling of health comes over you')) {
            deps.playEffect?.('cureserious');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('you start glowing') ||
            lower.includes('glows brightly') ||
            lower.includes('starts to glow')
        )) {
            deps.playEffect?.('sanctuary');
        }
        if ((!isSnoop || deps.isSpectateMode) && lower.includes('a warm feeling fills your body')) {
            deps.playEffect?.('heal');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('blue transparent shield') ||
            lower.includes('magic armour is revitalised') ||
            lower.includes('magic armor is revitalised')
        )) {
            deps.playEffect?.('armour');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('has been kicked out of the group') ||
            lower.includes('kicked out of the group')
        )) {
            deps.playEffect?.('ungroup');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('is now a group member')
        )) {
            deps.playEffect?.('group');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('you feel protected') ||
            lower.includes('protection is revitalised') ||
            lower.includes('protection is revitalized')
        )) {
            deps.playEffect?.('shield');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('you feel less protected') ||
            lower.includes('less protected')
        )) {
            deps.playEffect?.('affectdown');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('surrounded by a misty shroud') ||
            lower.includes('misty shroud')
        )) {
            deps.playEffect?.('shroud');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('sensitive of magical auras') ||
            lower.includes('sensitive to magical auras') ||
            lower.includes('magical auras')
        )) {
            deps.playEffect?.('detectmagic');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.includes('crackle of thunder') ||
            lower.includes('thunder in the distance')
        )) {
            deps.playEffect?.('thunderrumble', { filterFrequency: 500 });
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.startsWith('you found ') || lower.includes('you found ') ||
            lower.startsWith('you dig up ') || lower.includes('you dig up ') ||
            lower.includes('you have finished mixing') ||
            lower.includes('you produced ')
        )) {
            deps.playEffect?.('reveal');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.startsWith('you sell ') || lower.includes('you sell ') ||
            (lower.includes('here you have ') && lower.includes(' for that')) ||
            (lower.includes('i can offer ') && lower.includes(' for that'))
        )) {
            deps.playEffect?.('sell');
        }
        if ((!isSnoop || deps.isSpectateMode) && (
            lower.startsWith('you buy ') || lower.includes('you buy ') ||
            lower.includes("that'll be ") ||
            lower.includes('that will be ') ||
            lower.includes('there you are') ||
            lower.includes('they should be done shortly') ||
            lower.includes("i'll be forced to sell")
        )) {
            deps.playEffect?.('buy');
        }
        if (!isSnoop) {
            const endedEffect = getEndedEffectTimerEntry(textOnly);
            parseEffectTimerLine(textOnly);
            if (endedEffect) {
                const currentAffects = session.vitals.characterInfo.affectedBy || [];
                setCharacterInfo({
                    affectedBy: currentAffects.filter(affect => affect.trim().toLowerCase() !== endedEffect.name.toLowerCase())
                });
            }
            parseActionTimerLine(textOnly);
            if (changesCombatStatsFromSpell(textOnly)) refreshEquipmentCombatStats();
        }
        if (time.parseTimeLine(lower)) msgType = 'info' as any;

        // --- Magic Sound Effects ---
        /*
        if (!isSnoop && lineToParse.toLowerCase().includes('<magic>')) {
            deps.playMagicExplosionSound();
        }
        */
        let isMagicRipple = false;
        if (!isEffectivelyRoomDesc) {
            isMagicRipple = !!spellCompletion.handleSpellLine(textOnly, lower, isSnoop);
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
            if (finalType === 'weather' && (!isSnoop || deps.isSpectateMode)) {
                deps.playEffect?.('weather');
            }
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
                const hasAvoidOrMissTag = lineToParse.includes('<avoid_damage>') || lineToParse.includes('<miss>');
                const hasHitOrDamageTag = lineToParse.includes('<hit>') || lineToParse.includes('<damage>');
                const isCombatOrAvoid = hasAvoidOrMissTag || hasHitOrDamageTag;
                const isHitOrDamage = hasAvoidOrMissTag ? false : (hasHitOrDamageTag ? true : undefined);
                messageTokens = (isCombatOrAvoid && messageObj.tokens)
                    ? formatCombatLineTokens(messageObj.tokens, isHitOrDamage)
                    : messageObj.tokens;
                messageHtml = messageObj.html;
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
            const isRipMessage = (!isSnoop || deps.isSpectateMode) && /\bis dead!\s*r\.?i\.?p/i.test(textOnly);
            if (!isSnoop && (hasHitTag || hasDamageTag)) {
                const eventTime = Date.now();
                if (hasHitTag) gmcpBus.emit('Game.CombatPulse', { direction: 'outgoing', time: eventTime });
                if (hasDamageTag) gmcpBus.emit('Game.CombatPulse', { direction: 'incoming', time: eventTime });
            }
            deps.addMessage(
                finalType, textOnly, finalType === 'combat', mid, finalType === 'room-name',
                { textOnly, lower, html: messageHtml, tokens: messageTokens },
                undefined, undefined, undefined, false, 
                commResult.replyTarget, commResult.replyCommand, commResult.commSender, commResult.commAction, commResult.commText, commResult.commColor,
                commResult.commSender ? tokenizeFresh(commResult.commSender) : undefined,
                commResult.commText ? tokenizeFresh(commResult.commText) : undefined,
                undefined, hasHitTag, hasDamageTag, hasAvoidDamageTag, hasMissTag,
                undefined, isSnoop, undefined, isRipMessage, commResult.isSocial, resourceGain || undefined,
                isMagicRipple
            );
            if ((!isSnoop || deps.isSpectateMode) && commResult.isSocial) {
                deps.playEffect?.('social');
            }

            if (!isSnoop && finalType === 'prompt') {
                const parts: string[] = [];
                const playerCount = Array.isArray(deps.roomPlayers) ? deps.roomPlayers.filter(Boolean).length : 0;
                const npcCount = Array.isArray(deps.roomNpcs) ? deps.roomNpcs.filter(Boolean).length : 0;
                const itemCount = Array.isArray(deps.roomItems) ? deps.roomItems.filter(Boolean).length : 0;

                if (playerCount > 0) {
                    parts.push(`[Player: ${playerCount}]`);
                }
                if (npcCount > 0) {
                    parts.push(`[NPC: ${npcCount}]`);
                }
                if (itemCount > 0) {
                    parts.push(`[Object: ${itemCount}]`);
                }

                if (parts.length > 0) {
                    const entitiesText = parts.join('');
                    const entitiesMid = `entities-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    
                    deps.addMessage(
                        'game',
                        entitiesText,
                        undefined,
                        entitiesMid,
                        false,
                        { textOnly: entitiesText, lower: entitiesText.toLowerCase(), html: entitiesText },
                        undefined, undefined, undefined, false,
                        undefined, undefined, undefined, undefined, undefined, undefined,
                        undefined, undefined, undefined, false, false, false, false,
                        undefined, false, undefined, false, undefined, undefined
                    );
                }
            }
        }

        gmcpBus.emit('Game.Text', { type: finalType, text: textOnly });

    }, [
        processTriggers, router, combat, room, account, stat, atmosphere, time, parseLogGmcp, actionTracker,
        deps.addMessage, deps.isNewbieMode, session.game, deps.groupMembers, deps.inlineCategories, deps.btn, session.vitals.target, deps.captureStage, deps.ansiConvert, deps.practiceHandler, capture, finalizeNearbyCapture,
        automator.addToQueue, automator.stopSpectatingName, deps.roomPlayers, deps.roomNpcs, deps.roomItems
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
