/**
 * @file game.ts
 * @description Core game engine, stats, vitals, and message types.
 */

export type GameState = 'disconnected' | 'account' | 'playing';

export type CaptureStage = import('./capture').CaptureType;

export interface RoomNode {
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    exits: Record<string, string>;
    terrain?: string;
    zone?: string;
    color?: string;
}

export type ExecuteCommand = (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean, options?: { shouldFocus?: boolean, fromUi?: boolean }) => void;

export type LightingType = 'sun' | 'artificial' | 'moon' | 'dark' | 'none' | 'normal';
export type WeatherType = 'clear' | 'cloud' | 'rain' | 'heavy-rain' | 'snow' | 'none' | 'calm';

export type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | 'u' | 'd';
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'ne' | 'nw' | 'se' | 'sw';

export type CombatHealthStatus = 'Healthy' | 'Fine' | 'Hurt' | 'Wounded' | 'Bad' | 'Awful' | 'Dying' | 'Stunned' | 'None';

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

import { Token } from './tokens';

export type MessageType = 'user' | 'system' | 'error' | 'game' | 'prompt' | 'comm' | 'comm-continue' | 'comm-sender' | 'comm-text' | 'practice-skill' | 'practice-header' | 'practice-class-header' | 'practice-column-header' | 'who-list' | 'where-list' | 'room-description' | 'room-name' | 'equipment-list' | 'inventory-list' | 'room-exits' | 'snoop' | 'snoop-command' | 'snoop-vitals' | 'account-prompt' | 'account-menu-item' | 'account-selection' | 'account-selection-edit' | 'account-stat-edit' | 'account-stat-points' | 'account-character-list' | 'quest-list' | 'weather' | 'gmcp-event' | 'movement' | 'status-event';

export interface Message {
    id: string;
    html: string; // Pre-converted ANSI html
    textRaw: string; // Raw text for logic checks
    textOnly?: string; // Pure text without any ANSI or HTML formatting
    tokens?: Token[]; // AST tokens for structured rendering
    type: MessageType;
    timestamp: number;
    isCombat?: boolean; // True if this line is combat-related
    combatSide?: 'player' | 'opponent' | 'groupmate'; // Who is acting in this combat line
    dimmedInCombat?: boolean; // True if this non-combat line arrived during a fight (permanently dim)
    isComm?: boolean; // True if this is a communication message (says, tells, etc.)
    replyTarget?: string; // Sender name for comm messages — enables the inline reply button
    replyCommand?: string; // Channel command for the reply button (e.g. 'tell', 'say', 'narrate')
    isRoomName?: boolean; // True if this line is a room title/name
    terrain?: string | null; // The terrain of the room if this is a room name line
    isRoomBlock?: boolean; // True if this line is a room name (with embedded description)
    isRoomBlockStart?: boolean;
    isRoomBlockEnd?: boolean;
    isRoomContentsStart?: boolean; // First contents line (mob/player/object/exit) after the room description
    roomSection?: 'objects' | 'mobs' | 'players' | 'exits'; // Which room-contents group this line belongs to
    isRoomSectionStart?: boolean; // First line of a contents section — render a labelled divider above it
    isRoomContentsLine?: boolean; // Contents line (or trailing blank) — gets the solid panel background

    isCombatBlockStart?: boolean;
    isCommBlockStart?: boolean;
    isSocialBlockStart?: boolean;
    isWeatherBlockStart?: boolean;
    isMovementBlockStart?: boolean;
    isStatusBlockStart?: boolean;
    isEmpty?: boolean;
    isNarrate?: boolean;
    isUrgent?: boolean; // True if this is a critical non-combat message (arrive/leave/spell)
    isSocial?: boolean;
    commSender?: string; // Structured sender for bubbles
    commAction?: string; // Structured action (says, tells, etc.)
    commText?: string; // Structured message text
    commColor?: string;
    commRoomKey?: string; // Room identity (vnum) at the time this comm was said — used to thread vicinity chat by room
    commRoomName?: string; // Room display name at the time this comm was said
    commSenderTokens?: Token[];
    commTextTokens?: Token[];
    batchId?: number;
    isBatchEnd?: boolean;
    inRoomBatch?: boolean;
    isHitImpact?: boolean;
    isDamageImpact?: boolean;
    isAvoidDamageImpact?: boolean;
    isMissImpact?: boolean;
    isHitterImpact?: boolean;
    isRipMessage?: boolean;
    isSnoop?: boolean;
    isSnoopInput?: boolean;
    isSpacer?: boolean;
    // Add specific data objects for UI support
    practiceSkill?: any;
    practiceHeader?: { sessionsLeft: number };
    isWelcomeBlock?: boolean;
    isWelcomeTitle?: boolean;
}

export interface MumeTime {
    hour: number;
    minute: number;
    day: number;
    month: string;
    year: number;
    weekday: string;
    era: string;
    lastSyncRealTime: number; // Date.now() when last synced
    mumeStartEpoch?: number;
    moon?: {
        zenithMinutes: number;
        level: number;
        phaseIndex: number;
        phaseName: string;
        waxing: boolean;
        position: string;
        isAboveHorizon: boolean;
    };
}

export interface CharacterInfo {
    name: string | null;
    level: number;
    xp: number;
    xpMax: number;
    tnl: number;
    tp: number;
    tpMax: number;
    tpnl: number;
    race: string;
    subrace: string;
    subclass: string;
    class: string;
    gold: number;
    description?: string;
    whois?: string;
    title?: string;
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


export interface ActivePrompt {
    text: string;
    time?: MumeTime;
}

export interface ParleyState {
    active: boolean;
    mode?: 'command' | 'parley' | 'help';
    command: 'tell' | 'whisper' | 'ask' | 'say' | 'narrate' | 'shout' | 'yell' | 'sing' | 'emote' | 'none';
    target: string | null;
    message: string;
}

export interface TeleportTarget {
    id: string;
    name: string;
    label?: string; // often used for display
    command: string;
    vnum?: number;
    category?: string;
    expiresAt?: number;
    createdAt?: number;
    sourceSpell?: 'locate' | 'locate life' | 'manual';
    sourceLine?: string;
    customName?: string;
    gatheredZone?: string;
}

export interface SpatButton {
    id: string;
    btnId?: string; // Original button ID
    mid?: string; // Message ID that triggered it
    label: string;
    command: string;
    action?: string; // legacy action property
    color: string;
    timestamp: number;
    duration: number;
    expiresAt?: number;
    sourceMid?: string;
    icon?: string;
    type?: 'enemy' | 'group' | 'info';
    // Gesture/Trigger support for Spat
    swipeCommands?: Partial<Record<SwipeDirection, string>>;
    swipeActionTypes?: Partial<Record<SwipeDirection, any>>;
    menuDisplay?: 'list' | 'dial';
    closeKeyboard?: boolean;
    offKeyboard?: boolean;
    startX?: number;
    startY?: number;
    targetX?: number;
    targetY?: number;
}

export interface DrawerLine {
    id: string;
    text: string;
    html: string;
    rawText?: string;
    tokens?: Token[];
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
    practiceSkill?: any;
}
