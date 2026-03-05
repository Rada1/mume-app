import { useState, useRef, useEffect, useCallback } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState';
import { GameStats, LightingType, WeatherType, DeathStage, DrawerLine, Action } from '../../types';

export const useGameProviderState = () => {
    // Settings & Mode
    const [isNoviceMode, setIsNoviceMode] = usePersistentState('mud-novice-mode', false);
    const [isSoundEnabled, setIsSoundEnabled] = usePersistentState('mud-sound-enabled', true);
    const [isMmapperMode, setIsMmapperMode] = usePersistentState('mud-mmapper-mode', false);
    const [theme, setTheme] = usePersistentState<'light' | 'dark'>('mud-theme', 'dark');
    const [showControls, setShowControls] = usePersistentState<boolean | null>('mud-show-controls', null);

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
        drawer: 'none' | 'inventory' | 'character' | 'right';
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

    const setIsInventoryOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, drawer: open ? 'inventory' : 'none' })), []);
    const setIsCharacterOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, drawer: open ? 'character' : 'none' })), []);
    const setIsRightDrawerOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, drawer: open ? 'right' : 'none' })), []);
    const setIsMapExpanded = useCallback((open: boolean) => setUI(prev => ({ ...prev, mapExpanded: open })), []);
    const setIsSetManagerOpen = useCallback((open: boolean) => setUI(prev => ({ ...prev, setManagerOpen: open })), []);

    // Environmental state
    const [lighting, setLighting] = useState<LightingType>('none');
    const [lightningEnabled, setLightningEnabled] = useState(false);
    const [weather, setWeather] = useState<WeatherType>('none');
    const [isFoggy, setIsFoggy] = useState(false);

    // Other state
    const [abilities, setAbilities] = usePersistentState<Record<string, number>>('mud-abilities', {});
    const [characterClass, setCharacterClass] = usePersistentState<'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none'>('mud-character-class', 'none');
    const [actions, setActions] = useState<Action[]>([]);
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
        setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen, setIsMapExpanded, setIsSetManagerOpen,
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
        captureStage, isDrawerCapture, isWaitingForStats, isWaitingForEq, isWaitingForInv
    };
};
