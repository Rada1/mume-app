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
import { useLogGmcpParser } from './useLogGmcpParser';
import { occupantAnims, getOccupantKey, DIR_WORD_TO_CODE } from '../../components/Mapper/occupantAnimStore';

export function useGameParser(deps: UseGameParserDeps) {
    const { 
        mapperRef, btn, addMessage, playSound,        playHitImpactSound,
        playCommMessageSound,
        playTutorialExitSound,

        playIncantationSound,

        stopIncantationSound,
        playMagicExplosionSound,
        playRandomSound,
 playDoorSound, triggerHaptic, setStats, setWeather, setIsFoggy, 
        setLightningEnabled, setAbilities, setCharacterClass, 
        setInCombat, inCombatRef, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, 
        executeCommandRef, setInventoryLines, setStatsLines, setInfoLines, setQuestLines, setPracticeLines, setWhoLines, setWhereLines, setEqLines, setWhoList, setWhereList, setRoomItems, 
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        keywordOverrides, roomNameRef, roomDescRef, setRoomName, setRoomDesc, showDebugEchoes, addDiagnosticLog, popoverState, setPopoverState,
        setDiscoveredItems, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName,
        setBufferHealthStatus, setBufferName, setCharacterInfo, setQuests, quests,
        mumeEditState, setMumeEditState, isPlayersOpen, isInventoryOpen, isEquipmentOpen,
        triggerXpTicker, triggerHitFlash, triggerOppHitFlash, pendingGmcpCommRef, lastCommIdBySenderRef, groupMembers,
        shop, practice, registerEntity, setEntities, setPlayerPosition,
        isCharacterOpen, isStatsOpen,
        accountState, setAccountState, setGameState,
        isSpectateMode,
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName, setSpectateOpponentStatus,
        setSpectatePosition, setSpectateRoomName, setSpectateInCombat, setSpectateCharacterName,
        processMessageHtml
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
    const tutorialExitPlayedRef = useRef(false);
    const lastRoomChangeTimeRef = useRef(0);


    // Initialize Specialized Hooks
    const { finalizeCapture } = useStageManager({
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        addDiagnosticLog, addMessage,
        setPopoverState, setEqLines, setInventoryLines, registerEntity, setEntities,
        practice, shop, quests, finalizeQuests,
        tempEqRef, tempInvRef, tempEntitiesRef
    });

    const { parsePrompt } = usePromptParser({
        captureStage, setPlayerHealthStatus, setOpponentHealthStatus, setOpponentName,
        setBufferHealthStatus, setBufferName, setInCombat, finalizeCapture,
        isSpectateMode: deps.isSpectateMode,
        setStats, setSpectateStats, setSpectateHealthStatus,
        setSpectateOpponentName, setSpectateOpponentStatus, setSpectateInCombat
    });

    const { parseLogGmcp } = useLogGmcpParser({
        setSpectateStats, setSpectateHealthStatus, setSpectateOpponentName,
        setSpectateOpponentStatus, setSpectatePosition, setSpectateRoomName,
        setSpectateInCombat, setSpectateCharacterName, 
        setRoomPlayers: deps.setRoomPlayers, setRoomNpcs: deps.setRoomNpcs,
        setRoomName, setRoomDesc,
        characterName: deps.characterName,
        mapperRef,
        detectLighting: deps.detectLighting,
        setWeather: deps.setWeather,
        setIsFoggy: deps.setIsFoggy
    });

    const { checkCombatMatch, handleCombatExit, handleXpTicker } = useCombatParser({
        inCombatRef, setInCombat, setOpponentHealthStatus, setOpponentName, setCharacterInfo,
        triggerXpTicker, groupMembers, mapperRef, setDeathRoomId: deps.setDeathRoomId
    });

    const { parseGlobalStatus, parseDetailedScore } = useStatParser({
        setMood: deps.setMood, setStats, setCharacterInfo, inCombatRef, executeCommandRef, captureStage
    });

    const { detectRoom } = useRoomParser({
        roomNameRef, roomDescRef, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv, isDrawerCapture, isSilentCapture
    });

    const { parseAtmosphere } = useAtmosphereParser({
        setWeather, setIsFoggy, setLightningEnabled, triggerHaptic, playDoorSound, setPlayerPosition
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
        practice, quests, setCharacterInfo, setWhoList, setWhereList, setPopoverState, setStatsLines, setInfoLines, setQuestLines, setPracticeLines, setWhoLines, setWhereLines,
        finalizeCapture
    });

    const { routeMessage, determineVisibility, detectItemsInRoom } = useMessageRouter({
        captureStage, isSilentCapture, isDrawerCapture,
        isInventoryOpen, isEquipmentOpen, isCharacterOpen, isStatsOpen, isPlayersOpen,
        isWaitingForInv, isWaitingForEq, isWaitingForStats,
        setWhoList, setWhereList, setRoomItems, registerEntity, setCharacterInfo, setDiscoveredItems, extractNoun, ansiConvert,
        playerPosition: deps.playerPosition
    });

    const { parseAccountLine } = useAccountParser({
        accountState,
        setAccountState,
        gameState: deps.gameState,
        setGameState,
        sendCommand: (cmd: string) => executeCommandRef.current?.(cmd),
        executeCommandRef,
        isMobile: deps.isMobile,
        addDiagnosticLog
    });

    // --- Account / Prompt Watcher ---
    // This allows the Account Screen to trigger on the PROMPT (without newline)
    // so it's the "first thing" the user sees.
    useEffect(() => {
        if (!deps.activePrompt) return;
        // Only run if we aren't already in a game state
        if (deps.gameState !== 'playing') {
            const lines = deps.activePrompt.split('\n');
            lines.forEach((line, idx) => {
                parseAccountLine(line, idx === 0);
            });
        }
    }, [deps.activePrompt, deps.gameState, parseAccountLine]);
    
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

    const processLine = useCallback((line: string) => {
        let cleanLine = line.replace(/\r$/, '').normalize('NFC');
        // We no longer return early on empty lines to allow "compact off" (blank lines) to be visible.
        // This is crucial for properly rendering the game's spacing when compact mode is disabled.

        // --- Spectate Mode (Snoop & GMCP Parsing) ---
        const snoopRegex = /^((?:\x1b\[[0-9;]*m)*)&[a-zA-Z]\s/;
        const isSnoop = isSpectateMode && snoopRegex.test(cleanLine);
        
        if (isSpectateMode) {
            // Process GMCP state updates
            const wasGmcp = parseLogGmcp(cleanLine);
            if (wasGmcp) return null; // Hide GMCP data lines from the player's view

            // Snoop prefixes typically look like '&I ' or with ANSI: '\x1b[1;32m&I '
            // We strip the '&X ' part but preserve preceding ANSI codes
            if (isSnoop) {
                cleanLine = cleanLine.replace(snoopRegex, '$1');
            }
        }

        let textOnlyWithSpaces = cleanLine.replace(/\x1b\[[0-9;]*m/g, '');
        let textOnly = textOnlyWithSpaces;
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
            if (!attachedText) {
                if (isSpectateMode) {
                    // Only show the prompt if it was actually a snooped/spectated prompt.
                    // For our own character's prompts, we emit a blank line to preserve spacing/pacing.
                    if (isSnoop) {
                        addMessage('prompt', cleanLine, false);
                    } else {
                        addMessage('info', '', false);
                    }
                }
                return;
            }
            
            // If we have attached text on the SAME LINE as a prompt, we MUST process it.
            // If the attached text starts an 'info' capture, we need to capture it.
            initializeStage(attachedText, attachedText.toLowerCase(), attachedText, attachedText.toLowerCase(), attachedText);

            content = attachedText;
            contentLower = content.toLowerCase();
            cleanLine = cleanLine.replace(/^(?:\x1b\[[0-9;]*m)*[^>]*>/, '').trim();
            textOnly = attachedText;
            lower = attachedText.toLowerCase();
        }

        // --- Verbose Stat Parsing (standalone score line in spectate mode) ---
        // e.g. "70/98 hits, 75/130 mana, and 106/106 moves."
        // These lines in snoops usually have the &G prefix already stripped.
        // We only parse this if we're in spectate mode and the line is a snoop.
        if (isSnoop) {
            const verboseRegex = /(\d+)\/(\d+)\s+hits,?\s+(\d+)\/(\d+)\s+mana,?\s+and\s+(\d+)\/(\d+)\s+moves/i;
            const vm = textOnly.match(verboseRegex);
            if (vm) {
                setSpectateStats({
                    hp: parseInt(vm[1]),
                    maxHp: parseInt(vm[2]),
                    mana: parseInt(vm[3]),
                    maxMana: parseInt(vm[4]),
                    move: parseInt(vm[5]),
                    maxMove: parseInt(vm[6]),
                    wimpy: 0
                });
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
                    occupantAnims.set(key, { dir, type: 'exit', startTime: Date.now(), name, isPlayer: false });
                    mapperRef.current?.triggerRender?.();
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
                    occupantAnims.set(key, { dir, type: 'enter', startTime: Date.now(), name, isPlayer: false });
                    mapperRef.current?.triggerRender?.();
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

        const combatInfo = checkCombatMatch(lower);
        const isCombatMatch = combatInfo.isMatch;

        if (deps.isSpectateMode && lower.includes('(snooped)')) {
            const regexes = [
                /\(snooped\) .*?(?:hits|misses|wounds|pierces|smites|strikes|pounds|cleaves|dodges) (.*?)'s/,
                /\(snooped\) .*?(?:tries to hit) (.*?)[,\.]/,
                /(.*?) (?:fails to hit|hits|misses|wounds|pierces|smites|strikes|pounds|cleaves) .*? \(snooped\)/
            ];
            for (const r of regexes) {
                const m = lower.match(r);
                if (m) {
                    const opponentText = m[1];
                    let cleanName = opponentText.replace(/^(a|an|the) /, '');
                    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    deps.setOpponentName(cleanName);
                    deps.setOpponentHealthStatus('Healthy'); // Mock health
                    break;
                }
            }
        }

        if (combatInfo.isMatch && combatInfo.isImpact) {
            if (combatInfo.side === 'player') {
                playHitImpactSound?.();
                triggerOppHitFlash?.();
            } else if (combatInfo.side === 'opponent') {
                triggerHitFlash?.();
            }
        }

        // Check for Account/Login prompts
        if (parseAccountLine(line, false)) return;

        // --- Spell Casting Sounds ---
        // Only trigger for the player, not NPCs or other players
        if (lower.includes('you begin some strange incantations') || 
            lower.includes('you start to concentrate') || 
            lower.includes('you muster all of your concentration')) {
            playIncantationSound?.();
        }

        if (lower === 'ok.') {
            stopIncantationSound?.(true);
        } else if (lower.includes('lose your concentration') || 
                   lower.includes('lost your concentration') ||
                   lower.includes('stop your incantations') ||
                   lower.includes('are interrupted') ||
                   lower.includes('concentration is broken') ||
                   lower.includes('too dazed to concentrate') ||
                   lower.includes('too stunned to concentrate')) {
            stopIncantationSound?.(false);
        }

        // --- Tutorial Exit Sound ---
        // Note: only check the first part of the phrase — MUME wraps long lines at ~80 chars,
        // which splits "adventure concludes for now, for I must make haste to / Isengard" across
        // two separate processLine calls, so both conditions would never match simultaneously.
        if (!tutorialExitPlayedRef.current &&
            lower.includes('adventure concludes for now')) {
            tutorialExitPlayedRef.current = true;
            playTutorialExitSound?.();
        }



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
                if (textToParse.length > 0) {
                    parseQuestLine(textToParse);
                    setQuestLines((p: any) => [...p, { id: Math.random().toString(36).substring(7), text: textToParse, html: ansiConvert.toHtml(cleanLine) }]);
                }
                if (promptInfo.isEndPrompt && !attachedText) finalizeCapture();
                if (isDrawerCapture.current || isSilentCapture.current) return;
            }
            parseDetailedScore(textOnly, lower);
        }

        const { isRoomName, isRoomDescription } = detectRoom(textOnly, lower, cleanLine);

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
        parseAtmosphere(lower);

        if (['inv', 'eq', 'stat', 'container', 'practice', 'shop', 'shop-detail', 'info', 'whois', 'who', 'where'].includes(captureStage.current)) {
            if (captureStage.current === 'inv') {
                tempInvRef.current.push(...createLines(cleanLine, textOnly, lower, 'inventorylist'));
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) tempEqRef.current.push(...createLines(cleanLine, textOnly, lower, 'equipmentlist'));
            } else if (captureStage.current === 'practice') {
                if (textOnly.trim().length > 0) {
                    practice.parsePracticeLine(textOnly);
                    setPracticeLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
                }
            } else if (captureStage.current === 'who' || captureStage.current === 'where') {
                if (textOnly.trim().length > 0) {
                    const html = processMessageHtml ? processMessageHtml(ansiConvert.toHtml(cleanLine), 'players-line-' + Math.random(), false, captureStage.current === 'who' ? 'who-list' : 'where-list') : ansiConvert.toHtml(cleanLine);
                    const setter = captureStage.current === 'who' ? setWhoLines : setWhereLines;
                    setter(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html }]);
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
            } else if (captureStage.current === 'stat') {
                setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
            } else if (captureStage.current === 'info') {
                setInfoLines((p: any) => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
            }
        }

        trackAction(cleanLine, textOnly, lower);
        processTriggers(textOnly);

        const isImportantMessage = /hits you|receive your share|is dead|tells you|say,|group:|following/i.test(lower);
        // Room content (NPCs, exits, items) should be preserved even during silent captures.
        const isRoomContent = isRoomName || lower.startsWith('exits:') || lower.includes(' is here.') || lower.includes(' are here.');
        const shouldShow = determineVisibility(lower, isImportantMessage, isRoomContent, isRoomDescription, promptInfo.isEndPrompt);

        const commInfo = parseComm(line, textOnly, lower);
        if (commInfo.isSuppressed) return;

        let msgType = routeMessage(commInfo.msgType, textOnlyWithSpaces, lower, cleanLine, attachedText, isPromptMatch);
        if (isRoomDescription) msgType = 'room-description';
        detectItemsInRoom(textOnly, cleanLine, !shouldShow);

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
    }, [addMessage, setInventoryLines, setStatsLines, setPracticeLines, setWhoLines, setWhereLines, setEqLines, setWhoList, setWhereList, deps, processTriggers, roomNameRef, setPopoverState, finalizeCapture, parsePrompt, checkCombatMatch, handleCombatExit, handleXpTicker, parseGlobalStatus, parseDetailedScore, detectRoom, parseAtmosphere, trackAction, parseComm, createLines, resetNounCounts, resetContainerStack, practice, shop, quests, setCharacterInfo, setDiscoveredItems, executeCommandRef, captureStage, ansiConvert, extractNoun, initializeStage, determineVisibility, routeMessage, detectItemsInRoom, mumeEditState.isOpen, setMumeEditState]);

    return { processLine, finalizeCapture };
}
