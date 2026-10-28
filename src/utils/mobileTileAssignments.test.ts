/** @file mobileTileAssignments.test.ts — Default grids fill before overflow while valid slots stay in place. */
import {expect, it} from 'vitest';
import {createButton} from './buttonFactory';
import {createMobileTileButton, MOBILE_COMMAND_TILES} from './mobileCommandTiles';
import {completeMobileTileBindings, hasMobileTileArrangement, removeMobileTileBinding} from './mobileTileAssignments';

// --- Default Binding Completion Section ---
const commands = Array.from({length:12},(_,i) => createButton({id:`command-${i}`,label:`Command ${i}`,command:`get item${i}`,setId:'trait-utility'}));
const family = MOBILE_COMMAND_TILES.find(tile => tile.id === 'gear')!;
const bindings = (button: ReturnType<typeof createMobileTileButton>) => [button.command,...Object.values(button.swipeCommands || {})];

it('fills a saved sparse default up to nine commands before leaving overflow', () => {
 const saved = createMobileTileButton(family,commands.slice(0,3));
 const next = completeMobileTileBindings(saved,commands);
 expect(bindings(next)).toHaveLength(9);
 expect(new Set(bindings(next)).size).toBe(9);
 expect(bindings(next).slice(0,3)).toEqual(bindings(saved));
 expect(commands.filter(command => !bindings(next).includes(command.command))).toHaveLength(3);
 expect(completeMobileTileBindings(next,commands)).toBe(next);
 expect(hasMobileTileArrangement(next)).toBe(false);
});

it('fills unavailable default cells without moving commands that are still available', () => {
 const saved = createMobileTileButton(family,commands.slice(0,9));
 const next = completeMobileTileBindings(saved,commands.filter(command => command !== commands[1]));
 expect(next.swipeCommands?.up).toBe(commands[9].command);
 expect(next.command).toBe(saved.command);
 expect(next.swipeCommands?.right).toBe(saved.swipeCommands?.right);
 expect(bindings(next)).toHaveLength(9);
});

it('keeps automatic relocation cleanup distinguishable from a manual arrangement', () => {
 const saved = createMobileTileButton(family,commands.slice(0,3));
 const next = removeMobileTileBinding(saved,commands[1].command);
 expect(hasMobileTileArrangement(next)).toBe(false);
 expect(completeMobileTileBindings(next,commands).swipeCommands?.up).toBe(commands[1].command);
});
