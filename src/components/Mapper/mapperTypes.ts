export interface MapperRoom {
    id: string;
    gmcpId: number;
    name: string;
    desc: string;
    x: number;
    y: number;
    z: number;
    zone: string;
    terrain: string;
    exits: Record<string, MapperExit>;
    notes: string;
    mobFlags?: string[];
    loadFlags?: string[];
    roomQuestFlags?: string[];
    light?: string | number | null;
    sundeath?: number;
    align?: string;
    portable?: string;
    ridable?: string;
    isPermanentSnow?: boolean;
    createdAt: number;
}

export interface MapperExit {
    target: string;
    closed: boolean;
    hasDoor?: boolean;
    gmcpDestId?: number;
    name?: string;
    flags?: string[];
    doorFlags?: string[];
}

export interface GmcpExitInfo {
    name: string;
    flags?: string[];
    id?: number;
    door?: number;
    to_vnum?: number;
}

export interface MapperMarker {
    id: string;
    x: number;
    y: number;
    z: number;
    text: string;
    dotSize: number;
    fontSize: number;
    createdAt: number;
}

export interface RegionLabel {
    id: string;
    text: string;
    x: number;            // world coords (tile-space, like rooms)
    y: number;
    z: number;
    fontSize: number;     // world-space size; large means LOTR-feel
    color?: string;       // optional override; falls back to theme default
    opacity?: number;     // 0..1; defaults applied at render time
    letterSpacing?: number; // additional spacing for "spread" titles like "M O R D O R"
    rotation?: number;    // radians; small tilts for stylistic flair
    createdAt: number;
}

export interface MapperPrediction {
    dir: string;
    toId: string;
    toX: number;
    toY: number;
    toZ: number;
    createdAt: number;
    seq: number;
}

export interface MapperRef {
    handleRoomInfo: (data: any) => void;
    handleUpdateExits: (data: any) => void;
    handleTerrain: (t: string) => void;
    handleResetAndSync: () => void;
    handleAddRoom: (wx: number, wy: number, z: number) => string;
    handleDeleteRoom: (id: string) => void;
    pushPendingMove: (dir: string) => void;
    pushPreMove: (dir: string, targetId: string) => void;
    handleMoveConfirmed: (e?: any) => void;
    handleMoveFailure: () => void;
    handleCenterOnPlayer: () => void;
    triggerRender: () => void;
    stableRoomIdRef: React.MutableRefObject<string | null>;
    stableRoomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
    serverIdIndexRef?: React.MutableRefObject<Record<string, string>>;
}

export interface MapperProps {
    isDesignMode?: boolean;
    characterName?: string;
    isExpanded?: boolean;
    isMobile?: boolean;
    isMmapperMode?: boolean;
}

export interface GmcpRoomInfo {
    num?: number;
    vnum?: number;
    id?: number;
    name: string;
    desc?: string;
    area?: string;
    zone?: string;
    terrain?: string | null;
    environment?: string | null;
    light?: string | number | null;
    l?: string | number | null;
    sundeath?: number;
    exits?: Record<string, GmcpExitInfo | number | false>;
    details?: string[];
    room_quest_flags?: string[];
    spectating?: boolean;
}

export interface LabelVector {
    text: string;
    x: number;
    y: number;
    size?: number;
}

export interface MiddleEarthVectors {
    coastlines: number[][][];
    rivers: number[][][];
    mountains: number[][][];
    forests: number[][][];
    labels: LabelVector[];
}

export interface MapTileVisualAdjustments {
    terrainColors: Record<string, string>;
    wallColor: string;
    doorColor?: string;
    roadColorDark?: string;
    roadColorLight?: string;
    pathColorDark?: string;
    pathColorLight?: string;
}

export interface MapBackgroundVisualAdjustments {
    opacity: number;
    brightness: number;
    saturation: number;
    grayscale: number;
    contrast: number;
    hue: number;
    blurMin: number;
    blurMax: number;
    blurScale: number;
    tintColor: string;
    tintOpacity: number;
}
