/**
 * @file useMapperFindPanel.ts
 * @description Tracks the map finder panel and the room that opened it.
 */
import { useCallback, useState } from 'react';

// --- Types ---
interface MapperFindPanelState {
    isOpen: boolean;
    selectedRoomId: string | null;
    anchor: { x: number; y: number } | null;
}

// --- Logic Section ---
export const useMapperFindPanel = () => {
    const [state, setState] = useState<MapperFindPanelState>({ isOpen: false, selectedRoomId: null, anchor: null });

    const open = useCallback((selectedRoomId: string | null, anchor: { x: number; y: number }) => {
        setState({ isOpen: true, selectedRoomId, anchor });
    }, []);

    const close = useCallback(() => {
        setState({ isOpen: false, selectedRoomId: null, anchor: null });
    }, []);

    return { isOpen: state.isOpen, selectedRoomId: state.selectedRoomId, anchor: state.anchor, open, close };
};
