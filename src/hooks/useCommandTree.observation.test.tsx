/** @file useCommandTree.observation.test.tsx — Observation owns a root menu without leaking into Abilities or Info. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {useCommandTree} from './useCommandTree';
import type {useCommandTreeController} from './useCommandTreeController';

// --- Navigation Fixture Section ---
vi.mock('./useRoomDrinkWater', () => ({useRoomDrinkWater: () => false}));
vi.mock('./useGearPanelData', () => ({useGearPanelData: () => ({status: {skills: 'ready'}})}));

it('owns Observation commands in a dedicated root menu', async () => {
 const controller = {
  game: {characterName: 'Ellessar', inlineCategories: [], roomNpcs: [], entities: {}, currentTerrain: 'field'},
  ui: {}, vitals: {characterInfo: {}}, entries: [], menuButtons: [],
  previewEntity: vi.fn(), previewTargetContext: vi.fn(),
  practice: {open: false, setOpen: vi.fn()}, shop: {browsing: false}
 } as unknown as ReturnType<typeof useCommandTreeController>;
 let tree!: ReturnType<typeof useCommandTree>;
 const root = createRoot(document.createElement('div'));
 function Harness() { tree = useCommandTree(controller); return null; }
 try {
  await act(async () => root.render(<Harness/>));
  expect(tree.grouped[2].label).toBe('Observation');
  await act(async () => tree.chooseGroup(2));
  expect(tree.commandSections.map(section => section.label)).toEqual(['Observation']);
  expect(tree.commandSections.flatMap(section => section.buttons.map(button => button.label)))
   .toEqual(expect.arrayContaining(['Look', 'Examine', 'Consider']));
  const look = tree.grouped[2].buttons.find(button => button.label === 'Look')!;
  await act(async () => tree.chooseCommand(look));
  expect(tree.command).toBe(look);
  await act(async () => tree.clearCommand());
  expect(tree.command).toBeNull();
  expect(tree.group).toBe(2);
  for (const group of [0, 5]) {
   await act(async () => tree.chooseGroup(group));
   expect(tree.commandSections.some(section => section.label === 'Observation')).toBe(false);
  }
 } finally { await act(async () => root.unmount()); }
});
