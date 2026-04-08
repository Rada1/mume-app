import React, { ReactNode, SetStateAction, Dispatch, RefObject, MutableRefObject, ChangeEvent, FormEvent, MouseEvent } from 'react';
import {
    GameStats, PopoverState, Message, MessageType, WeatherType,
    LightingType, SoundTrigger, TeleportTarget, CustomButton,
    DrawerLine, GameAction, SpatButton, CombatHealthStatus, GroupMember,
    OptimisticChange,
    SessionLog
} from '../../types';
import { useSessionRecorder } from '../../hooks/useSessionRecorder';
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
    deathRoomId: string | null;
    setDeathRoomId: (val: string | null) => void;
    heldButton: {
        isLogDragging?: boolean;
        x?: number;
        y?: number;
        label?: string;
        baseCommand?: string;
    } | null;
    setHeldButton: (val: {
        isLogDragging?: boolean;
        x?: number;
        y?: number;
        label?: string;
        baseCommand?: string;
    } | null) => void;
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
    xpHistory: { old: number; new: number };
    xpEvent: number;
    triggerXpTicker: () => void;
    hitFlashEvent: number;
    oppHitFlashEvent: number;
    triggerHitFlash: () => void;
    triggerOppHitFlash: () => void;
}

export interface LogContextType {
    messages: Message[];
    setMessages: Dispatch<SetStateAction<Message[]>>;
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }, shopItem?: import('../../types').ShopItem, practiceSkill?: import('../../types').PracticeSkill, practiceHeader?: { sessionsLeft: number }, skipBrevity?: boolean, replyTarget?: string, replyCommand?: string) => void;
    addSystemMessage: (text: string) => void;
    isCombatLine: (text: string) => boolean;
    processMessageHtml: (html: string, mid?: string, isRoomName?: boolean, type?: MessageType) => string;
    refreshLogHighlights: () => void;
    handleLogPointerDown: (e: React.PointerEvent) => void;
    handleLogPointerUp: (e: React.PointerEvent) => void;
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (id: string, setId?: string, context?: string) => void;
    clearObjectSelection: () => void;
}

export interface UIContextType {
    ui: {
        drawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players';
        isDrawerPeeking: boolean;
        peekingDrawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players' | 'map';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
        peekingSource: 'none' | 'inventory' | 'equipment' | 'character' | 'stats' | 'players' | 'map';
    };
    setUI: Dispatch<SetStateAction<{
        drawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players';
        isDrawerPeeking: boolean;
        peekingDrawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players' | 'map';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
        peekingSource: 'none' | 'inventory' | 'equipment' | 'character' | 'stats' | 'players' | 'map';
    }>>;
    popoverState: PopoverState | null;
    setPopoverState: (val: PopoverState | null) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (val: boolean) => void;
    settingsTab: 'general' | 'sound' | 'actions' | 'help';
    setSettingsTab: (val: 'general' | 'sound' | 'actions' | 'help') => void;
    setIsStatsOpen: (open: boolean) => void;
    setIsCharacterOpen: (open: boolean) => void;
    setIsEquipmentOpen: (open: boolean) => void;
    setIsInventoryOpen: (open: boolean) => void;
    setIsMapExpanded: (open: boolean) => void;
    setIsSetManagerOpen: (open: boolean) => void;
    setIsPlayersOpen: (open: boolean) => void;
    characterName: string | null;
    isRecording: boolean;
    duration: number;
    startRecording: (characterName?: string) => void;
    stopRecording: () => import('../../hooks/useSessionRecorder').SessionLog;
    saveLog: (log: import('../../hooks/useSessionRecorder').SessionLog) => void;
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
        startExport: () => Promise<void>;
        stopExport: () => void;
    };
}

export interface GameContextType {
    // High-frequency but log-related
    inCombat: boolean;
    setInCombat: (val: boolean, force?: boolean) => void;
    inCombatRef: RefObject<boolean>;
    status: 'connected' | 'disconnected' | 'connecting';
    setStatus: (val: 'connected' | 'disconnected' | 'connecting') => void;
    gameState: import('../../types').GameState;
    setGameState: Dispatch<SetStateAction<import('../../types').GameState>>;
    characterName: string | null;
    setCharacterName: (name: string | null) => void;
    popoverState: import('../../types').PopoverState | null;
    setPopoverState: (val: import('../../types').PopoverState | null) => void;

    // Settings & Mode
    isNoviceMode: boolean;
    setIsNoviceMode: (val: boolean) => void;
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    isSoundEnabled: boolean;
    setIsSoundEnabled: (val: boolean) => void;
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
    uiMode: import('../../types').UiMode;
    setUiMode: (val: import('../../types').UiMode) => void;
    disable3dScroll: boolean;
    setDisable3dScroll: (val: boolean) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isMobileBrevityMode: boolean;
    setIsMobileBrevityMode: (val: boolean) => void;
    isCrtEnabled: boolean;
    setIsCrtEnabled: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isSpectateMode: boolean;
    setIsSpectateMode: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    spectateTargetId: number | null;
    setSpectateTargetId: (val: number | null) => void;
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

    mood: string;
    setMood: (val: string) => void;
    spellSpeed: string;
    setSpellSpeed: (val: string) => void;
    alertness: string;
    setAlertness: (val: string) => void;
    playerPosition: string;
    setPlayerPosition: (val: string) => void;
    playerPositionRef: RefObject<string>;
    isRiding: boolean;
    setIsRiding: (val: boolean) => void;
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
    mumeEditState: { isOpen: boolean; title: string; text: string; key: string };
    setMumeEditState: Dispatch<SetStateAction<{ isOpen: boolean; title: string; text: string; key: string }>>;
    handleSaveMumeEdit: (text: string) => void;
    accountState: import('../../types').AccountState;
    setAccountState: Dispatch<SetStateAction<import('../../types').AccountState>>;

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
    roomPlayers: import('../../types').GmcpOccupant[];
    setRoomPlayers: Dispatch<SetStateAction<import('../../types').GmcpOccupant[]>>;
    roomNpcs: import('../../types').GmcpOccupant[];
    setRoomNpcs: Dispatch<SetStateAction<import('../../types').GmcpOccupant[]>>;
    roomItems: import('../../types').GmcpOccupant[];
    setRoomItems: Dispatch<SetStateAction<import('../../types').GmcpOccupant[]>>;
    currentTerrain: string;
    setCurrentTerrain: (terrain: string) => void;
    roomZone: string | null;
    setRoomZone: (zone: string | null) => void;
    roomName: string | null;
    roomDesc: string | null;
    setRoomName: (name: string | null) => void;
    setRoomDesc: (desc: string | null) => void;
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

    // GMCP Handlers
    onRoomInfo?: (data: import('../../types').GmcpRoomInfo) => void;
    setOnRoomInfo: (fn: (data: import('../../types').GmcpRoomInfo) => void) => void;
    onRoomUpdateExits?: (data: import('../../types').GmcpUpdateExits) => void;
    setOnRoomUpdateExits: (fn: (data: import('../../types').GmcpUpdateExits) => void) => void;
    onCharVitals?: (data: import('../../types').GmcpCharVitals) => void;
    setOnCharVitals: (fn: (data: import('../../types').GmcpCharVitals) => void) => void;
    onRoomPlayers?: (data: import('../../types').GmcpRoomPlayers) => void;
    setOnRoomPlayers: (fn: (data: import('../../types').GmcpRoomPlayers) => void) => void;
    onRoomNpcs?: (data: import('../../types').GmcpRoomNpcs) => void;
    setOnRoomNpcs: (fn: (data: import('../../types').GmcpRoomNpcs) => void) => void;
    onRoomItems?: (data: import('../../types').GmcpRoomItems) => void;
    setOnRoomItems: (fn: (data: import('../../types').GmcpRoomItems) => void) => void;
    onAddPlayer?: (data: import('../../types').GmcpOccupant | string | number) => void;
    setOnAddPlayer: (fn: (data: import('../../types').GmcpOccupant | string | number) => void) => void;
    onAddNpc?: (data: import('../../types').GmcpOccupant | string | number) => void;
    setOnAddNpc: (fn: (data: import('../../types').GmcpOccupant | string | number) => void) => void;
    onRemovePlayer?: (data: import('../../types').GmcpOccupant | string | number) => void;
    setOnRemovePlayer: (fn: (data: import('../../types').GmcpOccupant | string | number) => void) => void;
    onRemoveNpc?: (data: import('../../types').GmcpOccupant | string | number) => void;
    setOnRemoveNpc: (fn: (data: import('../../types').GmcpOccupant | string | number) => void) => void;
    onOpponentChange?: (name: string | null) => void;
    setOnOpponentChange: (fn: (name: string | null) => void) => void;
    onGroupAdd?: (data: GroupMember) => void;
    setOnGroupAdd: (fn: (data: GroupMember) => void) => void;
    onGroupUpdate?: (data: GroupMember) => void;
    setOnGroupUpdate: (fn: (data: GroupMember) => void) => void;
    onGroupRemove?: (data: number) => void;
    setOnGroupRemove: (fn: (data: number) => void) => void;
    onGroupSet?: (data: GroupMember[]) => void;
    setOnGroupSet: (fn: (data: GroupMember[]) => void) => void;
    onMumeEdit?: (data: import('../../types').GmcpMumeEdit) => void;
    setOnMumeEdit: (fn: (data: import('../../types').GmcpMumeEdit) => void) => void;

    // Settings
    bgImage: string;
    setBgImage: Dispatch<SetStateAction<string>>;
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
    handleFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
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
    handleDragStart: (e: React.DragEvent) => void;
    handleDragEnd: (e: React.DragEvent) => void;
    mapperRef: RefObject<MapperRef>;

    // Parser State
    inventoryLines: DrawerLine[];
    statsLines: DrawerLine[];
    eqLines: DrawerLine[];
    displayInventoryLines: DrawerLine[];
    displayEqLines: DrawerLine[];
    applyOptimisticChange: (change: OptimisticChange) => void;
    setInventoryLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setStatsLines: Dispatch<SetStateAction<DrawerLine[]>>;
    setEqLines: Dispatch<SetStateAction<DrawerLine[]>>;
    quests: import('../../types').QuestData;
    setQuests: Dispatch<SetStateAction<import('../../types').QuestData>>;

    captureStage: MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'who' | 'where' | 'container' | 'none'>;
    isDrawerCapture: MutableRefObject<number>;
    isSilentCapture: MutableRefObject<number>;
    isWaitingForStats: MutableRefObject<boolean>;
    isWaitingForEq: MutableRefObject<boolean>;
    isWaitingForInv: MutableRefObject<boolean>;
    pendingDrawerContainerRef: MutableRefObject<{ containerId: string; cmd: 'inventorylist' | 'equipmentlist'; afterId: string } | null>;

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
    stopCommMessageSound: () => void;
    playTutorialExitSound: (options?: { volume?: number }) => void;
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
    initAudio: () => void;
    setSettings: Record<string, import('../../types').ButtonSetSettings>;
    setSetSettings: Dispatch<SetStateAction<Record<string, import('../../types').ButtonSetSettings>>>;

    draggedTarget: { name: string; type: string; x: number; y: number } | null;
    setDraggedTarget: Dispatch<SetStateAction<{ name: string; type: string; x: number; y: number } | null>>;

    spatButtons: SpatButton[];
    setSpatButtons: Dispatch<SetStateAction<SpatButton[]>>;
    triggerSpitManual: (b: CustomButton) => void;

    diagnosticLogs: string[];
    addDiagnosticLog: (msg: string) => void;
    activeDragData: unknown;
    setActiveDragData: Dispatch<SetStateAction<unknown>>;

    // Selection State
    selectedObjectIds: Set<string>;
    toggleObjectSelection: (id: string, setId?: string, context?: string) => void;
    clearObjectSelection: () => void;

    // Recorder
    isRecording: boolean;
    duration: number;
    startRecording: (characterName?: string) => void;
    stopRecording: () => import('../../hooks/useSessionRecorder').SessionLog;
    saveLog: (log: import('../../hooks/useSessionRecorder').SessionLog) => void;
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
        startExport: () => Promise<void>;
        stopExport: () => void;
    };
}

