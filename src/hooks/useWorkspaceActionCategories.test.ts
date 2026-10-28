// @vitest-environment jsdom
/** @file useWorkspaceActionCategories.test.ts — Target menus show one category and ally-only socials. */
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { useWorkspaceActionCategories } from './useWorkspaceActionCategories';
import { createButton } from '../utils/buttonFactory';
import { usePanelDataStore } from '../stores/usePanelDataStore';

// --- Target category fixture ---
const hit = createButton({id:'hit', label:'Hit', command:'hit %n', setId:'trait-offense'});
const look = createButton({id:'look', label:'Look', command:'look %n', setId:'cat-room'});
const smile = createButton({id:'smile', label:'Smile', command:'smile %n', setId:'socials'});
const tell = createButton({id:'tell', label:'Tell', command:'tell %n', setId:'trait-communication'});
const flee = createButton({id:'flee', label:'Flee', command:'flee', setId:'trait-retreat'});
const groups = [{label:'Actions', buttons:[hit, look, smile, tell, flee], sections:[
 {label:'Combat action', buttons:[hit]}, {label:'Observation', buttons:[look]}, {label:'Social actions', buttons:[smile]},
 {label:'Messages', buttons:[tell]}, {label:'Retreat', buttons:[flee]}
]}];
afterEach(cleanup);
beforeEach(() => usePanelDataStore.setState(current => ({status: {...current.status, skills: 'idle'}})));

it.each(['cat-ally', 'cat-enemy', 'cat-neutral', 'cat-npc', 'cat-mount', 'cat-room-object'])(
 'keeps all class categories available for %s before skill sync', category => {
 const {result} = renderHook(() => useWorkspaceActionCategories(groups, 'Target', category));
 expect(result.current.categories.map(item => item.label)).toEqual(expect.arrayContaining(['Mage','Warrior','Ranger','Cleric','Thief']));
 act(() => result.current.select('workspace-class-Mage'));
 expect(result.current.needsSkillSync).toBe(true);
 expect(result.current.commands).toEqual([]);
});

it('keeps the chosen class selected when its learned commands arrive', () => {
 const spell = createButton({id:'missile',label:'Magic Missile',command:"cast 'magic missile' %n",setId:'magespelllist'});
 const {result, rerender} = renderHook(({sections}) => useWorkspaceActionCategories(sections, 'Target', 'cat-npc'),
  {initialProps:{sections:groups}});
 act(() => result.current.select('workspace-class-Mage'));
 act(() => usePanelDataStore.setState(current => ({status:{...current.status, skills:'ready'}})));
 rerender({sections:[...groups,{label:'Abilities',buttons:[spell],sections:[{label:'Mage',buttons:[spell]}]}]});
 expect(result.current.commands).toEqual([spell]);
 expect(result.current.needsSkillSync).toBe(false);
 expect(result.current.categories.filter(item => item.label === 'Mage')).toHaveLength(1);
});

it('shows only the selected category and keeps it selected on repeated clicks', () => {
 const {result} = renderHook(() => useWorkspaceActionCategories(groups, 'Ally', 'cat-ally'));
 expect(result.current.commands).toEqual([hit]);
 const observe = result.current.categories.find(category => category.label === 'Observe')!;
 act(() => result.current.select(observe.key));
 expect(result.current.commands).toEqual([look]);
 act(() => result.current.select(observe.key));
 expect(result.current.commands).toEqual([look]);
});

it('removes Social and falls back to a valid category when selecting an NPC', () => {
 const {result, rerender} = renderHook(({category}) => useWorkspaceActionCategories(groups, 'Target', category),
  {initialProps:{category:'cat-ally'}});
 const social = result.current.categories.find(category => category.label === 'Social')!;
 act(() => result.current.select(social.key));
 expect(result.current.commands).toEqual([smile]);
 rerender({category:'cat-npc'});
 expect(result.current.categories.map(category => category.label)).not.toContain('Social');
 expect(result.current.categories.map(category => category.label)).not.toContain('Messages');
 expect(result.current.commands).toEqual([hit]);
});

it('omits Flee entirely and does not create a Retreat category', () => {
 const {result} = renderHook(() => useWorkspaceActionCategories(groups, 'Ally', 'cat-ally'));
 expect(result.current.categories.map(category => category.label)).not.toContain('Retreat');
 expect(result.current.categories.flatMap(category => category.buttons)).not.toContain(flee);
 expect(result.current.categories.map(category => category.label)).toContain('Messages');
});
