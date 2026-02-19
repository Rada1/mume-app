import { LucideIcon } from 'lucide-react';

export type MessageType = 'user' | 'system' | 'error' | 'game' | 'prompt';
export type LightingType = 'sun' | 'artificial' | 'moon' | 'dark' | 'none';
export type WeatherType = 'clear' | 'cloud' | 'rain' | 'heavy-rain' | 'snow' | 'none';
export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'u' | 'd';
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
}

export type ActionType = 'command' | 'nav' | 'menu' | 'assign';

export interface CustomButton {
    id: string;
    label: string;
    command: string; // Used as payload (command or target set ID)
    setId?: string; // The menu set this button belongs to (default 'main')
    actionType?: ActionType; // What the button does
    longActionType?: ActionType;
    swipeActionTypes?: {
        up?: ActionType;
        down?: ActionType;
        left?: ActionType;
        right?: ActionType;
    };
    display: 'floating' | 'inline'; // How the button is shown
    style: {
        x: number; // percentage of viewport width
        y: number; // percentage of viewport height
        w: number; // px
        h: number; // px
        backgroundColor: string;
        transparent?: boolean; // New transparent flag
        shape: 'rect' | 'pill' | 'circle';
    };
    trigger: {
        enabled: boolean;
        pattern: string; // text to match (also used for inline highlight)
        isRegex: boolean;
        autoHide: boolean; // hide after clicking (floating only)
        duration: number; // seconds to auto-disappear (floating only)
        type?: TriggerAction;
        targetSet?: string;
    };
    isVisible: boolean; // Runtime state
    longCommand?: string; // Command sent on long-press
    swipeCommands?: { up?: string; down?: string; left?: string; right?: string }; // Commands sent on swipe
}

export interface SoundTrigger {
    id: string;
    pattern: string;
    isRegex: boolean;
    buffer: AudioBuffer;
    srcData: string; // Base64 data for saving/loading
    fileName: string;
}

export interface PopoverState {
    x: number;
    y: number;
    setId: string;
    context?: string;
    assignSourceId?: string;
}

export interface SavedSettings {
    version: number;
    connectionUrl: string;
    bgImage: string;
    buttons: CustomButton[];
    soundTriggers: Omit<SoundTrigger, 'buffer'>[];
    combatSet?: string;
    defaultSet?: string;
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
