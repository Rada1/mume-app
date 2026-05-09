/**
 * @file types.ts
 * @description Type definitions for the Unified Command Registry and Middlewares.
 */

import { MessageType, DrawerLine, GameAction, CaptureStage, TeleportTarget, Direction } from '../../types';
import { MapperRef } from '../../components/Mapper/mapperTypes';

export interface CommandContext {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: MessageType, text: string, combatOverride?: boolean, mid?: string, isRoomName?: boolean, precalculated?: { textOnly: string, lower: string }) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<MapperRef>;
    teleportTargets: TeleportTarget[];
    captureStage: React.MutableRefObject<CaptureStage>;
    setPendingFlags: (isSilent: boolean, fromDrawer: boolean) => void;
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
    handleTabClick: (drawer: 'character' | 'players' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    setIsSettingsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'help' | 'buttons' | 'map') => void;
    setUI?: React.Dispatch<React.SetStateAction<any>>;
    actions: GameAction[];
    setActions: (val: GameAction[] | ((prev: GameAction[]) => GameAction[])) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export type CommandMiddleware = (
    cmd: string, 
    context: CommandContext, 
    options: { silent: boolean, isSystem: boolean, fromDrawer: boolean }
) => string | string[] | null | undefined;
