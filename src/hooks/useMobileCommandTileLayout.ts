/** @file useMobileCommandTileLayout.ts — Enables the shared split layout while mobile V2 tiles are mounted. */
import { useLayoutEffect } from 'react';

// --- Layout lifetime ---
export const useMobileCommandTileLayout = (enabled: boolean, app?: HTMLElement) => {
 useLayoutEffect(() => {
  if (!enabled || !app) return;
  app.classList.add('mobile-command-tiles-mode');
  return () => app.classList.remove('mobile-command-tiles-mode');
 }, [enabled,app]);
};
