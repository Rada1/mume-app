/**
 * @file inlineActionModel.ts
 * @description Canonical category -> trait -> button model for inline actions.
 */

import { CategoryOverride, CustomTraitConfig, EntityKind, InlineCategoryConfig } from '../types';

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
}

export interface ResolvedTraitSection {
    trait: TraitConfig;
    buttonIds: string[];
}

export type InlineActionConfigRecord = InlineCategoryConfig | CategoryOverride | CustomTraitConfig;

// --- Default Model ---

export const DEFAULT_CATEGORY_CONFIGS: CategoryConfig[] = [
    { id: 'cat-target',           label: 'Target',           color: '#facc15',                   legacyIds: ['target'],                                    defaultTraitIds: ['trait-target'] },
    { id: 'cat-ally',             label: 'Ally',             color: '#22c55e', isGmcpCategory: true,     legacyIds: ['inline-ally', 'player', 'ally'],             defaultTraitIds: ['trait-group', 'trait-social', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-enemy',            label: 'Enemy',            color: '#ef4444', isGmcpCategory: true,     legacyIds: ['inline-enemy', 'enemy'],                     defaultTraitIds: ['trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-neutral',          label: 'Neutral',          color: '#eab308', isGmcpCategory: true,     legacyIds: ['inline-neutral', 'neutral'],                 defaultTraitIds: ['trait-social', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-ally-remote',      label: 'Remote Ally',      color: '#22c55e', isLocationCategory: true, legacyIds: ['inline-ally-remote', 'ally-remote'],         defaultTraitIds: ['trait-identify', 'trait-converse'] },
    { id: 'cat-npc',              label: 'NPC',                                isGmcpCategory: true,     legacyIds: ['inline-npc', 'npc'],                         defaultTraitIds: ['trait-group', 'trait-examine', 'trait-consider'] },
    { id: 'cat-room-object',      label: 'Room Object',                        isLocationCategory: true, legacyIds: ['inline-in-room-obj', 'object-room', 'obj-room'], defaultTraitIds: ['trait-room-object'] },
    { id: 'cat-inventory-object', label: 'Inventory Object',                   isLocationCategory: true, legacyIds: ['inline-inventory', 'inventory', 'obj-char'], defaultTraitIds: ['trait-inventory-object'] },
    { id: 'cat-worn-object',      label: 'Worn Object',                        isLocationCategory: true, legacyIds: ['inline-worn', 'worn', 'obj-worn'],           defaultTraitIds: ['trait-worn-object'] },
    { id: 'cat-object',           label: 'Object',                                                       legacyIds: ['inline-object', 'object', 'default'],        defaultTraitIds: ['trait-observable'] },
    { id: 'cat-room',             label: 'Room Name',                                                     legacyIds: ['room', 'roomname', 'room-name'],             defaultTraitIds: ['trait-watchtower', 'trait-campable'] },
    { id: 'cat-exit',             label: 'Exit',                                                          legacyIds: ['exit', 'inline-exit'],                       defaultTraitIds: ['trait-exit'] },
];

export const DEFAULT_TRAIT_CONFIGS: TraitConfig[] = [
    { id: 'trait-target', label: 'Target', legacySetIds: ['target'], keywords: [], buttonIds: ['btn-look', 'btn-examine', 'btn-get', 'btn-hit', 'btn-target-clear'] },
    { id: 'trait-consider', label: 'Consider', legacySetIds: ['inline-ally'], keywords: [], buttonIds: ['btn-consider'] },
    { id: 'trait-examine', label: 'Examine', legacySetIds: ['inline-ally', 'inline-object'], keywords: [], buttonIds: ['btn-examine', 'btn-obj-examine'] },
    { id: 'trait-identify', label: 'Identify', legacySetIds: ['inline-ally'], keywords: [], buttonIds: ['btn-whois'] },
    { id: 'trait-social', label: 'Social', legacySetIds: ['inline-neutral', 'inline-ally'], keywords: [], buttonIds: ['btn-social', 'btn-converse'] },
    { id: 'trait-converse', label: 'Converse', legacySetIds: ['inline-ally-remote'], keywords: [], buttonIds: ['btn-converse'] },
    { id: 'trait-group', label: 'Group', legacySetIds: ['inline-ally', 'inline-npc'], keywords: [], buttonIds: ['btn-group', 'btn-follow'] },
    { id: 'trait-shopkeeper', label: 'Shopkeeper', kind: 'npc', legacySetIds: ['inline-shopkeeper'], keywords: ['shopkeeper', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer', 'smith', 'trader', 'grocer', 'librarian', 'provisioner', 'alchemist', 'herbalist', 'tailor', 'blacksmith', 'vendor', 'cobbler', 'peddler'], buttonIds: ['btn-shopkeeper-shop'] },
    { id: 'trait-innkeeper', label: 'Innkeeper', kind: 'npc', legacySetIds: ['inline-innkeeper'], keywords: ['innkeeper', 'barman', 'tender', 'lodging'], buttonIds: ['btn-innkeeper-offer', 'btn-innkeeper-rent'] },
    { id: 'trait-mount', label: 'Mount', kind: 'npc', legacySetIds: ['inline-mounts'], keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg'], buttonIds: ['btn-mount-ride', 'btn-mount-lead', 'btn-mount-saddle', 'btn-mount-unsaddle', 'btn-mount-unsaddle-all', 'btn-mount-abandon'] },
    { id: 'trait-guildmaster', label: 'Guildmaster', kind: 'npc', legacySetIds: ['inline-guildmaster'], keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], buttonIds: ['btn-guildmaster-practice'] },
    { id: 'trait-corpse', label: 'Corpse', kind: 'object', legacySetIds: ['inline-corpses'], keywords: ['corpse'], buttonIds: ['btn-corpse-butcher', 'btn-corpse-drag', 'btn-corpse-scalp'] },
    { id: 'trait-container', label: 'Container', kind: 'object', legacySetIds: ['inline-containers'], keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box', 'case', 'wallet', 'crate', 'cabinet', 'bookshelf', 'jar'], buttonIds: ['btn-container-look-in', 'btn-container-open', 'btn-container-close', 'btn-container-get-all'] },
    { id: 'trait-food', label: 'Food', kind: 'object', legacySetIds: ['inline-food'], keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer', 'cookie', 'eg', 'dumpling', 'bannock', 'cheese', 'pastry', 'flour', 'cake', 'pie'], buttonIds: ['btn-food-eat'] },
    { id: 'trait-water', label: 'Water', kind: 'object', legacySetIds: ['inline-water'], keywords: ['water', 'fountain', 'pond', 'stream', 'well', 'spring', 'lake', 'river', 'sea', 'ocean', 'puddle', 'basin'], buttonIds: ['btn-water-drink'] },
    { id: 'trait-fluid-container', label: 'Fluid Container', kind: 'object', legacySetIds: ['inline-fluidcontainer'], keywords: ['flask', 'bottle', 'cup', 'skin', 'flagon', 'goblet', 'vial', 'keg', 'barrel', 'waterskin', 'pitcher', 'jug', 'mug', 'stein', 'pot', 'bowl', 'bucket', 'pail', 'calabash', 'gourd'], buttonIds: ['btn-fluid-drink', 'btn-fluid-pour', 'btn-fluid-empty', 'btn-fluid-look-in'] },
    { id: 'trait-weapon', label: 'Wieldable', kind: 'object', legacySetIds: ['inline-weapon'], keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'knife', 'wand', 'hammer'], buttonIds: ['btn-weapon-wield'] },
    { id: 'trait-room-object', label: 'Room Object', kind: 'object', legacySetIds: ['inline-in-room-obj'], keywords: [], buttonIds: ['btn-get'] },
    { id: 'trait-inventory-object', label: 'Inventory Object', kind: 'object', legacySetIds: ['inline-inventory'], keywords: [], buttonIds: ['btn-inv-drop', 'btn-inv-wear', 'btn-inv-give', 'btn-inv-put'] },
    { id: 'trait-worn-object', label: 'Worn Object', kind: 'object', legacySetIds: ['inline-worn'], keywords: [], buttonIds: ['btn-worn-remove'] },
    { id: 'trait-observable', label: 'Observable', kind: 'object', legacySetIds: ['inline-object', 'trait-object'], keywords: [], buttonIds: ['btn-obj-examine'] },
    { id: 'trait-whetstone', label: 'Whetstone', kind: 'object', keywords: ['a stone'], buttonIds: ['btn-whet'] },
    { id: 'trait-reciteable', label: 'Reciteable', kind: 'object', keywords: ['scroll'], buttonIds: ['btn-recite'] },
    { id: 'trait-drawable', label: 'Drawable', kind: 'object', keywords: ['bow', 'crossbow', 'scabbard', 'sheath', 'harness'], buttonIds: ['btn-draw'] },
    { id: 'trait-coverable', label: 'Coverable', kind: 'object', legacySetIds: ['inline-lightsource'], keywords: ['lantern', 'lamp', 'torch', 'lightsource', 'globe'], buttonIds: ['btn-lightsource-cover', 'btn-lightsource-uncover'] },
    { id: 'trait-watchtower', label: 'Watch Tower', kind: 'room', keywords: ['watch tower', 'watchtower', 'tower'], buttonIds: ['btn-watch'] },
    { id: 'trait-campable', label: 'Campable', kind: 'room', keywords: ['camp', 'clearing', 'campsite', 'forest', 'garden'], buttonIds: ['btn-camp'] },
    { id: 'trait-exit', label: 'Exit', kind: 'exit', legacySetIds: ['inline-exit'], keywords: ['north', 'south', 'east', 'west', 'up', 'down'], buttonIds: ['btn-exit-go', 'btn-look'] }
];

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
    entityColors: EntityColorMap = {}
): string | null => {
    if (!id) return null;
    const category = getCategoryConfig(id);
    const trait = getTraitConfig(id);
    const canonicalId = category?.id || trait?.id || toCategoryId(id) || toTraitId(id) || id;

    // 1. Per-category user override
    const override = configs.find(config => {
        const configId = toCategoryId(config.id) || toTraitId(config.id) || config.id;
        return configId === canonicalId && !!toCategoryId(config.id) && 'color' in config && !!config.color;
    });
    if (override && 'color' in override && override.color) return override.color;

    if (canonicalId === 'cat-ally' && entityColors.player) return entityColors.player;

    // 2. User's global kind-level setting (enemyColor, npcColor, objectColor, etc.)
    const entityKind: EntityKind | undefined = CATEGORY_KIND_MAP[canonicalId] ?? trait?.kind ?? undefined;
    if (entityKind) {
        const kindColor = entityColors[entityKind];
        if (kindColor) return kindColor;
    }

    // 3. Category's hardcoded default color
    if (category?.color) return category.color;

    return null;
};

/** Thin wrapper around getInlineGlowColor that always returns a string. */
export const getCategoryColorWithOverrides = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    fallback: string,
    entityColors: EntityColorMap = {}
): string => getInlineGlowColor(id, configs, entityColors) || fallback;

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
