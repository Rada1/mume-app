/** @file useDesktopDockPanels.ts — Remember the visibility of the desktop dock panels. */
import { useCallback, useEffect, useState } from 'react';

// --- Persistent Panel State ---
type Panel = 'commands' | 'character';
const keyFor = (panel: Panel) => `mume-desktop-dock-${panel}-open`;
const readPanel = (panel: Panel) => {
    try { return localStorage.getItem(keyFor(panel)) === 'true'; } catch { return false; }
};

export function useDesktopDockPanels() {
    const [commandsOpen, setCommandsOpen] = useState(() => readPanel('commands'));
    const [characterOpen, setCharacterOpen] = useState(() => readPanel('character'));
    useEffect(() => { try { localStorage.setItem(keyFor('commands'), String(commandsOpen)); } catch { /* Storage is optional. */ } }, [commandsOpen]);
    useEffect(() => { try { localStorage.setItem(keyFor('character'), String(characterOpen)); } catch { /* Storage is optional. */ } }, [characterOpen]);
    const toggle = useCallback((panel: Panel) => {
        const setOpen = panel === 'commands' ? setCommandsOpen : setCharacterOpen;
        setOpen(current => !current);
    }, []);
    return { commandsOpen, characterOpen, toggle };
}
