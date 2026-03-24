import { useCallback, useMemo } from 'react';
import { Direction, TeleportTarget, MessageType, DrawerLine, GameAction, CaptureStage } from '../types';
import { extractNoun } from '../utils/gameUtils';
import { MapperRef } from '../components/Mapper/mapperTypes';
import { getGateState } from '../components/Mapper/mapperUtils';

// --- Command Registry Imports ---
import { CommandRegistry } from '../services/command/CommandRegistry';
import { CommandContext } from '../services/command/types';
import { SemicolonMiddleware } from '../services/command/middlewares/SemicolonMiddleware';
import { TargetMiddleware } from '../services/command/middlewares/TargetMiddleware';
import { TeleportMiddleware } from '../services/command/middlewares/TeleportMiddleware';
import { ActionMiddleware } from '../services/command/middlewares/ActionMiddleware';
import { CaptureMiddleware } from '../services/command/middlewares/CaptureMiddleware';
import { SystemCommandMiddleware } from '../services/command/middlewares/SystemCommandMiddleware';

export interface ExecutorDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: MessageType, text: string) => void;
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
    setInventoryLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setStatsLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
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
}

export const useCommandExecutor = (deps: ExecutorDeps) => {
    const {
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        isDrawerCapture, isSilentCapture, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        setInventoryLines, setStatsLines, setEqLines, setTarget, target,
        setPopoverState, status, setIsCharacterOpen, setIsEquipmentOpen, setIsInventoryOpen,
        setIsSettingsOpen, setSettingsTab,
        actions, setActions
    } = deps;

    // --- Initialize Registry ---
    const registry = useMemo(() => {
        const r = new CommandRegistry();
        r.use(SemicolonMiddleware);
        r.use(SystemCommandMiddleware);
        r.use(TeleportMiddleware);
        r.use(ActionMiddleware);
        r.use(CaptureMiddleware);
        r.use(TargetMiddleware);
        return r;
    }, []);

    const executeCommand = useCallback((cmd: string, silent = false, isSystem = false, _isHistorical = false, fromDrawer = false) => {
        initAudio();
        
        // --- 1. Construct Context ---
        const context: CommandContext = {
            ...deps,
            executeCommand,
            addMessage: addMessage as any // Cast for extended signature
        };

        // --- 2. Run Pipeline ---
        const result = registry.execute(cmd, context, { silent, isSystem, fromDrawer });

        // --- 3. Process Result ---
        if (result === null) return; // Command cancelled/intercepted by middleware

        if (Array.isArray(result)) {
            result.forEach(subCmd => executeCommand(subCmd, silent, isSystem, _isHistorical, fromDrawer));
            return;
        }

        const finalCmd = result;

        // --- 4. Navigation Safety ---
        if (!isSystem && navIntervalRef.current) {
            clearInterval(navIntervalRef.current);
            navIntervalRef.current = null;
            addMessage('system', 'Navigation stopped.');
        }

        // --- 5. Silent Capture Safety (Keep here as it uses timers/refs) ---
        if (silent && isSystem) {
            const timeoutMs = (finalCmd.toLowerCase().startsWith('prac')) ? 15000 : 8000;
            setTimeout(() => {
                if (isSilentCapture.current > 0) {
                    console.log(`[Executor] Silent capture safety reset (Count: ${isSilentCapture.current}, Cmd: ${finalCmd})`);
                    isSilentCapture.current = 0;
                    if (captureStage.current !== 'container') {
                        deps.finalizeCapture();
                    }
                }
            }, timeoutMs);
        }

        // --- 6. Post-Execution Drawer Safety ---
        if (fromDrawer) {
            setTimeout(() => {
                if (isDrawerCapture.current > 0) {
                    isDrawerCapture.current = 0;
                    if (captureStage.current !== 'container') deps.finalizeCapture();
                }
            }, 8000);
        }

        // --- 7. Echo to Log ---
        if (!silent) (addMessage as any)('user', finalCmd, undefined, undefined, undefined, { textOnly: finalCmd, lower: finalCmd.toLowerCase() });

        // --- 8. Mapper Movement Hooks ---
        const moveCmd = finalCmd.toLowerCase().trim();
        const dirMap: Record<string, Direction> = {
            n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
            u: 'u', up: 'u', d: 'd', down: 'd', ne: 'ne', northeast: 'ne', nw: 'nw', northwest: 'nw',
            se: 'se', southeast: 'se', sw: 'sw', southwest: 'sw'
        };
        
        const dir = dirMap[moveCmd];
        if (dir) {
            const currentRoomId = mapperRef.current?.stableRoomIdRef?.current;
            const rooms = mapperRef.current?.stableRoomsRef?.current;
            const preloaded = mapperRef.current?.preloadedCoordsRef?.current;
            
            if (currentRoomId && rooms && preloaded) {
                const room = rooms[currentRoomId] || rooms[`m_${currentRoomId}`];
                const rawId = currentRoomId.startsWith('m_') ? currentRoomId.substring(2) : currentRoomId;
                const wEx = preloaded[rawId]?.[4]?.[dir];
                
                const { hasExit, hasDoor, isClosed } = getGateState(room, wEx, dir, rooms, preloaded);
                
                if (hasExit && (!hasDoor || !isClosed)) {
                    const exA = room?.exits ? room.exits[dir] : wEx;
                    const targetId = exA?.target || exA?.gmcpDestId;
                    if (targetId) {
                        const finalTargetId = String(targetId).startsWith('m_') ? String(targetId) : `m_${targetId}`;
                        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-push-pre-move', { detail: { dir, targetId: finalTargetId } }));
                    }
                }
            }
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-push-move', { detail: dir }));
        }

        // --- 9. Telnet Send ---
        if (status === 'connected') telnet.sendCommand(finalCmd);
        else if (!silent) addMessage('error', 'Not connected.');

        // --- 10. Post-Execution Refreshes ---
        if (!silent && status === 'connected' && /^ch\w*\s+mood\b/i.test(moveCmd)) {
            setTimeout(() => executeCommand('stat', true, true, false, false), 3000);
        }

    }, [registry, deps, status, target, teleportTargets, initAudio, addMessage, telnet, navIntervalRef, mapperRef, isDrawerCapture, captureStage, isSilentCapture, deps.finalizeCapture]);

    return { executeCommand };
};
