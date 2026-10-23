/** @file roomInfo.ts — Room information card and editor contracts. */
import type React from 'react';
import type { MapperRoom } from '../components/Mapper/mapperTypes';
import type { MapRoomAttribute } from './mapMarkers';

// --- Card and section contracts ---
export interface RoomInfoCardProps {
    roomId: string;
    rooms: Record<string, MapperRoom>;
    setRooms: React.Dispatch<React.SetStateAction<Record<string, MapperRoom>>>;
    mode: 'play' | 'edit';
    onClose: () => void;
    cardRef: React.RefObject<HTMLDivElement | null>;
    preloadedCoordsRef?: React.MutableRefObject<Record<string, unknown[]>>;
    isMmapperMap?: boolean;
    setViewZ?: (z: number | null) => void;
    isDarkMode: boolean;
    onWalkStart?: (roomId: string) => void;
    stopWalking?: () => void;
    walkTargetId?: string | null;
    isMobile?: boolean;
}

export interface RoomInfoBadge { text: string; color: string; bg: string; }

export interface RoomInfoSectionProps {
    room: MapperRoom;
    mode: 'play' | 'edit';
    isDarkMode: boolean;
    updateRoom: (patch: Partial<MapperRoom>) => void;
}

export interface RoomInfoFlagsProps { room: MapperRoom; noteBadges: RoomInfoBadge[]; }
export interface RoomInfoExitsProps extends Pick<RoomInfoSectionProps, 'room' | 'mode' | 'isDarkMode'> {
    editExit: (direction: string, remove: boolean) => void;
}

export interface RoomFlagOption {
    id: string;
    label: string;
    group: string;
    kind: 'attribute' | 'mobFlags' | 'loadFlags';
    field?: MapRoomAttribute;
    value?: number;
    flag?: string;
}
