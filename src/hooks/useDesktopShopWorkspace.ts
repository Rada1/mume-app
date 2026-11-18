/** @file useDesktopShopWorkspace.ts — Desktop shop views and gear snapshot loading. */
import { useEffect, useState } from 'react';
import { useGearPanelData } from './useGearPanelData';

// --- Workspace view ---
export function useDesktopShopWorkspace(visible: boolean) {
    const [view, setView] = useState<'stock' | 'gear'>('stock');
    useEffect(() => { if (!visible) setView('stock'); }, [visible]);
    const data = useGearPanelData(false, visible && view === 'gear');
    return { view, setView, data };
}
