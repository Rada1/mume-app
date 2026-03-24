/**
 * @file useGameParser.ts
 * @description Orchestrator hook that coordinates specialized sub-parsers to process game output.
 */

import { useRef, useCallback } from 'react';
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

export function useGameParser(deps: UseGameParserDeps) {
    const { 
        mapperRef, btn, addMessage, playSound, playRandomSound, triggerHaptic, setStats, setWeather, setIsFoggy, 
        setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, 
        setInCombat, inCombatRef, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, 
        executeCommandRef, setInventoryLines, setStatsLines, setEqLines, setWhoList, setWhereList, 
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        keywordOverrides, roomNameRef, showDebugEchoes, addDiagnosticLog, popoverState, setPopoverState,
        setDiscoveredItems, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName,
        setBufferHealthStatus, setBufferName, setCharacterInfo, setQuests, quests,
        mumeEditState, setMumeEditState, isPlayersOpen, isInventoryOpen, isEquipmentOpen,
        triggerXpTicker, pendingGmcpCommRef, lastCommIdBySenderRef, groupMembers,
        shop, practice, registerEntity, setEntities, playDoorSound, setPlayerPosition,
        isCharacterOpen, isStatsOpen
    } = deps;

    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef, playRandomSound });
    const { parseQuestLine, finalizeQuests } = useQuestsHandler(setQuests, quests.activeQuests);
    const { detectCapabilities, extractNoun } = useEntityRegistry();

    // Shared Buffers/Refs
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);
    const tempEntitiesRef = useRef<Record<string, GameEntity>>({});
    const counterRef = useRef(0);
    const shopPagerSeenRef = useRef(false);

    // Initialize Specialized Hooks
    const { finalizeCapture } = useStageManager({
        captureStage, isDrawerCapture, isSilentCapture, addDiagnosticLog, addMessage,
        setPopoverState, setEqLines, setInventoryLines, registerEntity, setEntities,
        practice, shop, quests, finalizeQuests,
        tempEqRef, tempInvRef, tempEntitiesRef
    });

    const { parsePrompt } = usePromptParser({
        captureStage, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName,
        setBufferHealthStatus, setBufferName, setInCombat, finalizeCapture
    });

    const { checkCombatMatch, handleCombatExit, handleXpTicker } = useCombatParser({
        inCombatRef, setInCombat, setOpponentHealthStatus, setOpponentName, setCharacterInfo,
        triggerXpTicker, groupMembers
    });

    const { parseGlobalStatus, parseDetailedScore } = useStatParser({
        setMood: deps.setMood, setStats, setCharacterInfo, inCombatRef, executeCommandRef, captureStage
    });

    const { detectRoom } = useRoomParser({
        roomNameRef, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isDrawerCapture, isSilentCapture
    });

    const { parseAtmosphere } = useAtmosphereParser({
        setWeather, setIsFoggy, setLightningEnabled, setRumble, triggerHaptic, playDoorSound, setPlayerPosition
    });

    const { trackAction } = useActionTracker({
        isSilentCapture, isDrawerCapture, setInventoryLines, setEqLines, setCharacterInfo, extractNoun, ansiConvert
    });

    const { parseComm } = useCommParser({
        pendingGmcpCommRef, lastCommIdBySenderRef
    });

    const { createLines, resetNounCounts, resetContainerStack } = useLineProcessor({
        captureStage, keywordOverrides, extractNoun, detectCapabilities, ansiConvert, addDiagnosticLog, tempEntitiesRef
    });

    const { initializeStage } = useStageInitializer({
        captureStage, isSilentCapture, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isPlayersOpen,
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState, setStatsLines,
        finalizeCapture
    });

    const { determineVisibility, routeMessage, detectItemsInRoom } = useMessageRouter({
        captureStage, isSilentCapture, isDrawerCapture,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        isWaitingForInv, isWaitingForEq, isWaitingForStats,
        setWhoList, setWhereList, setCharacterInfo, setDiscoveredItems, extractNoun, ansiConvert
    });

    const processLine = useCallback((line: string) => {
        let cleanLine = line.replace(/\r$/, '').normalize('NFC');
        if (!cleanLine) return;

        let textOnlyWithSpaces = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        let textOnly = textOnlyWithSpaces.trim();
        let lower = textOnly.toLowerCase();
        
        if (captureStage.current !== 'practice' && textOnly.trim().length > 0) {
            practice.parsePracticeLine(textOnly);
        }
        
        let content = textOnly.replace(/^([^\r\n>]{0,120}>)\s*/, '');
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
            if (!attachedText) return;
            content = attachedText;
            contentLower = content.toLowerCase();
            cleanLine = cleanLine.replace(/^(?:\x1b\[[0-9;]*m)*[^>]*>/, '').trim();
            textOnly = attachedText;
            lower = attachedText.toLowerCase();
        }

        initializeStage(textOnly, lower, content, contentLower, attachedText || undefined);

        const combatInfo = checkCombatMatch(lower);
        const isCombatMatch = combatInfo.isMatch;

        if (lower.includes('type %e on an empty line to save') || 
                 lower.includes('type %q to abandon') ||
                 /^(enter new |editing )\w+/i.test(textOnly)) {
            if (!mumeEditState.isOpen) {
                setMumeEditState({ isOpen: true, title: textOnly.trim(), text: '', key: 'text-editor' });
            }
        }

        parseGlobalStatus(content, contentLower);
        handleCombatExit(lower);
        handleXpTicker(lower);

        if (captureStage.current !== 'none') {
            if (captureStage.current === 'quest') {
                const textToParse = attachedText || textOnly;
                if (textToParse.length > 0) parseQuestLine(textToParse);
                if (promptInfo.isEndPrompt && !attachedText) finalizeCapture();
                return;
            }
            parseDetailedScore(textOnly, lower);
        }

        const isRoomName = detectRoom(textOnly, lower, cleanLine);

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

        if (captureStage.current === 'none') resetContainerStack();
        parseAtmosphere(lower);

        if (['inv', 'eq', 'stat', 'container', 'practice', 'shop', 'shop-detail'].includes(captureStage.current)) {
            if (captureStage.current === 'inv') {
                tempInvRef.current.push(...createLines(cleanLine, textOnly, lower, 'inventorylist'));
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) tempEqRef.current.push(...createLines(cleanLine, textOnly, lower, 'equipmentlist'));
            } else if (captureStage.current === 'practice') {
                if (textOnly.trim().length > 0) {
                    const skill = practice.parsePracticeLine(textOnly);
                    practice.addToLogBuffer(typeof skill === 'object' && 'name' in skill ? 'skill' : 'header', skill, cleanLine);
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
            } else {
                setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
            }
        }

        trackAction(cleanLine, textOnly, lower);
        processTriggers(textOnly);

        const isImportantMessage = /hits you|receive your share|is dead|tells you|say,|group:|following/i.test(lower);
        const shouldShow = determineVisibility(textOnly, lower, isImportantMessage, isRoomName, promptInfo.isEndPrompt);

        if (textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return to continue]')) {
            executeCommandRef.current?.('', true, true);
        }

        const commInfo = parseComm(line, textOnly, lower);
        if (commInfo.isSuppressed) return;

        const msgType = routeMessage(commInfo.msgType, textOnlyWithSpaces, lower, cleanLine, attachedText, isPromptMatch);
        detectItemsInRoom(textOnly, !shouldShow);

        let targetMid: string | undefined = undefined;
        if (msgType === 'comm-continue') {
            const senderKey = commInfo.commSender || commInfo.lastCommMsgIdRef.current?.split(':')[1] || 'last';
            targetMid = commInfo.lastCommIdBySenderRef?.current.get(senderKey) || commInfo.lastCommMsgIdRef.current || undefined;
        }

        if (shouldShow) {
            let finalRawText = cleanLine;
            if (isRoomName && !finalRawText.endsWith('\x1b[0m')) finalRawText += '\x1b[0m';
            const currentMid = msgType === 'comm-continue' ? targetMid! : `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`;
            if (msgType === 'comm' || commInfo.replyCommand) {
                commInfo.lastCommMsgIdRef.current = currentMid;
                commInfo.lastCommTimeRef.current = Date.now();
                if (commInfo.commSender && commInfo.lastCommIdBySenderRef) commInfo.lastCommIdBySenderRef.current.set(commInfo.commSender, currentMid);
            }
            addMessage(msgType, finalRawText, isCombatMatch, currentMid, isRoomName, { textOnly, lower }, undefined, undefined, undefined, false, commInfo.replyTarget, commInfo.replyCommand, commInfo.commSender, commInfo.commAction, commInfo.commText, commInfo.commColor, combatInfo.side);
        }

        if (promptInfo.isEndPrompt) finalizeCapture();
    }, [addMessage, setInventoryLines, setStatsLines, setEqLines, setWhoList, setWhereList, deps, processTriggers, roomNameRef, setPopoverState, finalizeCapture, parsePrompt, checkCombatMatch, handleCombatExit, handleXpTicker, parseGlobalStatus, parseDetailedScore, detectRoom, parseAtmosphere, trackAction, parseComm, createLines, resetNounCounts, resetContainerStack, practice, shop, quests, setCharacterInfo, setDiscoveredItems, executeCommandRef, captureStage, ansiConvert, extractNoun, initializeStage, determineVisibility, routeMessage, detectItemsInRoom, mumeEditState.isOpen, setMumeEditState]);

    return { processLine, finalizeCapture };
}
