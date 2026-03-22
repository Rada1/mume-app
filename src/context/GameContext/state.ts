import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { GameStats, LightingType, WeatherType, DeathStage, DrawerLine, GameAction, ParleyState, PopoverState, CombatHealthStatus, QuestData, GroupMember } from '../../types';
import { OptimisticChange } from './types';
import MASTER_SETTINGS from '../../constants/mastersettings.json';
import { DEFAULT_INLINE_CATEGORIES } from '../../utils/categorizationUtils';
import { sanitizeGameTarget } from '../../utils/gameUtils';

export const useGameProviderState = () => {
    // Settings & Mode
    const [isNoviceMode, setIsNoviceMode] = usePersistentState('mud-novice-mode', (MASTER_SETTINGS as any).isNoviceMode ?? false);
    const [isSoundEnabled, setIsSoundEnabled] = usePersistentState('mud-sound-enabled', (MASTER_SETTINGS as any).isSoundEnabled ?? true);
    const [isMmapperMode, setIsMmapperMode] = usePersistentState('mud-mmapper-mode', false);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('mud-theme', 'dark');
    const [showControls, setShowControls] = usePersistentState<boolean>('mud-show-controls', (() => {
        // If there's a stored preference, use it. Otherwise default to false on desktop, true on mobile.
        const stored = localStorage.getItem('mud-show-controls');
        if (stored !== null) return JSON.parse(stored) as boolean;
        const isMobile = window.matchMedia('(pointer: coarse)').matches;
        return isMobile;
    })());
    const [autoConnect, setAutoConnect] = usePersistentState('mud-auto-connect', (MASTER_SETTINGS as any).autoConnect ?? true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = usePersistentState('mud-has-seen-onboarding', false);
    const [showDebugEchoes, setShowDebugEchoes] = usePersistentState('mud-show-debug-echoes', false);
    const [uiMode, setUiMode] = usePersistentState<any>('mud-ui-mode', (MASTER_SETTINGS as any).uiMode ?? 'auto');
    const [disable3dScroll, setDisable3dScroll] = usePersistentState('mud-disable-3d-scroll', (MASTER_SETTINGS as any).disable3dScroll ?? false);
    const [disableSmoothScroll, setDisableSmoothScroll] = usePersistentState('mud-disable-smooth-scroll', (MASTER_SETTINGS as any).disableSmoothScroll ?? false);
    const [isImmersionMode, setIsImmersionMode] = usePersistentState('mud-immersion-mode', (MASTER_SETTINGS as any).isImmersionMode ?? true);
    const [isMobileBrevityMode, setIsMobileBrevityMode] = usePersistentState('mud-mobile-brevity', false);
    const [showLegacyButtons, setShowLegacyButtons] = usePersistentState('mud-show-legacy-buttons', false);
    const [showOrganicTerrain, setShowOrganicTerrain] = usePersistentState('mud-show-organic-terrain', true);
    const [inlineCategories, setInlineCategories] = usePersistentState<import('../../types').InlineCategoryConfig[]>('mud-inline-categories', (MASTER_SETTINGS as any).inlineCategories || DEFAULT_INLINE_CATEGORIES);
    const [isHighlighterEnabled, setIsHighlighterEnabled] = usePersistentState('mud-highlighter-enabled', true);
    const [isCrtEnabled, setIsCrtEnabled] = usePersistentState('mud-crt-enabled', false);
    const [isBloomEnabled, setIsBloomEnabled] = usePersistentState('mud-bloom-enabled', false);
    const [favorites, setFavorites] = usePersistentState<string[]>('mud-favorites', []);

    // Core Game State
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
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
    const [inCombat, _setInCombat] = useState(false);
    const inCombatRef = useRef(false);
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
            // Start the exit latch only if one isn't already running.
            // This prevents repeated no-opponent prompt calls from resetting the clock.
            combatTimeoutRef.current = setTimeout(() => {
                _setInCombat(false);
                combatTimeoutRef.current = null;
            }, 6000);
        }
    }, []);

    useEffect(() => { inCombatRef.current = inCombat; }, [inCombat]);

    useEffect(() => {
        return () => {
            if (combatTimeoutRef.current) clearTimeout(combatTimeoutRef.current);
        };
    }, []);

    const [characterName, setCharacterName] = useState<string | null>(null);
    const [parley, setParley] = useState<ParleyState>({ active: false, command: 'tell', target: null });
    const [whoList, setWhoList] = useState<string[]>([]);
    const [whereList, setWhereList] = useState<import('../../types').WhereEntry[]>([]);
    const [roomPlayers, setRoomPlayers] = useState<import('../../types').GmcpOccupant[]>([]);
    const [roomNpcs, setRoomNpcs] = useState<import('../../types').GmcpOccupant[]>([]);
    const [roomItems, setRoomItems] = useState<import('../../types').GmcpOccupant[]>([]);
    const [currentTerrain, setCurrentTerrain] = useState<string>('city');
    const [roomName, _setRoomName] = useState<string | null>(null);
    const [roomExits, setRoomExits] = useState<string[]>([]);
    const roomNameRef = useRef<string | null>(null);
    const setRoomName = useCallback((name: string | null) => {
        roomNameRef.current = name;
        _setRoomName(name);
    }, []);
    // Still keep the effect for sync if needed by other components
    useEffect(() => { roomNameRef.current = roomName; }, [roomName]);

    // UI state
    const [ui, setUI] = useState<{
        drawer: 'none' | 'stats' | 'items' | 'character' | 'players';
        isDrawerPeeking: boolean;
        peekingDrawer: 'none' | 'stats' | 'items' | 'character' | 'players' | 'map';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    }>(() => {
        const isMobileInitial = typeof window !== 'undefined' && 
            (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
            
        return {
            drawer: 'none',
            isDrawerPeeking: false,
            peekingDrawer: 'none',
            setManagerOpen: false,
            mapExpanded: !isMobileInitial, // Open by default on desktop
            isMenuOpen: false,
            isSetMenuOpen: false,
            menuView: 'main'
        };
    });

    const executeCommandRef = useRef<(cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void>(() => { });

    const setIsStatsOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'stats') {
                // Fetch fresh data only when OPENING the drawer
                // Use a short delay if needed to avoid blocking UI transition
                setTimeout(() => {
                    executeCommandRef.current?.('stat', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('at', true, true, true, true), 100);
                }, 50);
            }
            return { ...prev, drawer: open ? 'stats' : 'none' };
        });
    }, []);

    const setIsCharacterOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'character') {
                setTimeout(() => {
                    executeCommandRef.current?.('info', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('score', true, true, true, true), 100);
                    setTimeout(() => executeCommandRef.current?.('at', true, true, true, true), 200);
                    setTimeout(() => executeCommandRef.current?.('look self', true, true, true, true), 300);
                    setTimeout(() => executeCommandRef.current?.('whois', true, true, true, true), 400);
                    setTimeout(() => executeCommandRef.current?.('quest', true, true, true, true), 500);
                    setTimeout(() => executeCommandRef.current?.('practice', true, true, true, true), 600);
                }, 50);
            }
            return { ...prev, drawer: open ? 'character' : 'none' };
        });
    }, []);

    const setIsItemsDrawerOpen = useCallback((open: boolean) => {
        setUI(prev => {
            if (open && prev.drawer !== 'items') {
                setTimeout(() => {
                    executeCommandRef.current?.('inv', true, true, true, true);
                    setTimeout(() => executeCommandRef.current?.('eq', true, true, true, true), 150);
                }, 50);
            }
            return { ...prev, drawer: open ? 'items' : 'none' };
        });
    }, []);
    const setIsPlayersOpen = useCallback((open: boolean) => {
        setUI(prev => ({ ...prev, drawer: open ? 'players' : 'none' }));
    }, []);

    const setIsMapExpanded = useCallback((open: boolean) => setUI(prev => ({ ...prev, mapExpanded: open })), []);
    const setIsSetManagerOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, setManagerOpen: open })), []);

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

    // Save changes to character-specific keys
    useEffect(() => {
        const key = characterName ? `mud-abilities-${characterName.toLowerCase()}` : 'mud-abilities';
        localStorage.setItem(key, JSON.stringify(abilities));
    }, [abilities, characterName]);

    useEffect(() => {
        const key = characterName ? `mud-character-class-${characterName.toLowerCase()}` : 'mud-character-class';
        localStorage.setItem(key, JSON.stringify(characterClass));
    }, [characterClass, characterName]);

    const [actions, setActions] = useState<GameAction[]>((MASTER_SETTINGS as any).actions || []);
    const actionsRef = useRef(actions);
    useEffect(() => { actionsRef.current = actions; }, [actions]);
    const [rumble, setRumble] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [deathStage, setDeathStage] = useState<DeathStage>('none');
    const [mood, setMood] = useState('normal');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');
    const [activePrompt, setActivePrompt] = useState("");
    const [playerPosition, setPlayerPosition] = useState('standing');
    const [popoverState, setPopoverState] = useState<PopoverState | null>(null);

    // Global listener for replaying onboarding
    useEffect(() => {
        const handleReplay = () => {
            console.log('[Onboarding] Triggering replay...');
            setHasSeenOnboarding(false);
            // Close other UI elements that might block it
            setUI(prev => ({ 
                ...prev, 
                setManagerOpen: false, 
                isMenuOpen: false, 
                drawer: 'none' 
            }));
            // Settings modal is usually managed by useUI in context, 
            // but we can broadcast another event for components to react
            window.dispatchEvent(new CustomEvent('mume-close-settings'));
        };
        window.addEventListener('mume-replay-onboarding', handleReplay);
        return () => window.removeEventListener('mume-replay-onboarding', handleReplay);
    }, [setHasSeenOnboarding]);

    // Parser State
    const [inventoryLines, setInventoryLines] = useState<DrawerLine[]>([]);
    const [statsLines, setStatsLines] = useState<DrawerLine[]>([]);
    const [eqLines, setEqLines] = useState<DrawerLine[]>([]);
    const captureStage = useRef<import('../../types').CaptureStage>('none');

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

        switch (change.type) {
            case 'wear': {
                const sid = change.item.stableId || change.item.id;
                setOptimisticInventoryLines(removeItemAndChildren(currentInv, sid));
                break;
            }
            case 'remove': {
                const newEq = currentEq.filter(l => l.id !== change.item.id);
                const invItem: DrawerLine = { ...change.item, prefix: undefined, prefixHtml: undefined, depth: 0, parentItemId: undefined, parentItemNoun: undefined };
                setOptimisticEqLines(newEq);
                setOptimisticInventoryLines([...currentInv, invItem]);
                break;
            }
            case 'drop':
            case 'give': {
                const sid = change.item.stableId || change.item.id;
                if (change.from === 'inv') {
                    setOptimisticInventoryLines(removeItemAndChildren(currentInv, sid));
                } else {
                    setOptimisticEqLines(currentEq.filter(l => l.id !== change.item.id));
                }
                break;
            }
            case 'get': {
                const sid = change.item.stableId || change.item.id;
                const withoutItem = removeItemAndChildren(currentInv, sid);
                const unnested: DrawerLine = { ...change.item, depth: 0, parentItemId: undefined, parentItemNoun: undefined };
                setOptimisticInventoryLines([...withoutItem, unnested]);
                break;
            }
            case 'put': {
                const sid = change.item.stableId || change.item.id;
                const withoutItem = removeItemAndChildren(currentInv, sid);
                const cSid = change.container.stableId || change.container.id;
                const nested: DrawerLine = {
                    ...change.item,
                    depth: (change.container.depth ?? 0) + 1,
                    parentItemId: change.container.context || cSid,
                    parentItemNoun: cSid
                };
                const idx = withoutItem.findIndex(l => l.id === change.container.id);
                const result = [...withoutItem];
                result.splice(idx >= 0 ? idx + 1 : result.length, 0, nested);
                setOptimisticInventoryLines(result);
                break;
            }
        }
    }, []);
    const isDrawerCapture = useRef<number>(0);
    const isSilentCapture = useRef<number>(0);
    const isWaitingForStats = useRef<boolean>(false);
    const isWaitingForEq = useRef<boolean>(false);
    const isWaitingForInv = useRef<boolean>(false);
    // Signals parser to inject container contents into a drawer instead of popover
    const pendingDrawerContainerRef = useRef<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>(null);
    const [activeDragData, setActiveDragData] = useState<any>(null);
    const [heldButton, setHeldButton] = useState<any>(null);
    const [isMendingMode, setIsMendingMode] = useState(false);
    const [mendingTarget, setMendingTarget] = useState<string | null>(null);
    const [discoveredItems, setDiscoveredItems] = useState<string[]>([]);
    const [isTrackpadModifierActive, setIsTrackpadModifierActive] = useState(false);
    
    // Combat Overlay State
    const [playerHealthStatus, setPlayerHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [opponentHealthStatus, setOpponentHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [opponentName, setOpponentName] = useState<string | null>(null);
    const [opponentId, setOpponentId] = useState<string | null>(null);
    const [bufferHealthStatus, setBufferHealthStatus] = useState<CombatHealthStatus | null>(null);
    const [bufferName, setBufferName] = useState<string | null>(null);

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

    const [xpHistory, setXpHistory] = useState<{ old: number; new: number }>({ old: 0, new: 0 });
    const [xpEvent, setXpEvent] = useState(0);

    const triggerXpTicker = useCallback(() => {
        setXpEvent(Date.now());
    }, []);

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
        hitFlash, setHitFlash,
        deathStage, setDeathStage,
        heldButton, setHeldButton,
        isMendingMode, setIsMendingMode,
        mendingTarget, setMendingTarget,
        playerHealthStatus, setPlayerHealthStatus,
        opponentHealthStatus, setOpponentHealthStatus,
        opponentName, setOpponentName,
        opponentId, setOpponentId,
        bufferHealthStatus, setBufferHealthStatus,
        bufferName, setBufferName,
        characterInfo, setCharacterInfo,
        groupMembers, setGroupMembers,
        xpHistory, xpEvent, triggerXpTicker
    }), [stats, target, activePrompt, rumble, hitFlash, deathStage, heldButton, isMendingMode, mendingTarget,
        playerHealthStatus, opponentHealthStatus, opponentName, opponentId, bufferHealthStatus, bufferName, characterInfo, groupMembers,
        xpHistory, xpEvent, triggerXpTicker]);

    const game = useMemo(() => ({
        inCombat, setInCombat,
        status, setStatus,
        characterName, setCharacterName,
        mood, setMood,
        spellSpeed, setSpellSpeed,
        alertness, setAlertness,
        playerPosition, setPlayerPosition,
        isNoviceMode, setIsNoviceMode,
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
        setIsStatsOpen, setIsItemsDrawerOpen, setIsCharacterOpen, setIsMapExpanded, setIsSetManagerOpen, setIsPlayersOpen,
        lighting, setLighting,
        lightningEnabled, setLightningEnabled,
        weather, setWeather,
        isFoggy, setIsFoggy,
        abilities, setAbilities,
        characterClass, setCharacterClass,
        actions, setActions, actionsRef,
        inventoryLines, setInventoryLines,
        statsLines, setStatsLines,
        eqLines, setEqLines,
        displayInventoryLines: optimisticInventoryLines ?? inventoryLines,
        displayEqLines: optimisticEqLines ?? eqLines,
        applyOptimisticChange,
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv, pendingDrawerContainerRef,
        autoConnect, setAutoConnect,
        hasSeenOnboarding, setHasSeenOnboarding,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        isMobileBrevityMode, setIsMobileBrevityMode,
        showLegacyButtons, setShowLegacyButtons,
        showOrganicTerrain, setShowOrganicTerrain,
        parley, setParley,
        whoList, setWhoList,
        whereList, setWhereList,
        roomName, setRoomName, roomNameRef,
        roomExits, setRoomExits,
        inlineCategories, setInlineCategories,
        isHighlighterEnabled, setIsHighlighterEnabled,
        isCrtEnabled, setIsCrtEnabled,
        isBloomEnabled, setIsBloomEnabled,
        favorites, setFavorites,
        activeDragData, setActiveDragData,
        heldButton, setHeldButton,
        popoverState, setPopoverState,
        discoveredItems, setDiscoveredItems,
        isTrackpadModifierActive, setIsTrackpadModifierActive,
        setPlayerHealthStatus: vitals.setPlayerHealthStatus,
        setOpponentHealthStatus: vitals.setOpponentHealthStatus,
        setBufferHealthStatus: vitals.setBufferHealthStatus,
        setOpponentName: vitals.setOpponentName,
        setBufferName: vitals.setBufferName,
        setQuests,
        quests,
        groupMembers,
        setGroupMembers,
        mumeEditState,
        setMumeEditState,
        handleSaveMumeEdit,
        executeCommandRef,
    }), [
        inCombat, status, characterName, mood, spellSpeed, alertness, playerPosition,
        isNoviceMode, isSoundEnabled, isMmapperMode, theme, showControls,
        roomPlayers, roomNpcs, roomItems, currentTerrain, ui, setIsCharacterOpen,
        setIsItemsDrawerOpen, setIsMapExpanded, setIsSetManagerOpen, lighting,
        lightningEnabled, weather, isFoggy, abilities, characterClass, actions,
        inventoryLines, statsLines, eqLines, optimisticInventoryLines, optimisticEqLines, applyOptimisticChange, autoConnect, hasSeenOnboarding, showDebugEchoes, uiMode,
        disable3dScroll, disableSmoothScroll, isImmersionMode, isMobileBrevityMode, showLegacyButtons, roomName, roomExits,
        inlineCategories, isHighlighterEnabled, isCrtEnabled, isBloomEnabled, favorites, activeDragData, heldButton,
        parley, whoList, whereList, popoverState, discoveredItems,
        quests, groupMembers, mumeEditState, handleSaveMumeEdit, executeCommandRef
    ]);

    return { vitals, game };
};
