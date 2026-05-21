/**
 * @file categorizationUtils.ts
 * @description Legacy compatibility adapters for the canonical inline action model.
 */

import { EntityKind, InlineCategoryConfig } from '../types';
import {
    DEFAULT_CATEGORY_CONFIGS,
    DEFAULT_TRAIT_CONFIGS,
    EntityColorMap,
    getCategoryColorWithOverrides,
    getCategoryConfig,
    getInlineGlowColor,
    getKindForCategory,
    getTraitConfig,
    getTraitsForName as getInlineTraitsForName,
    toCategoryId,
    toTraitId,
    TraitConfig
} from './inlineActionModel';
import { LinkedColorTheme } from './themeLinkedColors';

// --- Color Fallbacks ---

export const COLOR_NPC = 'rgba(150, 253, 48, 0.95)';
export const COLOR_PLAYER = '#4173e6';
export const COLOR_OBJ = 'rgba(251, 146, 60, 0.95)';
export const COLOR_ALLY = '#55a5e2';
export const COLOR_ENEMY = '#ef4444';
export const COLOR_NEUTRAL = '#eab308';
export const COLOR_ROOM = '#22c55e';

// --- Legacy Alias Section ---

export const LEGACY_ID_MAP: Record<string, string> = Object.fromEntries([
    ...DEFAULT_CATEGORY_CONFIGS.flatMap(category => [
        [category.id, category.id],
        ...(category.legacyIds || []).map(id => [id, category.id])
    ]),
    ...DEFAULT_TRAIT_CONFIGS.flatMap(trait => [
        [trait.id, trait.id],
        ...(trait.legacySetIds || []).map(id => [id, trait.id])
    ]),
    ['inlineplayer', 'cat-ally'],
    ['pc', 'cat-ally'],
    ['roomitems', 'cat-room-object'],
    ['inventorylist', 'cat-inventory-object'],
    ['equipmentlist', 'cat-worn-object'],
    ['roomnpcs', 'cat-npc']
]);

export const canonicalizeCategoryId = (id: string): string => {
    if (!id) return 'cat-object';
    return toCategoryId(id) || toTraitId(id) || LEGACY_ID_MAP[id] || id;
};

// --- Keyword Matching Adapters ---

export function getTraitsForName(name: string, customCategories?: InlineCategoryConfig[]): string[] {
    return getInlineTraitsForName(name, customCategories || []).map(trait => trait.id);
}

export function getTraitConfigsForName(name: string, customCategories?: InlineCategoryConfig[]): InlineCategoryConfig[] {
    return getInlineTraitsForName(name, customCategories || []).map(traitToInlineConfig);
}

export function getCategoryForName(name: string, customCategories?: InlineCategoryConfig[]): string | null {
    const traits = getTraitsForName(name, customCategories);
    return traits.length > 0 ? traits[0] : null;
}

// --- Category Adapters ---

export function getCategoryType(category: string | null, customCategories?: InlineCategoryConfig[]): EntityKind | null {
    if (!category) return null;
    const kind = getKindForCategory(category);
    if (kind) return kind;

    const traitConfig = getTraitConfig(category);
    if (traitConfig?.kind) return traitConfig.kind;

    const configs = customCategories || [];
    const config = configs.find(candidate => canonicalizeCategoryId(candidate.id) === canonicalizeCategoryId(category));
    return config?.kind || null;
}

export function getGlowColorForCategory(
    category: string | null,
    customCategories?: InlineCategoryConfig[],
    entityColors?: EntityColorMap,
    theme: LinkedColorTheme = 'dark'
): string | null {
    if (!category) return null;
    const fallback = getFallbackColor(getCategoryType(category, customCategories));
    return getCategoryColorWithOverrides(category, customCategories || [], fallback, entityColors, theme);
}

export const resolveKindAndLocation = (
    kind?: string | null,
    location?: string | null,
    cmd?: string | null
): { kind: string, location: string } => {
    if (kind && location) return { kind, location };

    const canonicalId = canonicalizeCategoryId(cmd || '');
    if (canonicalId === 'cat-room-object' || canonicalId === 'trait-corpse') return { kind: 'object', location: 'room' };
    if (canonicalId === 'cat-inventory-object') return { kind: 'object', location: 'carried' };
    if (canonicalId === 'cat-worn-object') return { kind: 'object', location: 'worn' };
    if (canonicalId === 'cat-npc') return { kind: 'npc', location: 'room' };
    if (canonicalId === 'cat-ally') return { kind: 'ally', location: 'room' };
    if (canonicalId === 'cat-enemy') return { kind: 'enemy', location: 'room' };
    if (canonicalId === 'cat-neutral') return { kind: 'neutral', location: 'room' };
    if (canonicalId === 'cat-room' || cmd === 'roomname' || cmd === 'room-name' || cmd === 'exits') {
        return { kind: 'room', location: 'room' };
    }

    return { kind: kind || 'object', location: location || 'room' };
};

// --- Helpers ---

function traitToInlineConfig(trait: TraitConfig): InlineCategoryConfig {
    return {
        id: trait.id,
        kind: trait.kind || getKindForCategory(trait.legacySetIds?.[0]) || 'object',
        keywords: trait.keywords,
        buttonSetId: trait.legacySetIds?.[0]
    };
}

function getFallbackColor(kind: EntityKind | string | null): string {
    if (kind === 'ally' || kind === 'player') return COLOR_ALLY;
    if (kind === 'enemy') return COLOR_ENEMY;
    if (kind === 'neutral') return COLOR_NEUTRAL;
    if (kind === 'all') return COLOR_PLAYER;
    if (kind === 'npc') return COLOR_NPC;
    if (kind === 'object') return COLOR_OBJ;
    if (kind === 'room') return COLOR_ROOM;
    return COLOR_OBJ;
}
