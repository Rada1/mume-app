/** @file useDesktopMovementDock.ts — Finds the command-bar slot for the desktop movement pad. */
import { useEffect, useRef, useState } from 'react';

// --- Dock Lifetime Section ---
export function useDesktopMovementDock() {
    const [dock, setDock] = useState<HTMLElement | null>(null);
    const dockRef = useRef<HTMLElement | null>(null);
    useEffect(() => {
        const root = document.querySelector('.app-container');
        const update = () => {
            if (dockRef.current?.isConnected) return;
            const next = document.getElementById('desktop-movement-pad-slot');
            if (next === dockRef.current) return;
            dockRef.current = next;
            setDock(next);
        };
        update();
        if (!root) return;
        const observer = new MutationObserver(update);
        observer.observe(root, { childList: true, subtree: true });
        return () => observer.disconnect();
    }, []);
    return dock;
}
