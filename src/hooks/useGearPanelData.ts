/** @file useGearPanelData.ts — Loads the gear sections the player opens. */
import { useEffect } from 'react';
import { usePanelData } from './usePanelData';

// --- Section Loading ---
export const useGearPanelData = (wornOpen: boolean, inventoryOpen: boolean) => {
    const data = usePanelData();
    useEffect(() => {
        if (wornOpen) data.request('equipment');
        if (inventoryOpen) data.request('inventory');
    }, [wornOpen, inventoryOpen, data.request, data.revision]);
    return data;
};
