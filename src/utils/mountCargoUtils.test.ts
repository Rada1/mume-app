/** @file mountCargoUtils.test.ts — Bulk valuables do not include nonvaluable matching items. */
import {expect, it} from 'vitest';
import type {DrawerLine} from '../types';
import {getValuableLootGroups} from './mountCargoUtils';

// --- Bulk eligibility ---
it('avoids bulk collection when a matching item is not valuable', () => {
 const lines: DrawerLine[] = [
  {id:'1',text:'a steel sword',html:'',isItem:true},
  {id:'2',text:'an iron sword',html:'',isItem:true},
  {id:'3',text:'a wooden sword',html:'',isItem:true}
 ];
 const groups = getValuableLootGroups(lines);
 expect(groups).toHaveLength(1);
 expect(groups[0].keyword).toBe('sword');
 expect(groups[0].targets).toHaveLength(2);
 expect(groups[0].bulk).toBe(false);
});
