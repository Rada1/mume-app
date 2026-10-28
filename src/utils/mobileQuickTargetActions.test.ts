/** @file mobileQuickTargetActions.test.ts — Contextual actions keep numbered target selectors. */
import { describe, expect, it } from 'vitest';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { getMobileQuickTarget } from './mobileQuickTargetActions';

// --- Contextual action selection ---
const entry = (overrides: Partial<CommandActionTargetEntry>): CommandActionTargetEntry => ({
 id:'item', label:'an item', keyword:'item', context:'item', category:'cat-room-object', group:'objects', scope:'room', ...overrides
});
const actions = (target: CommandActionTargetEntry) => getMobileQuickTarget(target, []).actions;
describe('mobile quick actions', () => {
 it('offers corpse actions with the exact numbered selector', () => {
  expect(actions(entry({label:'the corpse of an elf', context:'2.elf-corpse'}))).toEqual([
   {label:'Loot', command:'get all 2.elf-corpse'}, {label:'Butcher', command:'butcher 2.elf-corpse'}]);
  const rider = getMobileQuickTarget(entry({label:'corpse of an Ohurk-uai warg-rider', context:'2.rider'}), []);
  expect(rider.target).toBe('2.rider-corpse');
  expect(rider.actions.map(action => action.command)).toEqual(['get all 2.rider-corpse', 'butcher 2.rider-corpse']);
  expect(getMobileQuickTarget(entry({label:'corpse of an Ohurk-uai warg-rider', context:'rider'}), []).target).toBe('rider-corpse');
 });
 it('distinguishes mounts, allies and enemies', () => {
  expect(actions(entry({label:'a pack horse', context:'2.horse', category:'cat-npc', group:'npcs'})).map(a => a.command))
   .toEqual(['ride 2.horse','lead 2.horse','unsaddle 2.horse all']);
  expect(actions(entry({label:'Elena', context:'Elena', category:'cat-ally', group:'players'})).map(a => a.label)).toEqual(['Follow','Group']);
  expect(actions(entry({label:'an orc', context:'orc', category:'cat-enemy', group:'players'})).map(a => a.label)).toEqual(['Hit']);
 });
 it('offers only the relevant item actions', () => {
  expect(actions(entry({label:'an ash arrow', context:'2.arrow'})).map(a => a.command)).toEqual(['get 2.arrow']);
  expect(actions(entry({label:'a broadsword', context:'2.broadsword', group:'inventory', category:'cat-inventory-object', scope:'self'})).map(a => a.command)).toEqual(['drop 2.broadsword','wield 2.broadsword']);
  expect(actions(entry({label:'some bread', context:'bread', group:'inventory', category:'cat-inventory-object', scope:'self'})).map(a => a.command)).toEqual(['eat bread']);
  expect(actions(entry({label:'some bread', context:'2.bread'})).map(a => a.command)).toEqual(['get 2.bread', 'eat 2.bread']);
  expect(actions(entry({label:'a waterskin', context:'2.skin'})).map(a => a.command)).toEqual(['get 2.skin', 'drink 2.skin']);
  expect(actions(entry({label:'a cloak', context:'cloak', group:'worn', category:'cat-worn-object', scope:'self'})).map(a => a.command)).toEqual(['remove cloak']);
 });
});
