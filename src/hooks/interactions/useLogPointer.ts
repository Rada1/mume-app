import { useCallback, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { useLogPointerDown } from './useLogPointerDown';
import { useLogPointerMove } from './useLogPointerMove';
import { useLogPointerUp } from './useLogPointerUp';

/**
 * @file useLogPointer.ts
 * @description thin orchestrator for log pointer interactions.
 * Delegates to modular hooks for down, move, and up logic.
 */
export const useLogPointer = (deps: InteractionDeps, lookModFiredRef: React.MutableRefObject<boolean>) => {
    const { 
        setHeldButton, setActiveDragData, setCommandPreview, setUI, 
        viewport, triggerHaptic, heldButton, initAudio
    } = deps;

    // --- Refs shared across pointer stages ---
    const logLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logDragStartPosRef = useRef<{ x: number; y: number } | null>(null);
    const isLogDraggingRef = useRef(false);
    const moveCountRef = useRef(0);
    
    // Track current active target and its state for the 'up' handler
    const activeTargetElRef = useRef<HTMLElement | null>(null);
    const activePressedRectRef = useRef<DOMRect | null>(null);
    const isShopItemRef = useRef(false);

    // --- Modular Hooks ---
    const { handleLogPointerDown: internalDown } = useLogPointerDown(
        deps, lookModFiredRef, logLongPressTimerRef, logDragStartPosRef, isLogDraggingRef
    );
    const { handleLogPointerMove: internalMove } = useLogPointerMove(
        deps, logDragStartPosRef, isLogDraggingRef, moveCountRef
    );
    const { handleLogPointerUp: internalUp } = useLogPointerUp(
        deps, logLongPressTimerRef, isLogDraggingRef
    );

    /**
     * Resets interaction state and removes global listeners.
     */
    const cleanupDrag = useCallback(() => {
        const isMobile = viewport.isMobile;
        const container = document.querySelector('.message-log') as HTMLElement || document.querySelector('.log-card-drawer') as HTMLElement;
        if (container) {
            container.style.userSelect = 'auto';
            container.style.webkitUserSelect = 'auto';
            if (isMobile) {
                container.style.overflow = 'auto';
                container.style.touchAction = 'pan-y';
            }
        }
        
        setUI((prev: any) => ({ ...prev, isDrawerPeeking: false }));
        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
        document.querySelectorAll('.inline-btn.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.inline-btn.pressed').forEach(el => el.classList.remove('pressed'));
        
        logDragStartPosRef.current = null;
        isLogDraggingRef.current = false;
        activeTargetElRef.current = null;
        activePressedRectRef.current = null;
        
        // setHeldButton(null); // This is now handled conditionally in handleGlobalUp
        setActiveDragData(null);
        setCommandPreview('');
        
        // window.removeEventListener('pointermove', handleGlobalMove);
        window.removeEventListener('pointerup', handleGlobalUp as any);
        window.removeEventListener('pointercancel', handleGlobalUp as any);
    }, [setUI, setHeldButton, setActiveDragData, setCommandPreview, viewport.isMobile]);

    const handleGlobalUp = useCallback((e: PointerEvent) => {
        // Only clear heldButton if it was started by the log
        setHeldButton((prev: any) => (prev?.id?.startsWith('log-inline-')) ? null : prev);
        internalUp(e, activeTargetElRef.current, activePressedRectRef.current, isShopItemRef.current, cleanupDrag);
    }, [internalUp, cleanupDrag, setHeldButton]);

    const startDrag = useCallback((e: React.PointerEvent | null, targetEl: HTMLElement, label: string, contextStr: string) => {
        isLogDraggingRef.current = true;
        
        const cmd = targetEl.getAttribute('data-cmd') || '';
        const context = targetEl.getAttribute('data-context') || '';
        const entityId = targetEl.getAttribute('data-id') || '';
        
        setActiveDragData({ type: 'inline-btn', cmd, context, id: entityId });
        targetEl.classList.add('dragging');

        const logEl = document.querySelector('.message-log') as HTMLElement;
        if (logEl) {
            logEl.style.userSelect = 'none';
            logEl.style.webkitUserSelect = 'none';
            window.getSelection()?.removeAllRanges();
        }

        if (viewport.isMobile) {
            if (logEl) {
                logEl.style.overflow = 'hidden';
                logEl.style.touchAction = 'none';
            }
            if (targetEl.isConnected && e) {
                try { targetEl.setPointerCapture(e.pointerId); } catch (err) {}
            }
        }

        setHeldButton((prev: any) => ({
            ...prev,
            isLogDragging: true,
            x: logDragStartPosRef.current?.x || 0,
            y: logDragStartPosRef.current?.y || 0,
            label,
            originalLabel: label,
            context: contextStr
        }));
    }, [setActiveDragData, setHeldButton, viewport.isMobile]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        initAudio(); // Sound fix
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        activeTargetElRef.current = targetEl;
        activePressedRectRef.current = targetEl ? targetEl.getBoundingClientRect() : null;
        isShopItemRef.current = targetEl?.getAttribute('data-cmd') === 'inline-shopitem';
        
        internalDown(e, startDrag);

        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('pointercancel', handleGlobalUp);

        if (viewport.isMobile && targetEl) {
            // Protect active swipe session: don't overwrite if another button is already swiping
            if (heldButton && heldButton.id !== ('log-inline-' + (targetEl.getAttribute('data-id') || '')) && (Math.abs(heldButton.dx || 0) > 15 || Math.abs(heldButton.dy || 0) > 15)) {
                return;
            }

            const id = 'log-inline-' + (targetEl.getAttribute('data-id') || Math.random());
            const cmd = targetEl.getAttribute('data-cmd') || '';
            const context = targetEl.getAttribute('data-context') || '';
            const rect = targetEl.getBoundingClientRect();
            const baseCommand = cmd.includes('%n') ? cmd.replace(/%n/g, context) : (cmd ? `${cmd} ${context}` : context);
            setHeldButton({ id, baseCommand, modifiers: [], dx: 0, dy: 0, didFire: false, isLogDragging: false, initialX: rect.left + rect.width / 2, initialY: rect.top + rect.height / 2 });
        }
    }, [initAudio, internalDown, startDrag, handleGlobalUp, viewport.isMobile, setHeldButton]);

    const handleLogPointerUp = useCallback((e: React.PointerEvent) => {
        if (heldButton?.id?.startsWith('log-inline-')) {
            setHeldButton(null);
        }
    }, [heldButton, setHeldButton]);

    return { handleLogPointerDown, handleLogPointerUp };
};
