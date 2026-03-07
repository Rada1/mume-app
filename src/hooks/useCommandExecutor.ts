import { useCallback } from 'react';
import { Direction, TeleportTarget, MessageType, DrawerLine, GameAction } from '../types';
import { extractNoun } from '../utils/gameUtils';
import { MapperRef } from '../components/Mapper/mapperTypes';

export interface ExecutorDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: MessageType, text: string) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<MapperRef>;
    teleportTargets: TeleportTarget[];
    isDrawerCapture: React.MutableRefObject<number>;
    isSilentCapture: React.MutableRefObject<number>;
    captureStage: React.MutableRefObject<'stat' | 'eq' | 'inv' | 'practice' | 'none'>;
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
                    isSilentCapture.current--;
                    console.log("[Executor] Silent capture safety timeout triggered.");
                }
            }, 3000);
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
        if (target && /\btarget\b/i.test(cmd)) finalCmd = cmd.replace(/\btarget\b/gi, target);

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

        if (fromDrawer) {
            isDrawerCapture.current++;
            // Safety timeout
            setTimeout(() => {
                if (isDrawerCapture.current > 0) {
                    isDrawerCapture.current--;
                }
            }, 3000);
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
            mapperRef.current?.pushPendingMove(dir);
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mume-mapper-push-move', { detail: dir }));
        }


        if (status === 'connected') telnet.sendCommand(finalCmd);
        else if (!silent) addMessage('error', 'Not connected.');

    }, [
        status, target, teleportTargets, initAudio, addMessage, setTarget, setPopoverState,
        telnet, navIntervalRef, mapperRef, isDrawerCapture, captureStage, isWaitingForInv,
        isWaitingForStats, isWaitingForEq, setInventoryLines, setStatsLines, setEqLines,
        setIsCharacterOpen, setIsItemsDrawerOpen
    ]);

    return { executeCommand };
};
