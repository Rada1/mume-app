import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { GameStats, LightingType, WeatherType, DeathStage, DrawerLine, GameAction } from '../../types';
import MASTER_SETTINGS from '../../constants/mastersettings.json';

export const useGameProviderState = () => {
    // Settings & Mode
    const [isNoviceMode, setIsNoviceMode] = usePersistentState('mud-novice-mode', (MASTER_SETTINGS as any).isNoviceMode ?? false);
    const [isSoundEnabled, setIsSoundEnabled] = usePersistentState('mud-sound-enabled', (MASTER_SETTINGS as any).isSoundEnabled ?? true);
    const [isMmapperMode, setIsMmapperMode] = usePersistentState('mud-mmapper-mode', false);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('mud-theme', 'dark');
    const [showControls, setShowControls] = usePersistentState<boolean>('mud-show-controls', (() => {
        // If there's a stored preference, use it. Otherwise default to true.
        const stored = localStorage.getItem('mud-show-controls');
        if (stored !== null) return JSON.parse(stored) as boolean;
        return true;
    })());
    const [autoConnect, setAutoConnect] = usePersistentState('mud-auto-connect', (MASTER_SETTINGS as any).autoConnect ?? true);
    const [hasSeenOnboarding, setHasSeenOnboarding] = usePersistentState('mud-has-seen-onboarding', false);
    const [showDebugEchoes, setShowDebugEchoes] = usePersistentState('mud-show-debug-echoes', false);
    const [uiMode, setUiMode] = usePersistentState<any>('mud-ui-mode', (MASTER_SETTINGS as any).uiMode ?? 'auto');
    const [disable3dScroll, setDisable3dScroll] = usePersistentState('mud-disable-3d-scroll', (MASTER_SETTINGS as any).disable3dScroll ?? false);
    const [disableSmoothScroll, setDisableSmoothScroll] = usePersistentState('mud-disable-smooth-scroll', (MASTER_SETTINGS as any).disableSmoothScroll ?? false);
    const [isImmersionMode, setIsImmersionMode] = usePersistentState('mud-immersion-mode', (MASTER_SETTINGS as any).isImmersionMode ?? false);

    // Core Game State
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [target, setTarget] = useState<string | null>(null);
    const [stats, setStats] = useState<GameStats>({
        hp: 0, maxHp: 1,
        mana: 0, maxMana: 1,
        move: 0, maxMove: 1,
        wimpy: 0
    });
    const [inCombat, _setInCombat] = useState(false);
    const inCombatRef = useRef(false);

    const setInCombat = useCallback((val: boolean, force: boolean = false) => {
        _setInCombat(val);
    }, []);

    useEffect(() => { inCombatRef.current = inCombat; }, [inCombat]);

    const [characterName, setCharacterName] = useState<string | null>(null);
    const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
    const [roomNpcs, setRoomNpcs] = useState<string[]>([]);
    const [roomItems, setRoomItems] = useState<string[]>([]);
    const [currentTerrain, setCurrentTerrain] = useState<string>('city');
    const [roomName, setRoomName] = useState<string | null>(null);
    const roomNameRef = useRef<string | null>(null);
    useEffect(() => { roomNameRef.current = roomName; }, [roomName]);

    // UI state
    const [ui, setUI] = useState<{
        drawer: 'none' | 'character' | 'items';
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    }>({
        drawer: 'none',
        isDrawerPeeking: false,
        setManagerOpen: false,
        mapExpanded: false,
        isMenuOpen: false,
        isSetMenuOpen: false,
        menuView: 'main'
    });

    const setIsCharacterOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, drawer: open ? 'character' : 'none' })), []);
    const setIsItemsDrawerOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, drawer: open ? 'items' : 'none' })), []);
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

    // Parser State
    const [inventoryLines, setInventoryLines] = useState<DrawerLine[]>([]);
    const [statsLines, setStatsLines] = useState<DrawerLine[]>([]);
    const [eqLines, setEqLines] = useState<DrawerLine[]>([]);
    const captureStage = useRef<'stat' | 'eq' | 'inv' | 'practice' | 'none'>('none');
    const isDrawerCapture = useRef<number>(0);
    const isSilentCapture = useRef<number>(0);
    const isWaitingForStats = useRef<boolean>(false);
    const isWaitingForEq = useRef<boolean>(false);
    const isWaitingForInv = useRef<boolean>(false);

    const vitals = useMemo(() => ({
        stats, setStats,
        target, setTarget,
        activePrompt, setActivePrompt,
        rumble, setRumble,
        hitFlash, setHitFlash,
        deathStage, setDeathStage,
    }), [stats, target, activePrompt, rumble, hitFlash, deathStage]);

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
        setIsCharacterOpen, setIsItemsDrawerOpen, setIsMapExpanded, setIsSetManagerOpen,
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
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        autoConnect, setAutoConnect,
        hasSeenOnboarding, setHasSeenOnboarding,
        showDebugEchoes, setShowDebugEchoes,
        uiMode, setUiMode,
        disable3dScroll, setDisable3dScroll,
        disableSmoothScroll, setDisableSmoothScroll,
        isImmersionMode, setIsImmersionMode,
        roomName, setRoomName, roomNameRef
    }), [
        inCombat, status, characterName, mood, spellSpeed, alertness, playerPosition,
        isNoviceMode, isSoundEnabled, isMmapperMode, theme, showControls,
        roomPlayers, roomNpcs, roomItems, currentTerrain, ui, setIsCharacterOpen,
        setIsItemsDrawerOpen, setIsMapExpanded, setIsSetManagerOpen, lighting,
        lightningEnabled, weather, isFoggy, abilities, characterClass, actions,
        inventoryLines, statsLines, eqLines, autoConnect, hasSeenOnboarding, showDebugEchoes, uiMode, 
        disable3dScroll, disableSmoothScroll, isImmersionMode, roomName
    ]);

    return { vitals, game };
};
