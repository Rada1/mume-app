/**
 * @file useButtonGestures.ts
 * @description Hook managing pointer gestures for individual game buttons, including swiping and radial menus.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { CustomButton, PopoverState, SwipeDirection, ExecuteCommand } from '../../../types';

import { getButtonCommand } from '../../../utils/buttonUtils';

export interface UseButtonGesturesProps {
    button: CustomButton;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
    wasDraggingRef: React.RefObject<boolean>;
    triggerHaptic: (ms: number) => void;
    setHeldButton: React.Dispatch<React.SetStateAction<{ id: string, baseCommand: string, longCommand?: string, modifiers: string[], commandPrefixes?: string[], dx?: number, dy?: number, didFire?: boolean, lastTargetFireAt?: number, initialX?: number, initialY?: number } | null>>;
    heldButton: { id: string, baseCommand: string, longCommand?: string, modifiers: string[], commandPrefixes?: string[], dx?: number, dy?: number, didFire?: boolean, lastTargetFireAt?: number, initialX?: number, initialY?: number } | null;
    joystick: { isActive: boolean, currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void, setIsSwipeWheelHidden?: (val: boolean) => void };
    target: string | null;
    setCommandPreview: (cmd: string | null) => void;
    setActiveDir: React.Dispatch<React.SetStateAction<SwipeDirection | null>>;
    activeDir: SwipeDirection | null;
    setIsCancelling: React.Dispatch<React.SetStateAction<boolean>>;
    isCancelling: boolean;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    executeCommand: ExecuteCommand;
    setActiveSet: (setId: string) => void;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent | React.PointerEvent) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    setEditButton: (button: CustomButton) => void;
    setWheelPos: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>;
    playClickSound: () => void;
    isSoundEnabled: boolean;
    initAudio: () => void;
    setRayParams: React.Dispatch<React.SetStateAction<{ angle: number, length: number, opacity: number, color?: string }>>;
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
    const rayFrameRef = useRef<number | null>(null);
    const pendingRayRef = useRef<{ angle: number, length: number, opacity: number, color?: string } | null>(null);
    const lastPreviewRef = useRef<string | null>(null);
    const lastActiveDirRef = useRef<SwipeDirection | 'center' | null>(null);
    const lastCancellingRef = useRef(false);

    const getNextCommandPrefixes = useCallback((prev?: { commandPrefixes?: string[] } | null) => {
        const prefixes = prev?.commandPrefixes || [];
        if (button.actionType !== 'modifier') return prefixes;
        return prefixes.includes(button.command) ? prefixes : [...prefixes, button.command];
    }, [button.actionType, button.command]);

    // Helper to update ray params easily
    const updateRay = useCallback((angle: number, length: number, opacity: number, color?: string) => {
        pendingRayRef.current = { angle, length, opacity, color };
        if (rayFrameRef.current !== null) return;

        rayFrameRef.current = requestAnimationFrame(() => {
            rayFrameRef.current = null;
            const next = pendingRayRef.current;
            pendingRayRef.current = null;
            if (!next) return;
            setRayParams(prev => (
                prev.angle === next.angle &&
                prev.length === next.length &&
                prev.opacity === next.opacity &&
                prev.color === next.color
                    ? prev
                    : next
            ));
        });
    }, [setRayParams]);

    useEffect(() => () => {
        if (rayFrameRef.current !== null) {
            cancelAnimationFrame(rayFrameRef.current);
            rayFrameRef.current = null;
        }
    }, []);

    // --- Auto-Reset on External Fire ---
    React.useEffect(() => {
        if (!heldButton || (heldButton && (heldButton.id !== button.id || heldButton.didFire))) {
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            updateRay(0, 0, 0);
            // If it's our button that fired externally, clear the local pointer start
            if (heldButton?.id === button.id && heldButton.didFire) {
                const el = document.getElementById(button.id) as any;
                if (el) {
                    el._startX = null;
                    el._startY = null;
                }
            }
        }
    }, [heldButton?.id, heldButton?.didFire, button.id, setActiveDir, setIsCancelling, updateRay]);

    // --- Interaction Start ---
    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.buttons !== 1 && e.pointerType === 'mouse') return;

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
            try { el.setPointerCapture(e.pointerId); } catch(err) {}

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
            setHeldButton(prev => {
                // If there's already a held button that is SWIPING, don't overwrite it.
                // This allows us to tap other buttons for combos without losing the swipe state of the first button.
                if (prev && prev.id !== button.id && (Math.abs(prev.dx || 0) > 15 || Math.abs(prev.dy || 0) > 15)) {
                    return prev;
                }
                return {
                    id: button.id,
                    baseCommand: button.command,
                    longCommand: button.longCommand,
                    modifiers: [],
                    commandPrefixes: getNextCommandPrefixes(prev),
                    dx: 0,
                    dy: 0,
                    didFire: false,
                    initialX,
                    initialY
                };
            });
            updateRay(0, 0, 0, button.style.borderColor || button.style.backgroundColor || 'var(--accent)');
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0');
        }
    }, [isEditMode, handleDragStart, button, setWheelPos, wasDraggingRef, triggerHaptic, setHeldButton, initAudio, updateRay, getNextCommandPrefixes]);

    // --- Gesture Recording & Feedback ---
    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (isEditMode) return;
        const el = e.currentTarget as any;
        if (!el._startX) return;

        // Failsafe for desktop: if no buttons are pressed, clean up orphaned state
        if (e.buttons === 0) {
            setHeldButton(null);
            el._startX = null;
            el._startY = null;
            return;
        }

        if (heldButton?.id === button.id && heldButton.didFire) {
            return;
        }

        const dx = e.clientX - el._startX, dy = e.clientY - el._startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        el._maxDist = Math.max(el._maxDist || 0, dist);
        
        if (dist > 10 && wasDraggingRef) wasDraggingRef.current = true;

        if (dist > 15) {
            setHeldButton(prev => {
                // If someone else is already swiping, don't take it back.
                if (prev && prev.id !== button.id && (Math.abs(prev.dx || 0) > 15 || Math.abs(prev.dy || 0) > 15)) {
                    return prev;
                }
                // If it's already us, update dx/dy
                if (prev && prev.id === button.id) {
                    if (prev.dx === dx && prev.dy === dy) return prev;
                    return { ...prev, dx, dy };
                }
                // Otherwise (null or someone not swiping), take it.
                return { 
                    id: button.id, 
                    baseCommand: button.command, 
                    longCommand: button.longCommand, 
                    modifiers: prev?.modifiers || [], 
                    commandPrefixes: getNextCommandPrefixes(prev),
                    dx, 
                    dy,
                    didFire: false
                };
            });
        }

        const isDial = button.menuDisplay === 'dial';
        const startX = el._startX;
        const startY = el._startY;

        const dxVal = e.clientX - startX;
        const dyVal = e.clientY - startY;
        const distVal = Math.sqrt(dxVal * dxVal + dyVal * dyVal);

        const isLong = joystick.isTargetModifierActive;
        const preview = getButtonCommand(button, dxVal, dyVal, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target, isLong, (heldButton?.id === button.id ? heldButton.commandPrefixes : []));
        const nextPreview = preview?.cmd || null;
        if (lastPreviewRef.current !== nextPreview) {
            lastPreviewRef.current = nextPreview;
            setCommandPreview(nextPreview);
        }
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

        let nextActiveDir: SwipeDirection | 'center' | null = null;

        if (isCancelZone) {
            el.style.setProperty('--cancel-opacity', '1');
            el.style.setProperty('--cancel-scale', '1.35');
            if (!el._wasInCancelZone) {
                triggerHaptic(60);
                el._wasInCancelZone = true;
            }
            if (!lastCancellingRef.current) {
                lastCancellingRef.current = true;
                setIsCancelling(true);
            }
        } else if (preview?.isSwipe) {
            el._wasInCancelZone = false;
            nextActiveDir = preview.dir || null;
            el.style.setProperty('--cancel-opacity', '0');
            if (lastCancellingRef.current) {
                lastCancellingRef.current = false;
                setIsCancelling(false);
            }
        } else if (preview && isSwipedOut && distVal < 20) {
            el._wasInCancelZone = false;
            nextActiveDir = 'center';
            el.style.setProperty('--cancel-opacity', '0');
            if (lastCancellingRef.current) {
                lastCancellingRef.current = false;
                setIsCancelling(false);
            }
        } else {
            el._wasInCancelZone = false;
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0.5');
            if (lastCancellingRef.current) {
                lastCancellingRef.current = false;
                setIsCancelling(false);
            }
        }

        if (lastActiveDirRef.current !== nextActiveDir) {
            lastActiveDirRef.current = nextActiveDir;
            setActiveDir(nextActiveDir as any);
        }

        if (nextActiveDir !== el._lastActiveDir) {
            if (!isCancelZone) {
                triggerHaptic(15);
                if (isSoundEnabled) playClickSound();
            }
            el._lastActiveDir = nextActiveDir;
        }

        const menuActionType = isLong ? button.longActionType : button.actionType;
        const isMenuButton = ['menu', 'assign', 'select-assign'].includes(menuActionType || '');
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
                assignSourceId: (menuActionType === 'assign' || menuActionType === 'select-assign') ? button.id : undefined,
                executeAndAssign: menuActionType === 'select-assign',
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

    }, [isEditMode, heldButton, button, activeDir, setActiveDir, setCommandPreview, wasDraggingRef, setHeldButton, joystick, target, setIsCancelling, triggerHaptic, setPopoverState, isSoundEnabled, playClickSound, updateRay, isMobile, getNextCommandPrefixes]);

    // --- Execution & Termination ---
    const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (e.cancelable) e.preventDefault();
        const el = e.currentTarget as any;
        try { el.releasePointerCapture(e.pointerId); } catch(err) {}
        
        if (isEditMode) return;

        if (heldButton?.id === button.id && heldButton.didFire) {
            setHeldButton(null);
            lastPreviewRef.current = null;
            lastActiveDirRef.current = null;
            lastCancellingRef.current = false;
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }

        if (heldButton?.id === button.id && heldButton.lastTargetFireAt && Date.now() - heldButton.lastTargetFireAt < 1200) {
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            document.documentElement.style.removeProperty('--preview-glow-color');
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            updateRay(0, 0, 0);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }

        if (heldButton && heldButton.id !== button.id) {
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            el._didFire = false;
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0');
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

        const previewCmd = getButtonCommand(button, finalDx, finalDy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, target, isLong, (heldButton?.id === button.id ? heldButton.commandPrefixes : []));

        setHeldButton(null);
        setCommandPreview(null);
        lastPreviewRef.current = null;
        document.documentElement.style.removeProperty('--preview-glow-color');
        setActiveDir(null);
        lastActiveDirRef.current = null;
        const finalIsCancelling = isCancelling;
        setIsCancelling(false);
        lastCancellingRef.current = false;
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

        if (button.actionType === 'modifier') return;

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
                    executeAndAssign: previewCmd.actionType === 'select-assign',
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
                if (joystick.currentDir) {
                    joystick.setIsJoystickConsumed(true);
                    if (joystick.setIsSwipeWheelHidden) joystick.setIsSwipeWheelHidden(true);
                }
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
        try { el.releasePointerCapture(e.pointerId); } catch(err) {}

        const isActiveSwipeHold = heldButton?.id === button.id
            && !heldButton.didFire
            && (Math.abs(heldButton.dx || 0) > 15 || Math.abs(heldButton.dy || 0) > 15);
        
        if (heldButton && heldButton.id !== button.id) {
            el._wasInCancelZone = false;
            el.style.setProperty('--ray-opacity', '0');
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0');
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            return;
        }

        if (!isActiveSwipeHold) {
            setHeldButton(null);
        }
        setCommandPreview(null);
        lastPreviewRef.current = null;
        document.documentElement.style.removeProperty('--preview-glow-color');
        if (!isActiveSwipeHold) {
            setActiveDir(null);
            lastActiveDirRef.current = null;
        }
        lastCancellingRef.current = false;
        el._wasInCancelZone = false;
        el.style.setProperty('--ray-opacity', '0');
        el.style.setProperty('--cancel-opacity', '0');
        el.style.setProperty('--cancel-scale', '0');
        el._startX = null;
        el._startY = null;
        el._startTime = null;
        el._maxDist = 0;
    }, [heldButton, button.id, setHeldButton, setCommandPreview, setActiveDir]);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (isEditMode) {
            if (wasDraggingRef && wasDraggingRef.current) return;
            setEditButton(button);
        }
    }, [isEditMode, wasDraggingRef, setEditButton, button]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick };
};
