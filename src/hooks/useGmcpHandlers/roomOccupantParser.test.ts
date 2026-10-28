/** @file roomOccupantParser.test.ts — Room name fields stay strings before reaching UI consumers. */
import {expect, it} from 'vitest';
import {parseOccupants} from './roomOccupantParser';

// --- Malformed Name and Cached Mount Section ---
it('uses a usable mount label when its primary name has an unexpected wire value', () => {
 const [mount]=parseOccupants([{id:'name-test-pony',name:{text:'pony'},short:'a pony',desc:42,type:'npc'}],null);
 expect(mount.name).toBe('a pony');
 expect(mount.desc).toBeUndefined();
 expect(typeof mount.keyword).toBe('string');
});

it('keeps the last usable name when an update contains no valid name strings', () => {
 parseOccupants([{id:'name-test-horse',name:'a pack horse',type:'npc'}],null);
 const [mount]=parseOccupants([{id:'name-test-horse',name:42,short:{},keyword:false}],null);
 expect(mount.name).toBe('a pack horse');
 expect(mount.keyword).toBe('horse');
 expect(mount.type).toBe('npc');
});
