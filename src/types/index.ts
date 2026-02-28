import { LucideIcon } from 'lucide-react';

export type MessageType = 'user' | 'system' | 'error' | 'game' | 'prompt';
export type LightingType = 'sun' | 'artificial' | 'moon' | 'dark' | 'none';
export type WeatherType = 'clear' | 'cloud' | 'rain' | 'heavy-rain' | 'snow' | 'none';
export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'u' | 'd';
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw';
export type DeathStage = 'none' | 'fade_to_black' | 'flash' | 'black_hold' | 'fade_in';
export type TriggerAction = 'show' | 'switch_set';

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
    command: string; // Used as payload (command or target set ID)
    setId?: string; // The menu set this button belongs to (default 'main')
    actionType?: ActionType; // What the button does
    longActionType?: ActionType;
    swipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
    longSwipeActionTypes?: Partial<Record<SwipeDirection, ActionType>>;
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
        closeKeyboard?: boolean; // Close keyboard after clicking
    };
    isVisible: boolean; // Runtime state
    longCommand?: string; // Command sent on long-press
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    longSwipeCommands?: Partial<Record<SwipeDirection, string>>;
    menuDisplay?: 'list' | 'dial';
    requirement?: {
        ability?: string;
        minProficiency?: number;
        characterClass?: string[]; // Allowed classes
    };
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

export interface PopoverState {
    x: number;
    y: number;
    sourceHeight?: number;
    type?: 'menu' | 'teleport-select' | 'teleport-save' | 'teleport-manage' | 'give-recipient-select';
    setId: string;
    context?: string;
    assignSourceId?: string;
    assignSwipeDir?: SwipeDirection;
    executeAndAssign?: boolean;
    menuDisplay?: 'list' | 'dial';
    initialPointerX?: number;
    initialPointerY?: number;
    teleportId?: string; // For saving
    spellCommand?: string; // e.g. "cast 'teleport'"
}

export interface SavedSettings {
    version: number;
    connectionUrl: string;
    bgImage: string;
    buttons: CustomButton[];
    soundTriggers: Omit<SoundTrigger, 'buffer'>[];
    combatSet?: string;
    defaultSet?: string;
    loginName?: string;
    loginPassword?: string;
    isSoundEnabled?: boolean;
    isNoviceMode?: boolean;
    abilities?: Record<string, number>;
    characterClass?: 'ranger' | 'warrior' | 'mage' | 'cleric' | 'thief' | 'none';
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
    command: string;
    action: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    color: string;
    timestamp: number;
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

export interface GmcpRoomInfo {
    num?: number;
    id?: number;
    vnum?: number;
    name?: string;
    desc?: string;
    area?: string;
    zone?: string;
    terrain?: string | null;
    exits?: Record<string, any>;
}

export interface GmcpOccupant {
    name?: string;
    short?: string;
    shortdesc?: string;
    keyword?: string;
}

export interface GmcpRoomPlayers {
    players?: (string | GmcpOccupant)[];
    chars?: (string | GmcpOccupant)[];
    members?: (string | GmcpOccupant)[];
}

export interface GmcpRoomItems {
    items?: (string | GmcpOccupant)[];
    objects?: (string | GmcpOccupant)[];
}
