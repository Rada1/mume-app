/** @file enchantTargetEligibility.ts — Shared object classification for Enchant targets. */
import type { DrawerLine } from '../types';
import { hasObjectTrait } from '../objects/objectTargetModel';

// --- Enchantable Objects ---
export function isEnchantableObject(source: string | DrawerLine): boolean {
    if (hasObjectTrait(source, 'trait-weapon')) return true;
    const label = typeof source === 'string' ? source : `${source.text || ''} ${source.rawText || ''} ${source.context || ''}`;
    return /\barrows?\b/i.test(label) && !hasObjectTrait(source, 'trait-container');
}
