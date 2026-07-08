/**
 * @file capture.ts
 * @description Types for the Reactive Capture Machine.
 */

import { DrawerLine } from './game';

export type CaptureType = 
  | 'stats' 
  | 'equipment' 
  | 'inventory' 
  | 'who' 
  | 'where' 
  | 'practice' 
  | 'score'
  | 'info'
  | 'quests'
  | 'achievement'
  | 'container'
  | 'help'
  | 'board_list'
  | 'board_read'
  | 'mail_list'
  | 'mail_read'
  | 'book_read'
  | 'shaper_mob_find'
  | 'shaper_obj_find'
  | 'shaper_mob_stat'
  | 'shaper_obj_stat'
  | 'shaper_mob_info'
  | 'shaper_obj_info'
  | 'shaper_live_build_list'
  | 'shaper_live_room_stat'
  | 'shaper_live_com_list'
  | 'shaper_live_lib_list'
  | 'examine'
  | 'consider'
  | 'whois'
  | 'self_title'
  | 'none';

export interface CaptureSession {
    type: CaptureType;
    lines: DrawerLine[];
    startTime: number;
    isSilent?: boolean;
    fromDrawer?: boolean;
    metadata?: Record<string, any>;
}

export interface CaptureResult {
    type: CaptureType;
    lines: DrawerLine[];
    metadata?: Record<string, any>;
}

export interface CaptureController {
    checkTriggers: (line: string, attachedText?: string) => CaptureType | null;
    startSession: (type: CaptureType) => void;
    accumulateLine: (line: DrawerLine | string, tokens?: any[], context?: any) => void;
    finalizeSession: (targetStage?: CaptureType) => void;
    hasSession: () => boolean;
    isSilent: () => boolean;
    isFromDrawer: () => boolean;
    getActiveType: () => CaptureType;
    setPendingFlags: (isSilent: boolean, fromDrawer: boolean, command?: string) => void;
    isPendingSilent: () => boolean;
    shouldSuppressCommandEcho: (line: string, attachedText?: string) => boolean;
    shouldSuppressSilentBlank: (line: string) => boolean;
    setLastRequestedContainerId?: (id: string | null) => void;
    getSession?: () => CaptureSession | null;
}
