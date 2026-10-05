/**
 * @file useButtonGestures.ts
 * @description Hook managing pointer gestures for individual game buttons, including swiping and radial menus.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { ActionType, CustomButton, PopoverState, SwipeDirection, ExecuteCommand } from '../../../types';

import { getButtonCommand } from '../../../utils/buttonUtils';
import { BLANK_TARGET_VALUE, canCommandAcceptTarget, getDefaultCommandTarget } from '../../../utils/commandTargetUtils';
import type { UseTacticalTargetingReturn } from './tacticalTargetingTypes';
import type { TacticalSwapCell } from './TacticalCommandPalette';
import { initializeMapSwipeTracking, isMapControlElement, showMapSwipeFeedback, trackMapSwipeMovement } from './mapSwipeFeedback';
import { FOLLOWERS_COMMAND_PREFIX } from '../../../stores/useTacticalCommandPrefixStore';

// --- Gesture State Section ---
const swipeOctant = (dx: number, dy: number): number =>
    (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;

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
    tacticalTargeting?: UseTacticalTargetingReturn;
    gestureDefaultTargetRef?: React.MutableRefObject<(command: string) => string | null>;
    gestureDefaultCommandRef?: React.MutableRefObject<(command: string) => string | null>;
    isStagedTargetMenuRef?: React.RefObject<boolean>;
    onSelectStagedTargetRef?: React.RefObject<(targetValue: string, columnIndex: number) => boolean>;
    onCommitStagedTargetRef?: React.RefObject<() => boolean>;
    isWheelReplacementModeRef?: React.RefObject<boolean>;
    isRebindingGestureRef?: React.MutableRefObject<boolean>;
    onSelectWheelReplacementRef?: React.RefObject<((targetValue: string) => string | void) | null>;
    onCancelPanel?: () => void;
    onRebindPanel?: (direction?: SwipeDirection | 'center' | null) => void;
    isPanelPinned?: boolean;
    onMovePinnedCell?: (source: SwipeDirection | 'center', destination: SwipeDirection | 'center') => void;
    onAssignPinnedCommand?: (command: string, actionType: import('../../../types').ActionType, destination: SwipeDirection | 'center', setId?: string) => void;
    onPanelToolAtRelease?: (tool: 'add' | 'delete' | 'swap') => void;
    onPanelToolHoverChange?: (tool: 'add' | 'delete' | 'swap' | null) => void;
    panelHoverCellRef?: React.MutableRefObject<TacticalSwapCell | null>;
    swapSourceRef?: React.MutableRefObject<TacticalSwapCell | null>;
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
    isMobile,
    tacticalTargeting,
    gestureDefaultTargetRef,
    gestureDefaultCommandRef,
    isStagedTargetMenuRef,
    onSelectStagedTargetRef,
    onCommitStagedTargetRef,
    isWheelReplacementModeRef,
    isRebindingGestureRef,
    onSelectWheelReplacementRef,
    onCancelPanel,
    onRebindPanel,
    isPanelPinned = false,
    onMovePinnedCell,
    onAssignPinnedCommand,
    onPanelToolAtRelease,
    onPanelToolHoverChange,
    panelHoverCellRef,
    swapSourceRef
}: UseButtonGesturesProps) => {
    const rayFrameRef = useRef<number | null>(null);
    const pendingRayRef = useRef<{ angle: number, length: number, opacity: number, color?: string } | null>(null);
    const lastPreviewRef = useRef<string | null>(null);
    const lastActiveDirRef = useRef<SwipeDirection | 'center' | null>(null);
    const lastCancellingRef = useRef(false);
    const currentCommandRef = useRef<string>(button.command);
    const activePointerRef = useRef<{ id: number; element: HTMLDivElement } | null>(null);
    const pointerUpRef = useRef<(event: React.PointerEvent<HTMLDivElement>) => void>(() => {});
    const pointerCancelRef = useRef<(event: React.PointerEvent<HTMLDivElement>) => void>(() => {});
    const isTacticalSwipeButton = (element: HTMLElement) => button.setId.toLowerCase() === 'tactical'
        || button.id.startsWith('tactical-')
        || button.id.startsWith('map-action-')
        || isMapControlElement(element);
    const getGestureTarget = (command: string, element: HTMLElement): string | null => {
        const effectiveTarget = tacticalTargeting
            ? tacticalTargeting.getEffectiveTarget(command)
            : target;
        if (effectiveTarget) return effectiveTarget === BLANK_TARGET_VALUE ? null : effectiveTarget;
        if (!isTacticalSwipeButton(element) || tacticalTargeting?.isTargetColumnOpen) return null;
        const defaultTarget = gestureDefaultTargetRef
            ? gestureDefaultTargetRef.current(command)
            : getDefaultCommandTarget(command);
        return defaultTarget === BLANK_TARGET_VALUE ? null : defaultTarget;
    };

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

    const endHeldGestureForDialog = useCallback(() => {
        const active = activePointerRef.current;
        activePointerRef.current = null;
        if (active) {
            const el = active.element as HTMLDivElement & {
                _primaryPointerId?: number | null;
                _startX?: number | null;
                _startY?: number | null;
                _startTime?: number | null;
                _maxDist?: number;
                _panelWheelDragTimer?: number | null;
                _panelPaletteDragTimer?: number | null;
                _panelAutoScrollFrame?: number | null;
                _panelAutoScrollPoint?: { x: number; y: number } | null;
                _panelWheelDragSource?: SwipeDirection | 'center' | null;
                _panelPaletteDragSource?: unknown;
                _panelPaletteCandidate?: string | null;
                _panelPaletteIsScrolling?: boolean;
            };
            el._primaryPointerId = null;
            if (el._panelWheelDragTimer) clearTimeout(el._panelWheelDragTimer);
            if (el._panelPaletteDragTimer) clearTimeout(el._panelPaletteDragTimer);
            if (el._panelAutoScrollFrame != null) cancelAnimationFrame(el._panelAutoScrollFrame);
            el._panelWheelDragTimer = null;
            el._panelPaletteDragTimer = null;
            el._panelAutoScrollFrame = null;
            el._panelAutoScrollPoint = null;
            el._panelWheelDragSource = null;
            el._panelPaletteDragSource = null;
            el._panelPaletteCandidate = null;
            el._panelPaletteIsScrolling = false;
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            el.style.setProperty('--ray-opacity', '0');
            el.style.setProperty('--cancel-opacity', '0');
            el.style.setProperty('--cancel-scale', '0');
            try { el.releasePointerCapture(active.id); } catch { /* Capture may already be gone. */ }
        }
        tacticalTargeting?.releaseTargetMenu();
        setHeldButton(null);
        setCommandPreview(null);
        lastPreviewRef.current = null;
        document.documentElement.style.removeProperty('--preview-glow-color');
        setActiveDir(null);
        lastActiveDirRef.current = null;
        setIsCancelling(false);
        lastCancellingRef.current = false;
        updateRay(0, 0, 0);
    }, [setActiveDir, setCommandPreview, setHeldButton, setIsCancelling, tacticalTargeting, updateRay]);

    // --- Auto-Reset on External Fire ---
    React.useEffect(() => {
        if (isWheelReplacementModeRef?.current && tacticalTargeting?.isTargetColumnOpen) return;
        if (!heldButton && tacticalTargeting?.isTargetColumnOpen) return;
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
            tacticalTargeting?.resetTargeting();
        }
    }, [heldButton?.id, heldButton?.didFire, button.id, setActiveDir, setIsCancelling, updateRay, tacticalTargeting, isWheelReplacementModeRef]);

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
            if (isRebindingGestureRef) isRebindingGestureRef.current = false;
            lastCancellingRef.current = false;
            setIsCancelling(false);
            if (e.cancelable) e.preventDefault();
            initAudio(); 
            const el = e.currentTarget as any;
            el._primaryPointerId = e.pointerId;
            activePointerRef.current = { id: e.pointerId, element: el };
            try { el.setPointerCapture(e.pointerId); } catch(err) {}

            const rect = el.getBoundingClientRect();
            el._startX = e.clientX;
            el._startY = e.clientY;
            initializeMapSwipeTracking(el, e.clientX, e.clientY);
            el._heldTargetListScroll = null;
            el._startTime = Date.now();
            el._maxDist = 0;
            el._didFire = false;
            el._didLong = false;
            el._panelAutoScrollPoint = null;
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
            const wheelCell = (e.target as HTMLElement).closest('[data-wheel-direction]') as HTMLElement | null;
            const wheelDirection = wheelCell?.dataset.wheelDirection as SwipeDirection | 'center' | undefined;
            const wheelCommand = wheelCell?.dataset.wheelCommand?.trim() || '';
            const wheelIsLearned = wheelCell?.dataset.wheelLearned !== 'false';
            const paletteCell = (e.target as HTMLElement).closest('[data-palette-command]') as HTMLElement | null;
            const paletteCommand = paletteCell?.dataset.paletteCommand?.trim();
            panelHoverCellRef && (panelHoverCellRef.current = wheelDirection
                ? { kind: 'wheel', direction: wheelDirection }
                : paletteCommand && paletteCell
                    ? {
                        kind: 'palette',
                        command: paletteCommand,
                        actionType: (paletteCell.dataset.paletteActionType || 'command') as import('../../../types').ActionType,
                        setId: paletteCell.dataset.paletteSetId || ''
                    }
                    : null);
            if (wheelDirection) {
                lastActiveDirRef.current = wheelDirection;
                setActiveDir(wheelDirection as SwipeDirection);
                currentCommandRef.current = wheelCommand;
                if (wheelCommand && wheelIsLearned) tacticalTargeting?.startHoldTimer(wheelCommand);
                if (!wheelIsLearned || !wheelCommand) setCommandPreview(wheelCommand || null);
                el._panelWheelDragSource = null;
            } else if (paletteCommand) {
                el._panelPaletteDragSource = null;
                el._panelPaletteCandidate = paletteCommand;
                el._panelPaletteIsScrolling = false;
                currentCommandRef.current = paletteCommand;
                lastActiveDirRef.current = null;
                setActiveDir(null);
                setCommandPreview(paletteCommand);
                // A held command stays a command. Cell swapping is entered
                // explicitly through the swap control, never by a hold timer.
            } else {
                el._panelWheelDragSource = null;
                el._panelPaletteDragSource = null;
                currentCommandRef.current = button.command;
                tacticalTargeting?.startHoldTimer(button.command);
            }
        }
    }, [isEditMode, handleDragStart, button, setWheelPos, wasDraggingRef, triggerHaptic, setHeldButton, setCommandPreview, setActiveDir, setIsCancelling, initAudio, updateRay, getNextCommandPrefixes, tacticalTargeting, isRebindingGestureRef, isPanelPinned, panelHoverCellRef, swapSourceRef]);

    // --- Decision Panel Hover ---
    const selectPanelCellAtPoint = useCallback((x: number, y: number, el: HTMLElement & {
        _panelPaletteDragTimer?: number | null;
        _panelPaletteCandidate?: string | null;
        _panelPaletteDragSource?: { command: string; actionType: ActionType; setId: string } | null;
        _panelWheelDragSource?: SwipeDirection | 'center' | null;
    }) => {
        const hit = document.elementFromPoint?.(x, y);
        if (swapSourceRef?.current) {
            if (el._panelPaletteDragTimer) window.clearTimeout(el._panelPaletteDragTimer);
            el._panelPaletteDragTimer = null;
            el._panelPaletteCandidate = null;
            el._panelPaletteDragSource = null;
        }
        const paletteCell = hit?.closest('[data-palette-command]') as HTMLElement | null | undefined;
        const wheelCell = hit?.closest('[data-wheel-direction]') as HTMLElement | null | undefined;
        if (paletteCell?.dataset.paletteLearned === 'false') {
            const command = paletteCell.dataset.paletteCommand?.trim() || '';
            panelHoverCellRef && (panelHoverCellRef.current = command ? {
                kind: 'palette',
                command,
                actionType: (paletteCell.dataset.paletteActionType || 'command') as ActionType,
                setId: paletteCell.dataset.paletteSetId || ''
            } : null);
            if (command && !el._panelPaletteDragSource) {
                currentCommandRef.current = command;
                lastActiveDirRef.current = null;
                setActiveDir(null);
                setCommandPreview(command);
            }
            return;
        }
        if (paletteCell?.dataset.paletteCommand?.trim()) {
            panelHoverCellRef && (panelHoverCellRef.current = {
                kind: 'palette',
                command: paletteCell.dataset.paletteCommand.trim(),
                actionType: (paletteCell.dataset.paletteActionType || 'command') as ActionType,
                setId: paletteCell.dataset.paletteSetId || ''
            });
        } else if (wheelCell?.dataset.wheelDirection) {
            panelHoverCellRef && (panelHoverCellRef.current = {
                kind: 'wheel',
                direction: wheelCell.dataset.wheelDirection as SwipeDirection | 'center'
            });
        }
        if (paletteCell && !el._panelPaletteDragSource) {
            const command = paletteCell.dataset.paletteCommand?.trim() || '';
            if (command) {
                currentCommandRef.current = command;
                lastActiveDirRef.current = null;
                setActiveDir(null);
                setCommandPreview(tacticalTargeting?.resolveCommandWithTarget(command) || command);
            }
            return;
        }
        if (wheelCell?.dataset.wheelDirection) {
            const direction = wheelCell.dataset.wheelDirection as SwipeDirection | 'center';
            const command = wheelCell.dataset.wheelCommand?.trim() || '';
            if (el._panelPaletteDragSource || (isPanelPinned && el._panelWheelDragSource)) return;

            lastActiveDirRef.current = direction;
            setActiveDir(direction as SwipeDirection);
            currentCommandRef.current = command;
            setCommandPreview(command
                ? tacticalTargeting?.resolveCommandWithTarget(command) || command
                : null);
            return;
        }

    }, [button, isPanelPinned, panelHoverCellRef, swapSourceRef, setActiveDir, setCommandPreview, tacticalTargeting]);

    // --- Gesture Recording & Feedback ---
    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (isEditMode) return;
        const el = e.currentTarget as any;
        if (el._primaryPointerId !== undefined && el._primaryPointerId !== null && e.pointerId !== el._primaryPointerId) {
            return;
        }
        trackMapSwipeMovement(el, e.clientX, e.clientY);
        if (!el._startX) return;

        // Failsafe for desktop: if no buttons are pressed, clean up orphaned state
        if (e.buttons === 0) {
            onPanelToolHoverChange?.(null);
            setHeldButton(null);
            tacticalTargeting?.resetTargeting();
            activePointerRef.current = null;
            el._primaryPointerId = null;
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            document.documentElement.style.removeProperty('--preview-glow-color');
            updateRay(0, 0, 0);
            if (el._panelAutoScrollFrame != null) cancelAnimationFrame(el._panelAutoScrollFrame);
            el._panelAutoScrollFrame = null;
            el._panelAutoScrollPoint = null;
            el._startX = null;
            el._startY = null;
            return;
        }

        const pointerHit = document.elementFromPoint?.(e.clientX, e.clientY);
        const panelToolName = (pointerHit?.closest('[data-panel-tool]') as HTMLElement | null)?.dataset.panelTool;
        onPanelToolHoverChange?.(tacticalTargeting?.isTargetColumnOpen
            && (panelToolName === 'add' || panelToolName === 'delete' || panelToolName === 'swap')
            ? panelToolName
            : null);
        const panelAction = pointerHit?.closest('.unified-tactical-panel-action') as HTMLElement | null | undefined;
        const isSideTool = panelToolName === 'add' || panelToolName === 'delete' || panelToolName === 'swap';
        if (tacticalTargeting?.isTargetColumnOpen && (isSideTool || panelAction)) {
            panelHoverCellRef && (panelHoverCellRef.current = null);
            lastActiveDirRef.current = null;
            setActiveDir(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            document.documentElement.style.removeProperty('--preview-glow-color');
            if (el._panelAutoScrollFrame != null) cancelAnimationFrame(el._panelAutoScrollFrame);
            el._panelAutoScrollFrame = null;
            el._panelAutoScrollPoint = null;
            updateRay(0, 0, 0);
            if (!panelAction) {
                setIsCancelling(false);
                lastCancellingRef.current = false;
                return;
            }
        }
        if (heldButton?.id === button.id && heldButton.didFire
            && !pointerHit?.closest('.tactical-target-bar-list, .shop-target-menu .shop-panel-content')
            && !panelAction && !isSideTool) return;
        if (tacticalTargeting?.isTargetColumnOpen) {
            selectPanelCellAtPoint(e.clientX, e.clientY, el);
        }
        if (tacticalTargeting?.isTargetColumnOpen && panelAction) {
            const isClose = panelAction.classList.contains('is-close');
            setIsCancelling(isClose);
            lastCancellingRef.current = isClose;
            if (isClose || panelAction.classList.contains('is-swap')) {
                if (isClose) setActiveDir(null);
                setCommandPreview(null);
                lastPreviewRef.current = null;
                document.documentElement.style.removeProperty('--preview-glow-color');
                updateRay(0, 0, 0, isClose ? '#ef4444' : 'var(--accent)');
                return;
            }
        } else {
            setIsCancelling(false);
            lastCancellingRef.current = false;
        }

        // Once a rebind swipe is released, ignore any late movement from that
        // captured pointer until it lifts.
        if (isRebindingGestureRef?.current) return;

        const panelScrollArea = tacticalTargeting?.isTargetColumnOpen
            ? document.querySelector<HTMLElement>('.unified-tactical-panel-scroll')
            : null;
        const panelRect = panelScrollArea?.getBoundingClientRect();
        if (panelScrollArea && panelRect
            && e.clientX >= panelRect.left && e.clientX <= panelRect.right
            && e.clientY >= panelRect.top && e.clientY <= panelRect.bottom) {
            // Keep the finger on the highlighted cell. When that highlight is
            // dragged to the edge of the visible command area, advance the
            // grid beneath it instead of translating finger movement into a
            // conventional scroll gesture.
            el._panelAutoScrollPoint = { x: e.clientX, y: e.clientY };
            if (el._panelAutoScrollFrame == null) {
                const scrollAtEdge = () => {
                    el._panelAutoScrollFrame = null;
                    if (el._primaryPointerId == null || !el._panelAutoScrollPoint) return;
                    const area = document.querySelector<HTMLElement>('.unified-tactical-panel-scroll');
                    const areaRect = area?.getBoundingClientRect();
                    if (!area || !areaRect) return;
                    const { x, y } = el._panelAutoScrollPoint as { x: number; y: number };
                    const edge = Math.min(72, Math.max(44, areaRect.height * 0.1));
                    const maxScroll = area.scrollHeight - area.clientHeight;
                    let direction = 0;
                    let proximity = 0;
                    if (y <= areaRect.top + edge && area.scrollTop > 0) {
                        direction = -1;
                        proximity = (areaRect.top + edge - y) / edge;
                    } else if (y >= areaRect.bottom - edge && area.scrollTop < maxScroll) {
                        direction = 1;
                        proximity = (y - (areaRect.bottom - edge)) / edge;
                    }
                    if (!direction || maxScroll <= 1) {
                        el._panelPaletteIsScrolling = false;
                        return;
                    }

                    el._panelPaletteIsScrolling = true;
                    const step = Math.min(22, 5 + Math.max(0, Math.min(1, proximity)) * 14);
                    const before = area.scrollTop;
                    area.scrollTop = Math.max(0, Math.min(maxScroll, before + direction * step));
                    if (area.scrollTop !== before) selectPanelCellAtPoint(x, y, el);
                    el._panelAutoScrollFrame = requestAnimationFrame(scrollAtEdge);
                };
                el._panelAutoScrollFrame = requestAnimationFrame(scrollAtEdge);
            }
        } else {
            el._panelAutoScrollPoint = null;
            if (el._panelAutoScrollFrame != null) {
                cancelAnimationFrame(el._panelAutoScrollFrame);
                el._panelAutoScrollFrame = null;
            }
        }

        const paletteList = pointerHit?.closest('.unified-tactical-command-palette') as HTMLElement | null | undefined;
        const paletteCell = pointerHit?.closest('[data-palette-command]') as HTMLElement | null | undefined;
        if (tacticalTargeting?.isTargetColumnOpen && paletteList) {
            if (paletteCell?.dataset.paletteLearned === 'false') {
                if (el._panelPaletteDragTimer) window.clearTimeout(el._panelPaletteDragTimer);
                el._panelPaletteDragTimer = null;
                el._panelPaletteCandidate = null;
                const command = paletteCell.dataset.paletteCommand?.trim() || '';
                if (command && !el._panelPaletteDragSource) {
                    currentCommandRef.current = command;
                    lastActiveDirRef.current = null;
                    setActiveDir(null);
                    setCommandPreview(command);
                }
                return;
            }
            const paletteCommand = paletteCell?.dataset.paletteCommand?.trim() || '';
            const gestureDistance = Math.hypot(e.clientX - el._startX, e.clientY - el._startY);
            if (!el._panelPaletteDragSource && gestureDistance > 12) {
                if (el._panelPaletteDragTimer) window.clearTimeout(el._panelPaletteDragTimer);
                el._panelPaletteDragTimer = null;
                el._panelPaletteCandidate = null;
            }
            if (paletteCommand && !el._panelPaletteDragSource) {
                currentCommandRef.current = paletteCommand;
                lastActiveDirRef.current = null;
                setActiveDir(null);
                setCommandPreview(tacticalTargeting.resolveCommandWithTarget(paletteCommand));
                if (el._panelPaletteIsScrolling) {
                    if (el._panelPaletteDragTimer) window.clearTimeout(el._panelPaletteDragTimer);
                    el._panelPaletteDragTimer = null;
                    el._panelPaletteCandidate = null;
                }
            }
            return;
        }
        if (el._panelPaletteDragTimer) {
            window.clearTimeout(el._panelPaletteDragTimer);
            el._panelPaletteDragTimer = null;
            el._panelPaletteCandidate = null;
        }

        const targetList = pointerHit?.closest('.tactical-target-bar-list, .shop-target-menu .shop-panel-content') as HTMLElement | null | undefined;
        const isScrollingTargetList = Boolean(targetList && targetList.scrollHeight > targetList.clientHeight + 1);
        const isOverTargetChoice = Boolean(
            pointerHit?.closest('.tactical-target-bar-item, .shop-target-menu [data-shop-target-value], [data-direction-value]')
        );
        if (tacticalTargeting?.isTargetColumnOpen && targetList && isScrollingTargetList) {
            const scrollState = el._heldTargetListScroll as {
                list: HTMLElement;
                y: number;
                pendingDelta: number;
                isScrolling: boolean;
            } | null;
            if (scrollState?.list === targetList) {
                const deltaY = e.clientY - scrollState.y;
                const pendingDelta = scrollState.pendingDelta - deltaY;
                const isScrolling = scrollState.isScrolling || Math.abs(pendingDelta) > 8;
                const pointerEvent = e.nativeEvent as PointerEvent & { __targetListScrollHandled?: boolean };
                if (isScrolling && !pointerEvent.__targetListScrollHandled) {
                    targetList.scrollTop += scrollState.isScrolling ? -deltaY : pendingDelta;
                    if (e.cancelable) e.preventDefault();
                }
                targetList.dataset.scrolling = isScrolling ? 'true' : 'false';
                el._heldTargetListScroll = {
                    list: targetList,
                    y: e.clientY,
                    pendingDelta: isScrolling ? 0 : pendingDelta,
                    isScrolling
                };
            } else {
                el._heldTargetListScroll = { list: targetList, y: e.clientY, pendingDelta: 0, isScrolling: false };
            }
        } else {
            const previousScroll = el._heldTargetListScroll as { list: HTMLElement } | null;
            if (previousScroll) previousScroll.list.dataset.scrolling = 'false';
            el._heldTargetListScroll = null;
        }
        if (tacticalTargeting?.isTargetColumnOpen && (isOverTargetChoice || isScrollingTargetList)) {
            // Let target choices and scrollable lists consume this part of the
            // held gesture. The empty full-screen panel must remain swipe-through.
            el._startX = e.clientX;
            el._startY = e.clientY;
            el._maxDist = 0;
            setHeldButton(prev => prev?.id === button.id && (prev.dx !== 0 || prev.dy !== 0)
                ? { ...prev, dx: 0, dy: 0 }
                : prev);
            return;
        }

        if (tacticalTargeting?.isTargetColumnOpen) {
            const wheelCell = pointerHit?.closest('[data-wheel-direction]') as HTMLElement | null | undefined;
            if (!wheelCell?.dataset.wheelDirection) return;
            const direction = wheelCell.dataset.wheelDirection as SwipeDirection | 'center';
            const swipeCommand = wheelCell.dataset.wheelCommand?.trim() || '';

            if (el._panelPaletteDragSource) {
                lastActiveDirRef.current = direction;
                setActiveDir(direction === 'center' ? null : direction);
                return;
            }

            if (isPanelPinned && el._panelWheelDragSource) {
                lastActiveDirRef.current = direction;
                setActiveDir(direction === 'center' ? null : direction);
                return;
            }

            // Resolve the actual rendered cell under the pointer. The panel can
            // scroll while a finger stays down, so a static grid calculation
            // can select a different cell from the one visibly under it.
            if (lastActiveDirRef.current !== direction) {
                lastActiveDirRef.current = direction;
            }
            setActiveDir(direction as SwipeDirection);
            currentCommandRef.current = swipeCommand;
            lastPreviewRef.current = swipeCommand.trim() ? swipeCommand : null;
            setCommandPreview(swipeCommand.trim() ? tacticalTargeting.resolveCommandWithTarget(swipeCommand) : null);
            el._maxDist = Math.max(el._maxDist || 0, 16);
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
                // The preview only needs the selected octant. Keep raw pointer
                // coordinates local so each pixel does not update GameContext.
                if (prev && prev.id === button.id) {
                    if (prev.dx !== undefined && prev.dy !== undefined
                        && Math.hypot(prev.dx, prev.dy) > 15
                        && swipeOctant(prev.dx, prev.dy) === swipeOctant(dx, dy)) return prev;
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
        const basePreview = getButtonCommand(button, dxVal, dyVal, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, null, isLong, (heldButton?.id === button.id ? heldButton.commandPrefixes : []));
        const commandForTarget = basePreview?.cmd || currentCommandRef.current || button.command;
        const effectiveTarget = getGestureTarget(commandForTarget, el);
        const defaultCommand = isTacticalSwipeButton(el) && !tacticalTargeting?.isTargetColumnOpen
            ? gestureDefaultCommandRef?.current(commandForTarget)
            : null;
        const preview = defaultCommand && basePreview
            ? { ...basePreview, cmd: defaultCommand }
            : getButtonCommand(button, dxVal, dyVal, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, effectiveTarget, isLong, (heldButton?.id === button.id ? heldButton.commandPrefixes : []));
        const nextPreview = preview?.cmd || null;
        if (preview?.cmd) {
            currentCommandRef.current = preview.cmd;
        }
        if (lastPreviewRef.current !== nextPreview) {
            lastPreviewRef.current = nextPreview;
            setCommandPreview(nextPreview);
            if (preview?.cmd) {
                tacticalTargeting?.startHoldTimer(preview.cmd);
            }
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
        const cancelX = isMobile ? (window.innerWidth - 40) : (window.innerWidth / 2 + 200);
        const cancelY = isMobile ? (window.innerHeight * 0.12) : (window.innerHeight / 2);
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

    }, [isEditMode, heldButton, button, activeDir, setActiveDir, setCommandPreview, wasDraggingRef, setHeldButton, joystick, target, setIsCancelling, isRebindingGestureRef, triggerHaptic, setPopoverState, isSoundEnabled, playClickSound, updateRay, isMobile, getNextCommandPrefixes, tacticalTargeting, gestureDefaultTargetRef, gestureDefaultCommandRef, isPanelPinned, selectPanelCellAtPoint, onPanelToolHoverChange]);

    // --- Execution & Termination ---
    const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = e.currentTarget as any;
        if (el._primaryPointerId !== e.pointerId) return;
        activePointerRef.current = null;
        onPanelToolHoverChange?.(null);
        if (e.cancelable) e.preventDefault();
        el._heldTargetListScroll = null;
        try { el.releasePointerCapture(e.pointerId); } catch(err) {}
        
        if (isEditMode) return;
        if (isTacticalSwipeButton(el)) {
            showMapSwipeFeedback(el, button, e.clientX, e.clientY, lastActiveDirRef.current);
        }
        el._primaryPointerId = null;

        const releaseHit = document.elementFromPoint?.(e.clientX, e.clientY);
        const releasedPanelAction = releaseHit?.closest('.unified-tactical-panel-action') as HTMLElement | null | undefined;
        if (el._panelWheelDragTimer) {
            window.clearTimeout(el._panelWheelDragTimer);
            el._panelWheelDragTimer = null;
        }
        if (el._panelPaletteDragTimer) {
            window.clearTimeout(el._panelPaletteDragTimer);
            el._panelPaletteDragTimer = null;
        }
        if (el._panelAutoScrollFrame != null) cancelAnimationFrame(el._panelAutoScrollFrame);
        el._panelAutoScrollFrame = null;
        el._panelAutoScrollPoint = null;
        el._panelPaletteIsScrolling = false;
        el._panelPaletteCandidate = null;
        const releasedPanelTool = releaseHit?.closest('[data-panel-tool]') as HTMLElement | null | undefined;
        const panelTool = releasedPanelTool?.dataset.panelTool;
        if (tacticalTargeting?.isTargetColumnOpen && (panelTool === 'add' || panelTool === 'delete' || panelTool === 'swap')) {
            onPanelToolAtRelease?.(panelTool);
            el._panelWheelDragSource = null;
            el._panelPaletteDragSource = null;
            panelHoverCellRef && (panelHoverCellRef.current = null);
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            tacticalTargeting.releaseTargetMenu();
            updateRay(0, 0, 0);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }
        const releasedPaletteCell = releaseHit?.closest('[data-palette-command]') as HTMLElement | null | undefined;
        if (tacticalTargeting?.isTargetColumnOpen && releasedPaletteCell) triggerHaptic(35);
        const releasedUnavailableCell = releaseHit?.closest(
            '[data-palette-learned="false"], [data-wheel-direction][data-wheel-learned="false"], [data-wheel-direction][data-wheel-command=""]'
        );
        if (tacticalTargeting?.isTargetColumnOpen && releasedUnavailableCell) {
            el._panelPaletteDragSource = null;
            panelHoverCellRef && (panelHoverCellRef.current = null);
            if (swapSourceRef) swapSourceRef.current = null;
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setActiveDir(null);
            lastActiveDirRef.current = null;
            tacticalTargeting.resetTargeting();
            updateRay(0, 0, 0);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }
        if (tacticalTargeting?.isTargetColumnOpen && releasedPanelAction) {
            if (releasedPanelAction.classList.contains('is-close')) {
                onCancelPanel?.();
            } else {
                // Sliding the held finger over the swap button is a cancel,
                // not a swap tap by that pointer.
                tacticalTargeting.resetTargeting();
            }
            setIsCancelling(false);
            lastCancellingRef.current = false;
            lastActiveDirRef.current = null;
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            document.documentElement.style.removeProperty('--preview-glow-color');
            setRayParams({ angle: 0, length: 0, opacity: 0, color: 'var(--accent)' });
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            return;
        }

        if (swapSourceRef?.current) {
            el._panelPaletteDragSource = null;
            el._panelPaletteCandidate = null;
        }

        if (el._panelPaletteDragSource && !swapSourceRef?.current) {
            const destinationElement = releaseHit?.closest('[data-wheel-direction]') as HTMLElement | null | undefined;
            const destination = destinationElement?.dataset.wheelDirection as SwipeDirection | 'center' | undefined;
            const source = el._panelPaletteDragSource as { command: string; actionType: import('../../../types').ActionType; setId: string };
            if (destination) onAssignPinnedCommand?.(source.command, source.actionType, destination, source.setId);
            el._panelPaletteDragSource = null;
            el._panelPaletteCandidate = null;
            el._panelPaletteIsScrolling = false;
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setActiveDir(null);
            lastActiveDirRef.current = null;
            tacticalTargeting?.releaseTargetMenu();
            updateRay(0, 0, 0);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }

        if (isPanelPinned && el._panelWheelDragSource) {
            const destinationElement = releaseHit?.closest('[data-wheel-direction]') as HTMLElement | null | undefined;
            const destination = destinationElement?.dataset.wheelDirection as SwipeDirection | 'center' | undefined;
            if (destination) onMovePinnedCell?.(el._panelWheelDragSource as SwipeDirection | 'center', destination);
            el._panelWheelDragSource = null;
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setActiveDir(null);
            lastActiveDirRef.current = null;
            tacticalTargeting?.releaseTargetMenu();
            updateRay(0, 0, 0);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }

        const releasedLearnedPaletteCell = releaseHit?.closest('[data-palette-command][data-palette-learned="true"]') as HTMLElement | null | undefined;
        const paletteCommand = releasedLearnedPaletteCell?.dataset.paletteCommand?.trim();
        if (tacticalTargeting?.isTargetColumnOpen && paletteCommand) {
            const actionType = (releasedLearnedPaletteCell?.dataset.paletteActionType || 'command') as import('../../../types').ActionType;
            currentCommandRef.current = paletteCommand;
            const isFollowersPrefixAction = actionType === 'modifier'
                && paletteCommand.toLowerCase() === FOLLOWERS_COMMAND_PREFIX;
            const effectiveTarget = tacticalTargeting.getEffectiveTarget(paletteCommand);
            if (!isFollowersPrefixAction && canCommandAcceptTarget(paletteCommand) && !effectiveTarget) {
                setCommandPreview(paletteCommand);
                setHeldButton(null);
                setActiveDir('center' as SwipeDirection);
                tacticalTargeting.releaseTargetMenu();
                lastPreviewRef.current = paletteCommand;
                el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
                return;
            }
            if (['menu', 'assign', 'select-assign', 'select-recipient', 'select-container', 'nav'].includes(actionType)) {
                handleButtonClick({ ...button, command: paletteCommand, actionType }, e as unknown as React.MouseEvent);
            } else {
                const resolved = isFollowersPrefixAction
                    ? paletteCommand
                    : canCommandAcceptTarget(paletteCommand)
                    ? tacticalTargeting.resolveCommandWithTarget(paletteCommand)
                    : paletteCommand;
                executeCommand(resolved, false, false);
                if (actionType === 'modifier' && paletteCommand.toLowerCase() === FOLLOWERS_COMMAND_PREFIX) triggerHaptic(35);
            }
            tacticalTargeting.resetTargeting();
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            document.documentElement.style.removeProperty('--preview-glow-color');
            updateRay(0, 0, 0);
            el._startX = null; el._startY = null; el._startTime = null; el._maxDist = 0;
            return;
        }

        // Resolve the wheel cell at lift time too. Pointer capture can skip a
        // final move event, so the hover ref may otherwise point at the cell
        // the finger passed over just before release.
        const releasedWheelCell = releaseHit?.closest('[data-wheel-direction]') as HTMLElement | null | undefined;
        if (tacticalTargeting?.isTargetColumnOpen && releasedWheelCell) {
            const direction = releasedWheelCell.dataset.wheelDirection as SwipeDirection | 'center' | undefined;
            const command = releasedWheelCell.dataset.wheelCommand?.trim() || '';
            if (direction) {
                lastActiveDirRef.current = direction;
                setActiveDir(direction as SwipeDirection);
                currentCommandRef.current = command;
                setCommandPreview(command
                    ? tacticalTargeting.resolveCommandWithTarget(command)
                    : null);
            }
        }

        // A long-press keeps pointer capture on the game button, so row events
        // from the portaled target menu arrive here instead of on the row.
        // Resolve the row at the finger position before deciding whether to
        // execute the held command or close an unselected menu.
        const targetList = tacticalTargeting?.isTargetColumnOpen
            ? document.elementFromPoint?.(e.clientX, e.clientY)?.closest('.tactical-target-bar-list, .shop-target-menu .shop-panel-content') as HTMLElement | null | undefined
            : null;
        const targetRow = targetList?.matches('[data-scrolling="true"]')
            ? null
            : document.elementFromPoint?.(e.clientX, e.clientY)?.closest('.tactical-target-bar-item, .shop-target-menu [data-shop-target-value]') as HTMLElement | null | undefined;
        const selectedTargetValue = targetRow?.dataset.targetValue || targetRow?.dataset.shopTargetValue;
        const targetColumn = targetRow?.dataset.targetColumn;
        const targetDirection = document.elementFromPoint?.(e.clientX, e.clientY)?.closest('[data-direction-value]') as HTMLElement | null | undefined;
        if (targetList) targetList.dataset.scrolling = 'false';
        const hasExplicitWheelSelection = lastActiveDirRef.current !== null;
        const targetCommand = hasExplicitWheelSelection
            ? currentCommandRef.current
            : currentCommandRef.current || button.command;
        const selectedReplacement = Boolean(selectedTargetValue && isWheelReplacementModeRef?.current);
        let keepStagedMenuOpen = false;
        if (selectedTargetValue && tacticalTargeting) {
            if (targetColumn !== undefined) keepStagedMenuOpen = onSelectStagedTargetRef?.current(selectedTargetValue, Number(targetColumn)) || false;
            else if (isWheelReplacementModeRef?.current) {
                const replacementCommand = onSelectWheelReplacementRef?.current?.(selectedTargetValue);
                if (replacementCommand) currentCommandRef.current = replacementCommand;
                tacticalTargeting.clearSelection();
            }
            else if (targetCommand.trim()) tacticalTargeting.handleSelectTarget(selectedTargetValue, targetCommand);
        } else if (targetDirection?.dataset.directionValue && tacticalTargeting) {
            if (targetCommand.trim()) tacticalTargeting.handleSelectDirection(targetDirection.dataset.directionValue, targetCommand);
        }

        if (keepStagedMenuOpen && tacticalTargeting) {
            tacticalTargeting.clearSelection();
            tacticalTargeting.releaseTargetMenu();
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            document.documentElement.style.removeProperty('--preview-glow-color');
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            updateRay(0, 0, 0);
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            return;
        }

        // If the initiating finger itself selects a replacement, keep the panel
        // open and let the new command's targets take over immediately.
        if (selectedReplacement) {
            if (isRebindingGestureRef) isRebindingGestureRef.current = false;
            tacticalTargeting?.releaseTargetMenu();
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

        // Releasing the initiating finger after choosing a replacement must
        // not fire or dismiss the new command's target menu.
        if (isRebindingGestureRef?.current) {
            isRebindingGestureRef.current = false;
            tacticalTargeting?.releaseTargetMenu();
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            document.documentElement.style.removeProperty('--preview-glow-color');
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            updateRay(0, 0, 0);
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            return;
        }

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

        if (tacticalTargeting?.isTargetColumnOpen) {
            const didCommitStagedCommand = Boolean(isStagedTargetMenuRef?.current
                && !tacticalTargeting.fireOnTargetTap
                && onCommitStagedTargetRef?.current());
            const effectiveTarget = tacticalTargeting.getEffectiveTarget(targetCommand);
            const isFollowersPrefixCommand = hasExplicitWheelSelection
                && targetCommand.trim().toLowerCase() === FOLLOWERS_COMMAND_PREFIX;
            const isLongSwipe = (el._maxDist || 0) > 15;
            const hasPickedDirection = Boolean(tacticalTargeting.pendingDirection || targetDirection?.dataset.directionValue);
            const hasSelectedTarget = tacticalTargeting.hasSelectedTargetRef.current || Boolean(selectedTargetValue);
            const isWheelCellRelease = Boolean(releaseHit?.closest('.unified-tactical-wheel .swipe-wheel-container'));
            const didExecuteTargetedCommand = (!tacticalTargeting.fireOnTargetTap || isFollowersPrefixCommand)
                && !isStagedTargetMenuRef?.current
                && (isLongSwipe || hasPickedDirection || hasSelectedTarget || isWheelCellRelease)
                && (isFollowersPrefixCommand || (Boolean(effectiveTarget) && canCommandAcceptTarget(targetCommand)));
            const didExecuteBlankTargetCommand = !tacticalTargeting.fireOnTargetTap
                && !isStagedTargetMenuRef?.current
                && tacticalTargeting.pendingTarget === '__blank_target__'
                && targetCommand.trim().toLowerCase() !== 'status'
                && Boolean(targetCommand.trim())
                && !canCommandAcceptTarget(targetCommand);
            const releasedOnSwipeWheel = Boolean(document.elementFromPoint?.(e.clientX, e.clientY)
                ?.closest('.unified-tactical-wheel .swipe-wheel-container'));
            if (didExecuteTargetedCommand) {
                const resolvedCommand = isFollowersPrefixCommand
                    ? targetCommand.trim()
                    : tacticalTargeting.resolveCommandWithTarget(targetCommand);
                executeCommand(resolvedCommand, false, false);
            } else if (didExecuteBlankTargetCommand) {
            executeCommand(targetCommand.trim(), false, false);
            }
            if (releasedOnSwipeWheel && (didCommitStagedCommand || didExecuteTargetedCommand || didExecuteBlankTargetCommand)) {
                triggerHaptic(35);
            }
            tacticalTargeting.resetTargeting();
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            document.documentElement.style.removeProperty('--preview-glow-color');
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            updateRay(0, 0, 0);
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
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

        tacticalTargeting?.cancelHoldTimer();
        const tapButton = button;
        const basePreviewCmd = getButtonCommand(tapButton, finalDx, finalDy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, null, isLong, (heldButton?.id === button.id ? heldButton.commandPrefixes : []));
        const currentTargetCommand = basePreviewCmd?.cmd || currentCommandRef.current || button.command;
        const effectiveTarget = getGestureTarget(currentTargetCommand, el);
        if (tacticalTargeting?.isTargetColumnOpen && !effectiveTarget) {
            setHeldButton(null);
            setCommandPreview(null);
            lastPreviewRef.current = null;
            document.documentElement.style.removeProperty('--preview-glow-color');
            setActiveDir(null);
            lastActiveDirRef.current = null;
            setIsCancelling(false);
            lastCancellingRef.current = false;
            updateRay(0, 0, 0);
            el._startX = null;
            el._startY = null;
            el._startTime = null;
            el._maxDist = 0;
            tacticalTargeting.clearSelection();
            tacticalTargeting.releaseTargetMenu();
            return;
        }
        const defaultCommand = isTacticalSwipeButton(el) && !tacticalTargeting?.isTargetColumnOpen
            ? gestureDefaultCommandRef?.current(currentTargetCommand)
            : null;
        const previewCmd = defaultCommand && basePreviewCmd
            ? { ...basePreviewCmd, cmd: defaultCommand }
            : getButtonCommand(tapButton, finalDx, finalDy, undefined, el._maxDist, (heldButton?.id === button.id ? heldButton.modifiers : []), joystick, effectiveTarget, isLong, (heldButton?.id === button.id ? heldButton.commandPrefixes : []));

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

        if (el._didFire) {
            tacticalTargeting?.resetTargeting();
            el._didFire = false;
            return;
        }

        const cancelX = isMobile ? (window.innerWidth - 40) : (window.innerWidth / 2 + 200);
        const cancelY = isMobile ? (window.innerHeight * 0.12) : (window.innerHeight / 2);
        const distToCancelBubble = Math.sqrt(Math.pow(currentX - cancelX, 2) + Math.pow(currentY - cancelY, 2));

        if (finalIsCancelling || distToCancelBubble < 45) {
            tacticalTargeting?.resetTargeting();
            return;
        }

        if (button.actionType === 'modifier') {
            if (button.id === 'tactical-ranger' && button.command.trim().toLowerCase() === FOLLOWERS_COMMAND_PREFIX) {
                executeCommand(button.command, false, false);
                triggerHaptic(35);
            }
            tacticalTargeting?.resetTargeting();
            return;
        }

        if (previewCmd && previewCmd.cmd && previewCmd.cmd.trim() !== '') {
            if (previewCmd.cmd.trim().toLowerCase() === 'status') {
                tacticalTargeting?.openTargetMenu('status');
                setHeldButton(null);
                setCommandPreview(null);
                lastPreviewRef.current = null;
                setActiveDir(null);
                lastActiveDirRef.current = null;
                setIsCancelling(false);
                lastCancellingRef.current = false;
                document.documentElement.style.removeProperty('--preview-glow-color');
                return;
            }
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
                handleButtonClick({ ...tapButton, _skipJoystick: false } as any, e as any);
            }
        }

        if (button.trigger?.enabled && button.trigger.autoHide && button.display === 'floating') {
            setButtons(prev => prev.map(x => x.id === button.id ? { ...x, isVisible: false } : x));
        }

        tacticalTargeting?.resetTargeting();
    }, [isEditMode, heldButton, button, activeDir, joystick, target, isCancelling, isPanelPinned, setHeldButton, setCommandPreview, setActiveDir, setIsCancelling, setRayParams, onCancelPanel, onRebindPanel, onMovePinnedCell, onAssignPinnedCommand, onPanelToolAtRelease, onPanelToolHoverChange, setActiveSet, triggerHaptic, setPopoverState, executeCommand, handleButtonClick, setButtons, updateRay, tacticalTargeting, gestureDefaultTargetRef, gestureDefaultCommandRef, isStagedTargetMenuRef, onSelectStagedTargetRef, onCommitStagedTargetRef, swapSourceRef, panelHoverCellRef]);

    const onPointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = e.currentTarget as any;
        if (el._primaryPointerId !== e.pointerId) return;
        activePointerRef.current = null;
        onPanelToolHoverChange?.(null);
        try { el.releasePointerCapture(e.pointerId); } catch(err) {}
        if (isTacticalSwipeButton(el)) {
            showMapSwipeFeedback(el, button, e.clientX, e.clientY, lastActiveDirRef.current);
        }
        el._primaryPointerId = null;
        if (isRebindingGestureRef) isRebindingGestureRef.current = false;
        if (el._panelWheelDragTimer) window.clearTimeout(el._panelWheelDragTimer);
        el._panelWheelDragTimer = null;
        el._panelWheelDragSource = null;
        if (el._panelPaletteDragTimer) window.clearTimeout(el._panelPaletteDragTimer);
        el._panelPaletteDragTimer = null;
        if (el._panelAutoScrollFrame != null) cancelAnimationFrame(el._panelAutoScrollFrame);
        el._panelAutoScrollFrame = null;
        el._panelAutoScrollPoint = null;
        el._panelPaletteDragSource = null;
        el._panelPaletteIsScrolling = false;
        el._panelPaletteCandidate = null;
        setIsCancelling(false);

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

        setHeldButton(null);
        tacticalTargeting?.resetTargeting();
        setCommandPreview(null);
        lastPreviewRef.current = null;
        document.documentElement.style.removeProperty('--preview-glow-color');
        setActiveDir(null);
        lastActiveDirRef.current = null;
        lastCancellingRef.current = false;
        el._wasInCancelZone = false;
        el.style.setProperty('--ray-opacity', '0');
        el.style.setProperty('--cancel-opacity', '0');
        el.style.setProperty('--cancel-scale', '0');
        el._startX = null;
        el._startY = null;
        el._startTime = null;
        el._maxDist = 0;
    }, [heldButton, button.id, setHeldButton, setCommandPreview, setActiveDir, setIsCancelling, isRebindingGestureRef, tacticalTargeting, onPanelToolHoverChange]);

    pointerUpRef.current = onPointerUp;
    pointerCancelRef.current = onPointerCancel;
    useEffect(() => {
        const forwardLostPointer = (event: PointerEvent, cancelled: boolean) => {
            const active = activePointerRef.current;
            if (!active || active.id !== event.pointerId || active.element.contains(event.target as Node)) return;
            // A portaled target row can receive the release after capture is
            // lost. Finish the original gesture at the actual finger position.
            const forwarded = {
                currentTarget: active.element,
                target: event.target,
                nativeEvent: event,
                pointerId: event.pointerId,
                clientX: event.clientX,
                clientY: event.clientY,
                pointerType: event.pointerType,
                button: event.button,
                buttons: event.buttons,
                isPrimary: event.isPrimary,
                cancelable: event.cancelable,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation()
            } as React.PointerEvent<HTMLDivElement>;
            if (cancelled) pointerCancelRef.current(forwarded);
            else pointerUpRef.current(forwarded);
        };
        const finish = (event: PointerEvent) => forwardLostPointer(event, false);
        const cancel = (event: PointerEvent) => forwardLostPointer(event, true);
        window.addEventListener('pointerup', finish, true);
        window.addEventListener('pointercancel', cancel, true);
        return () => {
            window.removeEventListener('pointerup', finish, true);
            window.removeEventListener('pointercancel', cancel, true);
        };
    }, []);

    const onClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (isEditMode) {
            if (wasDraggingRef && wasDraggingRef.current) return;
            setEditButton(button);
        }
    }, [isEditMode, wasDraggingRef, setEditButton, button]);

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick, currentCommandRef, endHeldGestureForDialog };
};
