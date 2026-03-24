/**
 * @file useButtonGestures.ts
 * @description Hook managing pointer gestures for individual game buttons, including swiping and radial menus.
 */
import React, { useCallback } from 'react';
import { CustomButton, PopoverState, SwipeDirection } from '../../../types';
import { getButtonCommand } from '../../../utils/buttonUtils';

export interface UseButtonGesturesProps {
    button: CustomButton;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
    wasDraggingRef: React.RefObject<boolean>;
    triggerHaptic: (ms: number) => void;
    setHeldButton: React.Dispatch<React.SetStateAction<{ id: string, baseCommand: string, longCommand?: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null>>;
    heldButton: { id: string, baseCommand: string, longCommand?: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null;
    joystick: { isActive: boolean, currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void };
    target: string | null;
    setCommandPreview: (cmd: string | null) => void;
    setActiveDir: React.Dispatch<React.SetStateAction<SwipeDirection | null>>;
    activeDir: SwipeDirection | null;
    setIsCancelling: React.Dispatch<React.SetStateAction<boolean>>;
    isCancelling: boolean;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    setActiveSet: (setId: string) => void;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent | React.PointerEvent) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    setEditButton: (button: CustomButton) => void;
    setWheelPos: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
    playClickSound: () => void;
    isSoundEnabled: boolean;
    initAudio: () => void;
    setRayParams: (params: { angle: number, length: number, opacity: number, color?: string }) => void;
    isMobile?: boolean;
}

export const useButtonGestures = ({
    button,
    isEditMode,
    handleDragStart,
    wasDraggingRef,
    triggerHaptic,
    setHeldButton,
    heldButton,
    joystick,
    target,
    setCommandPreview,
    setActiveDir,
    activeDir,
    setIsCancelling,
    isCancelling,
    setPopoverState,
    executeCommand,
    setActiveSet,
    handleButtonClick,
    setButtons,
    setEditButton,
    setWheelPos,
    playClickSound,
    isSoundEnabled,
    initAudio,
    setRayParams,
    isMobile
}: UseButtonGesturesProps) => {

    // Helper to update ray params easily
    const updateRay = useCallback((angle: number, length: number, opacity: number, color?: string) => {
        setRayParams({ angle, length, opacity, color });
    }, [setRayParams]);

    // --- Auto-Reset on External Fire ---
    React.useEffect(() => {
        if (!heldButton || (heldButton && (heldButton.id !== button.id || heldButton.didFire))) {
            setActiveDir(null);
            setIsCancelling(false);
            updateRay(0, 0, 0);
        }
    }, [heldButton?.id, heldButton?.didFire, button.id, setActiveDir, setIsCancelling, updateRay]);

    // --- Interaction Start ---
    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (isEditMode) {
            if (button.setId === 'Tactical') {
                if (wasDraggingRef) wasDraggingRef.current = false;
                return;
            } else {
                handleDragStart(e, button.id, 'move');
            }
        } else {
            if (e.cancelable) e.preventDefault();
            initAudio(); 
            const el = e.currentTarget as any;
            const rect = el.getBoundingClientRect();
            el._startX = e.clientX;
            el._startY = e.clientY;
            el._startTime = Date.now();
            el._maxDist = 0;
            el._didFire = false;
            el._didLong = false;
            setWheelPos({ x: e.clientX, y: e.clientY });
            if (wasDraggingRef) wasDraggingRef.current = false;
            triggerHaptic(15);
            const initialX = rect.left + rect.width / 2;
            const initialY = rect.top + rect.height / 2;
            setHeldButton({
                id: button.id,
                baseCommand: button.command,
                longCommand: button.longCommand,
                modifiers: [],
                dx: 0,
                dy: 0,
                didFire: false,
                initialX,
                initialY
            });
            updateRay(0, 0, 0, button.style.borderColor || button.style.backgroundColor || 'var(--accent)');
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0');
        }
    }, [isEditMode, handleDragStart, button, setWheelPos, wasDraggingRef, triggerHaptic, setHeldButton, initAudio, updateRay]);

    // --- Gesture Recording & Feedback ---
    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (isEditMode) return;
        const el = e.currentTarget as any;
        if (!el._startX) return;

        if (heldButton?.id === button.id && heldButton.didFire) {
            return;
        }

        const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        el._maxDist = Math.max(el._maxDist || 0, dist);

        if (dist > 10 && wasDraggingRef) wasDraggingRef.current = true;

        if (dist > 15) {
            if (!heldButton || heldButton.id !== button.id) {
                setHeldButton({ id: button.id, baseCommand: button.command, longCommand: button.longCommand, modifiers: heldButton?.modifiers || [], dx, dy });
            } else if (heldButton.dx !== dx || heldButton.dy !== dy) {
                setHeldButton(prev => prev ? { ...prev, dx, dy } : null);
            }
        }

        const isDial = button.menuDisplay === 'dial';
        const startX = el._startX;
        const startY = el._startY;

        const dxVal = e.clientX - startX;
        const dyVal = e.clientY - startY;
        const distVal = Math.sqrt(dxVal * dxVal + dyVal * dyVal);

        const isLong = joystick.isTargetModifierActive;
        const preview = getButtonCommand(button, dxVal, dyVal, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target, isLong);
        setCommandPreview(preview?.cmd || null);
        if (preview?.cmd) {
            document.documentElement.style.setProperty(
                '--preview-glow-color',
                button.style.borderColor || button.style.backgroundColor || 'var(--accent)'
            );
        } else {
            document.documentElement.style.removeProperty('--preview-glow-color');
        }
        const angle = Math.atan2(dyVal, dxVal) * 180 / Math.PI;
        let snappedAngle = Math.round(angle / 45) * 45;

        if (el._lastAngle !== undefined) {
            let diff = snappedAngle - el._lastAngle;
            while (diff > 180) { snappedAngle -= 360; diff -= 360; }
            while (diff < -180) { snappedAngle += 360; diff += 360; }
        }
        el._lastAngle = snappedAngle;

        const isSwipedOut = el._maxDist > 25;
        const cancelX = window.innerWidth / 2 + 200;
        const cancelY = window.innerHeight / 2;
        const distToCancelBubble = Math.sqrt(Math.pow(e.clientX - cancelX, 2) + Math.pow(e.clientY - cancelY, 2));
        const isCancelZone = distToCancelBubble < 45;

        if (isCancelZone) {
            setActiveDir(null);
            el.style.setProperty('--cancel-opacity', '1');
            el.style.setProperty('--cancel-scale', '1.35');
            if (!el._wasInCancelZone) {
                triggerHaptic(60);
                el._wasInCancelZone = true;
            }
            setIsCancelling(true);
        } else if (preview?.isSwipe) {
            el._wasInCancelZone = false;
            setActiveDir(preview.dir || null);
            el.style.setProperty('--cancel-opacity', '0');
            setIsCancelling(false);
        } else if (preview && isSwipedOut && distVal < 20) {
            el._wasInCancelZone = false;
            setActiveDir('center' as any);
            el.style.setProperty('--cancel-opacity', '0');
            setIsCancelling(false);
        } else {
            el._wasInCancelZone = false;
            setActiveDir(null);
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0.5');
            setIsCancelling(false);
        }

        if (distVal > 20 && snappedAngle !== el._lastSnappedAngle) {
            triggerHaptic(15);
            if (isSoundEnabled) playClickSound();
            el._lastSnappedAngle = snappedAngle;
        }

        const isMenuButton = ['menu', 'assign', 'select-assign'].includes(button.actionType || '')
            || (isLong && ['menu', 'assign', 'select-assign'].includes(button.longActionType || ''));
        const menuSetId = isLong ? (button.longCommand || button.command) : button.command;

        if (isMenuButton && distVal > 25 && !el._didFire) {
            const rect = el.getBoundingClientRect();
            const initialX = rect.left + rect.width / 2;
            const initialY = rect.top + rect.height / 2;
            const isDial = button.menuDisplay === 'dial';
            el._didFire = true;
            setPopoverState({
                x: isDial ? window.innerWidth / 2 : e.clientX,
                y: isDial ? window.innerHeight / 2 : e.clientY,
                sourceHeight: rect.height, setId: menuSetId,
                context: button.label,
                assignSourceId: (button.actionType === 'assign' || button.actionType === 'select-assign') ? button.id : undefined,
                executeAndAssign: button.actionType === 'select-assign',
                menuDisplay: button.menuDisplay,
                accentColor: button.style.borderColor || button.style.backgroundColor,
                initialPointerX: isDial ? initialX : undefined,
                initialPointerY: isDial ? initialY : undefined
            });
            triggerHaptic(40);
        }

        const shouldShowRay = distVal > 15;
        const rayColor = isCancelZone ? '#ef4444' : (button.style.borderColor || 'var(--set-accent, var(--accent))');
        
        // Finalize ray parameters for state update
        const rayLength = isDial ? 140 : distVal + 55;
        updateRay(snappedAngle, rayLength, shouldShowRay ? 1 : 0, rayColor);

    }, [isEditMode, heldButton, button, activeDir, setActiveDir, setCommandPreview, wasDraggingRef, setHeldButton, joystick, target, setIsCancelling, triggerHaptic, setPopoverState, isSoundEnabled, playClickSound, updateRay, isMobile]);

    // --- Execution & Termination ---
    const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.cancelable) e.preventDefault();
        const el = e.currentTarget as any;
        if (isEditMode) return;

        if (heldButton?.id === button.id && heldButton.didFire) {
            setHeldButton(null);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }

        const currentX = e.clientX;
        const currentY = e.clientY;
        const startX = el._startX || currentX;
        const startY = el._startY || currentY;
        const dx = currentX - startX;
        const dy = currentY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isOverButton = dist < 25;
        const isLong = joystick.isTargetModifierActive;

        const isReturnToCenter = isOverButton && el._maxDist > 15;
        const finalDx = isReturnToCenter ? 0 : dx;
        const finalDy = isReturnToCenter ? 0 : dy;

        const previewCmd = getButtonCommand(button, finalDx, finalDy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target, isLong);

        setHeldButton(null);
        setCommandPreview(null);
        document.documentElement.style.removeProperty('--preview-glow-color');
        setActiveDir(null);
        const finalIsCancelling = isCancelling;
        setIsCancelling(false);
        el.style.setProperty('--cancel-opacity', '0');
        el.style.setProperty('--cancel-scale', '0');
        updateRay(0, 0, 0);

        el._startX = null;
        el._startY = null;
        el._startTime = null;
        el._maxDist = 0;

        if (el._didFire) { el._didFire = false; return; }

        const cancelX = window.innerWidth / 2 + 200;
        const cancelY = window.innerHeight / 2;
        const distToCancelBubble = Math.sqrt(Math.pow(currentX - cancelX, 2) + Math.pow(currentY - cancelY, 2));

        if (finalIsCancelling || distToCancelBubble < 45) return;

        if (previewCmd && previewCmd.cmd && previewCmd.cmd.trim() !== '') {
            if (previewCmd.actionType === 'nav') {
                setActiveSet(previewCmd.cmd);
                triggerHaptic(35);
                if (isSoundEnabled) playClickSound();
            } else if (['assign', 'menu', 'select-assign', 'select-recipient'].includes(previewCmd.actionType || '')) {
                const rect = el.getBoundingClientRect();
                const isSwipe = el._maxDist > 15;
                const isDial = button.menuDisplay === 'dial';
                const initialX = rect.left + rect.width / 2;
                const initialY = rect.top + rect.height / 2;

                triggerHaptic(40);
                setPopoverState({
                    x: isSwipe ? (isDial ? window.innerWidth / 2 : currentX) : rect.right + 10,
                    y: isSwipe ? (isDial ? window.innerHeight / 2 : currentY) : rect.top,
                    sourceHeight: rect.height,
                    setId: previewCmd.cmd,
                    context: previewCmd.actionType === 'select-assign' ? previewCmd.modifiers : button.label,
                    assignSourceId: (previewCmd.actionType === 'assign' || previewCmd.actionType === 'select-assign') ? button.id : undefined,
                    assignSwipeDir: previewCmd.dir,
                    executeAndAssign: previewCmd.actionType === 'select-assign' || previewCmd.actionType === 'assign',
                    menuDisplay: button.menuDisplay,
                    accentColor: button.style.borderColor || button.style.backgroundColor,
                    type: previewCmd.actionType === 'select-recipient' ? 'give-recipient-select' : undefined,
                    initialPointerX: (isSwipe && isDial) ? initialX : undefined,
                    initialPointerY: (isSwipe && isDial) ? initialY : undefined
                });
            } else if (previewCmd.actionType === 'preload' || (previewCmd.cmd && previewCmd.cmd.startsWith('input:'))) {
                const prefill = previewCmd.cmd.startsWith('input:') ? previewCmd.cmd.slice(6) : (previewCmd.cmd + (previewCmd.cmd.endsWith(' ') ? '' : ' '));
                handleButtonClick({ ...button, command: prefill, actionType: 'preload', _skipJoystick: true }, e as any);
            } else if (previewCmd.cmd === '__clear_target__') {
                handleButtonClick({ ...button, command: '__clear_target__', actionType: 'command', _skipJoystick: true }, e as any);
            } else if (previewCmd.cmd && previewCmd.cmd.trim() !== '') {
                executeCommand(previewCmd.cmd, false, false);
                if (joystick.currentDir) joystick.setIsJoystickConsumed(true);
                triggerHaptic(35);
                if (isSoundEnabled) playClickSound();
            }
            
            el.classList.remove('btn-glow-active');
            void el.offsetWidth;
            el.classList.add('btn-glow-active');
        } else {
            if (el._maxDist < 15 || isReturnToCenter) {
                el.classList.remove('btn-glow-active'); void el.offsetWidth; el.classList.add('btn-glow-active');

                const now = Date.now();
                const lastTap = el._lastTapTime || 0;
                el._lastTapTime = now;
                if (now - lastTap < 300 && !isReturnToCenter) {
                    const targetCmd = button.command?.trim();
                    if (targetCmd && targetCmd !== '__clear_target__') {
                        executeCommand(`target ${targetCmd}`);
                        triggerHaptic(60);
                        return;
                    }
                }
                handleButtonClick({ ...button, _skipJoystick: false } as any, e as any);
            }
        }

        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') {
            setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
        }
    }, [isEditMode, heldButton, button, joystick, target, isCancelling, setHeldButton, setCommandPreview, setActiveDir, setIsCancelling, setActiveSet, triggerHaptic, setPopoverState, executeCommand, handleButtonClick, setButtons, updateRay]);

    const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = e.currentTarget as any;
        setHeldButton(null);
        setCommandPreview(null);
        document.documentElement.style.removeProperty('--preview-glow-color');
        setActiveDir(null);
        el._wasInCancelZone = false;
        el.style.setProperty('--ray-opacity', '0');
        el.style.setProperty('--cancel-opacity', '0');
        el.style.setProperty('--cancel-scale', '0');
        el._startX = null;
        el._startY = null;
        el._startTime = null;
        el._maxDist = 0;
    }, [setHeldButton, setCommandPreview, setActiveDir]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (isEditMode) {
            if (wasDraggingRef && wasDraggingRef.current) return;
            setEditButton(button);
        }
    }, [isEditMode, wasDraggingRef, setEditButton, button]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick };
};
