/** @file commandTreeGroups.test.ts — Prevent unrelated saved actions from leaking into Combat. */
import { describe, expect, it } from 'vitest';
import { commandTreeGroup, isCommandTreeSpell } from './commandTreeGroups';
import { createButton } from './buttonFactory';
// --- Classification Checks ---
const button = (command: string, setId = 'inline-default') => createButton({id:command,label:command,command,setId});
describe('command tree placement', () => {
 it.each([['drink %n',3], ['lead %n',1], ['narrate',4], ['abandon %n',1], ['assist %n',0], ['rescue %n',0], ['cast bless %n',0], ['buy %n',3], ['sell %n',3], ['value %n',3]])('%s belongs to group %s', (command, group) => {
  expect(commandTreeGroup(button(command))).toBe(group);
 });
 it.each([
  ['remove poison', 'clericspelllist'], ['remove curse %n', 'clericspelllist'],
  ["cast 'remove poison' %n", 'trait-healing'], ['identify %n', 'magespelllist']
 ])('keeps spell %s in Combat ahead of matching item verbs', (command, setId) => {
  const spell=button(command,setId);
  expect(isCommandTreeSpell(spell)).toBe(true);
  expect(commandTreeGroup(spell)).toBe(0);
 });
 it('keeps removing equipment as an item command', () => {
  const remove=button('remove %n','equipmentlist');
  expect(isCommandTreeSpell(remove)).toBe(false);
  expect(commandTreeGroup(remove)).toBe(3);
 });
 it('does not assign unknown saved commands to Combat', () => {
  expect(commandTreeGroup(button('custom-command'))).toBeNull();
 });
 it('does not let a legacy combat set override a known item command', () => {
  expect(commandTreeGroup(button('drink %n', 'trait-offense'))).toBe(3);
 });
});

it.each([['track %n','rangerskilllist'],['bash %n','warriorskilllist'],['steal %n','thiefskilllist']])('keeps class ability %s in Combat + Abilities', (command,setId)=>{
 expect(commandTreeGroup(button(command,setId))).toBe(0);
});

// --- Movement and Vision Split ---
it.each(['look','examine','consider','scout','watch','search','scan','reveal'])('%s belongs to Vision', command => {
 expect(commandTreeGroup(button(command))).toBe(2);
});
it('places weather in Info', () => {
 expect(commandTreeGroup(button('weather'))).toBe(5);
});
it.each(['exits','map'])('%s belongs to Info', command => {
 expect(commandTreeGroup(button(command))).toBe(5);
});
it.each(['who','whois','where'])('%s belongs to Info', command => {
 expect(commandTreeGroup(button(command))).toBe(5);
});
it.each(['enter','leave','climb','swim','ride','lead','abandon','dismount','open','close'])('%s belongs to Movement', command => {
 expect(commandTreeGroup(button(command))).toBe(1);
});
it.each([['say',4],['practice',0],['wear %n',3]])('preserves %s placement after inserting Vision', (command,group) => {
 expect(commandTreeGroup(button(command))).toBe(group);
});
