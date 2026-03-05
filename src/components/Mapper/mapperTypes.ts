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
    createdAt: number;
}

export interface MapperExit {
    target: string;
    closed: boolean;
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
    handleMoveFailure: () => void;
}

export interface MapperProps {
    isDesignMode?: boolean;
    characterName?: string;
    isExpanded?: boolean;
    isMobile?: boolean;
    isMmapperMode?: boolean;
}


