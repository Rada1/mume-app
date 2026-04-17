import { LucideIcon } from 'lucide-react';

export type MessageType = 'user' | 'system' | 'error' | 'game' | 'prompt' | 'comm' | 'comm-continue' | 'comm-sender' | 'comm-text' | 'shop-item' | 'practice-skill' | 'practice-header' | 'practice-class-header' | 'practice-column-header' | 'who-list' | 'where-list' | 'room-description' | 'equipment-list' | 'inventory-list' | 'room-exits' | 'snoop-command' | 'account-prompt' | 'account-menu-item' | 'account-selection' | 'account-selection-edit' | 'account-stat-edit' | 'account-character-list' | 'quest-list';
export type LightingType = 'sun' | 'artificial' | 'moon' | 'dark' | 'none';
export type WeatherType = 'clear' | 'cloud' | 'rain' | 'heavy-rain' | 'snow' | 'none';
export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'u' | 'd';
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw';

export type TriggerAction = 'show' | 'switch_set';
export type SessionMode = 'live' | 'replay';
export type UiMode = 'auto' | 'desktop' | 'portrait' | 'landscape';
export type GameState = 'disconnected' | 'account' | 'playing';
export type CaptureStage = 'none' | 'who' | 'where' | 'inv' | 'eq' | 'stat' | 'score' | 'container' | 'shop' | 'shop-detail' | 'practice' | 'whois' | 'description' | 'info' | 'quest' | 'account' | 'help';
export type CombatHealthStatus = 'Healthy' | 'Fine' | 'Hurt' | 'Wounded' | 'Bad' | 'Awful' | 'Dying' | 'Stunned' | 'None';
export type ExecuteCommand = (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;


export type OptimisticChange =
    | { type: 'wear'; item?: DrawerLine; noun?: string; lineId?: string }
    | { type: 'remove'; item?: DrawerLine; noun?: string; lineId?: string }
    | { type: 'drop'; item?: DrawerLine; from: 'inv' | 'eq'; noun?: string; lineId?: string }
    | { type: 'give'; item?: DrawerLine; from: 'inv' | 'eq'; noun?: string; lineId?: string }
    | { type: 'get'; item?: DrawerLine; noun?: string; lineId?: string }
    | { type: 'put'; item?: DrawerLine; container?: DrawerLine; noun?: string; containerNoun?: string; lineId?: string };

export interface InlineCategoryConfig {
    id: string; // The base name of the category (e.g. 'lantern')
    keywords: string[];
    color?: string;
}

export interface Message {
    id: string;
    html: string; // Pre-converted ANSI html
    textRaw: string; // Raw text for logic checks
    type: MessageType;
    timestamp: number;
    isCombat?: boolean; // True if this line is combat-related
    combatSide?: 'player' | 'opponent' | 'groupmate'; // Who is acting in this combat line
    dimmedInCombat?: boolean; // True if this non-combat line arrived during a fight (permanently dim)
    isComm?: boolean; // True if this is a communication message (says, tells, etc.)
    replyTarget?: string; // Sender name for comm messages — enables the inline reply button
    replyCommand?: string; // Channel command for the reply button (e.g. 'tell', 'say', 'narrate')
    isRoomName?: boolean; // True if this line is a room title/name
    isRoomBlock?: boolean; // True if this line is a room name (with embedded description)
    isRoomBlockStart?: boolean;
    isRoomBlockEnd?: boolean;
    isEmpty?: boolean;
    isNarrate?: boolean;
    isUrgent?: boolean; // True if this is a critical non-combat message (arrive/leave/spell)
    shopItem?: ShopItem; // Optional structured shop item data
    practiceSkill?: PracticeSkill; // Optional structured practice skill data
    practiceHeader?: { sessionsLeft: number }; // Optional practice header data
    commSender?: string; // Structured sender for bubbles
    commAction?: string; // Structured action (says, tells, etc.)
    commText?: string; // Structured message text
    commColor?: string;
    batchId?: number;
    isBatchEnd?: boolean;
    inRoomBatch?: boolean;
    isHitImpact?: boolean;
    isHitterImpact?: boolean;
    isSnoop?: boolean;
    isSnoopInput?: boolean;
}

export interface ShopItem {
    id: string;
    name: string;
    shortName?: string;
    description: string;
    price: string;
    condition?: string;
    age?: string;
    count?: string;
    details?: string;
}

export interface PracticeSkill {
    name: string;
    sessions: string; // e.g., "1/43"
    knowledge: string; // e.g., "24%"
    proficiency: number; // numeric percentage
    difficulty: string; // e.g., "Hard"
    advice: string;
    skillClass?: string; // e.g., "Warrior", "Mage", "None"
}

export interface PracticeData {
    sessionsLeft: number;
    skills: PracticeSkill[];
    isAtGuildmaster?: boolean;
}

export interface Quest {
    id: string;
    name: string;
    description: string;
    isUnfinished: boolean;
    area: string;
    fullText?: string;
}

export interface QuestData {
    activeQuests: Quest[];
    lastUpdated: number;
}

export interface DrawerLine {
    id: string;
    text: string;
    html: string;
    isHeader?: boolean;
    isItem?: boolean;
    isContainer?: boolean;
    cmd?: string;
    context?: string;
    stableId?: string;
    depth?: number;
    prefix?: string;
    prefixHtml?: string;
    parentItemId?: string;
    parentItemNoun?: string;
    entityId?: string;
    practiceSkill?: PracticeSkill;
}

export type EntityLocation = 'room' | 'inv' | 'eq' | string; // string for 'container:<id>'

export enum EntityCapability {
    Wearable = 'wearable',
    Weapon = 'weapon',
    Blade = 'blade',
    Blunt = 'blunt',
    Axe = 'axe',
    Spear = 'spear',
    Staff = 'staff',
    Container = 'container',
    DrinkContainer = 'drink',
    Food = 'food',
    Readable = 'readable',
    Light = 'light',
    Shield = 'shield',
    FluidContainer = 'fluid',
    // NPC / Actor Capabilities
    Npc = 'npc',
    Player = 'player',
    Mount = 'mount',
    Innkeeper = 'innkeeper',
    Shopkeeper = 'shopkeeper',
    Guildmaster = 'guildmaster',
    Corpse = 'corpse',
    Exit = 'exit'
}

export interface GameEntity {
    id: string;
    name: string;
    noun: string;
    location: EntityLocation;
    parentId?: string;
    capabilities: EntityCapability[];
    weight?: number;
    value?: number;
    vnum?: number; // If known from GMCP
    shortDesc?: string;
    longDesc?: string;
}

export interface GameStats {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    move: number;
    maxMove: number;
    wimpy?: number;
    ob?: number;
    db?: number;
    pb?: number;
    armour?: number;
    conditions?: Record<string, boolean>;
    staminaStatus?: string;
}

export type ActionType = 'command' | 'nav' | 'menu' | 'assign' | 'select-assign' | 'teleport-manage' | 'select-recipient' | 'select-container' | 'preload';

export interface CustomButton {
    id: string;
    label: string;
    icon?: string;
    command: string; // Used as payload (command or target set ID)
    setId?: string; // The menu set this button belongs to (default 'main')
    actionType?: ActionType; // What the button does
    longActionType?: ActionType;
    swipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    longSwipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    longCommand?: string;
    display: 'floating' | 'inline'; // How the button is shown
    style: {
        x: number; // percentage of viewport width
        y: number; // percentage of viewport height
        w: number; // px
        h: number; // px
        backgroundColor: string;
        borderColor?: string; // Optional border color
        color?: string; // Optional text color
        fontSize?: number; // Optional font size in rem
        borderRadius?: number; // Optional border radius in px
        transparent?: boolean; // New transparent flag
        iconScale?: number; // Optional icon scale
        iconOpacity?: number; // Optional icon opacity
        borderWidth?: number; // Optional border width
        curvedText?: boolean; // Optional curved text flag
        shape: 'rect' | 'pill' | 'circle';

    };
    trigger: {
        enabled: boolean;
        pattern: string; // text to match (also used for inline highlight)
        isRegex: boolean;
        autoHide: boolean; // hide after clicking (floating only)
        duration: number; // seconds to auto-disappear (floating only)
        spit?: boolean; // animate flying from text to sidebar
        type?: TriggerAction;
        targetSet?: string;
        onKeyboard?: boolean; // Show when mobile keyboard opens
        closeKeyboard?: boolean; // Close keyboard when button is pressed
        offKeyboard?: boolean; // Hide when mobile keyboard closes
    };
    isVisible: boolean; // Runtime state
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    longSwipeCommands?: Partial<Record<SwipeDirection, string>>;
    menuDisplay?: 'list' | 'dial';
    requirement?: {
        ability?: string;
        minProficiency?: number;
        characterClass?: string[]; // Allowed classes
    };
    hideIfUnknown?: boolean;
    isDimmed?: boolean; // True if button should be visible but heavily transparent
    _skipJoystick?: boolean; // Internal: prevent double direction appending
}

export interface SoundTrigger {
    id: string;
    pattern: string;
    isRegex: boolean;
    buffer?: AudioBuffer; // Backward compatibility
    buffers?: AudioBuffer[]; // Array of buffers for random selection
    srcData: string | string[]; // Base64 data for saving/loading
    fileName: string | string[];
}

export interface TeleportTarget {
    id: string; // The room key
    label: string;
    expiresAt: number;
}

export interface ParleyState {
    active: boolean;
    command: string; // e.g., 'tell', 'whisper', 'say'
    target: string | null;
}

export interface PopoverState {
    x: number;
    y: number;
    sourceHeight?: number;
    type?: 'menu' | 'teleport-select' | 'teleport-save' | 'teleport-manage' | 'give-recipient-select' | 'give-target-select' | 'put-container-select' | 'shop-search' | 'practice' | 'select-parley-command' | 'select-parley-target' | 'container' | 'shop-card' | 'session-log' | 'help-card' | 'character-select';
    setId: string;
    category?: string;
    context?: string;
    containerItems?: DrawerLine[];
    assignSourceId?: string;
    assignSwipeDir?: SwipeDirection;
    executeAndAssign?: boolean;
    menuDisplay?: 'list' | 'dial';
    initialPointerX?: number;
    initialPointerY?: number;
    teleportId?: string; // For saving
    spellCommand?: string; // e.g. "cast 'teleport'"
    isContainer?: boolean;
    parentNoun?: string;
    entityId?: string;
    shopItems?: ShopItem[];
    practiceData?: PracticeData;
    helpData?: string;
    accentColor?: string;
    direction?: string;
    accountCharacters?: CharacterEntry[];
    accountState?: AccountState;
    setAccountState?: React.Dispatch<React.SetStateAction<AccountState>>;
}

export interface PopoverManagerProps {
    popoverState: PopoverState | null;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    popoverRef: React.RefObject<HTMLDivElement>;
    buttons: CustomButton[];
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    availableSets: string[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean; fromUi?: boolean }) => void;
    addMessage: (type: MessageType, content: string) => void;
    setTarget: (target: string | null) => void;
    teleportTargets: TeleportTarget[];
    setTeleportTargets: React.Dispatch<React.SetStateAction<TeleportTarget[]>>;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean, parentNoun?: string, direction?: string) => void;
    triggerHaptic: (ms: number) => void;
    roomPlayers: (string | GmcpOccupant)[];
    roomNpcs: (string | GmcpOccupant)[];
    roomItems: any[];
    inventoryLines?: DrawerLine[];
    eqLines?: DrawerLine[];
    setSettings: Record<string, ButtonSetSettings>;
    inlineCategories?: InlineCategoryConfig[];
    setInlineCategories?: React.Dispatch<React.SetStateAction<InlineCategoryConfig[]>>;
    favorites: string[];
    setFavorites: (val: string[]) => void;
    parley: ParleyState;
    setParley: React.Dispatch<React.SetStateAction<ParleyState>>;
    whoList: string[];
    isMendingMode?: boolean;
    setIsMendingMode?: (val: boolean) => void;
    setMendingTarget?: (val: string | null) => void;
    setIsEquipmentOpen?: (open: boolean) => void;
    setIsInventoryOpen?: (open: boolean) => void;
    refreshLogHighlights?: () => void;
    practice?: any;
    shop?: any;
    openKeywordEdit?: (context: string, displayText: string) => void;
    entities: Record<string, GameEntity>;
    registerEntity: (id: string, name: string, location: EntityLocation, category?: string) => GameEntity;
    selectedObjectIds: Set<string>;
    clearObjectSelection: () => void;
    keywordOverrides?: Record<string, string>;
    accountCharacters?: CharacterEntry[];
    accountState?: AccountState;
    setAccountState?: React.Dispatch<React.SetStateAction<AccountState>>;
}


export interface GameAction {
    id: string;
    pattern: string;
    command: string;
    isRegex: boolean;
    enabled: boolean;
}

export interface SettingsModalProps {
    connectionUrl: string;
    setConnectionUrl: (val: string) => void;
    bgImage: string;
    setBgImage: (val: string) => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    exportSettings: () => void;
    importSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isLoading: boolean;
    newSoundPattern: string;
    setNewSoundPattern: (val: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (val: boolean) => void;
    handleSoundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    soundTriggers: SoundTrigger[];
    setSoundTriggers: (val: SoundTrigger[]) => void;
    resetButtons: () => void;
    connect: () => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    autoConnect: boolean;
    setAutoConnect: (val: boolean) => void;
    showDebugEchoes: boolean;
    setShowDebugEchoes: (val: boolean) => void;
    uiMode: UiMode;
    setUiMode: (val: UiMode) => void;
    disable3dScroll: boolean;
    setDisable3dScroll: (val: boolean) => void;
    disableSmoothScroll: boolean;
    setDisableSmoothScroll: (val: boolean) => void;
    isImmersionMode: boolean;
    setIsImmersionMode: (val: boolean) => void;
    isHighlighterEnabled: boolean;
    setIsHighlighterEnabled: (val: boolean) => void;
    isBloomEnabled: boolean;
    setIsBloomEnabled: (val: boolean) => void;
    isSpectateMode: boolean;
    setIsSpectateMode: (val: boolean) => void;
    showLegacyButtons: boolean;
    setShowLegacyButtons: (val: boolean) => void;
    isNewbieMode: boolean;
    setIsNewbieMode: (val: boolean) => void;
    isNoviceMode?: boolean;
    setIsNoviceMode?: (val: boolean) => void;
    showRecordingIndicator: boolean;
    setShowRecordingIndicator: (val: boolean) => void;
    isTimestampEnabled: boolean;
    setIsTimestampEnabled: (val: boolean) => void;
    fontFamily: string;
    setFontFamily: (val: string) => void;
    showSpectatePromptInLog: boolean;
    setShowSpectatePromptInLog: (val: boolean) => void;
}

export interface ButtonSetSettings {
    themeColor?: string;
}

export interface SavedSettings {
    version: number;
    connectionUrl: string;
    bgImage: string;
    buttons: CustomButton[];
    soundTriggers: Omit<SoundTrigger, 'buffer'>[];
    actions?: GameAction[];
    combatSet?: string;
    defaultSet?: string;
    loginName?: string;
    loginPassword?: string;
    isSoundEnabled?: boolean;
    isNoviceMode?: boolean;
    abilities?: Record<string, number>;
    characterClass?: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none';
    setSettings?: Record<string, ButtonSetSettings>;
    autoConnect?: boolean;
    showDebugEchoes?: boolean;
    uiMode?: UiMode;
    disable3dScroll?: boolean;
    disableSmoothScroll?: boolean;
    isImmersionMode?: boolean;
    showRecordingIndicator?: boolean;
    showOrganicTerrain?: boolean;
    inlineCategories?: InlineCategoryConfig[];
    favorites?: string[];
    isHighlighterEnabled?: boolean;
    isBloomEnabled?: boolean;
    isNewbieMode?: boolean;
    isTimestampEnabled?: boolean;
    autoSaveSessions?: boolean;
}

export interface RoomNode {
    id: number;
    x: number;
    y: number;
    z: number;
    name: string;
    description?: string;
    environment: string;
    exits: Record<string, number>; // dir -> targetRoomId
    customColor?: string;
    notes?: string;
    zone?: string; // Zone/Area name
}

export interface SpatButton {
    id: string;
    btnId: string;
    label: string;
    icon?: string;
    command: string;
    action: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    color: string;
    timestamp: number;
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    swipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    menuDisplay?: 'list' | 'dial';
    closeKeyboard?: boolean;
    offKeyboard?: boolean;
    duration?: number;
    mid?: string;
}

// --- GMCP INTERFACES ---

export interface GmcpCharVitals {
    hp?: number;
    maxhp?: number;
    mana?: number;
    maxmana?: number;
    sp?: number;          // MUME Spirit/Mana
    maxsp?: number;
    move?: number;
    maxmove?: number;
    moves?: number;       // Alternate plural
    maxmoves?: number;
    mv?: number;          // Common short
    maxmv?: number;
    stamina?: number;     // Another common name
    maxstamina?: number;
    position?: string;
    opponent?: string | null;
    hp_status?: string;   // MUME health status via GMCP
    buff?: string | null; // MUME buffer tracking
    weather?: string | null;
    fog?: string | null;
    light?: string | null;
    terrain?: string | null;
    move_status?: string;
    stamina_status?: string;
}

export interface GmcpExitInfo {
    name: string;
    flags?: string[];
    id?: number;
    door?: number;
    to_vnum?: number;
}

export interface GmcpRoomInfo {
    num?: number;
    id?: number;
    vnum?: number;
    name?: string;
    desc?: string;
    area?: string;
    zone?: string;
    terrain?: string | null;
    environment?: string | null;
    light?: string | number | null;
    l?: string | number | null;
    sundeath?: boolean;
    exits?: Record<string, GmcpExitInfo | number | false>;
    details?: string[];
}

export interface GmcpUpdateExits {
    exits: Record<string, GmcpExitInfo | number | false>;
}
export interface GmcpOccupant {
    id?: string | number;
    name?: string;
    short?: string;
    shortdesc?: string;
    keyword?: string;
    type?: string;
    pc?: boolean | number;
}

export interface GmcpRoomPlayers extends Array<string | GmcpOccupant> { }

export interface GmcpRoomNpcs extends Array<string | GmcpOccupant> { }

export interface GmcpRoomItems extends Array<string | GmcpOccupant> { }

export interface GmcpCharInfo {
    name?: string;
    fullname?: string;
    level?: number;
    xp?: number;
    xp_max?: number;
    'next-level-xp'?: number;
    tp?: number;
    tp_max?: number;
    'next-level-tp'?: number;
    race?: string;
    subrace?: string;
    subclass?: string;
    class?: string;
    gold?: number;
    description?: string;
    whois?: string;
}

export interface CharacterInfo {
    name: string | null;
    level: number;
    xp: number;
    xpMax: number;
    tp: number;
    tpMax: number;
    race: string;
    subrace: string;
    subclass: string;
    class: string;
    gold: number;
    description?: string;
    whois?: string;
    alignment?: string;
    warPoints?: number;
    actsForWar?: number;
    stats?: {
        str: number;
        int: number;
        wis: number;
        dex: number;
        con: number;
        wil: number;
        per: number;
    };
    perception?: {
        vision: string;
        hearing: string;
        smell: string;
    };
    age?: string;
    weight?: string;
    eqWeight?: string;
    alertness?: string;
    session?: string;
    affectedBy?: string[];
    spells?: string[];
}

export interface WhereEntry { name: string; room: string; }

export interface GroupMember {
    id: number;
    name?: string;
    label?: string;
    type?: 'you' | 'npc' | 'ally' | 'enemy' | 'neutral';
    position?: string;
    room?: string;
    mapid?: number;
    ride?: boolean;
    blind?: boolean;
    bashed?: boolean;
    waiting?: boolean;
    poison?: boolean;
    slept?: boolean;
    wound?: boolean;
    snared?: boolean;
    hungry?: boolean;
    thirsty?: boolean;
    sanctuary?: boolean;
    hp?: number;
    maxhp?: number;
    mana?: number;
    maxmana?: number;
    mp?: number;
    maxmp?: number;
    mv?: number;
    maxmv?: number;
    'hp-string'?: string;
    'mana-string'?: string;
    'mp-string'?: string;
    'mv-string'?: string;
    fighting?: boolean;
    opponent?: string;
    'opponent-hp'?: string;
    zone?: string;
    terrain?: string;
}

export interface GmcpMumeEdit {
    title: string;
    text: string;
    key: string;
}

export interface ZoneMusicMapping {
    zone: string;
    url: string | string[];
}

// --- ACCOUNT & CHARACTER SELECTION ---

export type AccountStage = 'login' | 'character-select' | 'character-detail' | 'account-menu' | 'character-creation' | 'stat-editing' | 'none';

export interface CharacterEntry {
    index?: number;
    name: string;
    race: string;
    sublevel?: string;
    level: string | number;
    logon: string;
    area: string;
    rent: string;
    status?: string;
    host?: string;
}

export interface CreationOption {
    id: string;
    label: string;
}

export interface CreationPrompt {
    title: string;
    description: string;
    options: CreationOption[];
    footer?: string;
}

export type LogEntryType = 'rx' | 'tx' | 'gmcp' | 'ui' | 'sys';

export interface LogEntry {
  t: number; // timestamp offset from start in ms
  typ: LogEntryType;
  d: any; // data
}

export interface SessionLog {
  version: number;
  startTime: string;
  entries: LogEntry[];
  metadata: {
    client: string;
    version: string;
    character?: string;
  };
}

export interface AccountState {
    stage: AccountStage;
    characters: CharacterEntry[];
    selectedCharacter: CharacterEntry | null;
    creationPrompt?: CreationPrompt;
    lastCreatedCharacterName?: string;
    isGathering?: boolean;
}

export interface MumeTime {
    hour: number;
    day: number;
    month: string;
    year: number;
    weekday: string;
    era: string;
    lastSyncRealTime: number; // Date.now() when last synced
}
