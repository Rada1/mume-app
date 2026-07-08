/**
 * @file shaperTypes.ts
 * @description Typed domain model for Shaper concept workspaces.
 */

// --- Identity Section ---
export type ShaperRoomId = string;
export type ShaperDirection = 'n' | 'e' | 's' | 'w' | 'u' | 'd';

// --- Room Section ---
export type ShaperRoomKind = 'grid' | 'extra';
export type ShaperRoomStatus = 'new-draft' | 'modified' | 'verified' | 'out-of-sync';
export type ShaperSector =
    'inside' | 'building' | 'city' | 'field' | 'forest' | 'hills' | 'mountain' |
    'shallows' | 'water' | 'road' | 'rapids' | 'underwater' | 'brush' |
    'tunnel' | 'cavern';
export type ShaperRoomFlag =
    'dark' | 'death' | 'no_mob' | 'indoors' | 'no_ride' | 'no_freeze' |
    'open_root' | 'no_magic' | 'isolated' | 'private' | 'random_exits' |
    'map_toggle' | 'hide_map_id' | 'security' | 'peaceful' | 'build' |
    'water' | 'no_shout' | 'silent' | 'sunlit' | 'trail';
export type ShaperDoorFlag =
    'broken' | 'build' | 'climb_down' | 'climb_up' | 'closed' | 'door' |
    'hidden' | 'locked' | 'nobash' | 'noblock' | 'nobreak' | 'noflee' |
    'not_shown' | 'no_mob' | 'pickproof' | 'plural' | 'stream' |
    'transient';
export type ShaperDoorKeyMode = 'generic' | 'vnum' | 'latch' | 'no_keyhole' | 'none';

export interface ShaperKeywordDraft {
    id: string;
    keywords: string[];
    description: string;
}

// A placed object, either lying in a room or loaded on a mob.
export interface ShaperItemRef {
    id: string;
    vnum: string;
    name: string;
    resetType?: string;
    resetDetail?: string;
    contents?: ShaperItemRef[];
    limit?: ShaperCommandLimit | null;
}

// A mob placed in a room, with the objects it carries / wears.
export interface ShaperMobPlacement {
    id: string;
    vnum: string;
    name: string;
    items: ShaperItemRef[];
    resetType?: string;
    resetDetail?: string;
    followers?: ShaperMobPlacement[];
    limit?: ShaperCommandLimit | null;
}

export interface ShaperAnnotation {
    id: string;
    text: string;
    createdAt: number;
}

export interface ShaperLiveRoomSnapshot {
    importedAt: number;
    statRoomFull?: string;
    comListCommands?: string;
    libRoomCommands?: string;
}

export interface ShaperRoomDraft {
    id: ShaperRoomId;
    x: number;
    y: number;
    z: number;
    kind: ShaperRoomKind;
    anchorRoomId: ShaperRoomId | null;
    roomNumber: string;
    status: ShaperRoomStatus;
    name: string;
    preposition: string;
    description: string;
    sector: ShaperSector | '';
    flags: ShaperRoomFlag[];
    owner: string;
    keywords: ShaperKeywordDraft[];
    notes: string;
    inactive?: boolean;
    annotations: ShaperAnnotation[];
    mobs: ShaperMobPlacement[];
    objects: ShaperItemRef[];
    liveSnapshot?: ShaperLiveRoomSnapshot;
    mapId?: string;
}

export interface ShaperConnectionSelection {
    aId: ShaperRoomId;
    bId: ShaperRoomId;
    dirAB: ShaperDirection;
    dirBA: ShaperDirection;
}

// --- Reset Command Section ---
export type ShaperCommandType =
    'mobile' | 'follow' | 'object' | 'hide' | 'put' | 'give' | 'equip' |
    'find' | 'door' | 'container' | 'repeat' | 'eqclass' | 'exec' |
    'liquid' | 'money' | 'months';

export interface ShaperCommandLimit {
    world: number | null;
    zone: number | null;
    room: number | null;
    chancePercent: number;
    raw: string;
}

export interface ShaperCommandNode {
    id: string;
    roomId: ShaperRoomId;
    parentId: string | null;
    order: number;
    type: ShaperCommandType;
    limit: ShaperCommandLimit | null;
    fields: Record<string, string | number | boolean | null>;
    notes: string;
}

// --- Library Section ---
export type ShaperLibraryTargetType = 'room' | 'mobile' | 'object';

export interface ShaperLibraryInstall {
    id: string;
    targetType: ShaperLibraryTargetType;
    targetId: string;
    name: string;
    parameters: Record<string, string | number | boolean>;
    requiresSupervisorReview: boolean;
    requiresLoad: boolean;
    notes: string;
}

// --- Zone Info Section ---
export interface ShaperZoneInfoKeyword {
    id: string;
    keyword: string;
    body: string;
    rawText?: string;
    importedAt?: number;
}

// --- Exit Section ---
export interface ShaperExitDraft {
    id: string;
    fromRoomId: ShaperRoomId;
    direction: ShaperDirection;
    toRoomId: ShaperRoomId | null;
    isTwoWay: boolean;
    hasDoor?: boolean;
    exitType?: string;
    exitDescription?: string;
    // Climb details
    isClimb?: boolean;
    climbDifficulty?: number;
    climbDamage?: number;
    climbDirection?: 'up' | 'down';
    // Door details
    doorName?: string;
    keyMode?: ShaperDoorKeyMode;
    keyVnum?: string;
    doorFlags?: ShaperDoorFlag[];
    doorPickPercent?: number;
    doorWeight?: number;
}

// --- Validation Section ---
export type ShaperIssueSeverity = 'error' | 'warning';

export interface ShaperValidationIssue {
    id: string;
    severity: ShaperIssueSeverity;
    targetId: string;
    // Owning room for the artifact, so room/exit/com issues surface in the room inspector.
    roomId?: ShaperRoomId;
    message: string;
}

// --- Workspace Section ---
export interface ShaperWorkspaceDoc {
    id: string;
    name: string;
    zoneNumber: number;
    updatedAt: number;
    // When true, edits publish to the relay and anyone with the project's link can pull it.
    shared?: boolean;
    selectedRoomId: ShaperRoomId;
    rooms: Record<ShaperRoomId, ShaperRoomDraft>;
    exits: Record<string, ShaperExitDraft>;
    commandNodes: Record<string, ShaperCommandNode>;
    libraries: Record<string, ShaperLibraryInstall>;
    // God-facing zone documentation from `/info z <zone> ...`, distinct from
    // player-facing room keywords/extra descriptions.
    zoneInfoKeywords: Record<string, ShaperZoneInfoKeyword>;
}

// --- Project Section ---
export interface ShaperProjectSummary {
    id: string;
    name: string;
    zoneNumber: number;
    updatedAt: number;
    shared?: boolean;
}
