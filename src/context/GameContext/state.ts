import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { GameStats, LightingType, WeatherType, DrawerLine, GameAction, ParleyState, PopoverState, CombatHealthStatus, QuestData, GroupMember, OptimisticChange } from '../../types';
import MASTER_SETTINGS from '../../constants/mastersettings.json';
import { extractNoun, extractColorTaggedKeyword, sanitizeGameTarget } from '../../utils/gameUtils';
import { useSettingsState } from './useSettingsState';
import { useUIState } from './useUIState';
import { useEntityRegistry } from '../../hooks/useEntityRegistry';

export const useGameProviderState = () => {
    // Settings & Mode
    const settings = useSettingsState();
    const {
        isNewbieMode, setIsNewbieMode, isSoundEnabled, setIsSoundEnabled, isMmapperMode, setIsMmapperMode, theme, setTheme, showControls, setShowControls, autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes, uiMode, setUiMode, disable3dScroll, setDisable3dScroll, disableSmoothScroll, setDisableSmoothScroll, isImmersionMode, setIsImmersionMode, showOrganicTerrain, setShowOrganicTerrain, inlineCategories, setInlineCategories, isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled, isTimestampEnabled, setIsTimestampEnabled, favorites, setFavorites, zoneMusic, setZoneMusic,
        fontFamily, setFontFamily
    } = settings;

    // Registry
    const { entities, setEntities, registerEntity, getEntity, clearRegistry, detectCapabilities, extractNoun } = useEntityRegistry();

    // Core Game State
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [gameState, setGameState] = useState<import('../../types').GameState>('disconnected');
    const [isPasswordMode, setIsPasswordMode] = useState(false);

    const [target, _setTarget] = useState<string | null>(null);
    const setTarget = useCallback((val: string | null) => {
        _setTarget(sanitizeGameTarget(val));
    }, []);

    const [stats, setStats] = useState<GameStats>({
        hp: 0, maxHp: 1,
        mana: 0, maxMana: 1,
        move: 0, maxMove: 1,
        wimpy: 0
    });
    const [rawInCombat, _setInCombat] = useState(false);
    const rawInCombatRef = useRef(false);
    const combatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // After a force-clear (flee/slay), treat any setInCombat(false) as forced
    // for a short window. This prevents stale GMCP packets from re-enabling
    // combat and then the normal latch delaying exit by 3 seconds.
    const forceClearUntilRef = useRef(0);

    const setInCombat = useCallback((val: boolean, force: boolean = false) => {
        // Upgrade to forced clear if within the force-clear window
        if (!val && !force && Date.now() < forceClearUntilRef.current) {
            force = true;
        }

        if (val) {
            if (combatTimeoutRef.current) {
                clearTimeout(combatTimeoutRef.current);
                combatTimeoutRef.current = null;
            }
            // Re-engaging in combat cancels any active force-clear window
            forceClearUntilRef.current = 0;
            _setInCombat(true);
        } else if (force) {
            // Forced clear (flee/slay) — immediately exit combat
            if (combatTimeoutRef.current) {
                clearTimeout(combatTimeoutRef.current);
                combatTimeoutRef.current = null;
            }
            _setInCombat(false);
            forceClearUntilRef.current = Date.now() + 2000;
        } else if (!combatTimeoutRef.current) {
            // Start the exit latch only if one isn't already running AND we aren't spectating.
            // Spectate combat is driven strictly by snooped GMCP.
            if (settings.isSpectateMode) return;

            combatTimeoutRef.current = setTimeout(() => {
                _setInCombat(false);
                combatTimeoutRef.current = null;
            }, 6000);
        }
    }, []);

    useEffect(() => { rawInCombatRef.current = rawInCombat; }, [rawInCombat]);

    useEffect(() => {
        return () => {
            if (combatTimeoutRef.current) clearTimeout(combatTimeoutRef.current);
        };
    }, []);

    const [characterName, setCharacterName] = useState<string | null>(null);
    const [spectateTargetId, setSpectateTargetId] = useState<number | null>(null);

    // Sync Game State with status and characterName
    useEffect(() => {
        if (status === 'disconnected') {
            setGameState('disconnected');
            setIsPasswordMode(false);
        } else if (status === 'connected') {
            // If we have a character name, we are definitely playing.
            // If not, we are likely at the account/login screen.
            if (characterName) {
                setGameState('playing');
            } else {
                setGameState('account');
            }
        }
    }, [status, characterName]);
    const [parley, setParley] = useState<ParleyState>({ active: false, command: 'tell', target: null });
    const [whoList, setWhoList] = useState<string[]>([]);
    const [whereList, setWhereList] = useState<import('../../types').WhereEntry[]>([]);
    const [roomPlayers, setRoomPlayers] = useState<import('../../types').GmcpOccupant[]>([]);
    const [roomNpcs, setRoomNpcs] = useState<import('../../types').GmcpOccupant[]>([]);
    const [roomItems, setRoomItems] = useState<import('../../types').GmcpOccupant[]>([]);
    const [currentTerrain, setCurrentTerrain] = useState<string>('city');
    const [roomName, _setRoomName] = useState<string | null>(null);
    const [roomDesc, _setRoomDesc] = useState<string | null>(null);
    const [roomExits, setRoomExits] = useState<string[]>([]);
    const [roomZone, setRoomZone] = useState<string | null>(null);
    const roomNameRef = useRef<string | null>(null);
    const setRoomName = useCallback((name: string | null) => {
        roomNameRef.current = name;
        _setRoomName(name);
    }, []);
    const roomDescRef = useRef<string | null>(null);
    const setRoomDesc = useCallback((desc: string | null) => {
        roomDescRef.current = desc;
        _setRoomDesc(desc);
    }, []);
    // Still keep the effect for sync if needed by other components
    useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
    useEffect(() => { roomDescRef.current = roomDesc; }, [roomDesc]);


    // Parser State (Moved up for useUIState access)
    const [inventoryLines, setInventoryLines] = useState<DrawerLine[]>([]);
    const [statsLines, setStatsLines] = useState<DrawerLine[]>([]);
    const [infoLines, setInfoLines] = useState<DrawerLine[]>([]); 
    const [scoreLines, setScoreLines] = useState<DrawerLine[]>([]); 
    const [questLines, setQuestLines] = useState<DrawerLine[]>([]);
    const [practiceLines, setPracticeLines] = useState<DrawerLine[]>([]);
    const [whoLines, setWhoLines] = useState<DrawerLine[]>([]);
    const [whereLines, setWhereLines] = useState<DrawerLine[]>([]);
    const [eqLines, setEqLines] = useState<DrawerLine[]>([]);

    const executeCommandRef = useRef<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>(() => { });

    // UI state
    const { 
        ui, setUI, setIsStatsOpen, setIsCharacterOpen, setIsEquipmentOpen, setIsInventoryOpen, 
        setIsPlayersOpen, setIsMapExpanded, setIsSetManagerOpen,
        handleTabClick, toggleMap 
    } = useUIState(executeCommandRef, {
        statsCount: statsLines.length + scoreLines.length,
        characterCount: infoLines.length + practiceLines.length + questLines.length,
        inventoryCount: inventoryLines.length + eqLines.length,
        playersCount: whoLines.length + whereLines.length
    });

    // Environmental state
    const [lighting, setLighting] = useState<LightingType>('none');
    const [lightningEnabled, setLightningEnabled] = useState(false);
    const [weather, setWeather] = useState<WeatherType>('none');
    const [isFoggy, setIsFoggy] = useState(false);

    // Other state
    const [abilities, setAbilities] = useState<Record<string, number>>({});
    const [characterClass, setCharacterClass] = useState<'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none'>('none');

    // Handle character-specific persistence
    useEffect(() => {
        if (!characterName) {
            // Load global defaults if no character
            const savedAbilities = localStorage.getItem('mud-abilities');
            const savedClass = localStorage.getItem('mud-character-class');
            if (savedAbilities) setAbilities(JSON.parse(savedAbilities));
            else if ((MASTER_SETTINGS as any).abilities) setAbilities((MASTER_SETTINGS as any).abilities);

            if (savedClass) setCharacterClass(JSON.parse(savedClass));
            else if ((MASTER_SETTINGS as any).characterClass) setCharacterClass((MASTER_SETTINGS as any).characterClass);
            return;
        }

        const charAbilitiesKey = `mud-abilities-${characterName.toLowerCase()}`;
        const charClassKey = `mud-character-class-${characterName.toLowerCase()}`;

        const savedAbilities = localStorage.getItem(charAbilitiesKey);
        const savedClass = localStorage.getItem(charClassKey);

        if (savedAbilities) setAbilities(JSON.parse(savedAbilities));
        else setAbilities((MASTER_SETTINGS as any).abilities || {}); // Use master if new character

        if (savedClass) setCharacterClass(JSON.parse(savedClass) as any);
        else setCharacterClass((MASTER_SETTINGS as any).characterClass || 'none');
    }, [characterName]);

    const [deathRoomId, setDeathRoomId] = useState<string | null>(null);

    // Save changes to character-specific keys
    useEffect(() => {
        const key = characterName ? `mud-abilities-${characterName.toLowerCase()}` : 'mud-abilities';
        localStorage.setItem(key, JSON.stringify(abilities));
    }, [abilities, characterName]);

    useEffect(() => {
        const key = characterName ? `mud-character-class-${characterName.toLowerCase()}` : 'mud-character-class';
        localStorage.setItem(key, JSON.stringify(characterClass));
    }, [characterClass, characterName]);

    useEffect(() => {
        const key = characterName ? `mud-death-room-${characterName.toLowerCase()}` : 'mud-death-room';
        localStorage.setItem(key, JSON.stringify(deathRoomId));
    }, [deathRoomId, characterName]);

    useEffect(() => {
        if (!characterName) return;
        const charDeathKey = `mud-death-room-${characterName.toLowerCase()}`;
        const savedDeathId = localStorage.getItem(charDeathKey);
        if (savedDeathId) setDeathRoomId(JSON.parse(savedDeathId));
        else setDeathRoomId(null);
    }, [characterName]);

    const [actions, setActions] = useState<GameAction[]>((MASTER_SETTINGS as any).actions || []);
    const actionsRef = useRef(actions);
    useEffect(() => { actionsRef.current = actions; }, [actions]);
    const [rumble, setRumble] = useState(false);
    const [mood, setMood] = useState('normal');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');
    const [activePrompt, setActivePrompt] = useState("");
    const [playerPosition, _setPlayerPosition] = useState('standing');
    const playerPositionRef = useRef('standing');
    const setPlayerPosition = useCallback((pos: string) => {
        _setPlayerPosition(pos);
        playerPositionRef.current = pos;
    }, []);

    const [isRiding, _setIsRiding] = useState(false);
    const isRidingRef = useRef(false);
    const setIsRiding = useCallback((val: boolean) => {
        _setIsRiding(val);
        isRidingRef.current = val;
    }, []);

    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);


    // Virtual Spectate State (for Textual GMCP/Prompt parsing)
    const [spectateStats, setSpectateStats] = useState<GameStats>({
        hp: 0, maxHp: 1,
        mana: 0, maxMana: 1,
        move: 0, maxMove: 1,
        wimpy: 0
    });
    const [spectateHealthStatus, setSpectateHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [spectateOpponentName, setSpectateOpponentName] = useState<string | null>(null);
    const [spectateOpponentStatus, setSpectateOpponentStatus] = useState<CombatHealthStatus | null>(null);
    const [spectatePosition, setSpectatePosition] = useState<string>('standing');
    const [spectateWaiting, setSpectateWaiting] = useState<boolean>(false);
    const [spectateRoomName, setSpectateRoomName] = useState<string | null>(null);
    const [spectateRoomDesc, setSpectateRoomDesc] = useState<string | null>(null);
    const [spectateTerrain, setSpectateTerrain] = useState<string>('city');
    const [spectateRoomZone, setSpectateRoomZone] = useState<string | null>(null);
    const [spectateLighting, setSpectateLighting] = useState<LightingType>('none');
    const [spectateWeather, setSpectateWeather] = useState<WeatherType>('none');
    const [spectateIsFoggy, setSpectateIsFoggy] = useState(false);
    const [spectateInCombat, setSpectateInCombat] = useState(false);
    const [spectateCharacterName, setSpectateCharacterName] = useState<string | null>(null);

    const captureStage = useRef<import('../../types').CaptureStage>('none');

    // --- Spectate Automation State ---
    const [spectateQueue, setSpectateQueue] = useState<string[]>([]);
    const [lastSnoopStartTime, setLastSnoopStartTime] = useState<number | null>(null);

    // Optimistic inventory/equipment overlay
    const [optimisticInventoryLines, setOptimisticInventoryLines] = useState<DrawerLine[] | null>(null);
    const [optimisticEqLines, setOptimisticEqLines] = useState<DrawerLine[] | null>(null);

    // Stable refs so applyOptimisticChange never goes stale
    const invLinesRef = useRef(inventoryLines);
    const eqLinesRef = useRef(eqLines);
    const optInvRef = useRef(optimisticInventoryLines);
    const optEqRef = useRef(optimisticEqLines);
    useEffect(() => { invLinesRef.current = inventoryLines; }, [inventoryLines]);
    useEffect(() => { eqLinesRef.current = eqLines; }, [eqLines]);
    useEffect(() => { optInvRef.current = optimisticInventoryLines; }, [optimisticInventoryLines]);
    useEffect(() => { optEqRef.current = optimisticEqLines; }, [optimisticEqLines]);

    // Auto-clear optimistic overlay when confirmed state arrives from game
    useEffect(() => { setOptimisticInventoryLines(null); }, [inventoryLines]);
    useEffect(() => { setOptimisticEqLines(null); }, [eqLines]);

    const removeItemAndChildren = (lines: DrawerLine[], stableId: string): DrawerLine[] =>
        lines.filter(l => l.stableId !== stableId && l.id !== stableId && l.parentItemNoun !== stableId);

    const applyOptimisticChange = useCallback((change: OptimisticChange) => {
        const currentInv = optInvRef.current ?? invLinesRef.current;
        const currentEq = optEqRef.current ?? eqLinesRef.current;

        // Resolve item if not provided
        let item = change.item;
        if (!item) {
            if (change.lineId) {
                item = currentInv.find(l => l.id === change.lineId) || currentEq.find(l => l.id === change.lineId);
            } else if (change.noun) {
                const target = change.noun.toLowerCase();
                item = currentInv.find(l => ((extractColorTaggedKeyword(l.html) || extractNoun(l.text)) ?? '').toLowerCase() === target)
                    || currentEq.find(l => ((extractColorTaggedKeyword(l.html) || extractNoun(l.text)) ?? '').toLowerCase() === target);
            }
        }
        if (!item) return;

        switch (change.type) {
            case 'wear': {
                const sid = item.stableId || item.id;
                setOptimisticInventoryLines(removeItemAndChildren(currentInv, sid));
                break;
            }
            case 'remove': {
                const newEq = currentEq.filter(l => l.id !== item.id);
                const invItem: DrawerLine = { ...item, prefix: undefined, prefixHtml: undefined, depth: 0, parentItemId: undefined, parentItemNoun: undefined };
                setOptimisticEqLines(newEq);
                setOptimisticInventoryLines([...currentInv, invItem]);
                break;
            }
            case 'drop':
            case 'give': {
                const sid = item.stableId || item.id;
                if (change.from === 'inv' || currentInv.some(l => l.id === item?.id)) {
                    setOptimisticInventoryLines(removeItemAndChildren(currentInv, sid));
                } else {
                    setOptimisticEqLines(currentEq.filter(l => l.id !== item?.id));
                }
                break;
            }
            case 'get': {
                const sid = item.stableId || item.id;
                const withoutItem = removeItemAndChildren(currentInv, sid);
                const unnested: DrawerLine = { ...item, depth: 0, parentItemId: undefined, parentItemNoun: undefined };
                setOptimisticInventoryLines([...withoutItem, unnested]);
                break;
            }
            case 'put': {
                const sid = item.stableId || item.id;
                const withoutItem = removeItemAndChildren(currentInv, sid);

                // If container is also defined by noun
                let container = change.container;
                if (!container && change.containerNoun) {
                    const cTarget = change.containerNoun.toLowerCase();
                    container = currentInv.find(l => (extractColorTaggedKeyword(l.html) || extractNoun(l.text)).toLowerCase() === cTarget);
                }

                if (container) {
                    const cSid = container.stableId || container.id;
                    const nested: DrawerLine = {
                        ...item,
                        depth: (container.depth ?? 0) + 1,
                        parentItemId: container.context || cSid,
                        parentItemNoun: cSid
                    };
                    const idx = withoutItem.findIndex(l => l.id === container?.id);
                    const result = [...withoutItem];
                    result.splice(idx >= 0 ? idx + 1 : result.length, 0, nested);
                    setOptimisticInventoryLines(result);
                } else {
                    setOptimisticInventoryLines(withoutItem);
                }
                break;
            }
        }
    }, []);

    const isDrawerCapture = useRef<number>(0);
    const isSilentCapture = useRef<number>(0);
    const isWaitingForStats = useRef<boolean>(false);
    const isWaitingForEq = useRef<boolean>(false);
    const isWaitingForInv = useRef<boolean>(false);
    const isWaitingForInfo = useRef<boolean>(false);
    // Signals parser to inject container contents into a drawer instead of popover
    const pendingDrawerContainerRef = useRef<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>(null);
    const [activeDragData, setActiveDragData] = useState<any>(null);
    const [heldButton, setHeldButton] = useState<any>(null);
    const [isMendingMode, setIsMendingMode] = useState(false);
    const [mendingTarget, setMendingTarget] = useState<string | null>(null);
    const [discoveredItems, setDiscoveredItems] = useState<string[]>([]);
    const [isTrackpadModifierActive, setIsTrackpadModifierActive] = useState(false);

    // Selection state
    const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set());

    const toggleObjectSelection = useCallback((id: string, setId?: string, context?: string) => {
        setSelectedObjectIds(prev => {
            const next = new Set(prev);
            // Search for any existing entry for this id
            // We need to be careful: if id is "inventorylist:1:sword", entry might be "inline-obj-char:inventorylist:1:sword"
            let existingEntry: string | null = null;
            for (const entry of next) {
                if (entry === id) {
                    existingEntry = entry;
                    break;
                }
                if (setId && entry === `${setId}:${id}`) {
                    existingEntry = entry;
                    break;
                }
                // Also check if ID is the "inner" part of the entry (e.g. entry is "inline-btn:auto-obj-sword" and id is "auto-obj-sword")
                if (entry.endsWith(':' + id)) {
                    existingEntry = entry;
                    break;
                }
            }

            if (existingEntry) {
                next.delete(existingEntry);
            } else {
                let entry = setId ? `${setId}:${id}` : id;
                if (context) entry += `:${context}`;
                next.add(entry);
            }
            return next;
        });
    }, []);

    const clearObjectSelection = useCallback(() => {
        setSelectedObjectIds(new Set());
    }, []);

    // Combat Overlay State
    const [playerHealthStatus, setPlayerHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [opponentHealthStatus, setOpponentHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [opponentName, setOpponentName] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [bufferHealthStatus, setBufferHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [bufferName, setBufferName] = useState<string | null>(null);
    const [pendingMove, setPendingMove] = useState<{ dir: string; timestamp: number } | null>(null);

    const [characterInfo, setCharacterInfo] = useState<import('../../types').CharacterInfo>({
        name: null, level: 0, xp: 0, xpMax: 0, tp: 0, tpMax: 0,
        race: '', subrace: '', subclass: '', class: '', gold: 0,
        alignment: '', warPoints: 0, actsForWar: 0,
        stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, wil: 0, per: 0 }
    });

    const [quests, setQuests] = useState<QuestData>({
        lastUpdated: 0,
        activeQuests: []
    });

    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    // Group members parsed from snooped GMCP in spectate mode. Separate from the
    // spectator's own groupMembers so the two populations don't cross-contaminate.
    const [spectateGroupMembers, setSpectateGroupMembers] = useState<GroupMember[]>([]);

    const [xpHistory, setXpHistory] = useState<{ old: number; new: number }>({ old: 0, new: 0 });
    const [xpEvent, setXpEvent] = useState(0);

    const triggerXpTicker = useCallback(() => {
        setXpEvent(Date.now());
    }, []);

    const [hitFlashEvent, setHitFlashEvent] = useState(0);
    const [oppHitFlashEvent, setOppHitFlashEvent] = useState(0);
    const triggerHitFlash = useCallback(() => setHitFlashEvent(c => c + 1), []);
    const triggerOppHitFlash = useCallback(() => setOppHitFlashEvent(c => c + 1), []);

    useEffect(() => {
        setXpHistory(prev => {
            if (prev.new !== characterInfo.xp) {
                // If it's the first time we get XP, set both to the same value to avoid 0 -> XP jump
                if (prev.new === 0) return { old: characterInfo.xp, new: characterInfo.xp };
                return { old: prev.new, new: characterInfo.xp };
            }
            return prev;
        });
    }, [characterInfo.xp]);

    const [mumeEditState, setMumeEditState] = useState({
        isOpen: false,
        title: '',
        text: '',
        key: ''
    });

    const effectiveInCombat = useMemo(() => {
        return settings.isSpectateMode ? spectateInCombat : rawInCombat;
    }, [settings.isSpectateMode, spectateInCombat, rawInCombat]);

    const inCombatRef = useRef(effectiveInCombat);
    useEffect(() => { inCombatRef.current = effectiveInCombat; }, [effectiveInCombat]);

    // Account Selection State
    const [accountState, setAccountState] = useState<import('../../types').AccountState>({
        stage: 'none',
        characters: [],
        selectedCharacter: null,
        lastCreatedCharacterName: undefined
    });
    const accountStageRef = useRef<import('../../types').AccountStage>('none');
    useEffect(() => { accountStageRef.current = accountState.stage; }, [accountState.stage]);

    const handleSaveMumeEdit = useCallback((text: string) => {
        if (typeof window !== 'undefined' && (window as any).mumeTelnet?.sendGmcp) {
            (window as any).mumeTelnet.sendGmcp('Mume.Client.Edit', JSON.stringify({
                key: mumeEditState.key,
                text: text
            }));
        }
        setMumeEditState(prev => ({ ...prev, isOpen: false }));
    }, [mumeEditState.key]);

    const vitals = useMemo(() => ({
        stats, setStats,
        target, setTarget,
        activePrompt, setActivePrompt,
        rumble, setRumble,
        deathRoomId, setDeathRoomId,
        heldButton, setHeldButton,
        isMendingMode, setIsMendingMode,
        mendingTarget, setMendingTarget,
        playerHealthStatus, setPlayerHealthStatus,
        opponentHealthStatus, setOpponentHealthStatus,
        opponentName, setOpponentName,
        opponentId, setOpponentId,
        bufferHealthStatus, setBufferHealthStatus,
        bufferName, setBufferName,
        pendingMove, setPendingMove,
        characterInfo, setCharacterInfo,
        groupMembers, setGroupMembers,
        xpHistory, xpEvent, triggerXpTicker,
        hitFlashEvent, oppHitFlashEvent, triggerHitFlash, triggerOppHitFlash,
        accountState, setAccountState,
        spectateStats, setSpectateStats,
        spectateHealthStatus, setSpectateHealthStatus,
        spectateOpponentName, setSpectateOpponentName,
        spectateOpponentStatus, setSpectateOpponentStatus,
        spectateQueue, setSpectateQueue,
        lastSnoopStartTime, setLastSnoopStartTime
    }), [stats, target, activePrompt, rumble, deathRoomId, heldButton, isMendingMode, mendingTarget,
        playerHealthStatus, opponentHealthStatus, opponentName, opponentId, bufferHealthStatus, bufferName, pendingMove, characterInfo, groupMembers,
        xpHistory, xpEvent, triggerXpTicker, hitFlashEvent, oppHitFlashEvent, accountState,
        spectateStats, spectateHealthStatus, spectateOpponentName, spectateOpponentStatus]);

    const game = useMemo(() => ({
        inCombat: effectiveInCombat, setInCombat,
        status, setStatus,
        gameState, setGameState,
        isPasswordMode, setIsPasswordMode,
        characterName, setCharacterName,
        mood, setMood,
        spellSpeed, setSpellSpeed,
        alertness, setAlertness,
        playerPosition: settings.isSpectateMode ? spectatePosition : playerPosition, 
        setPlayerPosition, playerPositionRef,
        isRiding, setIsRiding, isRidingRef,
        isNewbieMode, setIsNewbieMode,
        isSoundEnabled, setIsSoundEnabled,
        isMmapperMode, setIsMmapperMode,
        theme, setTheme,
        inCombatRef,
        showControls, setShowControls,
        roomPlayers, setRoomPlayers,
        roomNpcs, setRoomNpcs,
        roomItems, setRoomItems,
        currentTerrain, setCurrentTerrain,
        ui, setUI,
        setIsStatsOpen, setIsEquipmentOpen, setIsInventoryOpen, setIsCharacterOpen, setIsMapExpanded, setIsSetManagerOpen, setIsPlayersOpen,
        lighting: settings.isSpectateMode ? spectateLighting : lighting, setLighting,
        lightningEnabled, setLightningEnabled,
        weather: settings.isSpectateMode ? spectateWeather : weather, setWeather,
        isFoggy: settings.isSpectateMode ? spectateIsFoggy : isFoggy, setIsFoggy,
        abilities, setAbilities,
        characterClass, setCharacterClass,
        actions, setActions, actionsRef,
        inventoryLines, setInventoryLines,
        statsLines, setStatsLines,
        infoLines, setInfoLines,
        scoreLines, setScoreLines,
        questLines, setQuestLines,
        practiceLines, setPracticeLines,
        whoLines, setWhoLines,
        whereLines, setWhereLines,
        eqLines, setEqLines,
        displayInventoryLines: optimisticInventoryLines ?? inventoryLines,
        displayEqLines: optimisticEqLines ?? eqLines,
        applyOptimisticChange,
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, isWaitingForInfo, pendingDrawerContainerRef,
        autoConnect, setAutoConnect,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        showOrganicTerrain, setShowOrganicTerrain,
        parley, setParley,
        whoList, setWhoList,
        whereList, setWhereList,
        roomName, setRoomName, roomNameRef,
        roomDesc, setRoomDesc, roomDescRef,
        roomExits, setRoomExits,
        roomZone, setRoomZone,
        inlineCategories, setInlineCategories,
        isHighlighterEnabled, setIsHighlighterEnabled,
        isBloomEnabled, setIsBloomEnabled,
        isTimestampEnabled, setIsTimestampEnabled,
        isSpectateMode: settings.isSpectateMode,
        setIsSpectateMode: settings.setIsSpectateMode,
        spectateTargetId, setSpectateTargetId,
        favorites, setFavorites,
        activeDragData, setActiveDragData,
        heldButton, setHeldButton,
        popoverState, setPopoverState,
        discoveredItems, setDiscoveredItems,
        zoneMusic, setZoneMusic,
        isTrackpadModifierActive, setIsTrackpadModifierActive,
        setPlayerHealthStatus: vitals.setPlayerHealthStatus,
        setOpponentHealthStatus: vitals.setOpponentHealthStatus,
        setBufferHealthStatus: vitals.setBufferHealthStatus,
        opponentName,
        opponentId,
        setOpponentName,
        setOpponentId,
        setBufferName: vitals.setBufferName,
        setQuests,
        quests,
        groupMembers,
        setGroupMembers,
        spectateGroupMembers,
        setSpectateGroupMembers,
        mumeEditState,
        setMumeEditState,
        handleSaveMumeEdit,
        executeCommandRef,
        entities,
        setEntities,
        registerEntity,
        getEntity,
        clearRegistry,
        selectedObjectIds, toggleObjectSelection, clearObjectSelection,
        spectatePosition, setSpectatePosition,
        spectateWaiting, setSpectateWaiting,
        spectateRoomName, setSpectateRoomName,
        spectateRoomDesc, setSpectateRoomDesc,
        spectateTerrain, setSpectateTerrain,
        spectateRoomZone, setSpectateRoomZone,
        spectateLighting, setSpectateLighting,
        spectateWeather, setSpectateWeather,
        spectateIsFoggy, setSpectateIsFoggy,
        spectateInCombat, setSpectateInCombat,
        spectateCharacterName, setSpectateCharacterName,
        handleTabClick, toggleMap,

        spectateStats, setSpectateStats,
        spectateHealthStatus, setSpectateHealthStatus,
        spectateOpponentName, setSpectateOpponentName,
        spectateOpponentStatus, setSpectateOpponentStatus,
        spectateQueue, setSpectateQueue,
        lastSnoopStartTime, setLastSnoopStartTime,
        fontFamily, setFontFamily,
        accountStageRef
    }), [
        effectiveInCombat, status, gameState, isPasswordMode, characterName, mood, spellSpeed, alertness, playerPosition, isRiding,
        isNewbieMode, setIsNewbieMode, isSoundEnabled, isMmapperMode, theme, showControls,
        roomPlayers, roomNpcs, roomItems, currentTerrain, ui, setIsCharacterOpen,
        setIsEquipmentOpen, setIsInventoryOpen, setIsMapExpanded, setIsSetManagerOpen, lighting,
        lightningEnabled, weather, isFoggy, abilities, characterClass, actions, handleTabClick, toggleMap,
        inventoryLines, statsLines, scoreLines, questLines, practiceLines, whoLines, whereLines, eqLines, optimisticInventoryLines, optimisticEqLines, applyOptimisticChange, autoConnect, showDebugEchoes, uiMode,
        disable3dScroll, disableSmoothScroll, isImmersionMode, roomName, roomDesc, roomExits, roomZone,
        handleTabClick, toggleMap,
        inlineCategories, isHighlighterEnabled, isBloomEnabled, favorites, activeDragData, heldButton,
        parley, whoList, whereList, popoverState, discoveredItems, zoneMusic,
        quests, groupMembers, spectateGroupMembers, mumeEditState, handleSaveMumeEdit, executeCommandRef,
        entities, setEntities, registerEntity, getEntity, clearRegistry, selectedObjectIds, toggleObjectSelection, clearObjectSelection,
        settings.isSpectateMode, settings.setIsSpectateMode, spectateTargetId, setSpectateTargetId,
        isTimestampEnabled, setIsTimestampEnabled,
        spectatePosition, spectateWaiting, spectateRoomName, 
        spectateTerrain, spectateRoomZone, spectateLighting, spectateWeather, spectateIsFoggy,
        spectateInCombat, spectateCharacterName,
        spectateStats, setSpectateStats, spectateHealthStatus, spectateOpponentName, spectateOpponentStatus,
        spectateQueue, setSpectateQueue, lastSnoopStartTime, setLastSnoopStartTime,
        opponentName, opponentId, fontFamily, setFontFamily, accountStageRef
    ]);


    return { vitals, game };
};
