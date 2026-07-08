import React, { ReactNode, SetStateAction, Dispatch, RefObject, MutableRefObject, ChangeEvent, FormEvent, MouseEvent } from 'react';
import {
    GameStats, PopoverState, Message, MessageType, WeatherType,
    LightingType, SoundTrigger, TeleportTarget, CustomButton,
    DrawerLine, GameAction, SpatButton, CombatHealthStatus, GroupMember,
    OptimisticChange,
    SessionLog, ActivePrompt, SessionSlot
} from '../../types';
import { CaptureSession, CaptureType, CaptureController } from '../../types/capture';
import { useSessionRecorder } from '../../hooks/useSessionRecorder';
import { useButtons } from '../../hooks/useButtons';
import { useJoystick } from '../../hooks/useJoystick';
import { useButtonEditor } from '../../hooks/useButtonEditor';
import { useViewport } from '../../hooks/useViewport';
import { useEnvironment } from '../../hooks/useEnvironment';
import { MapperRef } from '../../components/Mapper/mapperTypes';
import type { MumeEditState } from '../../stores/useUIStore';

export interface VitalsContextType {
    stats: GameStats;
    setStats: Dispatch<SetStateAction<GameStats>>;
    target: string | null;
    setTarget: (val: string | null) => void;
    activePrompt: ActivePrompt | null;
    setActivePrompt: (prompt: string | ActivePrompt | null) => void;
    rumble: boolean;
    setRumble: (val: boolean) => void;
    deathRoomId: string | null;
    setDeathRoomId: (val: string | null) => void;
    heldButton: {
        isLogDragging?: boolean;
        x?: number;
        y?: number;
        label?: string;
        baseCommand?: string;
        [key: string]: unknown;
    } | null;
    heldButtonRef?: MutableRefObject<{
        isLogDragging?: boolean;
        x?: number;
        y?: number;
        label?: string;
        baseCommand?: string;
        [key: string]: unknown;
    } | null>;
    setHeldButton: (val: {
        isLogDragging?: boolean;
        x?: number;
        y?: number;
        label?: string;
        baseCommand?: string;
        [key: string]: unknown;
    } | null | ((prev: any) => any)) => void;
    isMendingMode: boolean;
    setIsMendingMode: (val: boolean) => void;
    mendingTarget: string | null;
    setMendingTarget: (val: string | null) => void;
    bufferName: string | null;
    setBufferName: (val: string | null) => void;
    playerHealthStatus: CombatHealthStatus | null;
    opponentName: string | null;
    opponentId: string | null;
    setOpponentId: (val: string | null) => void;
    opponentHealthStatus: CombatHealthStatus | null;
    bufferHealthStatus: CombatHealthStatus | null;
    characterInfo: import('../../types').CharacterInfo;
    setCharacterInfo: Dispatch<SetStateAction<import('../../types').CharacterInfo>>;
    groupMembers: GroupMember[];
    setGroupMembers: Dispatch<SetStateAction<GroupMember[]>>;
    pendingMove: { dir: string; timestamp: number } | null;
    setPendingMove: (val: { dir: string; timestamp: number } | null) => void;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentName: (val: string | null) => void;
    xpHistory: { old: number; new: number };
    xpEvent: number;
    triggerXpTicker: (xp?: number) => void;
    tpHistory: { old: number; new: number };
    tpEvent: number;
    triggerTpTicker: (tp?: number) => void;
    gameTime: import('../../types').MumeTime | null;
    setGameTime: Dispatch<SetStateAction<import('../../types').MumeTime | null>>;
    roomName: string | null;
    characterName: string | null;
}

export interface LogData {
    messages?: Message[];
    setMessages?: Dispatch<SetStateAction<Message[]>>;
    addMessage: (type: MessageType, text: string, extra?: any, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string, html?: string, tokens?: any[] }, shopItem?: any, practiceSkill?: any, practiceHeader?: any, isSystem?: boolean, replyTarget?: string, replyCommand?: string, commSender?: string, commAction?: string, commText?: string, commColor?: string, commSenderTokens?: import('../../types').Token[], commTextTokens?: import('../../types').Token[], providedCombatSide?: 'player' | 'opponent' | 'groupmate', providedIsHitImpact?: boolean, providedIsDamageImpact?: boolean, providedIsAvoidDamageImpact?: boolean, providedIsMissImpact?: boolean, providedIsHitterImpact?: boolean, providedIsSnoop?: boolean, providedIsSnoopInput?: boolean, providedIsRipMessage?: boolean, providedIsSocial?: boolean) => void;
    addSystemMessage: (text: string) => void;
    isCombatLine: (text: string) => boolean;
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean, type?: MessageType) => string;
    processMessageTokens?: (textRaw: string) => import('../../types').Token[];
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (info: import('../../stores/useUIStore').SelectedTargetInfo) => void;
    clearObjectSelection: () => void;
    lastCommIdBySenderRef?: React.MutableRefObject<Map<string, string>>;
    messageActivity: number;
    bumpActivity: () => void;
}

export interface LogContextType extends LogData {
    replayMessages: Message[];
    refreshLogHighlights: () => void;
    handleLogPointerDown: (e: React.PointerEvent) => void;
    handleLogPointerUp: (e: React.PointerEvent) => void;
}

export type DrawerType = 'none' | 'account' | 'equipment' | 'character' | 'players' | 'status';

export interface UIContextType {
    ui: {
        drawer: DrawerType;
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        isShaperOpen?: boolean;
        isShaperAccessOpen?: boolean;
        menuView: 'main' | 'availableSets';
        mapMode?: 'edit' | 'play';
        peekingDrawer?: DrawerType;
        peekingSource?: string;
        showMapperToolbar?: boolean;
        managerSelectedSet?: string | null;
        characterTab?: 'info' | 'practice' | 'quests';
    };
    setUI: Dispatch<SetStateAction<{
        drawer: DrawerType;
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        isShaperOpen?: boolean;
        isShaperAccessOpen?: boolean;
        menuView: 'main' | 'availableSets';
        mapMode?: 'edit' | 'play';
        managerSelectedSet: string | null;
        showMapperToolbar?: boolean;
    }>>;
    popoverState: PopoverState | null;
    setPopoverState: (val: PopoverState | null) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    isLibraryOpen: boolean;
    setIsLibraryOpen: (val: boolean) => void;
    settingsTab: 'general' | 'sound' | 'actions' | 'buttons' | 'map' | 'help' | 'replays';
    setSettingsTab: (val: 'general' | 'sound' | 'actions' | 'buttons' | 'map' | 'help' | 'replays') => void;
    setIsMapExpanded: (open: boolean) => void;
    setIsSetManagerOpen: (open: boolean) => void;
    setManagerSelectedSet: (setId: string | null) => void;
    setShowMapperToolbar: (show: boolean) => void;
    gearTab: 'worn' | 'inv' | 'vicinity';
    setGearTab: (tab: 'worn' | 'inv' | 'vicinity') => void;
    playersTab: 'online' | 'nearby' | 'group';
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    charTab: 'info' | 'quests' | 'skills' | 'achievements';
    setCharTab: (tab: 'info' | 'quests' | 'skills' | 'achievements') => void;
    handleTabClick: (drawer: 'none' | 'account' | 'character' | 'players' | 'equipment' | 'status') => void;
    displayInventoryLines: DrawerLine[];
    displayEqLines: DrawerLine[];
    statsLines: DrawerLine[];
    scoreLines: DrawerLine[];
    playerLines: DrawerLine[];
    infoLines: DrawerLine[];
    practiceLines: DrawerLine[];
    questLines: DrawerLine[];
    achievementLines: DrawerLine[];
    whoLines: DrawerLine[];
    whereLines: DrawerLine[];
    setWhoLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setWhereLines: Dispatch<SetStateAction<DrawerLine[]>>;
    toggleMap: () => void;
    characterName: string | null;
    isRecording: boolean;
    duration: number;
    replayer: {
        log: import('../../types').SessionLog | null;
        state: import('../../hooks/useSessionReplayer').ReplayerState;
        loadLog: (log: import('../../hooks/useSessionRecorder').SessionLog) => void;
        clearLog: () => void;
        play: () => void;
        pause: () => void;
        seek: (time: number) => void;
        setSpeed: (speed: number) => void;
        setIsVisible: (visible: boolean) => void;
        setPrivacyMode: (active: boolean) => void;
        setTrimRange: (range: [number | null, number | null]) => void;
        startExport: () => Promise<void>;
        stopExport: () => void;
        exportAsText: () => void;
        performSearch: (query: string) => void;
    };
    spectateBuffer: {
        isLive: boolean;
        isPlaying: boolean;
        displayCutoff: number;
        seekTo: (ts: number) => void;
        play: () => void;
        pause: () => void;
        goBack: (ms: number) => void;
        jumpToLive: () => void;
        clear: () => void;
    };
}

export interface SessionContextType {
    vitals: VitalsContextType;
    game: {
        roomName: string | null;
        setRoomName: Dispatch<SetStateAction<string | null>>;
        roomDesc: string | null;
        setRoomDesc: Dispatch<SetStateAction<string | null>>;
        roomExits: string[];
        setRoomExits: Dispatch<SetStateAction<string[]>>;
        roomZone: string | null;
        setRoomZone: Dispatch<SetStateAction<string | null>>;
        currentTerrain: string;
        setCurrentTerrain: Dispatch<SetStateAction<string>>;
        lighting: LightingType;
        setLighting: Dispatch<SetStateAction<LightingType>>;
        weather: WeatherType;
        setWeather: Dispatch<SetStateAction<WeatherType>>;
        isFoggy: boolean;
        setIsFoggy: Dispatch<SetStateAction<boolean>>;
        inCombat: boolean;
        setInCombat: Dispatch<SetStateAction<boolean>>;
        playerPosition: string;
        setPlayerPosition: Dispatch<SetStateAction<string>>;
        isRiding: boolean;
        setIsRiding: Dispatch<SetStateAction<boolean>>;
        roomPlayers: import('../../types').GmcpOccupant[];
        roomChars?: Record<number, import('../../types').GmcpOccupant>;
        roomNpcs: import('../../types').GmcpOccupant[];
        roomItems: import('../../types').GmcpOccupant[];
        setRoomItems: Dispatch<SetStateAction<import('../../types').GmcpOccupant[]>>;
        inventoryLines: DrawerLine[];
        setInventoryLines: Dispatch<SetStateAction<DrawerLine[]>>;
        statsLines: DrawerLine[];
        setStatsLines: Dispatch<SetStateAction<DrawerLine[]>>;
        infoLines: DrawerLine[];
        setInfoLines: Dispatch<SetStateAction<DrawerLine[]>>;
        scoreLines: DrawerLine[];
        setScoreLines: Dispatch<SetStateAction<DrawerLine[]>>;
        questLines: DrawerLine[];
        setQuestLines: Dispatch<SetStateAction<DrawerLine[]>>;
        achievementLines: DrawerLine[];
        setAchievementLines: Dispatch<SetStateAction<DrawerLine[]>>;
        practiceLines: DrawerLine[];
        setPracticeLines: Dispatch<SetStateAction<DrawerLine[]>>;
        whoLines: DrawerLine[];
        setWhoLines: Dispatch<SetStateAction<DrawerLine[]>>;
        whereLines: DrawerLine[];
        setWhereLines: Dispatch<SetStateAction<DrawerLine[]>>;
        eqLines: DrawerLine[];
        setEqLines: Dispatch<SetStateAction<DrawerLine[]>>;
        abilities: Record<string, number>;
        setAbilities: Dispatch<SetStateAction<Record<string, number>>>;
        characterClass: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none';
        setCharacterClass: (val: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none') => void;
        actions: import('../../types').GameAction[];
        setActions: Dispatch<SetStateAction<import('../../types').GameAction[]>>;
        mood: string;
        setMood: (val: string) => void;
        spellSpeed: string;
        setSpellSpeed: (val: string) => void;
        alertness: string;
        setAlertness: (val: string) => void;
        level: number;
        setLevel: (val: number) => void;
        characterName: string | null;
        setCharacterName: (val: string | null) => void;
        registry: ReturnType<typeof import('../../hooks/useEntityRegistry').useEntityRegistry>;
        quests: import('../../types').QuestData;
        setQuests: Dispatch<SetStateAction<import('../../types').QuestData>>;
        roomNameRef: React.MutableRefObject<string | null>;
        roomDescRef: React.MutableRefObject<string | null>;
        lastCommMsgIdRef: React.MutableRefObject<string | null>;
        lastCommTimeRef: React.MutableRefObject<number>;
        whoList: string[];
        setWhoList: Dispatch<SetStateAction<string[]>>;
        whereList: import('../../types').WhereEntry[];
        setWhereList: Dispatch<SetStateAction<import('../../types').WhereEntry[]>>;
        lightningEnabled: boolean;
        setLightningEnabled: (val: boolean) => void;
        discoveredItems: string[];
        setDiscoveredItems: Dispatch<SetStateAction<string[]>>;
        roomNum: number;
        setRoomNum: (num: number) => void;
        captureSession: CaptureSession | null;
        setCaptureSession: Dispatch<SetStateAction<CaptureSession | null>>;
        expandedContainers: Set<string>;
        setExpandedContainers: Dispatch<SetStateAction<Set<string>>>;
        containerContents: Record<string, DrawerLine[]>;
        setContainerContents: Dispatch<SetStateAction<Record<string, DrawerLine[]>>>;
    };
    log: LogData;
    recorder: ReturnType<typeof useSessionRecorder>;
}

export interface GameContextType extends Omit<SessionContextType['vitals'], 'stats' | 'target' | 'activePrompt' | 'setActivePrompt' | 'pendingMove' | 'setPendingMove'>, Omit<SessionContextType['game'], 'inCombat' | 'roomName' | 'roomDesc' | 'characterName' | 'setCharacterName' | 'mood' | 'setMood' | 'spellSpeed' | 'setSpellSpeed' | 'alertness' | 'setAlertness' | 'whoList' | 'whereList' | 'setWhereList' | 'lightningEnabled' | 'setLightningEnabled' | 'abilities' | 'setAbilities' | 'actions' | 'setActions' | 'characterClass' | 'setCharacterClass' | 'quests' | 'setQuests' | 'roomNameRef' | 'roomDescRef'>, LogContextType {
    // Session Management
    activeSession: SessionSlot;
    setActiveSession: (slot: SessionSlot) => void;
    userSession: SessionContextType;
    spectateSession: SessionContextType;
    active: SessionContextType;

    // The "Effective" state (active session)
    // stats and target are intentionally absent — use useVitals() for those
    inCombat: boolean;
    roomName: string | null;
    roomDesc: string | null;
    spectateRoomNum?: number | null;
    commandPreview: string | null;
    setCommandPreview: (val: string | null) => void;
    pendingMove: { dir: string; timestamp: number } | null;
    setPendingMove: (val: { dir: string; timestamp: number } | null) => void;
    popoverState: PopoverState | null;
    setPopoverState: (val: PopoverState | null) => void;
    ui: {
        drawer: DrawerType;
        isDrawerPeeking: boolean;
        peekingDrawer: DrawerType;
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
        mapMode: 'edit' | 'play';
        peekingSource: DrawerType;
        showMapperToolbar: boolean;
        characterTab: 'info' | 'practice' | 'quests';
    };
    setUI: import('react').Dispatch<import('react').SetStateAction<GameContextType['ui']>>;

    // Global App State (Common to all sessions)
    status: 'connected' | 'disconnected' | 'connecting';
    setStatus: (val: 'connected' | 'disconnected' | 'connecting') => void;
    gameState: import('../../types').GameState;
    setGameState: Dispatch<SetStateAction<import('../../types').GameState>>;
    characterName: string | null;
    setCharacterName: (name: string | null) => void;
    
    help: ReturnType<typeof import('../../hooks/useHelpHandler').useHelpHandler>;

    // Settings & Mode
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    isSoundEnabled: boolean;
    setIsSoundEnabled: (val: boolean) => void;
    theme: 'light' | 'dark';
    setTheme: (val: 'light' | 'dark') => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
    sessionMode: import('../../types').SessionMode;
    setSessionMode: (val: import('../../types').SessionMode) => void;
    uiMode: import('../../types').UiMode;
    setUiMode: (val: import('../../types').UiMode) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isPerformanceMode: boolean;
    setIsPerformanceMode: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isSpectateMode: boolean;
    setIsSpectateMode: (val: boolean) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    isTextRevealEnabled: boolean;
    setIsTextRevealEnabled: (val: boolean) => void;
    showControls: boolean;
    setShowControls: (val: boolean) => void;
    isPasswordMode: boolean;
    spectateCharacterName: string | null;
    spectateTerrain: string;
    showLegacyButtons: boolean;
    setShowLegacyButtons: (val: boolean) => void;
    showOrganicTerrain: boolean;
    setShowOrganicTerrain: (val: boolean) => void;
    inlineCategories: import('../../types').InlineCategoryConfig[];
    setInlineCategories: Dispatch<SetStateAction<import('../../types').InlineCategoryConfig[]>>;
    favorites: string[];
    setFavorites: Dispatch<SetStateAction<string[]>>;
    parley: import('../../types').ParleyState;
    setParley: Dispatch<SetStateAction<import('../../types').ParleyState>>;

    whoList: string[];
    whereList: import('../../types').WhereEntry[];
    setWhereList: Dispatch<SetStateAction<import('../../types').WhereEntry[]>>;
    zoneMusic: import('../../types').ZoneMusicMapping[];
    setZoneMusic: Dispatch<SetStateAction<import('../../types').ZoneMusicMapping[]>>;
    spectateQueue: string[];

    lastSnoopStartTime: number | null;
    setLastSnoopStartTime: Dispatch<SetStateAction<number | null>>;
    addToQueue: (name: string) => void;
    rotateQueue: (manuallyTriggered?: boolean) => void;
    removeFromQueue: (name: string) => void;

    mood: string;
    setMood: (val: string) => void;
    spellSpeed: string;
    setSpellSpeed: (val: string) => void;
    alertness: string;
    setAlertness: (val: string) => void;
    playerPositionRef: RefObject<string>;
    isRidingRef: RefObject<boolean>;
    isTrackpadModifierActive: boolean;
    setIsTrackpadModifierActive: Dispatch<SetStateAction<boolean>>;
    setPlayerHealthStatus: (val: CombatHealthStatus | null) => void;
    setOpponentHealthStatus: (val: CombatHealthStatus | null) => void;
    setBufferHealthStatus: (val: CombatHealthStatus | null) => void;
    opponentName: string | null;
    opponentId: string | null;
    setOpponentName: (val: string | null) => void;
    setOpponentId: (val: string | null) => void;
    setBufferName: (val: string | null) => void;
    groupMembers: GroupMember[];
    setGroupMembers: Dispatch<SetStateAction<GroupMember[]>>;
    spectateGroupMembers: GroupMember[];
    mumeEditState: MumeEditState;
    setMumeEditState: Dispatch<SetStateAction<MumeEditState>>;
    handleSaveMumeEdit: (text: string) => void;
    handleCancelMumeEdit: () => void;
    accountState: import('../../types').AccountState;
    setAccountState: Dispatch<SetStateAction<import('../../types').AccountState>>;

    lightningEnabled: boolean;
    setLightningEnabled: (val: boolean) => void;
    isFoggy: boolean;
    setIsFoggy: (val: boolean) => void;

    roomZone: string | null;
    setRoomZone: (zone: string | null) => void;
    roomNameRef: RefObject<string | null>;
    roomDescRef: RefObject<string | null>;


    accentColor: string;
    setAccentColor: (val: string) => void;
    abilities: Record<string, number>;
    setAbilities: Dispatch<SetStateAction<Record<string, number>>>;
    actions: GameAction[];
    setActions: Dispatch<SetStateAction<GameAction[]>>;
    characterClass: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none';
    setCharacterClass: (val: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none') => void;
    keywordOverrides: Record<string, string>;
    openKeywordEdit: (context: string, displayText: string) => void;
    setKeywordOverride: (context: string, keyword: string) => void;
    removeKeywordOverride: (context: string) => void;

    entities: Record<string, import('../../types').GameEntity>;
    setEntities: Dispatch<SetStateAction<Record<string, import('../../types').GameEntity>>>;
    registerEntity: (id: string, name: string, location: import('../../types').EntityLocation, category?: string) => import('../../types').GameEntity;
    getEntity: (id: string) => import('../../types').GameEntity | undefined;
    clearRegistry: () => void;


    detectLighting: (symbol: string) => void;
    soundTriggersRef: RefObject<SoundTrigger[]>;
    isSoundEnabledRef: RefObject<boolean>;
    actionsRef: RefObject<GameAction[]>;

    teleportTargets: TeleportTarget[];
    setTeleportTargets: (val: TeleportTarget[] | ((prev: TeleportTarget[]) => TeleportTarget[])) => void;

    // Settings
    connectionUrl: string;
    setConnectionUrl: Dispatch<SetStateAction<string>>;
    loginName: string;
    setLoginName: Dispatch<SetStateAction<string>>;
    loginPassword: string;
    setLoginPassword: Dispatch<SetStateAction<string>>;
    prepareLoginAttempt: () => void;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
    soundTriggers: SoundTrigger[];
    setSoundTriggers: Dispatch<SetStateAction<SoundTrigger[]>>;
    newSoundPattern: string;
    setNewSoundPattern: Dispatch<SetStateAction<string>>;
    newSoundRegex: boolean;
    setNewSoundRegex: Dispatch<SetStateAction<boolean>>;
    exportSettings: () => Record<string, unknown>;
    exportSettingsFile: (buttons: CustomButton[]) => void;
    importSettings: (e: ChangeEvent<HTMLInputElement>, setIsSettingsOpen: (v: boolean) => void) => void;
    handleSoundUpload: (e: ChangeEvent<HTMLInputElement>) => void;
    handleMmapperModeChange: (enabled: boolean) => void;

    input: string;
    setInput: Dispatch<SetStateAction<string>>;
    handleSend: (e?: FormEvent) => void;
    handleInputSwipe: (dir: string) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;
    handleButtonClick: (button: CustomButton, e: MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string) => void;
    handleLogClick: (e: MouseEvent) => void;
    handleLogDoubleClick: (e: MouseEvent) => void;
    handleLogPointerDown: (e: React.PointerEvent) => void;
    handleLogPointerUp: (e: React.PointerEvent) => void;
    mapperRef: RefObject<MapperRef>;

    // Parser State
    applyOptimisticChange: (change: OptimisticChange) => void;
    setInventoryLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setStatsLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setInfoLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setPracticeLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setAchievementLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setWhoLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setWhereLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setEqLines: Dispatch<SetStateAction<DrawerLine[]>>;
    quests: import('../../types').QuestData;
    setQuests: Dispatch<SetStateAction<import('../../types').QuestData>>;

    capture: CaptureController;

    captureSession: CaptureSession | null;
    setCaptureSession: (val: CaptureSession | null) => void;
    nextCommandIsSilent: MutableRefObject<boolean>;

    // Network & Parser Engines
    telnet: ReturnType<typeof import('../../hooks/useTelnet').useTelnet>;
    parser: ReturnType<typeof import('../../hooks/GameParser/useGameParser').useGameParser>;
    practice: ReturnType<typeof import('../../hooks/usePracticeHandler').usePracticeHandler>;

    // Sound & Haptics
    playSound: (buffer: AudioBuffer) => void;
    playRandomSound: (buffers: AudioBuffer[]) => void;
    playDoorSound: (isOpen: boolean) => void;
    playClickSound: () => void;
    playCommMessageSound: (options?: { volume?: number }) => void;
    triggerHaptic: (ms: number) => void;

    // Major hook systems
    btn: ReturnType<typeof useButtons>;
    joystick: ReturnType<typeof useJoystick>;
    editor: ReturnType<typeof useButtonEditor>;
    containerRef: RefObject<HTMLDivElement>;
    viewport: ReturnType<typeof useViewport>;
    env: ReturnType<typeof useEnvironment>;
    audioCtxRef: MutableRefObject<AudioContext | null>;
    initAudio: () => void;
    setSettings: Record<string, import('../../types').ButtonSetSettings>;
    setSetSettings: Dispatch<SetStateAction<Record<string, import('../../types').ButtonSetSettings>>>;

    spatButtons: SpatButton[];
    setSpatButtons: Dispatch<SetStateAction<SpatButton[]>>;
    triggerSpitManual: (b: CustomButton) => void;

    diagnosticLogs: string[];
    addDiagnosticLog: (msg: string) => void;

    // Selection State
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (info: import('../../stores/useUIStore').SelectedTargetInfo) => void;
    clearObjectSelection: () => void;

    // Recorder
    isRecording: boolean;
    duration: number;
    replayer: {
        log: import('../../types').SessionLog | null;
        state: import('../../hooks/useSessionReplayer').ReplayerState;
        loadLog: (log: import('../../hooks/useSessionRecorder').SessionLog) => void;
        clearLog: () => void;
        play: () => void;
        pause: () => void;
        seek: (timeMs: number) => void;
        setSpeed: (speed: number) => void;
        setIsVisible: (visible: boolean) => void;
        setTrimRange: (range: [number | null, number | null]) => void;
        startExport: () => Promise<void>;
        stopExport: () => void;
    };
    accountStageRef: MutableRefObject<import('../../types').AccountStage>;
    gameTime: import('../../types').MumeTime | null;
    setGameTime: Dispatch<SetStateAction<import('../../types').MumeTime | null>>;
    messageActivity: number;
    bumpActivity: () => void;
    discordActivity?: ReturnType<typeof import('../../hooks/useDiscordActivity').useDiscordActivity>;
}
