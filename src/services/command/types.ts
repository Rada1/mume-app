/**
 * @file types.ts
 * @description Type definitions for the Unified Command Registry and Middlewares.
 */

import { MessageType, DrawerLine, GameAction, CaptureStage, TeleportTarget } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';

export interface CommandContext {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<MapperRef>;
    teleportTargets: TeleportTarget[];
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    captureStage: React.MutableRefObject<CaptureStage>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    isWaitingForInfo: React.MutableRefObject<boolean>;
    setInventoryLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setStatsLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setInfoLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setScoreLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setEqLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setTarget: (val: string | null) => void;
    finalizeCapture: (targetStage?: CaptureStage) => void;
    target: string | null;
    setPopoverState: (val: any) => void;
    status: 'connected' | 'disconnected' | 'connecting';
    setIsCharacterOpen: (open: boolean) => void;
    setIsEquipmentOpen: (open: boolean) => void;
    setIsInventoryOpen: (open: boolean) => void;
    setIsSettingsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'help') => void;
    actions: GameAction[];
    setActions: (val: GameAction[] | ((prev: GameAction[]) => GameAction[])) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export type CommandMiddleware = (
    cmd: string, 
    context: CommandContext, 
    options: { silent: boolean, isSystem: boolean, fromDrawer: boolean }
) => string | string[] | null | undefined;
