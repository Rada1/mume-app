/**
 * @file ReplayHUDTypes.ts
 * @description Shared types for replay HUD rendering components.
 */

import type { ChangeEventHandler } from 'react';
import type { UIContextType } from '../../../context/GameContext/types';

// --- Logic Section ---
export type ReplayHUDReplayer = UIContextType['replayer'];
export type ReplayFlagMarker = { t: number; kind: 'death_self' | 'death_enemy_player'; name?: string };

export interface ReplayHUDBaseProps {
    replayer: ReplayHUDReplayer;
    flagMarkers: ReplayFlagMarker[];
    isMobile: boolean;
    isHovered: boolean;
    setIsHovered: (value: boolean) => void;
    setIsMinimized: (value: boolean) => void;
    searchQuery: string;
    handleSearch: ChangeEventHandler<HTMLInputElement>;
    jumpToResult: (dir: 'next' | 'prev') => void;
    formatTime: (ms: number) => string;
    progress: number;
}
