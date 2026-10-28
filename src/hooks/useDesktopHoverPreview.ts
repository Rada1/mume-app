/** @file useDesktopHoverPreview.ts — Mouse-only previews with a bridge to floating menus. */
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

// --- Hover Preview Section ---
export function useDesktopHoverPreview(enabled: boolean) {
    const [open, setOpen] = useState(false);
    const timer = useRef<number | undefined>(undefined);
    const cancel = useCallback(() => { window.clearTimeout(timer.current); timer.current = undefined; }, []);
    const clear = useCallback(() => { cancel(); setOpen(false); }, [cancel]);
    const enter = useCallback((event: PointerEvent<HTMLElement>) => {
        if (!enabled || event.pointerType !== 'mouse') return;
        cancel(); setOpen(true);
    }, [enabled, cancel]);
    const leave = useCallback((event: PointerEvent<HTMLElement>) => {
        if (!enabled || event.pointerType !== 'mouse') return;
        cancel(); timer.current = window.setTimeout(() => { timer.current = undefined; setOpen(false); }, 180);
    }, [enabled, cancel]);
    useEffect(() => { if (!enabled) clear(); }, [enabled, clear]);
    useEffect(() => cancel, [cancel]);
    return { open, enter, leave, clear };
}
