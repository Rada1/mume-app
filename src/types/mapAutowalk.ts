/** @file mapAutowalk.ts — Mobile autowalk overlay inputs. */
import type { RefObject } from 'react';
import type { MapperRoom } from '../components/Mapper/mapperTypes';
import type { MapData } from '../components/Mapper/performance/webcockpit/model';

// --- Overlay contracts ---
export interface MobileAutowalkPopoverProps {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    cameraRef: RefObject<{ x: number; y: number; zoom: number }>;
    playerPosRef: RefObject<{ x: number; y: number; z: number } | null>;
    room: MapperRoom | undefined;
    currentRoomId: string | null;
    performanceMap: MapData | null;
    roomsLeft: number;
    onStop: () => void;
}
