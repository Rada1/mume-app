/** @file Bounded trait-action reuse across room snapshots with identical classification inputs. */
import { useMemo } from 'react';
import type { CharacterInfo, InlineCategoryConfig } from '../types';
import { getEligibleActionButtonIds } from '../utils/actionUtils';

// --- Static Trait Eligibility Section ---
export const useCommandTraitEligibility = (inlineCategories: InlineCategoryConfig[] | undefined, characterInfo: CharacterInfo | undefined) =>
 useMemo(() => {
  const cache = new Map<string, ReadonlySet<string>>();
  return (category: string, name: string | null): ReadonlySet<string> => {
   const key = JSON.stringify([category,name]);
   const cached = cache.get(key);
   if (cached) return cached;
   const ids = getEligibleActionButtonIds(category,name,{inlineCategories,characterInfo});
   if (cache.size >= 256) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
   }
   cache.set(key,ids);
   return ids;
  };
 // Trait requirements and mount restrictions read only these character fields.
 // XP, gold and prompt updates must not invalidate static action classification.
 }, [inlineCategories,characterInfo?.race,characterInfo?.subrace,characterInfo?.class]);
