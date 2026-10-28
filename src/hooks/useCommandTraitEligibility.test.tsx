// @vitest-environment jsdom
/** @file Trait eligibility reuse must preserve settings and character invalidation. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CharacterInfo, InlineCategoryConfig } from '../types';
import { useCommandTraitEligibility } from './useCommandTraitEligibility';
import * as actions from '../utils/actionUtils';

// --- Cache Lifetime Section ---
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('reuses category/name classification across room snapshots but invalidates every real input', () => {
 const prepare=vi.spyOn(actions,'getEligibleActionButtonIds');
 const categories: InlineCategoryConfig[]=[];
 const character={race:'elf'} as CharacterInfo;
 const {result,rerender}=renderHook(({categories,character})=>useCommandTraitEligibility(categories,character),{initialProps:{categories,character}});
 const first=result.current('cat-npc','a pack horse');
 rerender({categories,character});
 expect(result.current('cat-npc','a pack horse')).toBe(first);
 expect(prepare).toHaveBeenCalledTimes(1);
 rerender({categories,character:{...character,xp:123,gold:456}});
 expect(result.current('cat-npc','a pack horse')).toBe(first);
 expect(prepare).toHaveBeenCalledTimes(1);
 result.current('cat-npc','a guard');
 result.current('cat-mount','a pack horse');
 expect(prepare).toHaveBeenCalledTimes(3);
 const troll={race:'troll'} as CharacterInfo;
 rerender({categories,character:troll});
 expect(result.current('cat-npc','a pack horse').has('btn-mount-ride')).toBe(false);
 expect(prepare).toHaveBeenCalledTimes(4);
 rerender({categories:[...categories],character:troll});
 result.current('cat-npc','a pack horse');
 expect(prepare).toHaveBeenCalledTimes(5);
 rerender({categories,character:{...troll,class:'mage'}});
 result.current('cat-npc','a pack horse');
 expect(prepare).toHaveBeenCalledTimes(6);
});

it('bounds retained names during long sessions', () => {
 const prepare=vi.spyOn(actions,'getEligibleActionButtonIds');
 const {result}=renderHook(()=>useCommandTraitEligibility(undefined,undefined));
 for(let index=0;index<257;index++) result.current('cat-npc',`guard ${index}`);
 expect(prepare).toHaveBeenCalledTimes(257);
 result.current('cat-npc','guard 256');
 expect(prepare).toHaveBeenCalledTimes(257);
 result.current('cat-npc','guard 0');
 expect(prepare).toHaveBeenCalledTimes(258);
});
