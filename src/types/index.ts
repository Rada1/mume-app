import { LucideIcon } from 'lucide-react';

export type MessageType = 'user' | 'system' | 'error' | 'game' | 'prompt' | 'shop-item' | 'practice-skill' | 'practice-header' | 'who-list' | 'where-list';
export type LightingType = 'sun' | 'artificial' | 'moon' | 'dark' | 'none';
export type WeatherType = 'clear' | 'cloud' | 'rain' | 'heavy-rain' | 'snow' | 'none';
export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'u' | 'd';
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw';
export type DeathStage = 'none' | 'fade_to_black' | 'flash' | 'black_hold' | 'fade_in' | 'blood_vignette';
export type TriggerAction = 'show' | 'switch_set';
export type UiMode = 'auto' | 'desktop' | 'portrait' | 'landscape';
export type CaptureStage = 'none' | 'stat' | 'inv' | 'eq' | 'practice' | 'container' | 'shop' | 'who' | 'where';
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
    dimmedInCombat?: boolean; // True if this non-combat line arrived during a fight (permanently dim)
    stackCount?: number; // How many copies of this message are stacked
    stackId?: string; // Identifier for the type of stack (e.g. "arrival:a black wolf:south")
    isComm?: boolean; // True if this is a communication message (says, tells, etc.)
    isRoomName?: boolean; // True if this line is a room title/name
    shopItem?: ShopItem; // Optional structured shop item data
    practiceSkill?: PracticeSkill; // Optional structured practice skill data
    practiceHeader?: { sessionsLeft: number }; // Optional practice header data
}

export interface ShopItem {
    id: string;
    name: string;
    shortName?: string;
    description: string;
    price: string;
    condition?: string;
    count?: string;
}

export interface PracticeSkill {
    name: string;
    sessions: string; // e.g., "1/43"
    knowledge: string; // e.g., "24%"
    proficiency: number; // numeric percentage
    difficulty: string; // e.g., "Hard"
    advice: string;
}

export interface PracticeData {
    sessionsLeft: number;
    skills: PracticeSkill[];
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
    depth?: number;
    prefix?: string;
    prefixHtml?: string;
    parentItemId?: string;
    parentItemNoun?: string;
}

export interface GameStats {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    move: number;
    maxMove: number;
    wimpy?: number;
}

export type ActionType = 'command' | 'nav' | 'menu' | 'assign' | 'select-assign' | 'teleport-manage' | 'select-recipient' | 'preload';

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
    buffer: AudioBuffer;
    srcData: string; // Base64 data for saving/loading
    fileName: string;
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
    type?: 'menu' | 'teleport-select' | 'teleport-save' | 'teleport-manage' | 'give-recipient-select' | 'shop-search' | 'practice' | 'select-parley-command' | 'select-parley-target' | 'container';
    setId: string;
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
    handleButtonClick: (button: CustomButton, e: React.MouseEvent, context?: string, isContainer?: boolean) => void;
    triggerHaptic: (ms: number) => void;
    roomPlayers: string[];
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
    setIsItemsDrawerOpen?: (open: boolean) => void;
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
    isMobileBrevityMode: boolean;
    setIsMobileBrevityMode: (val: boolean) => void;
    showLegacyButtons: boolean;
    setShowLegacyButtons: (val: boolean) => void;
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
    isMobileBrevityMode?: boolean;
    showLegacyButtons?: boolean;
    inlineCategories?: InlineCategoryConfig[];
    favorites?: string[];
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
    weather?: string | null;
    fog?: string | null;
    light?: string | null;
    terrain?: string | null;
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
    exits?: Record<string, GmcpExitInfo | number | false>;
    details?: string[];
}

export interface GmcpUpdateExits {
    exits: Record<string, GmcpExitInfo | number | false>;
}
export interface GmcpOccupant {
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
