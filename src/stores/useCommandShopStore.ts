/** @file useCommandShopStore.ts — Keeps catalog selections and shop output bound to the current room. */
import { create } from 'zustand';
import type { CommandShopState } from '../types';
import { useRoomStore } from './useRoomStore';
import { useUIStore } from './useUIStore';
import { clampShopPurchaseQuantity } from '../utils/shopPurchaseUtils';

// --- Room Identity ---
const roomKey = (room: ReturnType<typeof useRoomStore.getState>) => `${room.mapId ?? room.roomNum}:${room.roomName}`;
const emptySession = {
    browsing: false, selectedItem: null, purchaseQuantity: 1, compareFirst: null, outputOpen: false,
    outputTitle: '', outputLines: [], pendingCommand: null, completedCommand: null, completedId: 0
};

// --- Store Section ---
export const useCommandShopStore = create<CommandShopState>((set) => ({
    ...emptySession, roomKey: roomKey(useRoomStore.getState()), requestId: 0,
    openCatalog: () => set({ browsing: true }),
    selectItem: selectedItem => set({ selectedItem, purchaseQuantity: 1 }),
    setPurchaseQuantity: quantity => set(state => ({ purchaseQuantity: clampShopPurchaseQuantity(state.selectedItem, quantity) })),
    setCompareFirst: compareFirst => set({ compareFirst }),
    setOutputOpen: outputOpen => set({ outputOpen }),
    beginOutput: (pendingCommand, outputTitle) => set(state => ({
        pendingCommand, outputTitle, outputOpen: true, outputLines: [], requestId: state.requestId + 1
    })),
    receiveOutput: (requestId, outputLines) => set(state => state.requestId === requestId && state.pendingCommand ? {
        outputLines, pendingCommand: null, completedCommand: state.pendingCommand, completedId: requestId
    } : state),
    resetRoom: roomKey => set(state => ({ ...emptySession, roomKey, requestId: state.requestId + 1 }))
}));

// --- Room Transition Cleanup ---
useRoomStore.subscribe((room, previous) => {
    if (roomKey(room) === roomKey(previous)) return;
    useCommandShopStore.getState().resetRoom(roomKey(room));
    const ui = useUIStore.getState();
    useUIStore.setState({ shopItems: [], shopVariants: {}, shopVariantRequest: null,
        shopkeeperName: null, shopBalance: null, heldShopAction: null, compareFirstTarget: null, isShopOpen: false });
    if (ui.popoverState?.entityId?.startsWith('command-shop:')) ui.setPopoverState({
        x: 0, y: 0, type: 'menu', entityId: 'command-panel-room', category: 'cat-room', setId: 'cat-room',
        isRoomDescription: true, context: room.roomName, displayName: room.roomName || 'Room'
    });
});
