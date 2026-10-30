/** @file useMobileCommandTilesStore.ts — Character-scoped mobile tile bindings, separate from Pro mode buttons. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomButton } from '../types';

// --- Saved wheel bindings ---
export const useMobileCommandTilesStore = create<{
 characters: Record<string, CustomButton[]>;
 customized: Record<string, string[]>;
 socialDefaultUpdated: Record<string, boolean>;
 socialRecent: Record<string, string[]>;
 update: (character: string, action: CustomButton[] | ((buttons: CustomButton[]) => CustomButton[])) => void;
 arrange: (character: string, button: CustomButton) => void;
 markSocialDefaultUpdated: (character: string) => void;
 recordSocial: (character: string, command: string) => void;
}>()(persist(set => ({
 characters:{},customized:{},socialDefaultUpdated:{},socialRecent:{},
 update:(character,action) => set(state => ({characters:{...state.characters,
  [character]:typeof action === 'function' ? action(state.characters[character] || []) : action}})),
 arrange:(character,button) => set(state => ({
  characters:{...state.characters,[character]:[...(state.characters[character] || []).filter(entry => entry.id !== button.id),button]},
  customized:{...state.customized,[character]:[...new Set([...(state.customized[character] || []),button.id])]}
 })),
 markSocialDefaultUpdated:character => set(state => ({socialDefaultUpdated:{...state.socialDefaultUpdated,[character]:true}})),
 recordSocial:(character,command) => set(state => ({socialRecent:{...state.socialRecent,
  [character]:[command,...(state.socialRecent[character] || []).filter(entry => entry !== command)].slice(0,100)}}))
}), {name:'mume-mobile-command-tiles-v1'}));
