import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { Direction, TeleportTarget, MessageType, CustomButton } from '../types';
import { extractNoun } from '../utils/gameUtils';
import { MapperRef } from '../components/Mapper';

interface CommandControllerDeps {
    telnet: { sendCommand: (cmd: string) => void };
    addMessage: (type: MessageType, text: string) => void;
    initAudio: () => void;
    navIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
    mapperRef: React.RefObject<MapperRef>;
    teleportTargets: TeleportTarget[];

    // Parser/UI state
    isDrawerCapture: React.MutableRefObject<boolean>;
    captureStage: React.MutableRefObject<string>;
    isWaitingForStats: React.MutableRefObject<boolean>;
    isWaitingForEq: React.MutableRefObject<boolean>;
    isWaitingForInv: React.MutableRefObject<boolean>;
    setInventoryHtml: (val: string) => void;
    setStatsHtml: (val: string) => void;
    setEqHtml: (val: string) => void;
    setCommandPreview: (val: string | null) => void;
    setInput: (val: string) => void;
    setTarget: (val: string | null) => void; // Passed from context but also available here

    // UI controls
    setIsInventoryOpen: (val: boolean) => void;
    setIsCharacterOpen: (val: boolean) => void;
    setIsRightDrawerOpen: (val: boolean) => void;
    setIsMapExpanded: (val: boolean) => void;

    // Environmental/System
    isMobile: boolean;
    triggerHaptic: (ms: number) => void;
    btn: {
        isEditMode: boolean;
        buttons: CustomButton[];
        buttonsRef: React.RefObject<CustomButton[]>;
        setEditingButtonId: (id: string | null) => void;
        setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
        setActiveSet: (setId: string) => void;
    };
    joystick: {
        currentDir: string | null;
        isTargetModifierActive: boolean;
        setIsJoystickConsumed: (val: boolean) => void;
    };
    wasDraggingRef: React.RefObject<boolean>;
}

export function useCommandController(deps: CommandControllerDeps) {
    const {
        target,
        setTarget: contextSetTarget,
        status,
        popoverState,
        setPopoverState
    } = useGame();

    const {
        telnet, addMessage, initAudio, navIntervalRef, mapperRef, teleportTargets,
        isDrawerCapture, captureStage, isWaitingForStats, isWaitingForEq, isWaitingForInv,
        setInventoryHtml, setStatsHtml, setEqHtml, setCommandPreview, setInput,
        setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen, setIsMapExpanded,
        isMobile, triggerHaptic, btn, joystick,
        wasDraggingRef
    } = deps;

    // Use context setTarget if available, otherwise fallback to deps
    const setTarget = contextSetTarget || deps.setTarget;

    const executeCommand = useCallback((cmd: string, silent = false, isSystem = false, isHistorical = false, fromDrawer = false) => {
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

        if (!isSystem) { // Silent usually means system-triggered or non-logged
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

        if (!silent) addMessage('user', finalCmd);
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
        } else if (!silent) {
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

    const handleButtonClick = useCallback((button: CustomButton, e: React.MouseEvent, context?: string) => {
        e.stopPropagation();
        if (btn.isEditMode) {
            if (wasDraggingRef.current) return;
            btn.setEditingButtonId(button.id);
        }
        else {
            if (popoverState) setPopoverState(null);
            const targetEl = (e.currentTarget && (e.currentTarget as any).classList) ? (e.currentTarget as HTMLElement) : null;
            if (targetEl) {
                targetEl.classList.remove('btn-glow-active');
                void targetEl.offsetWidth;
                targetEl.classList.add('btn-glow-active');
            }
            triggerHaptic(15);

            let cmd = button.command;
            if (context) {
                // If command contains %n, replace it, otherwise append with space
                if (cmd.includes('%n')) cmd = cmd.replace(/%n/g, context);
                else cmd = `${cmd} ${context}`;
            }

            let finalCmd = cmd;
            if (joystick.currentDir) {
                const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
                const fullDir = dirMap[joystick.currentDir] || joystick.currentDir;
                finalCmd = `${finalCmd} ${fullDir}`;
                joystick.setIsJoystickConsumed(true);
            } else if (joystick.isTargetModifierActive && target) {
                finalCmd = `${finalCmd} ${target}`;
                joystick.setIsJoystickConsumed(true);
            }

            if (button.actionType === 'nav') btn.setActiveSet(button.command);
            else if (button.actionType === 'assign' || button.actionType === 'menu') {
                const rect = targetEl ? targetEl.getBoundingClientRect() : null;
                const x = rect ? rect.right + 10 : (e as any).clientX || window.innerWidth / 2;
                const y = rect ? rect.top : (e as any).clientY || window.innerHeight / 2;

                setPopoverState({
                    x,
                    y,
                    sourceHeight: rect?.height,
                    setId: button.command,
                    context: button.label,
                    assignSourceId: button.actionType === 'assign' ? button.id : undefined,
                    menuDisplay: button.menuDisplay,
                    initialPointerX: rect ? (rect.left + rect.width / 2) : (e as any).clientX,
                    initialPointerY: rect ? (rect.top + rect.height / 2) : (e as any).clientY
                });
            } else if (button.actionType === 'teleport-manage') {
                setPopoverState({
                    x: window.innerWidth / 2 - 150,
                    y: window.innerHeight / 2 - 150,
                    type: 'teleport-manage',
                    setId: 'teleport'
                });
            } else if (button.actionType === 'select-recipient') {
                const rect = targetEl ? targetEl.getBoundingClientRect() : null;
                setPopoverState({
                    x: rect ? rect.right + 10 : (e as any).clientX || window.innerWidth / 2,
                    y: rect ? rect.top : (e as any).clientY || window.innerHeight / 2,
                    sourceHeight: rect?.height,
                    type: 'give-recipient-select',
                    setId: button.setId || 'main',
                    context: finalCmd
                });
            } else if (button.actionType === 'preload') {
                // Preload: put only the button's command into the input, never append context
                setInput(button.command + ' ');
                const el = document.querySelector('input');
                if (el) el.focus();
            } else if (finalCmd === '__clear_target__' || button.command === '__clear_target__') {
                setTarget(null);
                addMessage('system', 'Target cleared.');
            } else {
                setCommandPreview(finalCmd);
                executeCommand(finalCmd, false, false);
                setTimeout(() => setCommandPreview(null), 150);

                // Auto-refresh drawers if interacting with inventory/equipment buttons
                if (button.setId === 'inventorylist' || button.setId === 'equipmentlist') {
                    // Slight delay to allow MUD to process the change
                    setTimeout(() => {
                        if (button.setId === 'inventorylist' || button.command.includes('remove')) {
                            executeCommand('inv', false, true, true);
                        }
                        if (button.setId === 'equipmentlist' || button.command.includes('wear') || button.command.includes('hold') || button.command.includes('wield')) {
                            executeCommand('eq', false, true, true);
                        }
                    }, 500);
                }
            }
            if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') btn.setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
            if (button.trigger?.closeKeyboard) {
                (document.activeElement as HTMLElement)?.blur();
            }
        }
    }, [btn, popoverState, setPopoverState, triggerHaptic, joystick, target, executeCommand, setInput, setTarget, addMessage, setCommandPreview]);

    const handleInputSwipe = useCallback((dir: string) => {
        if (!isMobile) return;
        triggerHaptic(20);
        if (dir === 'up') {
            setIsMapExpanded(true);
        } else if (dir === 'down') {
            // Closing all drawers on swipe down
            if (isWaitingForStats.current || isWaitingForEq.current || isWaitingForInv.current || setIsInventoryOpen || setIsCharacterOpen || setIsRightDrawerOpen || setIsMapExpanded) {
                // We use isWaiting* as proxies for "is it open/opening"
                triggerHaptic(15);
                setIsInventoryOpen(false);
                setIsRightDrawerOpen(false);
                setIsCharacterOpen(false);
                setIsMapExpanded(false);
            } else executeCommand('s');
        } else if (dir === 'right') {
            // Swipe right (left to right) opens character
            setStatsHtml('');
            executeCommand('stat', false, true, true); // silent=false, isSystem=true, isHistorical=true
            setIsCharacterOpen(true);
        }
        else if (dir === 'left') {
            // Swipe left (right to left) opens inventory/equipment
            setInventoryHtml(''); setEqHtml('');
            executeCommand('inventory', false, true, true);
            setTimeout(() => executeCommand('eq', false, true, true), 300);
            setIsRightDrawerOpen(true);
        }
    }, [isMobile, triggerHaptic, setIsMapExpanded, isWaitingForStats, isWaitingForEq, isWaitingForInv, setIsInventoryOpen, setIsCharacterOpen, setIsRightDrawerOpen, executeCommand, setStatsHtml, setInventoryHtml, setEqHtml]);

    return { executeCommand, handleButtonClick, handleInputSwipe };
}
