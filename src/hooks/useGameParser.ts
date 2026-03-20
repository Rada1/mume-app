import { useState, useRef, useCallback } from 'react';
import { GameStats, DrawerLine, GameAction, MessageType, PopoverState, CaptureStage, CombatHealthStatus, QuestData } from '../types';
import { ansiConvert } from '../utils/ansi';
import { extractNoun, isItemContainer } from '../utils/gameUtils';
import { useTriggerProcessor } from './useTriggerProcessor';
import { useShopHandler } from './useShopHandler';
import { usePracticeHandler } from './usePracticeHandler';
import { useQuestsHandler } from './useQuestsHandler';

export interface UseGameParserDeps {
    isItemsOpen: boolean; isCharacterOpen: boolean; isStatsOpen: boolean; isPlayersOpen: boolean; mapperRef: React.RefObject<any>;
    btn: { buttonsRef: React.RefObject<any[]>; setButtons: React.Dispatch<React.SetStateAction<any[]>>; buttonTimers: React.RefObject<Record<string, ReturnType<typeof setTimeout>>>; setActiveSet: (setId: string) => void; };
    addMessage: (type: any, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, skipBrevity?: boolean, replyTarget?: string, replyCommand?: string, commSender?: string, commAction?: string, commText?: string, commColor?: string) => void;
    pendingGmcpCommRef?: React.MutableRefObject<{ sender: string; chan: string; msg?: string } | null>;
    playSound: (buffer: AudioBuffer) => void; triggerHaptic: (ms: number) => void;
    setWeather: (val: any) => void; setIsFoggy: (val: boolean) => void;
    setStats: (val: GameStats | ((prev: GameStats) => GameStats)) => void;
    setAbilities: (val: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    setCharacterClass: (val: any) => void; setRumble: (val: boolean) => void;
    setHitFlash: (val: boolean) => void; setDeathStage: (val: any) => void;
    setInCombat: (val: boolean, force?: boolean) => void;
    inCombatRef: React.RefObject<boolean>;
    setLightningEnabled: (val: boolean) => void;
    setPlayerPosition: (val: string) => void; detectLighting: (light: string) => void;
    setCurrentTerrain?: (terrain: string) => void;
    setMood: (val: string) => void;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferName: (val: string | null) => void;
    isSoundEnabledRef: React.RefObject<boolean>; soundTriggersRef: React.RefObject<any[]>;
    actionsRef: React.RefObject<GameAction[]>;
    executeCommandRef: React.RefObject<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>;
    setCharacterInfo: (val: import('../types').CharacterInfo | ((prev: import('../types').CharacterInfo) => import('../types').CharacterInfo)) => void;
    characterInfo: import('../types').CharacterInfo;
    setInventoryLines: React.Dispatch<React.SetStateAction<import('../types').DrawerLine[]>>;
    setStatsLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setEqLines: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setWhoList: React.Dispatch<React.SetStateAction<string[]>>;
    setWhereList: React.Dispatch<React.SetStateAction<import('../types').WhereEntry[]>>;
    captureStage: React.MutableRefObject<CaptureStage>;
    practice: ReturnType<typeof usePracticeHandler>;
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    roomNameRef: React.RefObject<string | null>;
    roomName: string | null;
    showDebugEchoes?: boolean;
    addDiagnosticLog?: (msg: string) => void;
    popoverState: PopoverState | null;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    pendingDrawerContainerRef?: React.MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;
    setDiscoveredItems: React.Dispatch<React.SetStateAction<string[]>>;
    setQuests: (val: QuestData | ((prev: QuestData) => QuestData)) => void;
    quests: QuestData;
    mumeEditState: { isOpen: boolean; title: string; text: string; key: string };
    setMumeEditState: React.Dispatch<React.SetStateAction<{ isOpen: boolean; title: string; text: string; key: string }>>;
    shop: ReturnType<typeof useShopHandler>;
    triggerXpTicker?: () => void;
}

export function useGameParser(deps: UseGameParserDeps) {
    const { mapperRef, btn, addMessage, playSound, triggerHaptic, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, inCombatRef, detectLighting, isSoundEnabledRef, soundTriggersRef, actionsRef, executeCommandRef, setInventoryLines, setStatsLines, setEqLines, setWhoList, setWhereList, captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, roomNameRef, showDebugEchoes, addDiagnosticLog, popoverState, setPopoverState, setDiscoveredItems, setPlayerHealthStatus, setOpponentHealthStatus,    setOpponentName,
    setBufferHealthStatus,
    setBufferName,
    setCharacterInfo,
    setQuests,
    quests,
    mumeEditState,
    setMumeEditState,
    isPlayersOpen,
    triggerXpTicker,
    pendingGmcpCommRef
} = deps;

    const { processTriggers } = useTriggerProcessor({ ...deps, buttonsRef: btn.buttonsRef, setButtons: btn.setButtons, buttonTimers: btn.buttonTimers, setActiveSet: btn.setActiveSet, actionsRef, executeCommandRef });
    const { parseShopLine, finalizeShop } = deps.shop;
    const { parseQuestLine, finalizeQuests, isQuestsActive, isDetailActive } = useQuestsHandler(setQuests, quests.activeQuests);

    const containerStackRef = useRef<{ depth: number, noun: string, context: string, stableId: string }[]>([]);
    const nounCountsRef = useRef<Record<string, number>>({});
    const counterRef = useRef(0);
    const tempEqRef = useRef<DrawerLine[]>([]);
    const tempInvRef = useRef<DrawerLine[]>([]);
    const shopPagerSeenRef = useRef(false);
    const ignoredCommBufferRef = useRef<string | null>(null);
    const lastCommMsgIdRef = useRef<string | null>(null);
    const lastCommTimeRef = useRef<number>(0);

    const finalizeCapture = useCallback((targetStage?: CaptureStage) => {
        const currentStage = captureStage.current as CaptureStage;
        if (currentStage === 'none') return false;
        
        // If targetStage is provided, only finalize if we match
        if (targetStage && currentStage !== targetStage) return false;

        const stagesToTerminate: CaptureStage[] = ['who', 'where', 'inv', 'eq', 'stat', 'container', 'shop', 'shop-detail', 'practice', 'description', 'whois', 'info', 'quest'];
        if (stagesToTerminate.includes(currentStage)) {
            const eqLen = tempEqRef.current.length;
            const invLen = tempInvRef.current.length;
            
            console.log(`[Parser] Finalizing ${currentStage} capture. Buffers: eq=${eqLen}, inv=${invLen}`);
            addDiagnosticLog?.(`Finalizing ${currentStage} capture. Eq: ${eqLen}, Inv: ${invLen}`);
            
            if (currentStage === 'practice') {
                console.log('[Parser] Practice capture complete. Finalizing...');
                // Don't flush practice lines to the log if the character drawer is open
                // (isDrawerCapture or isSilentCapture indicate drawer-triggered or character-open context)
                const suppressPracticeLog = isDrawerCapture.current > 0 || isSilentCapture.current > 0 || deps.practice.silentSyncPendingRef.current;
                deps.practice.finalizePractice(
                    suppressPracticeLog ? undefined : addMessage, 
                    suppressPracticeLog ? undefined : setPopoverState
                );
                deps.practice.setIsPracticeActive(false);
                deps.practice.setIsUiRequested(false);
            } else if (currentStage === 'shop') {
                deps.shop.finalizeShop(addMessage, setPopoverState);
            } else if (currentStage === 'shop-detail') {
                deps.shop.finalizeShopDetail(setPopoverState);
            } else if (currentStage === 'quest') {
                finalizeQuests();
            } else if (currentStage === 'eq') {
                setEqLines([...tempEqRef.current]);
                tempEqRef.current = [];
            } else if (currentStage === 'inv') {
                setInventoryLines([...tempInvRef.current]);
                tempInvRef.current = [];
            }
            
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            // Decrement silent capture instead of resetting to 0 to support multiple concurrent background commands
            if (isSilentCapture.current > 0) isSilentCapture.current--;
            return true;
        }
        return false;
    }, [addDiagnosticLog, setEqLines, setInventoryLines, captureStage, isDrawerCapture, isSilentCapture, deps.practice, deps.shop, addMessage, setPopoverState]);

    const processLine = useCallback((line: string) => {

        let cleanLine = line.replace(/\r$/, '').normalize('NFC');
        if (!cleanLine) return;

        // Perform ANSI stripping ONCE here and reuse the result everywhere.
        let textOnly = cleanLine.replace(/\x1b\[[0-9;]*m/g, '').trim();
        let lower = textOnly.toLowerCase();
        
        // Always check for practice updates/sessions if not actively in a practice capture listing
        if (captureStage.current !== 'practice' && textOnly.trim().length > 0) {
            deps.practice.parsePracticeLine(textOnly);
        }
        
        // Strip prompt prefix for detection
        let content = textOnly.replace(/^([^\r\n>]{0,120}>)\s*/, '');
        let contentLower = content.toLowerCase();

        const currentRoomName = roomNameRef.current;
        const textOnlyRaw = textOnly;
        const lowerRaw = lower;
        

        // Optimized Prompt and End Determination (Avoid nested quantifiers to prevent backtracking)
        const promptRegex = /^([^\r\n>]{0,120}>)\s*/;
        const textPMatch = textOnly.match(promptRegex);
        let attachedText = '';
        if (textPMatch) {
            attachedText = textOnly.slice(textPMatch[0].length).trim();
        }

        const isEndPrompt = (!!textPMatch && !attachedText && !['practice', 'who', 'shop', 'where', 'quest', 'stat', 'info', 'whois', 'description'].includes(captureStage.current as any)) || 
            (/^((?:(?:\[.*?\]|[\*\)\!oO\.\[f%\~+WU:=O\#\?\(\-]|\([^)]+\))\s*)*[>])\s*$/.test(textOnly)) ||
            (textOnly.includes('HP:') && textOnly.includes('MA:') && textOnly.includes('>'));

        // --- STAGE INITIALIZATION (Consolidated) ---
        // These check the fresh line to see if we should ENTER a new capture stage.
        const strippedLower = (attachedText || textOnly).toLowerCase();
        if (lower.includes('skill') && lower.includes('knowledge') && lower.includes('difficulty')) {
            if (deps.practice.isUiRequested || lower.includes('class') || deps.practice.silentSyncPendingRef.current) {
                if (captureStage.current === 'practice') return;
                if (captureStage.current !== 'none') finalizeCapture();
                console.log('[Parser] Entering Stage: practice'); addDiagnosticLog?.('Entering Stage: practice');
                (captureStage as any).current = 'practice';
                if (deps.practice.isUiRequested || deps.practice.silentSyncPendingRef.current) isSilentCapture.current = 1;
            }
        }
        else if (lower.includes('practice sessions left')) {
            if (captureStage.current === 'practice') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: practice'); addDiagnosticLog?.('Entering Stage: practice');
            (captureStage as any).current = 'practice';
            if (deps.isCharacterOpen || deps.practice.silentSyncPendingRef.current) isSilentCapture.current = 1;
        }
        else if (lower.includes('learnt of a quest') || lower.includes('unfinished quest') || lower.includes('not found any new quests') || lower.includes('no unfinished quests') || quests.activeQuests?.some(q => {
            const qName = q.name.toLowerCase().trim().replace(/\s+/g, ' ');
            const lName = lower.trim().replace(/\s+/g, ' ');
            return qName === lName || lName.includes(qName) || qName.includes(lName);
        })) {
            if (captureStage.current === 'quest') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: quest'); addDiagnosticLog?.('Entering Stage: quest');
            (captureStage as any).current = 'quest';
            if (deps.isCharacterOpen) isSilentCapture.current = 1;
        }
        else if (strippedLower === 'who' || strippedLower === 'who:' || strippedLower === 'players' || strippedLower === 'allies' || strippedLower === 'minions' || strippedLower.startsWith("who's online") || strippedLower.startsWith("allies online") || strippedLower.startsWith("minions online")) {
            if (captureStage.current === 'who') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: who'); addDiagnosticLog?.('Entering Stage: who');
            (captureStage as any).current = 'who'; setWhoList([]);
            if (deps.isPlayersOpen) isSilentCapture.current = 1;
        }
        else if (lower.includes('you can buy:') || lower.includes('items matching') || lower.includes('for sale:')) {
            if (captureStage.current === 'shop') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: shop'); addDiagnosticLog?.('Entering Stage: shop');
            (captureStage as any).current = 'shop'; deps.shop.setIsShopListingActive(true);
        }
        else if (isSilentCapture.current > 0 && deps.shop.pendingDetailItemIdRef.current && captureStage.current === 'none' && textOnly.trim().length > 0) {
            // Heuristic for the start of 'show item <id>' response (it's the first non-empty line after the command)
            (captureStage as any).current = 'shop-detail';
            deps.shop.parseShopDetailLine(textOnly);
            return;
        }
        else if ((textOnly.startsWith('Player') && textOnly.includes('Room')) || (textOnly.startsWith('Who') && textOnly.includes('Location'))) {
            if (captureStage.current === 'where') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: where'); addDiagnosticLog?.('Entering Stage: where');
            (captureStage as any).current = 'where'; setWhereList([]);
            if (deps.isPlayersOpen) isSilentCapture.current = 1;
        }
        else if (((contentLower.includes('in the ') || contentLower.includes('in your ') || contentLower.includes('in a ')) && contentLower.endsWith(':') && !contentLower.includes('equipped')) || (contentLower.includes('corpse') && contentLower.includes('contains:'))) {
            if (captureStage.current === 'container') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] ENTERING container stage via content:', content);
            (captureStage as any).current = 'container';
            if (deps.pendingDrawerContainerRef?.current) {
                isDrawerCapture.current = 1;
            } else {
                isDrawerCapture.current = 0;
                const containerName = content.replace(/^in (the|your|a)\s+/i, '').replace(/:$/, '').trim();
                setPopoverState(prev => prev ? { ...prev, type: 'container', containerItems: [], context: containerName } : null);
            }
        }
        else if (isWaitingForStats.current && /ob:|armor:|mood:|str:|exp:|level:/i.test(lower)) {
            if (captureStage.current === 'stat') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: stat'); addDiagnosticLog?.('Entering Stage: stat');
            isWaitingForStats.current = false; (captureStage as any).current = 'stat';
            setStatsLines([]);
            if (deps.isCharacterOpen) isDrawerCapture.current = 1;
        }
        else if ((isWaitingForEq.current || captureStage.current === 'none') && (/you are using|you are equipped with/i.test(lower) || (isWaitingForEq.current && lower.startsWith('<')))) {
            if (captureStage.current === 'eq') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: eq'); addDiagnosticLog?.('Entering Stage: eq');
            isWaitingForEq.current = false; (captureStage as any).current = 'eq';
            tempEqRef.current = []; if (deps.isCharacterOpen) isDrawerCapture.current = 1;
        }
        else if ((isWaitingForInv.current || captureStage.current === 'none') && /you are carrying|your inventory contains|is carrying:|is using:/i.test(lower)) {
            if (captureStage.current === 'inv') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: inv'); addDiagnosticLog?.('Entering Stage: inv');
            isWaitingForInv.current = false; (captureStage as any).current = 'inv';
            tempInvRef.current = []; if (deps.isItemsOpen) isDrawerCapture.current = 1;
        }
        else if ((lower.startsWith('you are a ') && (lower.includes('person') || lower.includes('being'))) || 
                 (lower.includes('exp:') && (lower.includes('level:') || lower.includes('tnl:'))) || 
                 (lower.includes('str:') && lower.includes('int:')) ||
                 (deps.characterInfo.name && lower.includes(deps.characterInfo.name.toLowerCase()) && (lower.includes('human being') || lower.includes('man eriadorian')))) {
            if (captureStage.current === 'info') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: info');
            (captureStage as any).current = 'info';
            if (deps.isCharacterOpen) isSilentCapture.current = 1;
        }
        else if (lower.includes('whois information for') || lower.startsWith('whois:') || lower.startsWith('whois status:')) {
            if (captureStage.current === 'whois') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: whois');
            (captureStage as any).current = 'whois';
            setCharacterInfo(prev => ({ ...prev, whois: '' }));
            if (deps.isCharacterOpen) isSilentCapture.current = 1;
        }
        else if ((deps.characterInfo.name && lower.includes(deps.characterInfo.name.toLowerCase()) && lower.includes(' is a ')) || lower.includes('described as:') || (lower.startsWith('description') && lower.includes(':'))) {
            // Heuristic: if it also looks like an 'info' start but was not caught above, it might be description.
            // But 'look self' often has more details.
            if (captureStage.current === 'description') return;
            if (captureStage.current !== 'none') finalizeCapture();
            console.log('[Parser] Entering Stage: description');
            (captureStage as any).current = 'description';
            setCharacterInfo(prev => ({ ...prev, description: '' }));
            if (deps.isCharacterOpen) isSilentCapture.current = 1;
        }
        console.log(`[Parser] Processing: "${textOnly}" | lower: "${lower}"`);

        if (lower.includes('type %e on an empty line to save') || 
                 lower.includes('type %q to abandon') ||
                 /^(enter new |editing )\w+/i.test(textOnly)) {
            // MUME Standard Text Editor or prompt detected!
            console.log('[Parser] POSSIBLE Editor trigger match:', { textOnly, isOpen: mumeEditState.isOpen });
            if (!mumeEditState.isOpen) {
                console.log('[Parser] TRIGGERING MUME Editor:', textOnly);
                setMumeEditState({
                    isOpen: true,
                    title: textOnly.trim(),
                    text: '', 
                    key: 'text-editor'
                });
            }
        }

        if (textPMatch || captureStage.current === 'none') {
            nounCountsRef.current = {};
        }

        if (textPMatch) {
            const promptPart = textPMatch[0];
            attachedText = textOnly.slice(promptPart.length).trim();

            // Only finalize if this is a standalone prompt at the start of a line and isn't a paging prompt
            const isPager = textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return to continue]');
            if (captureStage.current !== 'none' && !attachedText && !isPager) {
                finalizeCapture();
            }

            // Drive lighting and terrain from GMCP instead of prompt symbols
            /*
            const symbolMatch = promptPart.match(/[\*\)\!oO\.\[f%\~+WU:=O\#\?\(]/);
            if (symbolMatch) {
                const symbol = symbolMatch[0];
                if (detectLighting) detectLighting(symbol);
                if (deps.setCurrentTerrain && !['*', '!', ')', 'o', 'O', '?'].includes(symbol)) {
                    deps.setCurrentTerrain(symbol);
                }
            }
            */


            // --- Combat Health Extraction ---
            // Example: [ cW HP:Fine *a Dwarf* (x):Hurt>
            // Example with buffer: [ cW HP:Fine (Buff:Fine) *a Dwarf* (x):Hurt>
            const healthMap: Record<string, CombatHealthStatus> = {
                'healthy': 'Healthy',
                'fine': 'Fine',
                'hurt': 'Hurt',
                'wounded': 'Wounded',
                'bad': 'Badly Wounded',
                'awful': 'Awful',
                'stunned': 'Stunned',
                'dying': 'Dying',
                'bleeding': 'Dying'
            };

            const findStatus = (str: string): CombatHealthStatus | null => {
                const s = str.toLowerCase();
                for (const [key, val] of Object.entries(healthMap)) {
                    if (s.includes(key)) return val;
                }
                return null;
            };

            // 1. Player Health
            // MUME omits HP token entirely when player is healthy — treat absence as Healthy (5 segments)
            const playerMatch = promptPart.match(/HP:(\w+)/i);
            if (playerMatch) {
                const status = findStatus(playerMatch[1]);
                console.log('[Parser] Player Health Status:', status);
                setPlayerHealthStatus(status ?? 'Healthy');
            } else {
                setPlayerHealthStatus('Healthy');
            }

            // 2. Buffer Health/Name
            const bufferMatch = promptPart.match(/\(([^:]+):(\w+)\)/); // Heuristic for (Name:Status)
            if (bufferMatch) {
                setBufferName(bufferMatch[1]);
                setBufferHealthStatus(findStatus(bufferMatch[2]));
            } else if (!promptPart.includes('Buff:')) {
                // We keep GMCP source for name if parser doesn't find it, but clear status if missing from prompt
                setBufferHealthStatus(null);
            }

            // 3. Opponent Health/Name
            // Strip known parts (vitals, buffer, prompt symbols) then match name:Status>
            // Handles both *name*:Status> and bare multi-word name:Status>
            // Examples: *(- a fallow deer:Hurt>, )( R HP:Fine *a Dwarf*:Wounded>, *a Dwarf* (x):Fine>
            const oppPart = promptPart
                .replace(/\b(?:HP|MA|MV|SP|Move|Mana)\s*:\s*\w+/gi, '') // Remove vital statuses
                .replace(/\([^:)]+:\w+\)/g, '')                         // Remove buffer (Name:Status)
                .replace(/^[\*\)\!\(\[\]oO\.f%\~+WU:=O\#\?\s\-]+/, ''); // Remove leading prompt symbols
            // Try asterisked name anywhere (prompt flags like "CWRS" may precede the asterisks)
            const asteriskOppMatch = oppPart.match(/\*([^*]+)\*\s*(?:\(x\))?\s*:(\w+)\s*>$/);
            // For bare names, also strip remaining all-uppercase flag tokens (e.g. "CWRS ", "R ")
            const strippedOppPart = oppPart.replace(/^(?:[A-Z]+\s+)+/, '');
            const oppMatch = asteriskOppMatch ?? strippedOppPart.match(/(.+?)\s*(?:\(x\))?\s*:(\w+)\s*>$/);
            if (oppMatch) {
                const name = (oppMatch[1] || "").trim();
                const status = findStatus(oppMatch[2]);
                const isVitalPrefix = /^(hp|m|v|t|e|w|move|mana|tired)$/i.test(name);
                
                if (status && !isVitalPrefix) {
                    setOpponentName(name);
                    setOpponentHealthStatus(status);
                    setInCombat(true);
                } else {
                    setOpponentHealthStatus(null);
                    setOpponentName(null);
                    setInCombat(false); // No valid opponent — start the 5s latch
                }
            } else {
                setOpponentHealthStatus(null);
                setOpponentName(null);
                setInCombat(false); // No opponent in prompt — start the 5s latch
            }


            if (!attachedText) {
                return;
            }

            content = attachedText;
            contentLower = content.toLowerCase();

            // Strip everything up to and including '>' (prompt end) from cleanLine.
            // The simple [^>]*> approach works because MUME prompt chars never contain '>'.
            cleanLine = cleanLine.replace(/^(?:\x1b\[[0-9;]*m)*[^>]*>/, '').trim();
            // Also sync textOnly/lower so room detection and all downstream checks
            // see only the content after the prompt, not the full prompt+content string.
            textOnly = attachedText;
            lower = attachedText.toLowerCase();
            }

            // Global Status Parser for MUME (updates OB/DB/PB/Armour in real-time)
            // Ensure this runs BEFORE prompt stripping so we don't lose the context.
            if (contentLower.startsWith('your ob ') || contentLower.startsWith('your mood ') || contentLower.startsWith('your armor ') || contentLower.startsWith('your armour ') || contentLower.includes('ob:') || contentLower.includes('db:') || contentLower.includes('pb:') || contentLower.includes('mood:')) {
                const obMatch = content.match(/Ob\s*(?::|is)?\s*(\d+)%/i);
                const dbMatch = content.match(/Db\s*(?::|is)?\s*(\d+)%/i);
                const pbMatch = content.match(/Pb\s*(?::|is)?\s*(\d+)%/i);
                const armorMatch = content.match(/(?:Armo?ur|Armor)\s*(?::|is)?\s*(\d+)%/i);
                const moodMatch = content.match(/your mood is (?:now )?(\w+)/i);
                const moodCompactMatch = content.match(/\bMood\s*:\s*(\w+)/i);
                const wimpyMatch = content.match(/Wimpy(?:\s*set\s*to|:)?\s*(\d+)/i);

                if (obMatch || dbMatch || pbMatch || armorMatch || moodMatch || moodCompactMatch || wimpyMatch) {
                    const moodValue = moodMatch ? moodMatch[1] : (moodCompactMatch ? moodCompactMatch[1] : null);
                    if (moodValue) {
                        deps.setMood(moodValue.toLowerCase());
                        // Only fire stat on explicit mood change ("now") to avoid stat → mood → stat loop
                        const isMoodChange = /your mood is now/i.test(content);
                        if (isMoodChange && deps.inCombatRef.current && deps.executeCommandRef.current) {
                            setTimeout(() => deps.executeCommandRef.current?.('stat', true, true, true, true), 100);
                        }
                    }

                    deps.setStats(prev => ({
                        ...prev,
                        ...(obMatch && { ob: parseInt(obMatch[1]) }),
                        ...(dbMatch && { db: parseInt(dbMatch[1]) }),
                        ...(pbMatch && { pb: parseInt(pbMatch[1]) }),
                        ...(armorMatch && { armour: parseInt(armorMatch[1]) }),
                        ...(wimpyMatch && { wimpy: parseInt(wimpyMatch[1]) }),
                    }));
                }
            }

        // --- Combat Exit Detection (text-based) ---
        // Force-clear combat on unambiguous end-of-combat messages so we don't rely
        // solely on GMCP or the prompt opponent pattern disappearing.
        if (inCombatRef.current) {
            if (/you (?:have )?sl(?:ay|ew|ain)\b/i.test(lower) ||
                /\bis dead!\s*r\.?i\.?p/i.test(lower) ||
                /^you flee\b/i.test(lower) ||
                /\bflees\s/i.test(lower) ||
                /you stop fighting/i.test(lower)) {
                setInCombat(false, true);
                setOpponentHealthStatus(null);
                setOpponentName(null);
            }
        }

        // --- Experience Ticker Trigger ---
        const xpTextMatch = lower.match(/you receive (\d+) experience/i);
        if (xpTextMatch) {
            // Solo kill with explicit amount — advance xp immediately from text so the
            // ticker fires once per kill rather than waiting for the next GMCP prompt.
            const delta = parseInt(xpTextMatch[1], 10);
            if (delta > 0) setCharacterInfo(prev => ({ ...prev, xp: prev.xp + delta }));
            triggerXpTicker?.();
        } else if (/you receive your share of experience/i.test(lower)) {
            // Group kill — no amount in text, let GMCP drive the amount.
            triggerXpTicker?.();
        }

        // --- NEW: Priority Capture Handling ---
        if (captureStage.current !== 'none') {
            const stage = captureStage.current;
            
            if (stage === 'quest') {
                const textToParse = attachedText || textOnly;
                if (textToParse.length > 0) {
                    parseQuestLine(textToParse);
                }
                // If it's a standalone prompt and we're in quest stage, we can usually finalize
                if (isEndPrompt && !attachedText) {
                    finalizeCapture();
                }
                return;
            }

            if (stage === 'stat' || stage === 'info') {
                // Parse affected by list
                if (lower.startsWith('affected by:')) {
                    setCharacterInfo(prev => ({ ...prev, affectedBy: [] }));
                    return;
                }
                
                if (lower.startsWith('- ')) {
                    const spell = textOnly.substring(2).trim();
                    if (spell) {
                        setCharacterInfo(prev => ({
                            ...prev,
                            affectedBy: [...(prev.affectedBy || []), spell]
                        }));
                    }
                    return;
                }

                // Parse Gold, XP, TP, Level from score/info command
                // MUME Specific: gold/money/copper/lauren/celeb/busc/pennies/coins
                const moneyRegex = /(?:gold|money|copper|lauren|celeb|busc|silver|gold):\s*([\d,]+)|([\d,]+)\s*(?:gold|silver|copper|lauren|celeb|busc|pennies|coins)/gi;
                let moneyMatch;
                let totalGoldOnLine = undefined;
                
                while ((moneyMatch = moneyRegex.exec(textOnly)) !== null) {
                    const val = parseInt((moneyMatch[1] || moneyMatch[2]).replace(/,/g, ''));
                    if (totalGoldOnLine === undefined) totalGoldOnLine = 0;
                    
                    const lowMatch = moneyMatch[0].toLowerCase();
                    if (lowMatch.includes('gold') || lowMatch.includes('lauren')) totalGoldOnLine += val;
                    else if (lowMatch.includes('silver') || lowMatch.includes('celeb') || lowMatch.includes('pennies')) totalGoldOnLine += val / 10;
                    else if (lowMatch.includes('copper') || lowMatch.includes('busc')) totalGoldOnLine += val / 100;
                    else totalGoldOnLine += val; 
                }
                
                if (totalGoldOnLine !== undefined) {
                    console.log('[Parser] Gold Found on line:', { totalGoldOnLine, text: textOnly });
                    setCharacterInfo(prev => ({ ...prev, gold: Math.floor(totalGoldOnLine!) }));
                }

                const statRegex = /(str|int|wis|dex|con|wil|per):\s*(\d+)/gi;
                let match;
                const stats: any = {};
                let statFound = false;
                while ((match = statRegex.exec(textOnly)) !== null) {
                    stats[match[1].toLowerCase()] = parseInt(match[2]);
                    statFound = true;
                }
                if (statFound) {
                    console.log('[Parser] Captured Stats:', stats);
                    setCharacterInfo(prev => ({
                        ...prev,
                        stats: { ...(prev.stats || {str:0, int:0, wis:0, dex:0, con:0, wil:0, per:0}), ...stats }
                    }));
                }
            }

            if (stage === 'info') {
                const levelMatch = textOnly.match(/level:\s*(\d+)/i);
                const xpMatch = textOnly.match(/exp(?:erience)?:\s*([\d,]+)/i);
                const tnlMatch = textOnly.match(/tnl:\s*([\d,]+)/i);
                
                if (levelMatch || xpMatch || tnlMatch) {
                    const levelVal = levelMatch ? parseInt(levelMatch[1]) : undefined;
                    const xpVal = xpMatch ? parseInt(xpMatch[1].replace(/,/g, '')) : undefined;
                    const xpMaxVal = (xpVal !== undefined && tnlMatch) ? (xpVal + parseInt(tnlMatch[1].replace(/,/g, ''))) : undefined;

                    console.log('[Parser] Info Captured:', { levelVal, xpVal, xpMaxVal, text: textOnly });

                    setCharacterInfo(prev => ({
                        ...prev,
                        ...(levelVal !== undefined && { level: levelVal }),
                        ...(xpVal !== undefined && { xp: xpVal }),
                        ...(xpMaxVal !== undefined && { xpMax: xpMaxVal })
                    }));
                }

                // Parse War Info
                if (lower.includes('acts for war:') || lower.includes('war points:')) {
                    const actsMatch = textOnly.match(/Acts for war:\s*(\d+)/i);
                    const warPointsMatch = textOnly.match(/War points:\s*(\d+)/i);
                    if (actsMatch || warPointsMatch) {
                        setCharacterInfo(prev => ({
                            ...prev,
                            ...(actsMatch && { actsForWar: parseInt(actsMatch[1]) }),
                            ...(warPointsMatch && { warPoints: parseInt(warPointsMatch[1]) })
                        }));
                    }
                }
            }
        }

        // --- ROOM DETECTION ---
        const currentRoomRefValue = roomNameRef.current;
        let isRoomMatched = currentRoomRefValue && (
            textOnly === currentRoomRefValue || lower === currentRoomRefValue.toLowerCase() ||
            textOnly === currentRoomRefValue + '.' || lower === currentRoomRefValue.toLowerCase() + '.' ||
            (textOnly.startsWith(currentRoomRefValue) || lower.startsWith(currentRoomRefValue.toLowerCase()))
        );
        let isRoomAnsiMatch = /^\s*(?:\x1b\[[0-9;]*m)*\x1b\[[0-9;]*3[0-7]m/.test(cleanLine) &&
            textOnly.length < 80 && !textOnly.includes(' - ') &&
            !/carrying|using|following|contains|says|tells/i.test(lower);
        let isRoomName = !!(isRoomAnsiMatch || (isRoomMatched && textOnly.length < (currentRoomRefValue?.length || 0) + 30 && !textOnly.includes(' - ') && !/carrying|using|following|contains|says|tells/i.test(lower)));

        // SPLIT logic
        if (currentRoomName && (textOnlyRaw.startsWith(currentRoomName) || lowerRaw.startsWith(currentRoomName.toLowerCase()))) {
            const headerPart = textOnlyRaw.startsWith(currentRoomName) ? currentRoomName : textOnlyRaw.substring(0, currentRoomName.length);
            const remaining = textOnlyRaw.substring(headerPart.length);
            const nextChar = remaining[0];
            if (!nextChar || nextChar === '.' || nextChar === ' ' || nextChar === '[') {
                const headerEndIdx = cleanLine.indexOf(headerPart) + headerPart.length;
                let finalHeaderEndIdx = headerEndIdx;
                if (cleanLine[headerEndIdx] === '.') finalHeaderEndIdx++;
                if (cleanLine.substring(finalHeaderEndIdx).trim().length > 3) {
                    const headerText = cleanLine.substring(0, finalHeaderEndIdx);
                    const restText = cleanLine.substring(finalHeaderEndIdx).trim();
                    processLine(headerText);
                    processLine(restText);
                    return;
                }
            }
        }

        if (isRoomName) {
            console.log(`[Parser] Room Name Detected: "${textOnly}" | AnsiMatch: ${isRoomAnsiMatch} | TextMatch: ${isRoomMatched} | GMCP: ${currentRoomRefValue}`);
        }

        if (isRoomName && captureStage.current === 'none' && !isWaitingForStats.current && !isWaitingForEq.current && !isWaitingForInv.current) {
            captureStage.current = 'none';
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;

            const isSameRoom = currentRoomName && (textOnly === currentRoomName || lower === currentRoomName.toLowerCase());
            if (!isSameRoom) {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: false } }));
                }
            }
        } else if (textOnly.includes('It is pitch black...') || textOnly.includes('You cannot see a thing!')) {
             if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('mume-mapper-move-confirmed', { detail: { isDark: true } }));
            }
        }

        if (captureStage.current === 'none') {
            containerStackRef.current = [];
        }

        if (lower.includes("starts to rain") || lower.includes("it is raining")) setWeather(lower.includes("heavily") ? 'heavy-rain' : 'rain');
        if (lower.includes("starts to snow") || lower.includes("it is snowing")) setWeather('snow');
        if (lower.includes("rain stops") || lower.includes("snow stops") || lower.includes("clouds disappear")) setWeather('none');
        if (lower.includes("thick fog")) setIsFoggy(true);
        if (lower.includes("fog thins") || lower.includes("fog dissipates")) setIsFoggy(false);

        if (lower.includes("flash of lightning") || lower.includes("lightning illuminates")) {
            setLightningEnabled(true);
            setTimeout(() => setLightningEnabled(false), 200);
            setTimeout(() => setLightningEnabled(true), 350);
            setTimeout(() => setLightningEnabled(false), 450);
        }

        const stopMovementMsg = lower.includes("alas, you cannot go that way") ||
            lower.includes("there is no exit") ||
            lower.includes("you bump into") ||
            lower.includes("maybe you should get on your feet") ||
            lower.includes("nah, you're too exhausted") ||
            lower.includes("you are too exhausted") ||
            lower.includes("you're too exhausted") ||
            lower.includes("in your condition?") ||
            lower.includes("you're too stunned") ||
            lower.includes("you are too stunned") ||
            lower.includes("is closed") ||
            lower.includes("is locked") ||
            lower.includes("is blocking the way") ||
            lower.includes("you are too tired") ||
            lower.includes("you're too tired") ||
            lower.includes("you can't go that way") ||
            lower.includes("you are already there") ||
            lower.includes("you stop following");

        if (stopMovementMsg) {
            setRumble(true);
            triggerHaptic(40);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-move-fail'));
            setTimeout(() => setRumble(false), 300);
        }


        // Refined isEndPrompt was already handled at the top of processLine.

        if (isEndPrompt) {
            console.log('[Parser] End-prompt detected:', { textOnly, stage: captureStage.current });
        }

        if (captureStage.current === 'inv' || captureStage.current === 'eq' || captureStage.current === 'stat' || captureStage.current === 'container' || captureStage.current === 'practice' || captureStage.current === 'shop' || captureStage.current === 'shop-detail') {
            const createLine = (l: string, tOnly: string, lLower: string, cmd: string): DrawerLine => {
                const leadingSpaces = l.replace(/\x1b\[[0-9;]*m/g, '').match(/^ */)?.[0].length || 0;
                const depth = Math.floor(leadingSpaces / 3);
                const isContainer = isItemContainer(l);
                const isHdr = /you are (carrying|using|equipped with)|contains|in (?:the|your|a|his|her|its) (.*?):/i.test(lLower);
                const isNothing = lLower.includes('nothing');
                if (!isHdr && !isNothing && isContainer) addDiagnosticLog?.(`Detected container: ${textOnly}`);

                let prefix = ''; let prefixHtml = ''; let mainText = tOnly; let mainHtml = ansiConvert.toHtml(l);
                if (cmd === 'equipmentlist') {
                    const eqMatch = l.match(/^(\s*(?:\x1b\[[0-9;]*m)*<[^>]+>(?:\x1b\[[0-9;]*m)*\s*)(.*)/);
                    if (eqMatch) {
                        prefixHtml = ansiConvert.toHtml(eqMatch[1]);
                        prefix = tOnly.match(/^<[^>]+>\s*/)?.[0] || '';
                        mainHtml = ansiConvert.toHtml(eqMatch[2]);
                        mainText = tOnly.replace(/^<[^>]+>\s*/, '');
                    }
                }

                const noun = extractNoun(mainText || l);
                nounCountsRef.current[noun] = (nounCountsRef.current[noun] || 0) + 1;
                const count = nounCountsRef.current[noun];
                const stableId = count > 1 ? `${count}.${noun}` : noun;
                
                while (containerStackRef.current.length > 0 && containerStackRef.current[containerStackRef.current.length - 1].depth >= depth) {
                    containerStackRef.current.pop();
                }

                let context = stableId;
                let parentItemId = undefined;
                let parentItemNoun = undefined;

                if (depth > 0 && containerStackRef.current.length > 0) {
                    const parent = containerStackRef.current[containerStackRef.current.length - 1];
                    context = `${stableId}.${parent.context}`;
                    parentItemId = parent.context; // Using context as ID for stability
                    parentItemNoun = parent.stableId; // The stable noun for MUME (e.g. 2.bag)
                }

                if (isContainer) {
                    containerStackRef.current.push({ depth, noun, context, stableId });
                }

                const line: DrawerLine = {
                    id: context || stableId || Math.random().toString(36).substring(7),
                    text: mainText, html: mainHtml, prefix, prefixHtml,
                    isItem: !isHdr && !isNothing, isHeader: isHdr, isContainer, depth, cmd, context,
                    stableId,
                    parentItemId, parentItemNoun
                };

                if (captureStage.current === 'container') {
                    console.log(`[Parser] containerLine: ${line.text} | isItem: ${line.isItem} | isHdr: ${line.isHeader}`);
                }

                if (line.parentItemNoun) {
                    console.log(`[Parser] createLine:`, { text: line.text, parent: line.parentItemNoun, depth: line.depth, isItem: line.isItem });
                }

                return line;
            };

            if (captureStage.current === 'inv') {
                const line = createLine(cleanLine, textOnly, lower, 'inventorylist');
                tempInvRef.current.push(line);
            } else if (captureStage.current === 'eq') {
                if (textOnly.length > 0) {
                    const line = createLine(cleanLine, textOnly, lower, 'equipmentlist');
                    tempEqRef.current.push(line);
                }
            } else if (captureStage.current === 'practice') {
                if (textOnly.trim().length > 0) {
                    const skill = deps.practice.parsePracticeLine(textOnly);
                    deps.practice.addToLogBuffer(typeof skill === 'object' && 'name' in skill ? 'skill' : 'header', skill, cleanLine);
                }
            } else if (captureStage.current === 'shop') {
                if (textOnly.trim().length > 0) {
                    if (textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return')) {
                        shopPagerSeenRef.current = true;
                    }
                    parseShopLine(textOnly);
                }
            } else if (captureStage.current === 'shop-detail') {
                if (textOnly.trim().length > 0) {
                    deps.shop.parseShopDetailLine(textOnly);
                }
            } else if (captureStage.current === 'container') {
                if (textOnly.length > 0 && !lower.includes('contains:')) {
                    const containerLine = createLine(cleanLine, textOnly, lower, 'lookin');
                    const drawerPending = deps.pendingDrawerContainerRef?.current;
                    if (isDrawerCapture.current === 1 && drawerPending) {
                        const { containerId, cmd } = drawerPending;
                        if (cmd === 'inventorylist') {
                            setInventoryLines(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) return prev;
                                const parent = prev[parentIdx];
                                const injectedLine: DrawerLine = {
                                    ...containerLine, id: `${containerLine.id}.${containerId}`, cmd,
                                    depth: (parent.depth || 0) + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id, parentItemNoun: parent.stableId,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };
                                console.log(`[Parser] Injecting into ${cmd}:`, { text: injectedLine.text, parent: injectedLine.parentItemNoun });
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) return prev;
                                const next = [...prev];
                                let lastSiblingIdx = -1;
                                for (let i = prev.length - 1; i > parentIdx; i--) {
                                    if (prev[i].parentItemId === containerId) {
                                        lastSiblingIdx = i;
                                        break;
                                    }
                                }
                                const insertIdx = lastSiblingIdx !== -1 ? lastSiblingIdx + 1 : parentIdx + 1;
                                next.splice(insertIdx, 0, injectedLine);
                                return next;
                            });
                        } else {
                            setEqLines(prev => {
                                const parentIdx = prev.findLastIndex(l => l.isContainer && l.id === containerId);
                                if (parentIdx === -1) return prev;
                                const parent = prev[parentIdx];
                                const injectedLine: DrawerLine = {
                                    ...containerLine, id: `${containerLine.id}.${containerId}`, cmd,
                                    depth: (parent.depth || 0) + Math.max(containerLine.depth, 1),
                                    parentItemId: parent.id, parentItemNoun: parent.stableId,
                                    context: `${containerLine.context || containerLine.id}.${parent.context || parent.id}`
                                };
                                console.log(`[Parser] Injecting into ${cmd}:`, { text: injectedLine.text, parent: injectedLine.parentItemNoun });
                                if (prev.some(l => l.id === injectedLine.id && l.depth === injectedLine.depth)) return prev;
                                const next = [...prev];
                                let lastSiblingIdx = -1;
                                for (let i = prev.length - 1; i > parentIdx; i--) {
                                    if (prev[i].parentItemId === containerId) {
                                        lastSiblingIdx = i;
                                        break;
                                    }
                                }
                                const insertIdx = lastSiblingIdx !== -1 ? lastSiblingIdx + 1 : parentIdx + 1;
                                next.splice(insertIdx, 0, injectedLine);
                                return next;
                            });
                        }
                    } else if (containerLine.isItem && !containerLine.isHeader) {
                        // Only add real items (not 'Nothing', not headers) to the popover
                        console.log('[Parser] Adding to popover containerItems:', containerLine.text);
                        setPopoverState((prev: any) => {
                            if (!prev) return null;
                            return { 
                                ...prev, 
                                type: 'container', 
                                containerItems: [...(prev.containerItems || []), containerLine] 
                            };
                        });
                    }
                    if (containerLine.isItem) {
                        const itmNoun = extractNoun(containerLine.text);
                        if (itmNoun) deps.setDiscoveredItems(prev => prev.includes(itmNoun) ? prev : [...prev, itmNoun]);
                    }
                }
                if (isDrawerCapture.current || isSilentCapture.current) return;
            } else {
                setStatsLines(p => [...p, { id: Math.random().toString(36).substring(7), text: textOnly, html: ansiConvert.toHtml(cleanLine) }]);
            }
        }

        const trackAction = () => {
            if (isSilentCapture.current > 0 || isDrawerCapture.current) return;
            const wearMatch = cleanLine.match(/You (wear|put on) (.*?)\./i);
            if (wearMatch) {
                const itemNoun = extractNoun(wearMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx]; setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                    return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const removeMatch = cleanLine.match(/You (remove|stop using) (.*?)\./i);
            if (removeMatch) {
                const itemNoun = extractNoun(removeMatch[2]);
                setEqLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx]; setInventoryLines(inv => [...inv, { ...item, cmd: 'inventorylist' }]);
                    return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const putMatch = cleanLine.match(/You put (.*?) in (.*?)\./i);
            if (putMatch) {
                const itemNoun = extractNoun(putMatch[1]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const getMatch = cleanLine.match(/You (get|take) (.*?)\.( from (.*?)\.)?/i);
            if (getMatch) {
                const itemText = getMatch[2];
                setInventoryLines(prev => [...prev, { id: Math.random().toString(36).substring(7), text: itemText, html: ansiConvert.toHtml(itemText), isItem: true, cmd: 'inventorylist', context: extractNoun(itemText) }]);
                return;
            }
            const receiveMatch = cleanLine.match(/(.*?) gives you (.*?)\./i);
            if (receiveMatch) {
                const itemText = receiveMatch[2];
                setInventoryLines(prev => [...prev, { id: Math.random().toString(36).substring(7), text: itemText, html: ansiConvert.toHtml(itemText), isItem: true, cmd: 'inventorylist', context: extractNoun(itemText) }]);
                return;
            }
            const giveMatch = cleanLine.match(/You (give|drop|junk) (.*?)\./i);
            if (giveMatch) {
                const itemNoun = extractNoun(giveMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const wieldMatch = cleanLine.match(/You (wield|hold) (.*?)\./i);
            if (wieldMatch) {
                const itemNoun = extractNoun(wieldMatch[2]);
                setInventoryLines(prev => {
                    const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                    if (idx === -1) return prev;
                    const item = prev[idx]; setEqLines(eq => [...eq, { ...item, cmd: 'equipmentlist' }]);
                    return prev.filter((_, i) => i !== idx);
                }); return;
            }
            const consumeMatch = cleanLine.match(/You (eat|quaff|drink) (.*?)\./i);
            if (consumeMatch) {
                const itemNoun = extractNoun(consumeMatch[2]);
                if (!consumeMatch[0].includes('from')) {
                    setInventoryLines(prev => {
                        const idx = prev.findIndex(l => l.isItem && (l.context === itemNoun || l.text.toLowerCase().includes(itemNoun)));
                        if (idx === -1) return prev; return prev.filter((_, i) => i !== idx);
                    });
                } return;
            }
            if (lower.includes('gold coins') || lower.includes('lauren') || lower.includes('celeb') || lower.includes('busc')) {
                const moneyMatch = textOnly.match(/(\d+)\s*(gold coins|silver coins|copper coins|lauren|celeb|busc)/i);
                if (moneyMatch && (lower.includes('get') || lower.includes('take') || lower.includes('gives you'))) {
                    const amount = parseInt(moneyMatch[1]);
                    console.log('[Parser] Money Gained:', amount, moneyMatch[2]);
                    setCharacterInfo(prev => ({ ...prev, gold: (prev.gold || 0) + amount }));
                } else if (moneyMatch && (lower.includes('drop') || lower.includes('give') || lower.includes('junk'))) {
                    const amount = parseInt(moneyMatch[1]);
                    console.log('[Parser] Money Lost:', amount, moneyMatch[2]);
                    setCharacterInfo(prev => ({ ...prev, gold: Math.max(0, (prev.gold || 0) - amount) }));
                }
            }
        };

        trackAction(); processTriggers(textOnly);

        const isImportantMessage = /hits you|receive your share|is dead|tells you|say,|group:|mood:|alertness:|spell speed:|following/i.test(lower);
        
        // Drawer-aware hiding: hide when the relevant drawer is open, regardless of how the command was triggered.
        // This prevents double-showing data that's already displayed in the drawer UI.
        let isDrawerHiding = false;
        // Always suppress MUME pager navigation lines from the message log and auto-advance them.
        // Paginators are always hidden (shouldShow will be false), so always sending a return is
        // correct — the user can never interact with a paginator they cannot see. This also handles
        // the case where the paginator fires BEFORE the shop/practice header arrives (e.g. when
        // MUME sends the MORE prompt at the very start of a long "list" response).
        if (textOnly.includes('*** Return:') || textOnly.includes('*** [Hit Return to continue]')) {
            isDrawerHiding = true;
            deps.executeCommandRef.current?.('', true, true);
        }
        const currentStage = captureStage.current as any;
        if (currentStage !== 'none') {
            if (currentStage === 'inv' && deps.isItemsOpen) isDrawerHiding = true;
            else if (currentStage === 'eq' && (deps.isItemsOpen || deps.isCharacterOpen)) isDrawerHiding = true;
            else if (currentStage === 'stat' && (deps.isStatsOpen || deps.isCharacterOpen)) isDrawerHiding = true;
            else if (currentStage === 'practice') isDrawerHiding = true;
            else if (['info', 'quest', 'description', 'whois'].includes(currentStage) && deps.isCharacterOpen) isDrawerHiding = true;
            else if (currentStage === 'container' && (isDrawerCapture.current > 0 || isSilentCapture.current > 0)) isDrawerHiding = true;
            else if (['who', 'where'].includes(currentStage) && isPlayersOpen) isDrawerHiding = true;
            else if (currentStage === 'shop') isDrawerHiding = true;
        } else if (isSilentCapture.current > 0 || isDrawerCapture.current > 0) {
            // Stage already reset or prompt detected - hide any trailing matches or command echoes
            if (/you are carrying|your inventory contains/i.test(lower) && deps.isItemsOpen) isDrawerHiding = true;
            if ((/you are (using|equipped with)/i.test(lower) || /ob:|armor:|mood:|str:|exp:|level:/i.test(lower) || /practice sessions left/i.test(lower)) && deps.isCharacterOpen) isDrawerHiding = true;
            if (/ob:|armor:|mood:|str:|exp:|level:/i.test(lower) && deps.isStatsOpen) isDrawerHiding = true;
            if ((lower === 'who' || lower === 'where') && isPlayersOpen) isDrawerHiding = true;
            if (isEndPrompt) {
                 if (deps.isItemsOpen && (isWaitingForInv.current || isWaitingForEq.current)) isDrawerHiding = true;
                 if (deps.isCharacterOpen && (isWaitingForStats.current || isWaitingForEq.current || captureStage.current === 'practice' || captureStage.current === 'info' || captureStage.current === 'quest' || captureStage.current === 'shop')) isDrawerHiding = true;
                 if (deps.isStatsOpen && isWaitingForStats.current) isDrawerHiding = true;
                 if (isPlayersOpen && captureStage.current === 'none') {
                     // Heuristic: If we just finished a who/where and the drawer is open, hide the final prompt
                     isDrawerHiding = true;
                 }
            }
        }

        const shouldShow = (isSilentCapture.current === 0 && !isDrawerHiding) || isImportantMessage || isRoomName;

        // Diagnostic Visibility Logger
        if (!shouldShow && showDebugEchoes) {
            console.log(`[Parser] Suppressing line: "${textOnly.substring(0, 30)}${textOnly.length > 30 ? '...' : ''}" | Reasons: isSilent=${isSilentCapture.current}, isDrawerHiding=${isDrawerHiding}, stage=${captureStage.current}`);
        }

        // Always determine msgType for state-updating list entries, even if not showing in main log
        // When a prompt prefix has only a short indicator char attached (e.g. 'o', 'c' — light/terrain hints),
        // mark it 'prompt' so flushMessages can move it to the end of the display batch.
        // Real content after a prompt (room names, game text) stays 'game'.
        let msgType: MessageType = (textPMatch && attachedText.length <= 2) ? 'prompt' : 'game';
        if (captureStage.current === 'who' && textOnly !== 'who:' && lower !== 'allies' && lower !== 'minions' && !textOnly.startsWith('---')) {
            msgType = 'who-list';
        } else if (captureStage.current === 'where' && !textOnly.startsWith('Player') && !textOnly.startsWith('Who') && !textOnly.startsWith('---')) {
            msgType = 'where-list';
        } else if (captureStage.current === 'description') {
            msgType = 'room-description';
        } else if (captureStage.current === 'eq') {
            msgType = 'equipment-list';
        } else if (captureStage.current === 'inv') {
            msgType = 'inventory-list';
        } else if (lower.startsWith('exits:')) {
            msgType = 'room-exits';
        }

        // State updates for Who/Where lists must happen regardless of shouldShow (silent background captures)
        if (msgType === 'who-list') {
            const textToParse = textOnly.trim();
            // Match name with potential leading prefixes like <C> or [A]
            const nameMatch = textToParse.match(/((?:[<\[].*?[>\]]\s*)*)([A-Z\u00C0-\u00DE][a-zA-Z\u00C0-\u00FF]+)/);
            if (nameMatch) {
                const baseName = nameMatch[2];
                // Convert the raw ANSI line to HTML; strip MUME XML markup tags (e.g. &lt;C&gt;, [AW])
                const htmlDisplay = ansiConvert.toHtml(cleanLine).trim()
                    .replace(/&lt;\/?[A-Za-z]+&gt;\s*/g, '')
                    .replace(/\[[A-Za-z]+\]\s*/g, '');
                const entry = `${htmlDisplay}|${baseName}`;
                
                if (baseName.length > 1) {
                    setWhoList(prev => [...prev, entry]);
                }
            }
        } else if (msgType === 'where-list') {
            const clean = textOnly.trim();
            const parts = clean.split(/\s{2,}/);
            const name = parts[0]?.trim().replace(/^-\s*/, '');
            const room = parts.slice(1).join(' ').replace(/^-\s*/, '').trim();
            if (name && /^[A-Z\u00C0-\u00DE]/.test(name) && name.length > 1) {
                setWhereList(prev => [...prev, { name, room: room || '' }]);
            }
        } else if (captureStage.current === 'whois') {
            setCharacterInfo(prev => ({ ...prev, whois: (prev.whois || '') + textOnly + '\n' }));
        } else if (captureStage.current === 'description') {
            setCharacterInfo(prev => ({ ...prev, description: (prev.description || '') + textOnly + '\n' }));
        }

        // --- Text-based Item Detection ---
        // If we see "is here" or "are here" in a line that isn't a known capture stage, 
        // add it to discovered items for highlighting.
        const itemMatch = textOnly.match(/^(?:A|An|The|Some)\s+(.*?)\s+(?:is|are)\s+here\s*[.!]?$/i);
        if (itemMatch && captureStage.current === 'none' && !isDrawerHiding) {
            const noun = extractNoun(itemMatch[1]);
            if (noun && noun.length > 2) {
                setDiscoveredItems(prev => Array.from(new Set([...prev, noun])));
            }
        }

        // Consume pending GMCP comm metadata (set by onComm before this text line arrives)
        const gmcpComm = pendingGmcpCommRef?.current ?? null;
        if (gmcpComm) pendingGmcpCommRef!.current = null;

        // --- Multi-line Comm Suppression ---
        // If we have an ignoredCommBuffer, it means we used a full GMCP message
        // and need to suppress the subsequent wrapped text lines from the server.
        if (ignoredCommBufferRef.current && !gmcpComm) {
            const cleanLine = textOnly.trim();
            const currentBuffer = ignoredCommBufferRef.current.trim();
            
            // If the current line is a substring of what's left in the buffer, skip it
            if (currentBuffer.startsWith(cleanLine) || cleanLine.startsWith(currentBuffer.substring(0, Math.min(10, currentBuffer.length)))) {
                // If it's a very short line or matches the start, we assume it's a continuation
                // We don't want to over-suppress, so we only do this for lines that don't look like new commands
                if (cleanLine.length > 0) {
                    ignoredCommBufferRef.current = currentBuffer.substring(cleanLine.length).trim();
                    if (ignoredCommBufferRef.current.length === 0) {
                        ignoredCommBufferRef.current = null;
                    }
                    return; // Suppress this line from the log
                }
            } else {
                // Buffer doesn't match, clear it (something else happened)
                ignoredCommBufferRef.current = null;
            }
        }

        let replyTarget: string | undefined;
        let replyCommand: string | undefined;
        let commSender: string | undefined;
        let commAction: string | undefined;
        let commText: string | undefined;
        let commColor: string | undefined;

        // Try to extract the first color from the ANSI-encoded raw line
        const colorNames = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
        const ansiMatches = Array.from(line.matchAll(/\x1b\[([\d;]+)m/g));
        for (const match of ansiMatches) {
            const codes = match[1].split(';').map(n => parseInt(n, 10));
            let isBright = codes.includes(1);
            for (const code of codes) {
                if (code >= 30 && code <= 37) {
                    commColor = isBright ? `var(--ansi-bright-${colorNames[code - 30]})` : `var(--ansi-${colorNames[code - 30]})`;
                    break;
                }
                if (code >= 90 && code <= 97) {
                    commColor = `var(--ansi-bright-${colorNames[code - 90]})`;
                    break;
                }
            }
            if (commColor) break;
        }

        if (gmcpComm) {
            replyTarget = gmcpComm.sender || undefined;
            const chanMap: Record<string, string> = { tell: 'tell', say: 'say', narrate: 'narrate', shout: 'shout', exclaim: 'exclaim', sing: 'sing', whisper: 'whisper', pray: 'pray', ask: 'ask', yell: 'yell' };
            replyCommand = chanMap[gmcpComm.chan.toLowerCase()] ?? gmcpComm.chan.toLowerCase();
            commSender = replyTarget;
            commAction = replyCommand;
            
            if (gmcpComm.msg) {
                commText = gmcpComm.msg;
                // Store the remaining text to suppress future wrapped lines
                const prefixMatch = textOnly.match(/^(.*?)\s+(?:says|tells|narrates|yells|shouts|exclaims|sings|whispers|prays|asks)(?:.*?)[,\s:]+\s*/i);
                const lineContentText = prefixMatch ? textOnly.substring(prefixMatch[0].length) : textOnly;
                
                if (commText.length > lineContentText.length) {
                    ignoredCommBufferRef.current = commText.substring(lineContentText.length).trim();
                }
            } else {
                // Heuristic fallback to extract the message body from the full text line
                const prefixMatch = textOnly.match(/^(.*?)\s+(?:says|tells|narrates|yells|shouts|exclaims|sings|whispers|prays|asks)(?:.*?)[,\s:]+\s*/i);
                if (prefixMatch) {
                    commText = textOnly.substring(prefixMatch[0].length);
                } else {
                    commText = textOnly;
                }
            }
        } else {
            // Text fallback (no GMCP): detect common comm patterns and split into parts
            const commPatterns: [RegExp, string, boolean][] = [
                [/^(.+?)\s+(tells? you|says?|narrates?|yell?s|shouts?|exclaims?|sings?|whispers?|prays?|asks?(?:\s+you)?)(?:[:,\s]+)(.*)$/i, 'tell', true],
            ];
            for (const [re, cmd, hasSender] of commPatterns) {
                const m = textOnly.match(re);
                if (m) { 
                    replyCommand = cmd; 
                    if (hasSender) {
                        replyTarget = m[1];
                        commSender = m[1];
                        commAction = m[2];
                        commText = m[3];
                    }
                    break; 
                }
            }

            // JOIN CONTINUATION LINES:
            // If this line doesn't match a comm pattern but follows a very recent comm from the same sender,
            // or if it's a raw line ending/starting with quotes that suggests continuation.
            if (!replyCommand && lastCommMsgIdRef.current && (Date.now() - lastCommTimeRef.current < 500)) {
                // Heuristic: if the line doesn't look like a new game action (starts with lowercase or punctuation)
                // or if it completes a quoted block.
                const isLikelyContinuation = textOnly.length > 0 && (
                    /^[a-z0-9'"]/.test(textOnly) || 
                    textOnly.endsWith("'") || 
                    textOnly.endsWith('"') ||
                    textOnly.endsWith("'!") ||
                    textOnly.endsWith('"!') ||
                    textOnly.endsWith("'.") ||
                    textOnly.endsWith('".')
                );

                if (isLikelyContinuation) {
                    msgType = 'comm-continue';
                    commText = textOnly;
                    // We don't set replyCommand here, but we'll use 'comm-continue' type to signal useMessageLog
                }
            }
        }
        if (replyCommand) msgType = 'comm';

        if (shouldShow) {
            let finalRawText = cleanLine;
            if (isRoomName && !finalRawText.endsWith('\x1b[0m')) finalRawText += '\x1b[0m';
            
            const mid = msgType === 'comm-continue' ? lastCommMsgIdRef.current! : `msg-${textOnly.length}-${Date.now()}-${counterRef.current++}`;
            
            if (msgType === 'comm' || replyCommand) {
                lastCommMsgIdRef.current = mid;
                lastCommTimeRef.current = Date.now();
            }

            addMessage(msgType, finalRawText, undefined, mid, isRoomName, { textOnly, lower }, undefined, undefined, undefined, false, replyTarget, replyCommand, commSender, commAction, commText, commColor);
        }

        if (isEndPrompt) finalizeCapture();
    }, [addMessage, setStats, setWeather, setIsFoggy, setLightningEnabled, setAbilities, setCharacterClass, setRumble, setHitFlash, setDeathStage, setInCombat, detectLighting, setInventoryLines, setStatsLines, setEqLines, setWhoList, setWhereList, triggerHaptic, mapperRef, deps, processTriggers, parseShopLine, roomNameRef, addDiagnosticLog, setPopoverState, finalizeCapture, parseQuestLine, finalizeQuests]);

    return { processLine, finalizeCapture };
}
