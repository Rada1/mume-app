/** @file useGameplayPagerStore.ts — Tracks ownership of the player's active server viewer. */
import { create } from 'zustand';

// --- Viewer lifecycle ---
export const useGameplayPagerStore = create<{ active: boolean; autoAdvance: boolean }>(() => ({ active: false, autoAdvance: false }));

export const isGameplayPagerControl = (command: string): boolean => /^(?:[brqv])?$/i.test(command.trim());
