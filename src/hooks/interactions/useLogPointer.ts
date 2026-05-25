import { useCallback, useRef } from 'react';
import { InteractionDeps } from '../useInteractionHandlers';
import { useLogPointerDown } from './useLogPointerDown';
import { useLogPointerUp } from './useLogPointerUp';
import { audioManager } from '../../services/audio/AudioManager';

export const useLogPointer = (deps: InteractionDeps, lookModFiredRef: React.MutableRefObject<boolean>, longPressJustFiredRef?: React.MutableRefObject<boolean>, heldBtnFiredRef?: React.MutableRefObject<boolean>) => {
    const {
        setHeldButton, setCommandPreview, setUI,
        viewport, heldButton, initAudio
    } = deps;

    const logLongPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const activeTargetElRef = useRef<HTMLElement | null>(null);
    const activePressedRectRef = useRef<DOMRect | null>(null);
    const isShopItemRef = useRef(false);

    const { handleLogPointerDown: internalDown } = useLogPointerDown(
        deps, lookModFiredRef, logLongPressTimerRef, longPressJustFiredRef, heldBtnFiredRef
    );
    const { handleLogPointerUp: internalUp } = useLogPointerUp(logLongPressTimerRef);

    const cleanupDrag = useCallback(() => {
        const container = document.querySelector('.message-log') as HTMLElement || document.querySelector('.log-card-drawer') as HTMLElement;
        if (container) {
            container.style.userSelect = '';
            container.style.webkitUserSelect = '';
        }

        setUI((prev: any) => ({ ...prev, isDrawerPeeking: false }));
        document.querySelectorAll('.drop-hover-active').forEach(el => el.classList.remove('drop-hover-active'));
        document.querySelectorAll('.inline-btn.dragging').forEach(el => el.classList.remove('dragging'));
        document.querySelectorAll('.inline-btn.pressed').forEach(el => el.classList.remove('pressed'));

        activeTargetElRef.current = null;
        activePressedRectRef.current = null;

        setCommandPreview('');

        window.removeEventListener('pointerup', handleGlobalUp as any);
        window.removeEventListener('pointercancel', handleGlobalUp as any);
    }, [setUI, setCommandPreview]);

    const handleGlobalUp = useCallback((e: PointerEvent) => {
        setHeldButton((prev: any) => (prev?.id?.startsWith('log-inline-')) ? null : prev);
        internalUp(e, activeTargetElRef.current, activePressedRectRef.current, isShopItemRef.current, cleanupDrag);
    }, [internalUp, cleanupDrag, setHeldButton]);

    const handleLogPointerDown = useCallback((e: React.PointerEvent) => {
        initAudio();
        const targetEl = (e.target as HTMLElement).closest('.inline-btn') as HTMLElement;
        activeTargetElRef.current = targetEl;
        activePressedRectRef.current = targetEl ? targetEl.getBoundingClientRect() : null;
        isShopItemRef.current = targetEl?.getAttribute('data-cmd') === 'inline-shopitem';

        internalDown(e);

        window.addEventListener('pointerup', handleGlobalUp);
        window.addEventListener('pointercancel', handleGlobalUp);

        if (targetEl && targetEl.getAttribute('data-targetable') !== 'false') {
            audioManager.playEffect('target', { skipJitter: true });
        }

        if (viewport.isMobile && targetEl && targetEl.getAttribute('data-targetable') !== 'false') {
            if (heldButton && !heldButton.id.startsWith('log-inline-')) {
                return;
            }
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
    }, [initAudio, internalDown, handleGlobalUp, viewport.isMobile, setHeldButton, heldButton]);

    const handleLogPointerUp = useCallback((_e: React.PointerEvent) => {
        if (heldButton?.id?.startsWith('log-inline-')) {
            setHeldButton(null);
        }
    }, [heldButton, setHeldButton]);

    return { handleLogPointerDown, handleLogPointerUp };
};
