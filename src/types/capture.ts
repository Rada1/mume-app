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
  | 'container'
  | 'help'
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
    setPendingFlags: (isSilent: boolean, fromDrawer: boolean) => void;
}
