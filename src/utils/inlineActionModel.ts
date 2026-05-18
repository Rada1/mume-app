/**
 * @file inlineActionModel.ts
 * @description Canonical category -> trait -> button model for inline actions.
 */

import { CategoryOverride, CustomButton, CustomTraitConfig, EntityKind, InlineCategoryConfig } from '../types';
import { DEFAULT_CATEGORY_CONFIGS, DEFAULT_TRAIT_CONFIGS } from './inlineActionDefaults';
import { LinkedColorTheme, toThemeLinkedColor } from './themeLinkedColors';

export { DEFAULT_CATEGORY_CONFIGS, DEFAULT_TRAIT_CONFIGS } from './inlineActionDefaults';

// --- Type Definitions ---

export interface CategoryConfig {
    id: string;
    label: string;
    defaultTraitIds: string[];
    legacyIds?: string[];
    color?: string;
    isGmcpCategory?: boolean;
    isLocationCategory?: boolean;
}

/** Maps a canonical category id to its actual EntityKind. Replaces CategoryConfig.kind. */
export const CATEGORY_KIND_MAP: Readonly<Record<string, EntityKind>> = {
    'cat-target':           'none',
    'cat-ally':             'ally',
    'cat-enemy':            'enemy',
    'cat-neutral':          'neutral',
    'cat-ally-remote':      'ally',
    'cat-npc':              'npc',
    'cat-room-object':      'object',
    'cat-inventory-object': 'object',
    'cat-worn-object':      'object',
    'cat-object':           'object',
    'cat-room':             'room',
    'cat-exit':             'exit',
};

/** Per-kind color overrides passed to getInlineGlowColor from caller settings. */
export type EntityColorMap = Partial<Record<EntityKind, string>>;

export interface TraitConfig {
    id: string;
    label: string;
    buttonIds: string[];
    keywords: string[];
    legacySetIds?: string[];
    kind?: EntityKind;
    requirement?: CustomButton['requirement'];
}

export interface ResolvedTraitSection {
    trait: TraitConfig;
    buttonIds: string[];
}

export type InlineActionConfigRecord = InlineCategoryConfig | CategoryOverride | CustomTraitConfig;

// --- Alias Resolution ---

const categoryAliasMap = new Map<string, string>();
DEFAULT_CATEGORY_CONFIGS.forEach(category => {
    categoryAliasMap.set(category.id, category.id);
    category.legacyIds?.forEach(id => categoryAliasMap.set(id, category.id));
});

const traitAliasMap = new Map<string, string>();
DEFAULT_TRAIT_CONFIGS.forEach(trait => {
    traitAliasMap.set(trait.id, trait.id);
    trait.legacySetIds?.forEach(id => traitAliasMap.set(id, trait.id));
});

export const toCategoryId = (id: string | null | undefined): string | null => (
    id ? categoryAliasMap.get(id) || null : null
);

export const toTraitId = (id: string | null | undefined): string | null => (
    id ? traitAliasMap.get(id) || null : null
);

// --- Resolution Helpers ---

export const getCategoryConfig = (id: string | null | undefined): CategoryConfig | null => {
    const categoryId = toCategoryId(id);
    return categoryId ? DEFAULT_CATEGORY_CONFIGS.find(category => category.id === categoryId) || null : null;
};

export const getTraitConfig = (id: string | null | undefined): TraitConfig | null => {
    const traitId = toTraitId(id);
    return traitId ? DEFAULT_TRAIT_CONFIGS.find(trait => trait.id === traitId) || null : null;
};

export const getTraitsForCategory = (id: string | null | undefined): TraitConfig[] => {
    const category = getCategoryConfig(id);
    if (!category) return [];
    return category.defaultTraitIds.map(getTraitConfig).filter((trait): trait is TraitConfig => !!trait);
};

export const getTraitsForCategoryWithOverrides = (
    id: string | null | undefined,
    customConfigs: InlineActionConfigRecord[] = []
): TraitConfig[] => {
    const category = getCategoryConfig(id);
    if (!category) return [];
    const override = findCategoryOverride(category.id, customConfigs);
    const traitIds = override && 'defaultTraitIds' in override && override.defaultTraitIds
        ? override.defaultTraitIds
        : category.defaultTraitIds;
    return traitIds.map(getTraitConfig).filter((trait): trait is TraitConfig => !!trait);
};

export const getCategoryIdForKindLocation = (
    kind: string | null | undefined,
    location: string | null | undefined
): string => {
    if (kind === 'enemy') return 'cat-enemy';
    if (kind === 'neutral') return 'cat-neutral';
    if (kind === 'player' || kind === 'ally') return location === 'none' ? 'cat-ally-remote' : 'cat-ally';
    if (kind === 'npc') return 'cat-npc';
    if (kind === 'room') return 'cat-room';
    if (kind === 'exit') return 'cat-exit';
    if (kind === 'object') {
        if (location === 'carried' || location === 'inventory') return 'cat-inventory-object';
        if (location === 'worn' || location === 'equipment') return 'cat-worn-object';
        return 'cat-room-object';
    }
    if (kind === 'target') return 'cat-target';
    return 'cat-object';
};

export const getKindForCategory = (id: string | null | undefined): EntityKind | null => {
    const canonicalId = toCategoryId(id) || id;
    return (canonicalId ? CATEGORY_KIND_MAP[canonicalId] : undefined) ?? null;
};

export const getTraitsForName = (
    name: string,
    customTraits: InlineActionConfigRecord[] = []
): TraitConfig[] => {
    if (!name) return [];
    const lowerName = name.toLowerCase();
    const defaults = DEFAULT_TRAIT_CONFIGS.filter(trait => trait.keywords.some(keyword => matchesKeyword(lowerName, keyword)));
    const custom = customTraits
        .filter(isTraitConfigRecord)
        .filter(config => ('keywords' in config ? config.keywords || [] : []).some(keyword => matchesKeyword(lowerName, keyword)))
        .map(config => inlineConfigToTrait(config));
    return dedupeTraits([...custom, ...defaults]);
};

export const getResolvedTraitSections = (
    categoryId: string | null | undefined,
    name: string | null | undefined,
    customTraits: InlineActionConfigRecord[] = []
): ResolvedTraitSection[] => {
    const categoryTraits = getTraitsForCategoryWithOverrides(categoryId, customTraits);
    const keywordTraits = name ? getTraitsForName(name, customTraits) : [];
    return dedupeTraits([...categoryTraits, ...keywordTraits]).map(trait => ({
        trait,
        buttonIds: trait.buttonIds
    }));
};

export const getButtonIdsForTraits = (traits: TraitConfig[]): string[] => (
    Array.from(new Set(traits.flatMap(trait => trait.buttonIds)))
);

export const getAllTraits = (customTraits: InlineActionConfigRecord[] = []): TraitConfig[] => {
    const custom = customTraits
        .filter(isTraitConfigRecord)
        .map(config => inlineConfigToTrait(config));
    return dedupeTraits([...DEFAULT_TRAIT_CONFIGS, ...custom])
        .sort((a, b) => a.label.localeCompare(b.label));
};

export const findCategoryOverride = (
    categoryId: string,
    configs: InlineActionConfigRecord[] = []
): InlineActionConfigRecord | undefined => (
    configs.find(config => (
        (toCategoryId(config.id) || config.id) === categoryId &&
        'defaultTraitIds' in config &&
        !!config.defaultTraitIds
    ))
);

/**
 * Resolves the display color for a category or trait, in priority order:
 *   1. Per-category user override stored in inlineCategories
 *   2. Caller-supplied per-kind color (user's global settings: npcColor, objectColor, etc.)
 *   3. Category's own hardcoded default color (e.g. #22c55e for allies)
 */
export const getInlineGlowColor = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    entityColors: EntityColorMap = {},
    theme: LinkedColorTheme = 'dark'
): string | null => {
    const themeColor = (color: string | null | undefined): string | null => toThemeLinkedColor(color, theme);
    if (!id) return null;
    const category = getCategoryConfig(id);
    const trait = getTraitConfig(id);
    const canonicalId = category?.id || trait?.id || toCategoryId(id) || toTraitId(id) || id;

    // 1. Per-category user override
    const override = configs.find(config => {
        const configId = toCategoryId(config.id) || toTraitId(config.id) || config.id;
        return configId === canonicalId && !!toCategoryId(config.id) && 'color' in config && !!config.color;
    });
    if (override && 'color' in override && override.color) return themeColor(override.color);

    if (canonicalId === 'cat-ally' && entityColors.player) return themeColor(entityColors.player);

    // 2. User's global kind-level setting (enemyColor, npcColor, objectColor, etc.)
    const entityKind: EntityKind | undefined = CATEGORY_KIND_MAP[canonicalId] ?? trait?.kind ?? undefined;
    if (entityKind) {
        const kindColor = entityColors[entityKind];
        if (kindColor) return themeColor(kindColor);
    }

    // 3. Category's hardcoded default color
    if (category?.color) return themeColor(category.color);

    return null;
};

/** Thin wrapper around getInlineGlowColor that always returns a string. */
export const getCategoryColorWithOverrides = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    fallback: string,
    entityColors: EntityColorMap = {},
    theme: LinkedColorTheme = 'dark'
): string => getInlineGlowColor(id, configs, entityColors, theme) || (toThemeLinkedColor(fallback, theme) || fallback);

export const upsertCategoryColorOverride = (
    id: string,
    kind: EntityKind,
    color: string,
    configs: InlineCategoryConfig[]
): InlineCategoryConfig[] => {
    const category = getCategoryConfig(id);
    const categoryId = category?.id || toCategoryId(id) || id;
    const existing = configs.find(config => (toCategoryId(config.id) || config.id) === categoryId);
    const override: InlineCategoryConfig = {
        ...(existing || {
            id: category?.id || categoryId,
            kind,
            keywords: []
        }),
        color
    };

    return existing
        ? configs.map(config => config === existing ? override : config)
        : [...configs, override];
};

// --- Legacy Config Bridge ---

export const inlineConfigToTrait = (config: InlineActionConfigRecord): TraitConfig => {
    const customButtonIds = (config as CustomTraitConfig).buttonIds;
    const known = getTraitConfig(config.id);
    if (known) {
        return {
            ...known,
            keywords: 'keywords' in config ? config.keywords || known.keywords : known.keywords,
            buttonIds: customButtonIds || known.buttonIds,
        };
    }

    return {
        id: config.id.startsWith('trait-') ? config.id : `trait-${config.id.replace(/^inline-/, '')}`,
        label: config.id.replace(/^(inline|trait)-/, '').replace(/-/g, ' '),
        buttonIds: customButtonIds || [],
        keywords: 'keywords' in config ? config.keywords || [] : [],
        legacySetIds: 'buttonSetId' in config && config.buttonSetId ? [config.buttonSetId] : [config.id],
        kind: config.kind
    };
};

export const isTraitConfigRecord = (config: InlineActionConfigRecord): boolean => {
    if ('defaultTraitIds' in config && config.defaultTraitIds || toCategoryId(config.id)) return false;
    if (getTraitConfig(config.id) || config.id.startsWith('trait-')) return true;
    const legacyFlags = config as InlineCategoryConfig;
    const keywords = 'keywords' in config ? config.keywords : [];
    return !legacyFlags.isGmcpCategory && !legacyFlags.isLocationCategory && !!(keywords?.length || legacyFlags.buttonSetId);
};

const dedupeTraits = (traits: TraitConfig[]): TraitConfig[] => {
    const seen = new Set<string>();
    return traits.filter(trait => {
        const key = trait.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const matchesKeyword = (lowerName: string, keyword: string): boolean => {
    const lowKey = keyword.toLowerCase();
    const escaped = lowKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(lowerName);
};
