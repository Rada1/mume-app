import { ReactNode, SetStateAction, Dispatch, RefObject, MutableRefObject, ChangeEvent, FormEvent, MouseEvent } from 'react';
import {
    GameStats, PopoverState, Message, MessageType, WeatherType,
    LightingType, SoundTrigger, TeleportTarget, CustomButton,
    DrawerLine, DeathStage, GameAction, SpatButton
} from '../../types';
import { useButtons } from '../../hooks/useButtons';
import { useJoystick } from '../../hooks/useJoystick';
import { useButtonEditor } from '../../hooks/useButtonEditor';
import { useViewport } from '../../hooks/useViewport';
import { useEnvironment } from '../../hooks/useEnvironment';
import { MapperRef } from '../../components/Mapper/mapperTypes';

export interface VitalsContextType {
    stats: GameStats;
    setStats: Dispatch<SetStateAction<GameStats>>;
    target: string | null;
    setTarget: (val: string | null) => void;
    activePrompt: string;
    setActivePrompt: (prompt: string) => void;
    rumble: boolean;
    setRumble: (val: boolean) => void;
    hitFlash: boolean;
    setHitFlash: (val: boolean) => void;
    deathStage: DeathStage;
    setDeathStage: (val: DeathStage) => void;
}

export interface GameContextType {
    // High-frequency but log-related
    inCombat: boolean;
    setInCombat: (val: boolean, force?: boolean) => void;
    status: 'connected' | 'disconnected' | 'connecting';
    setStatus: (val: 'connected' | 'disconnected' | 'connecting') => void;
    characterName: string | null;
    setCharacterName: (name: string | null) => void;

    // Settings & Mode
    isNoviceMode: boolean;
    setIsNoviceMode: (val: boolean) => void;
    isSoundEnabled: boolean;
    setIsSoundEnabled: (val: boolean) => void;
    isMapBlobsEnabled: boolean;
    setIsMapBlobsEnabled: (val: boolean) => void;
    isMmapperMode: boolean;
    setIsMmapperMode: (val: boolean) => void;
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    showControls: boolean;
    setShowControls: (val: boolean) => void;
    hasSeenOnboarding: boolean;
    setHasSeenOnboarding: (val: boolean) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;

    mood: string;
    setMood: (val: string) => void;
    spellSpeed: string;
    setSpellSpeed: (val: string) => void;
    alertness: string;
    setAlertness: (val: string) => void;
    playerPosition: string;
    setPlayerPosition: (val: string) => void;

    // Environmental state
    lighting: LightingType;
    setLighting: Dispatch<SetStateAction<LightingType>>;
    lightningEnabled: boolean;
    setLightningEnabled: (val: boolean) => void;
    weather: WeatherType;
    setWeather: Dispatch<SetStateAction<WeatherType>>;
    isFoggy: boolean;
    setIsFoggy: (val: boolean) => void;

    // Room Info
    roomPlayers: string[];
    setRoomPlayers: Dispatch<SetStateAction<string[]>>;
    roomNpcs: string[];
    setRoomNpcs: Dispatch<SetStateAction<string[]>>;
    roomItems: string[];
    setRoomItems: Dispatch<SetStateAction<string[]>>;
    currentTerrain: string;
    setCurrentTerrain: (terrain: string) => void;
    roomName: string | null;
    roomNameRef: RefObject<string | null>;

    // Shared UI state
    ui: {
        drawer: 'none' | 'character' | 'items';
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    };
    setUI: Dispatch<SetStateAction<{
        drawer: 'none' | 'character' | 'items';
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    }>>;

    popoverState: PopoverState | null;
    setPopoverState: (val: PopoverState | null) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    settingsTab: 'general' | 'sound' | 'actions' | 'help';
    setSettingsTab: (val: 'general' | 'sound' | 'actions' | 'help') => void;
    accentColor: string;
    setAccentColor: (val: string) => void;
    abilities: Record<string, number>;
    setAbilities: Dispatch<SetStateAction<Record<string, number>>>;
    actions: GameAction[];
    setActions: Dispatch<SetStateAction<GameAction[]>>;
    characterClass: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none';
    setCharacterClass: (val: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none') => void;

    // Helpers for UI
    setIsCharacterOpen: (open: boolean) => void;
    setIsItemsDrawerOpen: (open: boolean) => void;
    setIsMapExpanded: (open: boolean) => void;
    setIsSetManagerOpen: (open: boolean) => void;

    detectLighting: (symbol: string) => void;
    soundTriggersRef: RefObject<SoundTrigger[]>;
    isSoundEnabledRef: RefObject<boolean>;
    actionsRef: RefObject<GameAction[]>;

    teleportTargets: TeleportTarget[];
    setTeleportTargets: (val: TeleportTarget[] | ((prev: TeleportTarget[]) => TeleportTarget[])) => void;

    // GMCP Handlers
    onRoomInfo?: (data: any) => void;
    setOnRoomInfo: (fn: (data: any) => void) => void;
    onRoomUpdateExits?: (data: any) => void;
    setOnRoomUpdateExits: (fn: (data: any) => void) => void;
    onCharVitals?: (data: any) => void;
    setOnCharVitals: (fn: (data: any) => void) => void;
    onRoomPlayers?: (data: any) => void;
    setOnRoomPlayers: (fn: (data: any) => void) => void;
    onRoomNpcs?: (data: any) => void;
    setOnRoomNpcs: (fn: (data: any) => void) => void;
    onRoomItems?: (data: any) => void;
    setOnRoomItems: (fn: (data: any) => void) => void;
    onAddPlayer?: (data: any) => void;
    setOnAddPlayer: (fn: (data: any) => void) => void;
    onAddNpc?: (data: any) => void;
    setOnAddNpc: (fn: (data: any) => void) => void;
    onRemovePlayer?: (data: any) => void;
    setOnRemovePlayer: (fn: (data: any) => void) => void;
    onRemoveNpc?: (data: any) => void;
    setOnRemoveNpc: (fn: (data: any) => void) => void;
    onOpponentChange?: (name: string | null) => void;
    setOnOpponentChange: (fn: (name: string | null) => void) => void;

    // Messages
    messages: Message[];
    setMessages: Dispatch<SetStateAction<Message[]>>;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean) => void;
    addSystemMessage: (text: string) => void;
    isCombatLine: (text: string) => boolean;
    isCommunicationLine: (text: string) => boolean;
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean) => string;

    // Settings
    bgImage: string;
    setBgImage: Dispatch<SetStateAction<string>>;
    connectionUrl: string;
    setConnectionUrl: Dispatch<SetStateAction<string>>;
    loginName: string;
    setLoginName: Dispatch<SetStateAction<string>>;
    loginPassword: string;
    setLoginPassword: Dispatch<SetStateAction<string>>;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    soundTriggers: SoundTrigger[];
    setSoundTriggers: Dispatch<SetStateAction<SoundTrigger[]>>;
    newSoundPattern: string;
    setNewSoundPattern: Dispatch<SetStateAction<string>>;
    newSoundRegex: boolean;
    setNewSoundRegex: Dispatch<SetStateAction<boolean>>;
    handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
    exportSettings: () => any;
    exportSettingsFile: (buttons: CustomButton[]) => void;
    importSettings: (e: ChangeEvent<HTMLInputElement>, setIsSettingsOpen: (v: boolean) => void) => void;
    handleSoundUpload: (e: ChangeEvent<HTMLInputElement>) => void;
    handleMmapperModeChange: (enabled: boolean) => void;

    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    handleSend: (e?: FormEvent) => void;
    handleInputSwipe: (dir: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    handleButtonClick: (button: CustomButton, e: MouseEvent, context?: string) => void;
    handleLogClick: (e: MouseEvent) => void;
    handleLogDoubleClick: (e: MouseEvent) => void;
    handleDragStart: (e: React.DragEvent) => void;
    mapperRef: RefObject<MapperRef>;

    // Parser State
    inventoryLines: DrawerLine[];
    statsLines: DrawerLine[];
    eqLines: DrawerLine[];
    setInventoryLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setStatsLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setEqLines: Dispatch<SetStateAction<DrawerLine[]>>;

    captureStage: MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'none'>;
    isDrawerCapture: MutableRefObject<number>;
    isSilentCapture: MutableRefObject<number>;
    isWaitingForStats: MutableRefObject<boolean>;
    isWaitingForEq: MutableRefObject<boolean>;
    isWaitingForInv: MutableRefObject<boolean>;

    // Network & Parser Engines
    telnet: any;
    parser: any;

    // Sound & Haptics
    playSound: (buffer: AudioBuffer) => void;
    triggerHaptic: (ms: number) => void;

    // Low-level callback registration
    setDetectLighting: (fn: (text: string) => void) => void;
    setPlaySound: (fn: (buffer: AudioBuffer) => void) => void;
    setTriggerHaptic: (fn: (ms: number) => void) => void;

    // Major hook systems
    btn: ReturnType<typeof useButtons>;
    joystick: ReturnType<typeof useJoystick>;
    editor: ReturnType<typeof useButtonEditor>;
    containerRef: RefObject<HTMLDivElement>;
    viewport: ReturnType<typeof useViewport>;
    env: ReturnType<typeof useEnvironment>;
    audioCtxRef: MutableRefObject<AudioContext | null>;
    setSettings: Record<string, import('../../types').ButtonSetSettings>;
    setSetSettings: Dispatch<SetStateAction<Record<string, import('../../types').ButtonSetSettings>>>;

    draggedTarget: { name: string; type: string; x: number; y: number } | null;
    setDraggedTarget: Dispatch<SetStateAction<{ name: string; type: string; x: number; y: number } | null>>;

    spatButtons: SpatButton[];
    setSpatButtons: Dispatch<SetStateAction<SpatButton[]>>;
    triggerSpitManual: (b: CustomButton) => void;
}
