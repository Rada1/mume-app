/** @file commandTreeSections.test.ts — Consistent subcategory metadata across command and target workspaces. */
import { expect, it } from 'vitest';
import { createButton } from './buttonFactory';
import { getCommandTreeSection, getCommandTreeSectionLabels } from './commandTreeSections';

// --- Ability Class and Task Classification ---
it.each([
 ["cast 'armour' %n",'magespelllist','Mage'],
 ['bash %n','warriorskilllist','Warrior'],
 ["cast 'cure light' %n",'clericspelllist','Cleric'],
 ['sneak','thiefskilllist','Thief'],
 ['track %n','rangerskilllist','Ranger'],
 ['get %n','trait-object','Move'],
 ['light %n','trait-object','Modify'],
 ['eat %n','trait-object','Use'],
 ['look %n','trait-examine','Observation'],
 ['__parley__','inline-ally','Messages']
])('%s belongs to %s subcategory %s', (command,setId,expected) => {
 expect(getCommandTreeSection(createButton({id:command,label:command,command,setId}))).toBe(expected);
});
it('keeps classes in the command-panel order without inventing unavailable classes', () => {
 const buttons=[['track %n','rangerskilllist'],["cast 'armour' %n",'magespelllist'],['bash %n','warriorskilllist']]
  .map(([command,setId])=>createButton({id:command,label:command,command,setId}));
 expect(getCommandTreeSectionLabels(buttons,0)).toEqual(['Warrior','Mage','Ranger']);
});
