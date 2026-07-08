import { 
    GameStats, DrawerLine, GameAction, PopoverState, CaptureStage, 
    CombatHealthStatus, QuestData, GameEntity, EntityLocation,
    MessageType, GroupMember, AccountState, AccountStage, MumeTime,
    Direction, CustomButton, InlineCategoryConfig, GameState,
    ExecuteCommand, WeatherType, DrawerType, SessionMode
} from '../../types';
import { RefObject, MutableRefObject, Dispatch, SetStateAction } from 'react';
import { CaptureSession } from '../../types/capture';

export interface UseGameParserDeps {
    entities: Record<string, GameEntity>;
    entitiesRef: MutableRefObject<Record<string, GameEntity>>;
    drawer: DrawerType;
    mapperRef: RefObject<any>;
    btn: any;
    addMessage: (
        type: MessageType, 
        text: string, 
        extra?: any, 
        mid?: string, 
        isRoomName?: boolean, 
        precalculated?: { textOnly: string, lower: string, html?: string, tokens?: any[] },
        shopItem?: any,
        practiceSkill?: any,
        practiceHeader?: any,
        isSystem?: boolean,
        replyTarget?: string,
        replyCommand?: string,
        commSender?: string,
        commAction?: string,
        commText?: string,
        commColor?: string,
        commSenderTokens?: import('../../types').Token[],
        commTextTokens?: import('../../types').Token[],
        providedCombatSide?: 'player' | 'opponent' | 'groupmate',
        providedIsHitImpact?: boolean,
        providedIsDamageImpact?: boolean,
        providedIsAvoidDamageImpact?: boolean,
        providedIsMissImpact?: boolean,
        providedIsHitterImpact?: boolean,
        providedIsSnoop?: boolean,
        providedIsSnoopInput?: boolean,
        providedIsRipMessage?: boolean,
        providedIsSocial?: boolean
    ) => void;
    addSystemMessage: (msg: string) => void;
    executeCommandRef: MutableRefObject<ExecuteCommand | null>;
    pendingGmcpCommRef: MutableRefObject<any>;
    lastCommIdBySenderRef: MutableRefObject<Map<string, string>>;
    lastCommMsgIdRef: MutableRefObject<string | null>;
    lastCommTimeRef: MutableRefObject<number>;
    
    // Audio
    playHitImpactSound: (options?: { pitch?: number, volume?: number } | string) => void;
    playOofSound: (options?: { pitch?: number, volume?: number }) => void;
    playSpectateHitImpactSound?: (options?: { pitch?: number, volume?: number } | string) => void;
    playSpectateOofSound?: (options?: { pitch?: number, volume?: number }) => void;
    playCommMessageSound: (options?: { volume?: number }) => void;
    playBuySellSound: (options?: { volume?: number }) => void;
    playBashSound: (options?: { pitch?: number, volume?: number }) => void;
    playIncantationSound: (options?: any) => void;
    stopIncantationSound: (playExplosion?: boolean) => void;
    playMagicExplosionSound: (options?: { volume?: number }) => void;
    playEffect: (name: string, options?: any) => void;
    playDoorSound: (isOpen: boolean) => void;
    playMovementSound: (isRiding?: boolean, terrain?: string) => void;
    triggerHaptic: (ms: number) => void;
    playSound?: (buffer: any) => void;
    playRandomSound?: (buffers: any[]) => void;
    playKillSound: (options?: any) => void;
    playLevelSound: (options?: any) => void;
    playClickSound: () => void;
    playWearSound: () => void;
    playRemoveSound: () => void;
    playRideSound: () => void;
    playStopRidingSound: () => void;

    sessionMode: SessionMode;
    inCombatRef: MutableRefObject<boolean>;
    triggerXpTicker: (xp?: number) => void;
    triggerTpTicker: (tp?: number) => void;
    groupMembers: GroupMember[];
    activeGroupMembers: GroupMember[];
    setDeathRoomId: (id: string | null) => void;
    setMood: (val: string) => void;
    
    keywordOverrides: Record<string, string>;
    registerEntity: (id: string, name: string, location: EntityLocation, category?: string) => GameEntity;
    setEntities: Dispatch<SetStateAction<Record<string, GameEntity>>>;
    
    playerPosition?: string;
    inlineCategories: InlineCategoryConfig[];
    objectColor?: string;
    npcColor?: string;
    playerColor?: string;
    roomColor?: string;
    roomPlayers: any[];
    roomNpcs: any[];
    roomItems: any[];
    target: string | null;
    
    accountState: AccountState;
    accountStageRef: MutableRefObject<AccountStage>;
    pendingDrawerContainerRef?: MutableRefObject<any>;
    setDiscoveredItems: Dispatch<SetStateAction<any[]>>;
    roomNameRef: MutableRefObject<string | null>;
    roomDescRef: MutableRefObject<string | null>;
    spectateRoomName: string;
    spectateRoomDesc: string;
    setIsSpectateMode: (val: boolean) => void;
    practiceHandler?: ReturnType<typeof import('../usePracticeHandler').usePracticeHandler>;
    gameState: GameState;
    setGameState: Dispatch<SetStateAction<GameState>>;
    ansiConvert: any;
    isSoundEnabledRef: RefObject<boolean>;
    soundTriggersRef: RefObject<any[]>;
    quests: any;
    setQuests: Dispatch<SetStateAction<any>>;
    captureStage: MutableRefObject<CaptureStage>;
    captureOwnerDrawer: MutableRefObject<any>;
    setIsPasswordMode: (mode: boolean) => void;
    setAccountState: Dispatch<SetStateAction<any>>;
    setGameTime: (time: MumeTime | null) => void;
    setRoomNum: (num: number | null) => void;
    setUserRoomNum: (num: number | null) => void;
    setWeather: (weather: WeatherType) => void;
    setIsFoggy: (foggy: boolean) => void;
    setLightningEnabled: (val: boolean) => void;
    detectLighting?: (light: number | string) => void;
    
    // Spectate Setters
    setSpectateStats: (stats: any) => void;
    setSpectateWaiting: (waiting: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    setSpectatePosition: (pos: string) => void;
    setSpectateInCombat: (val: boolean, force?: boolean) => void;
    setSpectateOpponentName: (name: string | null) => void;
    setSpectateOpponentStatus: (status: CombatHealthStatus | null) => void;
    setSpectateRoomNum: (num: number | null) => void;
    setSpectateRoomName: (name: string | null) => void;
    setSpectateRoomDesc: (desc: string | null) => void;
    setSpectateRoomZone: (zone: string | null) => void;
    setSpectateActivePrompt?: (prompt: string | null) => void;
    setSpectateActivePromptText?: (val: string) => void;
    setSpectateWeather?: (weather: WeatherType) => void;
    setSpectateIsFoggy?: (foggy: boolean) => void;
    setSpectateLightningEnabled?: (val: boolean) => void;

    // Drawer Setters
    setInventoryLines: (lines: DrawerLine[]) => void;
    setEqLines: (lines: DrawerLine[]) => void;
    setStatsLines: (lines: DrawerLine[]) => void;
    setPracticeLines: (lines: DrawerLine[]) => void;
    setWhoLines: (lines: DrawerLine[]) => void;
    setWhereLines: (lines: DrawerLine[]) => void;
    setScoreLines: (lines: DrawerLine[]) => void;
    setInfoLines: (lines: DrawerLine[]) => void;
    setQuestLines: (lines: DrawerLine[]) => void;
    setAchievementLines: (lines: DrawerLine[]) => void;
    setWhoList: (list: string[]) => void;
    setWhereList: (list: import('../../types').WhereEntry[]) => void;

    sendCommand?: (cmd: string) => void;
    clearLog?: () => void;
    setInput?: (val: string) => void;

    // Others
    addDiagnosticLog: (msg: string) => void;
    isMobile?: boolean;
    isNewbieMode: boolean;
    isSpectateMode: boolean;
    activeView?: 'self' | 'target';
    captureSession: CaptureSession | null;
    setCaptureSession: Dispatch<SetStateAction<CaptureSession | null>>;
    executeCommand?: (cmd: string, echo?: boolean, fromMacro?: boolean) => void;
    setSettingsTab?: (tab: any) => void;
    setIsSettingsOpen?: (open: boolean) => void;
    handleTabClick?: (tab: DrawerType) => void;
    setUI?: (val: any) => void;
    activePrompt: any;
    characterName: string | null;
    spectateCharacterName: string | null;
    spectateQueue: string[];
    setSpectateQueue: (queue: string[] | ((prev: string[]) => string[])) => void;
    lastSnoopStartTime: number | null;
    setLastSnoopStartTime: (time: number | null) => void;
    actionsRef: RefObject<GameAction[]>;
    gameTime: MumeTime | null;
    setPopoverState?: (state: PopoverState | null) => void;
    help: any;
}
