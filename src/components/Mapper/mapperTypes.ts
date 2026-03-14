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
    createdAt: number;
}

export interface GmcpExitInfo {
    name: string;
    flags?: string[];
    id?: number;
    door?: number;
    to_vnum?: number;
}

export interface MapperExit {
    target: string;
    closed: boolean;
    hasDoor?: boolean;
    gmcpDestId?: number;
    name?: string;
    flags?: string[];
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
    stableRoomIdRef: React.MutableRefObject<string | null>;
    stableRoomsRef: React.MutableRefObject<Record<string, MapperRoom>>;
    preloadedCoordsRef: React.MutableRefObject<Record<string, any>>;
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
    exits?: Record<string, GmcpExitInfo | number | false>;
    details?: string[];
    room_quest_flags?: string[];
}
