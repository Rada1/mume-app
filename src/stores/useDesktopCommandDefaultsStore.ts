/** @file useDesktopCommandDefaultsStore.ts — Per-character desktop category click actions. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Saved desktop defaults ---
export const useDesktopCommandDefaultsStore = create<{
 characters: Record<string, Record<string, string>>;
 setDefault: (character: string, category: string, command: string) => void;
}>()(persist(set => ({
 characters: {},
 setDefault: (character, category, command) => set(state => ({
  characters: {...state.characters, [character]: {...state.characters[character], [category]: command}}
 }))
}), {name: 'mume-desktop-command-defaults-v1'}));
