/** @file useDesktopCommandDefaultsStore.ts — Per-character desktop category click actions. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';

// --- Saved desktop defaults ---
export const useDesktopCommandDefaultsStore = create<{
 characters: Record<string, Record<string, string>>;
 targets: Record<string, Record<string, CommandActionTargetEntry>>;
 setDefault: (character: string, category: string, command: string) => void;
 toggleTarget: (character: string, command: string, target: CommandActionTargetEntry) => void;
}>()(persist(set => ({
 characters: {},
 targets: {},
 setDefault: (character, category, command) => set(state => ({
  characters: {...state.characters, [character]: {...state.characters[character], [category]: command}}
 })),
 toggleTarget: (character, command, target) => set(state => {
  const saved = state.targets?.[character]?.[command];
  const next = { ...state.targets?.[character] };
  if (saved && saved.context === target.context && saved.group === target.group && saved.parentNoun === target.parentNoun) delete next[command];
  else next[command] = { id:target.id, label:target.label, keyword:target.keyword, context:target.context, category:target.category, group:target.group, scope:target.scope, parentNoun:target.parentNoun, hasDoor:target.hasDoor };
  return { targets:{...state.targets, [character]:next} };
 })
}), {name: 'mume-desktop-command-defaults-v1'}));
