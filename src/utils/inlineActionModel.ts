/**
 * @file inlineActionModel.ts
 * @description Canonical category -> trait -> button model for inline actions.
 */

import { CategoryOverride, CustomButton, CustomTraitConfig, EntityKind, InlineCategoryConfig } from '../types';
import { DEFAULT_CATEGORY_CONFIGS, DEFAULT_TRAIT_CONFIGS } from './inlineActionDefaults';
import { matchesKeyword } from './inlineKeywordMatching';
export { matchesKeyword } from './inlineKeywordMatching';

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
    'cat-mount-object':      'object',
    'cat-ally':             'ally',
    'cat-enemy':            'enemy',
    'cat-neutral':          'neutral',
    'cat-ally-remote':      'ally',
    'cat-npc':              'npc',
    'cat-mount':            'npc',
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
    excludedKeywords?: string[];
    legacySetIds?: string[];
    kind?: EntityKind;
    requirement?: CustomButton['requirement'];
    /** If set, keyword matching only applies when the entity's category is in this list. */
    categoryIds?: string[];
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
const PRIORITY_ACTION_TRAIT_IDS = ['trait-examine', 'trait-consider'] as const;
const PRIORITY_ACTION_TRAIT_ID_SET = new Set<string>(PRIORITY_ACTION_TRAIT_IDS);

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
    if (kind === 'mount') return 'cat-mount';
    if (kind === 'room') return 'cat-room';
    if (kind === 'exit') return 'cat-exit';
    if (kind === 'object') {
        if (location === 'carried' || location === 'inventory') return 'cat-inventory-object';
        if (location === 'worn' || location === 'equipment') return 'cat-worn-object';
        return 'cat-room-object';
    }
    return 'cat-object';
};

export const getKindForCategory = (id: string | null | undefined): EntityKind | null => {
    const canonicalId = toCategoryId(id) || id;
    return (canonicalId ? CATEGORY_KIND_MAP[canonicalId] : undefined) ?? null;
};

// Defaults depend only on the name. Apply live custom overrides/exclusions afterward.
const defaultNameMatches = new Map<string, TraitConfig[]>();
const getDefaultTraitsForName = (name: string): TraitConfig[] => {
    let matches = defaultNameMatches.get(name);
    if (!matches) {
        matches = DEFAULT_TRAIT_CONFIGS.filter(trait => trait.keywords.some(keyword => matchesKeyword(name, keyword)));
        if (defaultNameMatches.size >= 512) defaultNameMatches.delete(defaultNameMatches.keys().next().value!);
        defaultNameMatches.set(name, matches);
    }
    return matches;
};

export const getTraitsForName = (
    name: string,
    customTraits: InlineActionConfigRecord[] = []
): TraitConfig[] => {
    if (!name) return [];
    const lowerName = name.toLowerCase();
    const custom = customTraits
        .filter(isTraitConfigRecord)
        .map(config => inlineConfigToTrait(config));
    const overriddenTraitIds = new Set(custom.map(trait => trait.id));
    const matchingCustom = custom.filter(trait => trait.keywords.some(keyword => matchesKeyword(lowerName, keyword)));
    const matchingDefaults = getDefaultTraitsForName(lowerName).filter(trait => !overriddenTraitIds.has(trait.id));
    const excludedTraitIds = getExcludedTraitIdsForName(lowerName, customTraits);
    return dedupeTraits([...matchingCustom, ...matchingDefaults]).filter(trait => !excludedTraitIds.has(trait.id));
};

const getExcludedTraitIdsForName = (lowerName: string, customTraits: InlineActionConfigRecord[]): Set<string> => new Set(
    customTraits
        .filter(isTraitConfigRecord)
        .filter(config => ('excludedKeywords' in config ? config.excludedKeywords || [] : []).some(keyword => matchesKeyword(lowerName, keyword)))
        .map(config => toTraitId(config.id) || config.id)
);

export const getResolvedTraitSections = (
    categoryId: string | null | undefined,
    name: string | null | undefined,
    customTraits: InlineActionConfigRecord[] = []
): ResolvedTraitSection[] => {
    const excludedTraitIds = name ? getExcludedTraitIdsForName(name.toLowerCase(), customTraits) : new Set<string>();
    const categoryTraits = getTraitsForCategoryWithOverrides(categoryId, customTraits)
        .filter(trait => !excludedTraitIds.has(trait.id));
    const isMountObject = toCategoryId(categoryId) === 'cat-mount-object';
    const keywordTraits = (name ? getTraitsForName(name, customTraits) : [])
        .filter(trait => !trait.categoryIds || (categoryId != null && trait.categoryIds.includes(categoryId)))
        .filter(trait => !isMountObject || trait.id === 'trait-saddle');
    const isMountedSaddle = isMountObject && keywordTraits.some(trait => trait.id === 'trait-saddle');
    const resolvedTraits = dedupeTraits([...categoryTraits, ...keywordTraits])
        .filter(trait => !isMountedSaddle || trait.id !== 'trait-mount-object');
    // Keep the most common inspection actions first, including for custom category orders.
    const orderedTraits = [
        ...PRIORITY_ACTION_TRAIT_IDS.flatMap(id => resolvedTraits.filter(trait => trait.id === id)),
        ...resolvedTraits.filter(trait => !PRIORITY_ACTION_TRAIT_ID_SET.has(trait.id))
    ];
    return orderedTraits.map(trait => ({
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

export { getCategoryColorWithOverrides, getInlineGlowColor, upsertCategoryColorOverride } from './inlineActionColors';

// --- Legacy Config Bridge ---

export const inlineConfigToTrait = (config: InlineActionConfigRecord): TraitConfig => {
    const customButtonIds = (config as CustomTraitConfig).buttonIds;
    const known = getTraitConfig(config.id);
    if (known) {
        const explicitKeywords = 'keywords' in config && (config.keywords || []).length > 0;
        return {
            ...known,
            keywords: 'keywords' in config ? config.keywords || known.keywords : known.keywords,
            excludedKeywords: 'excludedKeywords' in config ? config.excludedKeywords || [] : [],
            buttonIds: (customButtonIds || known.buttonIds).filter(buttonId => (
                known.id !== 'trait-container' || buttonId !== 'btn-container-get-all'
            )),
            categoryIds: explicitKeywords ? undefined : known.categoryIds,
        };
    }

    return {
        id: config.id.startsWith('trait-') ? config.id : `trait-${config.id.replace(/^inline-/, '')}`,
        label: config.id.replace(/^(inline|trait)-/, '').replace(/-/g, ' '),
        buttonIds: customButtonIds || [],
        keywords: 'keywords' in config ? config.keywords || [] : [],
        excludedKeywords: 'excludedKeywords' in config ? config.excludedKeywords || [] : [],
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

export const toggleTraitKeywords = (keywords: string[], name: string, isActive: boolean): string[] => {
    const lowerName = name.toLowerCase();
    if (isActive) return keywords.filter(keyword => !matchesKeyword(lowerName, keyword));
    if (keywords.some(keyword => matchesKeyword(lowerName, keyword))) return keywords;
    return [...keywords, lowerName];
};
