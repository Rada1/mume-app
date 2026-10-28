/** @file silentLootCapture.test.ts — Hide only background inventory and examine output. */
import {expect, it} from 'vitest';
import {shouldHideSilentLootCapture} from './silentLootCapture';

// --- Snapshot visibility ---
const base = {activeType:'none', expectedType:'inventory', activeSilent:false, pendingSilent:true,
 isSnoop:false, isPrompt:false, isLive:false, isCommunication:false, isEnvironment:false};
it('hides pending and active silent inventory and corpse examinations', () => {
 expect(shouldHideSilentLootCapture(base)).toBe(true);
 expect(shouldHideSilentLootCapture({...base,expectedType:'examine'})).toBe(true);
 expect(shouldHideSilentLootCapture({...base,pendingSilent:false,expectedType:'none',activeType:'examine',activeSilent:true})).toBe(true);
 expect(shouldHideSilentLootCapture({...base,pendingSilent:false})).toBe(false);
 expect(shouldHideSilentLootCapture({...base,expectedType:'equipment'})).toBe(false);
});
it('keeps prompts, snoops, communication, weather and live game events visible', () => {
 for (const key of ['isPrompt','isSnoop','isLive','isCommunication','isEnvironment'] as const)
  expect(shouldHideSilentLootCapture({...base,[key]:true})).toBe(false);
});
