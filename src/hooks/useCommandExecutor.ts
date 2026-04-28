import { useCallback, useMemo, useRef, useEffect } from 'react';
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
    addMessage: (
        type: MessageType, 
        text: string, 
        extra?: any, 
        mid?: string, 
        isRoomName?: boolean, 
        precalculated?: { textOnly: string, lower: string, html?: string, tokens?: any[] },
        shopItem?: any,
        practiceSkill?: any,
        practiceHeader?: any,
        isSystem?: boolean
    ) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<MapperRef>;
    teleportTargets: TeleportTarget[];
    captureStage: React.MutableRefObject<CaptureStage>;
    setInventoryLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setStatsLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setInfoLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setScoreLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setEqLines: (val: DrawerLine[] | ((prev: DrawerLine[]) => DrawerLine[])) => void;
    setTarget: (val: string | null) => void;
    finalizeCapture: (targetStage?: CaptureStage) => void;
    setPendingFlags: (isSilent: boolean, fromDrawer: boolean) => void;
    target: string | null;
    setPopoverState: (val: any) => void;
    status: 'connected' | 'disconnected' | 'connecting';
    handleTabClick: (drawer: 'character' | 'players' | 'equipment') => void;
    setGearTab: (tab: 'worn' | 'inv') => void;
    setPlayersTab: (tab: 'online' | 'nearby' | 'group') => void;
    setCharTab: (tab: 'info' | 'quests' | 'skills') => void;
    setIsSettingsOpen: (open: boolean) => void;
    setSettingsTab: (tab: 'general' | 'sound' | 'actions' | 'help') => void;
    actions: GameAction[];
    setActions: (val: GameAction[] | ((prev: GameAction[]) => GameAction[])) => void;
    activePrompt: string;
    isPasswordMode: boolean;
    recordEntry?: (type: any, data: any, options?: { mask?: boolean }) => void;
}

export const useCommandExecutor = (deps: ExecutorDeps) => {
    const {
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        captureStage,
        setInventoryLines, setStatsLines, setScoreLines, setEqLines, setTarget, target,
        setPopoverState, status, handleTabClick, setGearTab, setPlayersTab, setCharTab,
        setIsSettingsOpen, setSettingsTab,
        actions, setActions, activePrompt, recordEntry
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

    // --- Stable Dependencies ---
    const depsRef = useRef(deps);
    useEffect(() => { depsRef.current = deps; }, [deps]);

    const executeCommand = useCallback((cmd: string, silent = false, isSystem = false, _isHistorical = false, fromDrawer = false) => {
        const d = depsRef.current;
        const { telnet, addMessage, initAudio, navIntervalRef, status } = d;

        initAudio();
        
        // --- 1. Construct Context ---
        const context: CommandContext = {
            ...d,
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
        if (!isSystem && navIntervalRef?.current) {
            clearInterval(navIntervalRef.current);
            navIntervalRef.current = null;
            addMessage('system', 'Navigation stopped.');
        }

        // --- 7. Echo to Log ---
        if (!silent) {
            const promptPrefix = activePrompt || '';
            const logText = d.isPasswordMode ? '********' : finalCmd;
            console.log('[useCommandExecutor] Sending to addMessage:', { 
                type: 'user', 
                text: `${promptPrefix}${logText}`, 
                isPasswordMode: d.isPasswordMode,
                hasAddMessage: !!addMessage
            });
            
            (addMessage as any)('user', `${promptPrefix}${logText}`, undefined, undefined, undefined, { 
                textOnly: `${promptPrefix}${logText}`, 
                lower: `${promptPrefix}${logText}`.toLowerCase() 
            });
        } else {
            console.log('[useCommandExecutor] Logging skipped because silent=true');
        }

        // --- 8. Mapper Movement Hooks ---
        const moveCmd = finalCmd.toLowerCase().trim();
        const dirMap: Record<string, Direction> = {
            n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
            u: 'u', up: 'u', d: 'd', down: 'd', ne: 'ne', northeast: 'ne', nw: 'nw', northwest: 'nw',
            se: 'se', southeast: 'se', sw: 'sw', southwest: 'sw'
        };
        
        const dir = dirMap[moveCmd];
        if (dir) {
            const currentRoomId = mapperRef?.current?.stableRoomIdRef?.current;
            const rooms = mapperRef?.current?.stableRoomsRef?.current;
            const preloaded = mapperRef?.current?.preloadedCoordsRef?.current;
            
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
        if (!silent && status === 'connected' && /^(ch\w*\s+)?mood\b/i.test(moveCmd)) {
            setTimeout(() => executeCommand('stat', true, true, false, false), 1000);
        }

    }, [registry]);

    return { executeCommand };
};
