// @vitest-environment jsdom
/** @file Prevents target and scalar vitals updates from rebuilding the button catalog. */
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useButtonLogic } from './useButtonLogic';
import { createButton } from '../utils/buttonFactory';
import type { CharacterInfo } from '../types';

// --- Catalog Identity and Eligibility Section ---
afterEach(cleanup);
it('keeps button identities across target/XP/gold changes but refreshes real catalog inputs', () => {
 const button={...createButton({id:'elf-only',label:'Info',command:'info',setId:'main'}),requirement:{race:['elf']}};
 const initial={rawButtons:[button],activeSet:'main',abilities:{},characterClass:'none',characterName:'Tester',
  characterInfo:{race:'elf',class:'mage',subrace:''} as CharacterInfo,isEditMode:false,isSmartPopulateEnabled:true,
  target:null as string | null,inlineCategories:[]};
 const {result,rerender}=renderHook(props=>useButtonLogic(props),{initialProps:initial});
 const first=result.current;
 expect(first.some(entry=>entry.id===button.id)).toBe(true);
 rerender({...initial,target:'a guard',characterInfo:{...initial.characterInfo,xp:123,gold:456}});
 expect(result.current).toBe(first);
 rerender({...initial,characterInfo:{...initial.characterInfo,race:'dwarf'}});
 expect(result.current).not.toBe(first);
 expect(result.current.some(entry=>entry.id===button.id)).toBe(false);
 rerender({...initial,rawButtons:[{...button,label:'My Info'}]});
 expect(result.current.find(entry=>entry.id===button.id)?.label).toBe('My Info');
 const beforeSkills=result.current;
 rerender({...initial,abilities:{bash:50}});
 expect(result.current).not.toBe(beforeSkills);
});
