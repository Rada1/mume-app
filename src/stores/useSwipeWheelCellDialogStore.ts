/** @file useSwipeWheelCellDialogStore.ts — Keeps the add-cell form open across mobile control unmounts. */

import { create } from 'zustand';
import type { SwipeWheelCellDialogState } from '../types';

// --- Logic Section ---
export const useSwipeWheelCellDialogStore = create<SwipeWheelCellDialogState>(set => ({
    onCreateCell: null,
    openDialog: onCreateCell => set({ onCreateCell }),
    closeDialog: () => set({ onCreateCell: null }),
}));
