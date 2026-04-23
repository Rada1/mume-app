import { 
    GameStats, DrawerLine, GameAction, PopoverState, CaptureStage, 
    CombatHealthStatus, QuestData, GameEntity, EntityLocation,
    MessageType, GroupMember, AccountState, AccountStage, MumeTime,
    Direction, CustomButton, InlineCategoryConfig, GameState,
    ExecuteCommand
} from '../../types';
import { RefObject, MutableRefObject, Dispatch, SetStateAction } from 'react';

export interface UseGameParserDeps {
    entities: Record<string, GameEntity>;
    isInventoryOpen: boolean;
    isEquipmentOpen: boolean;
    isCharacterOpen: boolean;
    isStatsOpen: boolean;
    isPlayersOpen: boolean;
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
        isSystem?: boolean
    ) => void;
    addSystemMessage: (msg: string) => void;
    pendingGmcpCommRef: MutableRefObject<any>;
    lastCommIdBySenderRef: MutableRefObject<Map<string, string>>;
    
    // Audio
    playHitImpactSound: (options?: { pitch?: number, volume?: number } | string) => void;
    playOofSound: (options?: { pitch?: number, volume?: number }) => void;
    playSlashSound: (options?: { pitch?: number, volume?: number }) => void;
    playCleaveSound: (options?: { pitch?: number, volume?: number }) => void;
    playSmiteSound: (options?: { pitch?: number, volume?: number }) => void;
    playPierceSound: (options?: { pitch?: number, volume?: number }) => void;
    playStabSound: (options?: { pitch?: number, volume?: number }) => void;
    playArrowHitSound: (options?: { pitch?: number, volume?: number }) => void;
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

    sessionMode: string;
    inCombatRef: MutableRefObject<boolean>;
    triggerXpTicker: (xp?: number) => void;
    groupMembers: GroupMember[];
    activeGroupMembers: GroupMember[];
    setDeathRoomId: (id: string | null) => void;
    setMood: (val: string) => void;
    
    keywordOverrides: Record<string, string>;
    registerEntity: (id: string, name: string, location: EntityLocation, category?: string) => GameEntity;
    setEntities: Dispatch<SetStateAction<Record<string, GameEntity>>>;
    
    playerPosition?: string;
    inlineCategories: InlineCategoryConfig[];
    roomPlayers: any[];
    roomNpcs: any[];
    roomItems: any[];
    target: string | null;
    
    accountState: AccountState;
    accountStageRef: MutableRefObject<AccountStage>;
    pendingDrawerContainerRef?: MutableRefObject<any>;
    lastCommMsgIdRef: MutableRefObject<string | null>;
    lastCommTimeRef: MutableRefObject<number>;
    setDiscoveredItems: Dispatch<SetStateAction<any[]>>;
    roomNameRef: MutableRefObject<string | null>;
    roomDescRef: MutableRefObject<string | null>;
    spectateRoomName: string;
    spectateRoomDesc: string;
    setIsSpectateMode: (val: boolean) => void;
    shop: any;
    gameState: GameState;
    setGameState: Dispatch<SetStateAction<GameState>>;
    ansiConvert: any;
    isSoundEnabledRef: RefObject<boolean>;
    soundTriggersRef: RefObject<any[]>;
    quests: any;
    setQuests: Dispatch<SetStateAction<any>>;
    captureStage: MutableRefObject<CaptureStage>;
    isSilentCapture: MutableRefObject<number>;
    isDrawerCapture: MutableRefObject<number>;
    captureOwnerDrawer: MutableRefObject<any>;
    setIsPasswordMode: (mode: boolean) => void;
    setAccountState: Dispatch<SetStateAction<any>>;
    setGameTime: (time: MumeTime | null) => void;
    setWeather: (weather: string) => void;
    setIsFoggy: (foggy: boolean) => void;
    setLightningEnabled: (val: boolean) => void;
    
    // Spectate Setters
    setSpectateInCombat: (inCombat: boolean, force?: boolean) => void;
    setSpectateOpponentName: (name: string | null) => void;
    setSpectateOpponentStatus: (status: CombatHealthStatus | null) => void;
    setSpectateHealthStatus: (status: CombatHealthStatus | null) => void;
    setSpectateStats: (stats: any) => void;
    setSpectatePosition: (pos: string) => void;
    setSpectateWaiting: (waiting: boolean) => void;
    setSpectateRoomName: (name: string | null) => void;
    setSpectateRoomZone: (zone: string | null) => void;
    setSpectateLighting: (lighting: string | null) => void;
    setSpectateWeather: (weather: string | null) => void;
    setSpectateIsFoggy: (foggy: boolean) => void;
    setSpectateCharacterName: (name: string | null) => void;
    setSpectateGroupMembers: (members: any) => void;
    setSpectateRoomDesc: (desc: string | null) => void;
    setSpectateTerrain: (terrain: string | null) => void;

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
    setWhoList: (list: string[]) => void;
    setWhereList: (list: any[]) => void;

    // Others
    addDiagnosticLog: (msg: string) => void;
    isNewbieMode: boolean;
    isSpectateMode: boolean;
    spectateTarget: string | null;
    executeCommandRef: MutableRefObject<ExecuteCommand | null>;
    gameTime: MumeTime | null;

    // Practice
    practiceHandler?: any;
    questsHandler?: any;
    shopHandler?: any;
    helpHandler?: any;

    characterName: string | null;
    spectateCharacterName: string | null;
    activePrompt: any;
    selectedObjectIds: string[];

    actionsRef: RefObject<GameAction[]>;
    isWaitingForInv: MutableRefObject<boolean>;
    isWaitingForEq: MutableRefObject<boolean>;
    isWaitingForStats: MutableRefObject<boolean>;
    isWaitingForInfo: MutableRefObject<boolean>;
}
