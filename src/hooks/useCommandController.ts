import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Direction, TeleportTarget, MessageType } from '../types';
import { extractNoun } from '../utils/gameUtils';
import { MapperRef } from '../components/Mapper';

interface CommandControllerDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: MessageType, text: string) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<MapperRef>;
    teleportTargets: TeleportTarget[];

    // Parser state
    isDrawerCapture: React.MutableRefObject<boolean>;
    captureStage: React.MutableRefObject<string>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    setInventoryHtml: (val: string) => void;
    setStatsHtml: (val: string) => void;
    setEqHtml: (val: string) => void;

    // UI controls
    setIsInventoryOpen: (val: boolean) => void;
    setIsCharacterOpen: (val: boolean) => void;
    setIsRightDrawerOpen: (val: boolean) => void;
}

export function useCommandController(deps: CommandControllerDeps) {
    const {
        target, setTarget,
        status,
        setPopoverState
    } = useGame();

    const {
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        isDrawerCapture, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        setInventoryHtml, setStatsHtml, setEqHtml,
        setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen
    } = deps;

    const executeCommand = useCallback((cmd: string, isAutoNav = false, updateInput = true, fromDrawer = false) => {
        initAudio();

        // Local Target Setting
        const setTargetMatch = cmd.match(/^(:|#)?target\s*(\s+|=)\s*(.+)$/i) || cmd.match(/^#target\s+(.+)$/i);
        if (setTargetMatch) {
            const rawTarget = setTargetMatch[3] || setTargetMatch[2] || setTargetMatch[1];
            if (rawTarget) {
                const nounTarget = extractNoun(rawTarget.trim());
                setTarget(nounTarget);
                addMessage('system', `Target set to noun: ${nounTarget}`);
                return;
            }
        }

        // Target substitution
        let finalCmd = cmd;
        if (target && /\btarget\b/i.test(cmd)) {
            finalCmd = cmd.replace(/\btarget\b/gi, target);
        }

        if (!isAutoNav) {
            if (navIntervalRef.current) {
                clearInterval(navIntervalRef.current);
                navIntervalRef.current = null;
                addMessage('system', 'Navigation stopped.');
            }
        }

        const lowerCmd = cmd.toLowerCase().trim();

        // Teleport Spell Interception
        if (teleportTargets.length > 0) {
            const teleportMatch = lowerCmd.match(/^(cast\s+['"]?(teleport|portal|scry)['"]?)$/i);
            if (teleportMatch) {
                const spell = teleportMatch[1];
                setPopoverState({
                    x: window.innerWidth / 2 - 100,
                    y: window.innerHeight / 2 - 100,
                    type: 'teleport-select',
                    setId: 'teleport',
                    spellCommand: spell
                });
                return;
            }
        }

        // Teleport Manage/Select Command
        if (lowerCmd.startsWith('#teleport') || lowerCmd.startsWith('#tp') || lowerCmd.startsWith('#targets')) {
            if (teleportTargets.length > 0 && !lowerCmd.includes('manage') && !lowerCmd.includes('list')) {
                setPopoverState({
                    x: window.innerWidth / 2 - 100,
                    y: window.innerHeight / 2 - 100,
                    type: 'teleport-select',
                    setId: 'teleport',
                    spellCommand: "cast 'teleport'"
                });
            } else {
                setPopoverState({
                    x: window.innerWidth / 2 - 150,
                    y: window.innerHeight / 2 - 150,
                    type: 'teleport-manage',
                    setId: 'teleport'
                });
            }
            return;
        }

        if (lowerCmd === 'inventory' || lowerCmd === 'inv' || lowerCmd === 'stat' || lowerCmd === 'eq' || lowerCmd === 'equipment') {
            isDrawerCapture.current = fromDrawer;
        }

        if (lowerCmd === 'inventory' || lowerCmd === 'inv') {
            isWaitingForInv.current = true;
            captureStage.current = 'none';
            setInventoryHtml('');
        } else if (lowerCmd === 'stat') {
            isWaitingForStats.current = true;
            captureStage.current = 'none';
            setStatsHtml('');
        } else if (lowerCmd === 'eq' || lowerCmd === 'equipment') {
            isWaitingForEq.current = true;
            captureStage.current = 'none';
            setEqHtml('');
        }

        // Failsafe: Hard-stop any captures
        if (['inventory', 'inv', 'stat', 'eq', 'equipment'].includes(lowerCmd)) {
            setTimeout(() => {
                if (captureStage.current !== 'none') {
                    captureStage.current = 'none';
                    isWaitingForStats.current = false;
                    isWaitingForEq.current = false;
                    isWaitingForInv.current = false;
                }
            }, 1000);
        }

        if (lowerCmd.includes('stat') && lowerCmd.includes('eq')) {
            isWaitingForStats.current = true;
            isWaitingForEq.current = true;
            captureStage.current = 'none';
            setStatsHtml('');
            setEqHtml('');
        }

        if (lowerCmd === 'closeall') {
            setIsInventoryOpen(false); setIsCharacterOpen(false); setIsRightDrawerOpen(false);
        }

        addMessage('user', finalCmd);
        const moveCmd = finalCmd.toLowerCase().trim();
        const validMoves: Direction[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'];
        let dir: Direction | null = null;
        if (validMoves.includes(moveCmd as any)) dir = moveCmd as Direction;
        else if (moveCmd === 'north') dir = 'n';
        else if (moveCmd === 'south') dir = 's';
        else if (moveCmd === 'east') dir = 'e';
        else if (moveCmd === 'west') dir = 'w';
        else if (moveCmd === 'up') dir = 'u';
        else if (moveCmd === 'down') dir = 'd';
        else if (moveCmd === 'northeast') dir = 'ne';
        else if (moveCmd === 'northwest') dir = 'nw';
        else if (moveCmd === 'southeast') dir = 'se';
        else if (moveCmd === 'southwest') dir = 'sw';

        if (dir && ['n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw'].includes(dir)) {
            mapperRef.current?.pushPendingMove(dir);
        }

        if (status === 'connected') {
            telnet.sendCommand(finalCmd);
        } else {
            addMessage('error', 'Not connected.');
        }
    }, [
        status, target, teleportTargets,
        initAudio, addMessage, setTarget, setPopoverState,
        telnet, navIntervalRef, mapperRef,
        isDrawerCapture, captureStage, isWaitingForInv, isWaitingForStats, isWaitingForEq,
        setInventoryHtml, setStatsHtml, setEqHtml,
        setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen
    ]);

    return { executeCommand };
}
