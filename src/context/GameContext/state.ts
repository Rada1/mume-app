import { useState, useRef, useEffect, useCallback } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { GameStats, LightingType, WeatherType, DeathStage, DrawerLine, GameAction } from '../../types';

export const useGameProviderState = () => {
    // Settings & Mode
    const [isNoviceMode, setIsNoviceMode] = usePersistentState('mud-novice-mode', false);
    const [isSoundEnabled, setIsSoundEnabled] = usePersistentState('mud-sound-enabled', true);
    const [isMmapperMode, setIsMmapperMode] = usePersistentState('mud-mmapper-mode', false);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('mud-theme', 'dark');
    const [showControls, setShowControls] = usePersistentState<boolean>('mud-show-controls', (() => {
        // If there's a stored preference, use it. Otherwise default to true on mobile, false on desktop.
        const stored = localStorage.getItem('mud-show-controls');
        if (stored !== null) return JSON.parse(stored) as boolean;
        return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    })());
    const [autoConnect, setAutoConnect] = usePersistentState('mud-auto-connect', true);

    // Core Game State
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [target, setTarget] = useState<string | null>(null);
    const [stats, setStats] = useState<GameStats>({
        hp: 0, maxHp: 1,
        mana: 0, maxMana: 1,
        move: 0, maxMove: 1,
        wimpy: 0
    });
    const [inCombat, setInCombat] = useState(false);
    const inCombatRef = useRef(false);
    useEffect(() => { inCombatRef.current = inCombat; }, [inCombat]);

    const [characterName, setCharacterName] = useState<string | null>(null);
    const [roomPlayers, setRoomPlayers] = useState<string[]>([]);
    const [roomNpcs, setRoomNpcs] = useState<string[]>([]);
    const [roomItems, setRoomItems] = useState<string[]>([]);
    const [currentTerrain, setCurrentTerrain] = useState<string>('city');

    // UI state
    const [ui, setUI] = useState<{
        drawer: 'none' | 'character' | 'items';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    }>({
        drawer: 'none',
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
            if (savedClass) setCharacterClass(JSON.parse(savedClass));
            return;
        }

        const charAbilitiesKey = `mud-abilities-${characterName.toLowerCase()}`;
        const charClassKey = `mud-character-class-${characterName.toLowerCase()}`;

        const savedAbilities = localStorage.getItem(charAbilitiesKey);
        const savedClass = localStorage.getItem(charClassKey);

        if (savedAbilities) setAbilities(JSON.parse(savedAbilities));
        else setAbilities({}); // Reset for new character if nothing saved

        if (savedClass) setCharacterClass(JSON.parse(savedClass) as any);
        else setCharacterClass('none');
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

    const [actions, setActions] = useState<GameAction[]>([]);
    const actionsRef = useRef(actions);
    useEffect(() => { actionsRef.current = actions; }, [actions]);
    const [rumble, setRumble] = useState(false);
    const [hitFlash, setHitFlash] = useState(false);
    const [deathStage, setDeathStage] = useState<DeathStage>('none');
    const [mood, setMood] = useState('normal');
    const [spellSpeed, setSpellSpeed] = useState('normal');
    const [alertness, setAlertness] = useState('normal');
    const [playerPosition, setPlayerPosition] = useState('standing');

    // Parser State
    const [inventoryLines, setInventoryLines] = useState<DrawerLine[]>([]);
    const [statsLines, setStatsLines] = useState<DrawerLine[]>([]);
    const [eqLines, setEqLines] = useState<DrawerLine[]>([]);
    const captureStage = useRef<'stat' | 'eq' | 'inv' | 'practice' | 'none'>('none');
    const isDrawerCapture = useRef<boolean>(false);
    const isSilentCapture = useRef<boolean>(false);
    const isWaitingForStats = useRef<boolean>(false);
    const isWaitingForEq = useRef<boolean>(false);
    const isWaitingForInv = useRef<boolean>(false);

    return {
        isNoviceMode, setIsNoviceMode,
        isSoundEnabled, setIsSoundEnabled,
        isMmapperMode, setIsMmapperMode,
        theme, setTheme,
        status, setStatus,
        target, setTarget,
        stats, setStats,
        inCombat, setInCombat, inCombatRef,
        showControls, setShowControls,
        characterName, setCharacterName,
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
        rumble, setRumble,
        hitFlash, setHitFlash,
        deathStage, setDeathStage,
        mood, setMood,
        spellSpeed, setSpellSpeed,
        alertness, setAlertness,
        playerPosition, setPlayerPosition,
        inventoryLines, setInventoryLines,
        statsLines, setStatsLines,
        eqLines, setEqLines,
        captureStage, isDrawerCapture, isSilentCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        autoConnect, setAutoConnect
    };
};
