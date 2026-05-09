/**
 * @file useLogPointerUp.ts
 * @description Hook for handling pointer up in the message log.
 */

import { useCallback } from 'react';

export const useLogPointerUp = (
    logLongPressTimerRef: React.MutableRefObject<NodeJS.Timeout | null>
) => {
    const handleLogPointerUp = useCallback((
        _e: PointerEvent,
        _targetEl: HTMLElement | null,
        _pressedRect: DOMRect | null,
        _isShopItem: boolean,
        cleanupDrag: () => void
    ) => {
        if (logLongPressTimerRef.current) {
            clearTimeout(logLongPressTimerRef.current);
            logLongPressTimerRef.current = null;
        }

        setTimeout(() => {
            cleanupDrag();
        }, 50);
    }, [logLongPressTimerRef]);

    return { handleLogPointerUp };
};
