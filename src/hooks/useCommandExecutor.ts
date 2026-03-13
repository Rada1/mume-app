import { useCallback } from 'react';
import { Direction, TeleportTarget, MessageType, DrawerLine, GameAction, CaptureStage } from '../types';
import { extractNoun } from '../utils/gameUtils';
import { MapperRef } from '../components/Mapper/mapperTypes';
import { getGateState } from '../components/Mapper/mapperUtils';

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
    target: string | null;
    setPopoverState: (val: any) => void;
    status: 'connected' | 'disconnected' | 'connecting';
    setIsCharacterOpen: (open: boolean) => void;
    setIsItemsDrawerOpen: (open: boolean) => void;
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
        setPopoverState, status, setIsCharacterOpen, setIsItemsDrawerOpen,
        setIsSettingsOpen, setSettingsTab,
        actions, setActions
    } = deps;

    const executeCommand = useCallback((cmd: string, silent = false, isSystem = false, _isHistorical = false, fromDrawer = false) => {
        initAudio();
        if (silent && isSystem) {
            isSilentCapture.current++;
            // Safety timeout: if a prompt isn't detected within 3s, assume the command finished
            // This prevents a "stuck" silent counter from hiding all game text.
            setTimeout(() => {
                if (isSilentCapture.current > 0) {
                    console.log(`[Executor] Silent capture safety reset (Count: ${isSilentCapture.current})`);
                    isSilentCapture.current = 0;
                    if (captureStage.current !== 'container') captureStage.current = 'none';
                }
            }, 8000);
        }

        // Target Setting
        const setTargetMatch = cmd.match(/^(:|#)?target\s*(\s+|=)\s*(.+)$/i) || cmd.match(/^#target\s+(.+)$/i);
        if (setTargetMatch) {
            const rawTarget = setTargetMatch[3] || setTargetMatch[2] || setTargetMatch[1];
            if (rawTarget) {
                const nounTarget = extractNoun(rawTarget.trim());
                setTarget(nounTarget); addMessage('system', `Target set to: ${nounTarget}`);
                return;
            }
        }

        // Target substitution
        let finalCmd = cmd;
        const hasTargetPlaceholder = /<target>/i.test(cmd);

        if (hasTargetPlaceholder) {
            if (target) {
                // Replace "<target>" with the actual name
                finalCmd = cmd.replace(/<target>/gi, target);
            } else {
                // Strip "<target>" and clean up double spaces/trailing space
                finalCmd = cmd.replace(/\s*<target>/gi, '').trim();
            }
        } else if (target) {
            const lower = cmd.toLowerCase().trim();
            // Intelligent auto-append for common combat/magic prefixes if no explicit target provided
            const isCastOrSkill = lower.startsWith('cast ') || lower.startsWith('skill ');

            // Common standalone verbs that usually want a target if one is available
            const combatVerbs = ['kill', 'k', 'hit', 'bash', 'kick', 'trip', 'bs', 'backstab', 'murder', 'charge', 'circle', 'assist', 'rescue', 'shoot', 'throw', 'track', 'consider', 'examine', 'eat', 'drink', 'quaff', 'sip'];
            const isStandaloneCombat = combatVerbs.includes(lower);

            if (isCastOrSkill || isStandaloneCombat) {
                if (isCastOrSkill) {
                    // Heuristic: if command is just 'cast "spell"' or 'skill "name"' with no extra word, append target
                    const parts = lower.split(/\s+/);
                    if (parts.length <= 2 || (parts[0] === 'cast' && parts.length <= 3 && cmd.includes("'"))) {
                        finalCmd = `${cmd.trim()} ${target}`;
                    }
                } else {
                    // Standalone combat verb - always append if we have a target
                    finalCmd = `${cmd.trim()} ${target}`;
                }
            }
        }

        if (!isSystem && navIntervalRef.current) {
            clearInterval(navIntervalRef.current); navIntervalRef.current = null;
            addMessage('system', 'Navigation stopped.');
        }

        const lowerCmd = cmd.toLowerCase().trim();

        // Teleport Interception
        if (teleportTargets.length > 0) {
            const teleportMatch = lowerCmd.match(/^(cast\s+['"]?(teleport|portal|scry)['"]?)$/i);
            if (teleportMatch) {
                setPopoverState({ x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100, type: 'teleport-select', setId: 'teleport', spellCommand: teleportMatch[1] });
                return;
            }
        }

        if (lowerCmd.startsWith('#teleport') || lowerCmd.startsWith('#tp') || lowerCmd.startsWith('#targets')) {
            const isManage = lowerCmd.includes('manage') || lowerCmd.includes('list');
            setPopoverState({
                x: window.innerWidth / 2 - (isManage ? 150 : 100),
                y: window.innerHeight / 2 - (isManage ? 150 : 100),
                type: isManage ? 'teleport-manage' : 'teleport-select',
                setId: 'teleport',
                spellCommand: isManage ? undefined : "cast 'teleport'"
            });
            return;
        }

        // Action Interception
        if (lowerCmd.startsWith('#action')) {
            const actionMatch = cmd.match(/^#action\s+({?)(.+?)(}?)\s+({?)(.+?)(}?)\s*$/i);
            if (actionMatch) {
                const pattern = actionMatch[2];
                const command = actionMatch[5];
                setActions(prev => [...prev, {
                    id: Math.random().toString(36).substring(2, 9),
                    pattern,
                    command,
                    isRegex: false,
                    enabled: true
                }]);
                addMessage('system', `Action added: [${pattern}] -> [${command}]`);
                return;
            } else {
                addMessage('system', 'Usage: #action {pattern} {command}');
                return;
            }
        }
        if (lowerCmd.startsWith('#unaction')) {
            const unactionMatch = cmd.match(/^#unaction\s+({?)(.+?)(}?)\s*$/i);
            if (unactionMatch) {
                const patternToRemove = unactionMatch[2].toLowerCase();
                setActions(prev => {
                    const filtered = prev.filter(a => a.pattern.toLowerCase() !== patternToRemove);
                    if (filtered.length !== prev.length) {
                        addMessage('system', `Action removed: [${patternToRemove}]`);
                    } else {
                        addMessage('system', `Action not found: [${patternToRemove}]`);
                    }
                    return filtered;
                });
                return;
            } else {
                addMessage('system', 'Usage: #unaction {pattern}');
                return;
            }
        }

        if (lowerCmd === '/help' || lowerCmd === '/?') {
            const setSettingsTab = (deps as any).setSettingsTab;
            const setIsSettingsOpen = (deps as any).setIsSettingsOpen;
            if (setSettingsTab && setIsSettingsOpen) {
                setSettingsTab('help');
                setIsSettingsOpen(true);
                return;
            }
        }

        // Container Interception
        if (lowerCmd.startsWith('look in ')) {
            captureStage.current = 'container';
            isDrawerCapture.current = 1;
            // Only reset popover if this is NOT a silent (drawer-triggered) look in
            // Drawer-triggered look in commands route results into the drawer list directly
            if (!silent) {
                setPopoverState((prev: any) => prev ? { ...prev, type: 'container', containerItems: [] } : prev);
            }
        }

        if (fromDrawer) {
            isDrawerCapture.current++;
            // Safety timeout
            setTimeout(() => {
                if (isDrawerCapture.current > 0) {
                    console.log(`[Executor] Drawer capture safety reset (Count: ${isDrawerCapture.current})`);
                    isDrawerCapture.current = 0;
                    if (captureStage.current === 'container') {
                         // Don't reset if we are actively capturing a container
                    } else {
                         captureStage.current = 'none';
                    }
                }
            }, 8000);
        } else if (!isSystem) {
            // CRITICAL: If the user sends a manual command, we MUST ensure they aren't stuck 
            // in a capture stage from a background drawer task that hung or is taking too long.
            isDrawerCapture.current = 0;
            isSilentCapture.current = 0;
            // Don't reset captureStage for 'who'/'where' — the parser sets it when the server's
            // header line arrives, and we need it to survive so list entries are tagged correctly.
            if (lowerCmd !== 'who' && lowerCmd !== 'where') {
                captureStage.current = 'none';
            }
        }

        if (lowerCmd === 'inventory' || lowerCmd === 'inv' || lowerCmd === 'i') {
            isWaitingForInv.current = true; captureStage.current = 'none'; setInventoryLines([]);
        } else if (lowerCmd === 'stat' || lowerCmd === 'st') {
            isWaitingForStats.current = true; captureStage.current = 'none'; setStatsLines([]);
        } else if (lowerCmd === 'eq' || lowerCmd === 'equipment') {
            isWaitingForEq.current = true; captureStage.current = 'none'; setEqLines([]);
        }

        if (lowerCmd === 'closeall') {
            setIsCharacterOpen(false); setIsItemsDrawerOpen(false);
        }

        // Only cast to bypass the TypeScript signature limitation of `addMessage` in the deps interface,
        // which currently only expects 2 arguments in the type definition but takes up to 6 in implementation.
        if (!silent) (addMessage as any)('user', finalCmd, undefined, undefined, undefined, { textOnly: finalCmd, lower: finalCmd.toLowerCase() });

        const moveCmd = finalCmd.toLowerCase().trim();
        const dirMap: Record<string, Direction> = {
            n: 'n', north: 'n', s: 's', south: 's', e: 'e', east: 'e', w: 'w', west: 'w',
            u: 'u', up: 'u', d: 'd', down: 'd', ne: 'ne', northeast: 'ne', nw: 'nw', northwest: 'nw',
            se: 'se', southeast: 'se', sw: 'sw', southwest: 'sw'
        };
        const dir = dirMap[moveCmd];
        if (dir) {
            // Responsive Pre-movement
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
                        mapperRef.current?.pushPreMove(dir, finalTargetId);
                        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-push-pre-move', { detail: { dir, targetId: finalTargetId } }));
                    }
                }
            }

            mapperRef.current?.pushPendingMove(dir);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-push-move', { detail: dir }));
        }


        if (status === 'connected') telnet.sendCommand(finalCmd);
        else if (!silent) addMessage('error', 'Not connected.');

        // Re-centering is handled automatically by the mapper's internal animation loop
        // when autoCenter is active. Explicitly calling handleCenterOnPlayer here
        // can cause imprecise 'snaps' on mobile that conflict with smooth animations.
    }, [status, target, teleportTargets, initAudio, addMessage, setTarget, setPopoverState,
        telnet, navIntervalRef, mapperRef, isDrawerCapture, captureStage, isWaitingForInv,
        isWaitingForStats, isWaitingForEq, setInventoryLines, setStatsLines, setEqLines,
        setIsCharacterOpen, setIsItemsDrawerOpen
    ]);

    return { executeCommand };
};
