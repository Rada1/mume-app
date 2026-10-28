/** @file useDesktopCommandDefaults.ts — Resolve desktop defaults against currently available commands. */
import { useDesktopCommandDefaultsStore } from '../stores/useDesktopCommandDefaultsStore';
import { useMobileCommandTilesStore } from '../stores/useMobileCommandTilesStore';
import type { CustomButton } from '../types';

// --- Character selection ---
export const useDesktopCommandDefaults = (characterName: string | undefined) => {
 const character = characterName?.toLowerCase() || 'guest';
 const defaults = useDesktopCommandDefaultsStore(state => state.characters[character]);
 const mobileButtons = useMobileCommandTilesStore(state => state.characters[character]);
 const setDefault = useDesktopCommandDefaultsStore(state => state.setDefault);
 const resolve = (category: string, commands: CustomButton[], fallback?: string) => {
  const saved = defaults?.[category];
  const mobile = mobileButtons?.find(button => button.id === `mobile-tile-${category}`)?.command;
  return commands.find(button => button.command === saved)
   || commands.find(button => button.command === (fallback || mobile));
 };
 return {resolve, saved: defaults, setDefault: (category: string, button: CustomButton) => setDefault(character, category, button.command)};
};
