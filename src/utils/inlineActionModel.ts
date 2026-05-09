/**
 * @file inlineActionModel.ts
 * @description Canonical category -> trait -> button model for inline actions.
 */

import { CategoryOverride, CustomTraitConfig, EntityKind, InlineCategoryConfig } from '../types';

// --- Type Definitions ---

export interface CategoryConfig {
    id: string;
    label: string;
    kind: EntityKind;
    defaultTraitIds: string[];
    legacyIds?: string[];
    color?: string;
    isGmcpCategory?: boolean;
    isLocationCategory?: boolean;
}

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
    { id: 'cat-target', label: 'Target', kind: 'none', legacyIds: ['target'], defaultTraitIds: ['trait-target'] },
    { id: 'cat-ally', label: 'Ally', kind: 'player', color: '#22c55e', isGmcpCategory: true, legacyIds: ['inline-ally', 'player', 'ally'], defaultTraitIds: ['trait-group', 'trait-social', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-enemy', label: 'Enemy', kind: 'player', color: '#ef4444', isGmcpCategory: true, legacyIds: ['inline-enemy', 'enemy'], defaultTraitIds: ['trait-combat', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-neutral', label: 'Neutral', kind: 'player', color: '#eab308', isGmcpCategory: true, legacyIds: ['inline-neutral', 'neutral'], defaultTraitIds: ['trait-social', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-ally-remote', label: 'Remote Ally', kind: 'player', color: '#22c55e', isLocationCategory: true, legacyIds: ['inline-ally-remote', 'ally-remote'], defaultTraitIds: ['trait-identify', 'trait-converse'] },
    { id: 'cat-npc', label: 'NPC', kind: 'npc', isGmcpCategory: true, legacyIds: ['inline-npc', 'npc'], defaultTraitIds: ['trait-group', 'trait-combat', 'trait-examine', 'trait-consider'] },
    { id: 'cat-room-object', label: 'Room Object', kind: 'object', isLocationCategory: true, legacyIds: ['inline-in-room-obj', 'object-room', 'obj-room'], defaultTraitIds: ['trait-room-object'] },
    { id: 'cat-inventory-object', label: 'Inventory Object', kind: 'object', isLocationCategory: true, legacyIds: ['inline-inventory', 'inventory', 'obj-char'], defaultTraitIds: ['trait-inventory-object'] },
    { id: 'cat-worn-object', label: 'Worn Object', kind: 'object', isLocationCategory: true, legacyIds: ['inline-worn', 'worn', 'obj-worn'], defaultTraitIds: ['trait-worn-object'] },
    { id: 'cat-object', label: 'Object', kind: 'object', legacyIds: ['inline-object', 'object', 'default'], defaultTraitIds: ['trait-observable'] },
    { id: 'cat-room', label: 'Room', kind: 'room', legacyIds: ['room'], defaultTraitIds: [] },
    { id: 'cat-exit', label: 'Exit', kind: 'exit', legacyIds: ['exit', 'inline-exit'], defaultTraitIds: ['trait-exit'] }
];

export const DEFAULT_TRAIT_CONFIGS: TraitConfig[] = [
    { id: 'trait-target', label: 'Target', legacySetIds: ['target'], keywords: [], buttonIds: ['btn-look', 'btn-examine', 'btn-get', 'btn-hit', 'btn-target-clear'] },
    { id: 'trait-combat', label: 'Combat', legacySetIds: ['inline-enemy', 'inline-default'], keywords: [], buttonIds: ['btn-hit'] },
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
    { id: 'trait-weapon', label: 'Weapon', kind: 'object', legacySetIds: ['inline-weapon'], keywords: ['sword', 'blade', 'dagger', 'axe', 'mace', 'spear', 'staff', 'club', 'flail', 'scimitar', 'rapier', 'halberd', 'bow', 'sling', 'knife', 'wand', 'hammer'], buttonIds: ['btn-weapon-wield', 'btn-inv-sell', 'btn-inv-value', 'btn-inv-mend'] },
    { id: 'trait-room-object', label: 'Room Object', kind: 'object', legacySetIds: ['inline-in-room-obj'], keywords: [], buttonIds: ['btn-get'] },
    { id: 'trait-inventory-object', label: 'Inventory Object', kind: 'object', legacySetIds: ['inline-inventory'], keywords: [], buttonIds: ['btn-inv-drop', 'btn-inv-wear', 'btn-inv-wield', 'btn-inv-sell', 'btn-inv-value', 'btn-inv-give', 'btn-inv-put'] },
    { id: 'trait-worn-object', label: 'Worn Object', kind: 'object', legacySetIds: ['inline-worn'], keywords: [], buttonIds: ['btn-worn-remove', 'btn-worn-examine'] },
    { id: 'trait-observable', label: 'Observable', kind: 'object', legacySetIds: ['inline-object', 'trait-object'], keywords: [], buttonIds: ['btn-obj-examine'] },
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

export const getKindForCategory = (id: string | null | undefined): EntityKind | null => (
    getCategoryConfig(id)?.kind || null
);

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

export const getCategoryColorWithOverrides = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    fallback: string
): string => {
    const category = getCategoryConfig(id);
    const categoryId = category?.id || toCategoryId(id) || id;
    const override = configs.find(config => (
        (toCategoryId(config.id) || config.id) === categoryId &&
        'color' in config &&
        !!config.color
    ));
    return override && 'color' in override && override.color ? override.color : category?.color || fallback;
};

export const getInlineGlowColor = (
    id: string | null | undefined,
    configs: InlineActionConfigRecord[] = [],
    kindColors: { npc?: string, player?: string, object?: string, room?: string } = {}
): string | null => {
    if (!id) return null;
    const category = getCategoryConfig(id);
    const trait = getTraitConfig(id);
    const canonicalId = category?.id || trait?.id || toCategoryId(id) || toTraitId(id) || id;
    const override = configs.find(config => {
        const configId = toCategoryId(config.id) || toTraitId(config.id) || config.id;
        return configId === canonicalId && !!toCategoryId(config.id) && 'color' in config && !!config.color;
    });
    if (override && 'color' in override && override.color) return override.color;

    const kind = category?.kind || trait?.kind || inferKindFromId(canonicalId);
    if (kind === 'player' && kindColors.player) return kindColors.player;
    if (kind === 'npc' && kindColors.npc) return kindColors.npc;
    if (kind === 'object' && kindColors.object) return kindColors.object;
    if (kind === 'room' && kindColors.room) return kindColors.room;

    return category?.color || null;
};

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

const inferKindFromId = (id: string): EntityKind | null => {
    if (['cat-ally', 'cat-enemy', 'cat-neutral', 'cat-ally-remote'].includes(id)) return 'player';
    if (id.includes('npc') || id.includes('shopkeeper') || id.includes('innkeeper') || id.includes('mount') || id.includes('guildmaster')) return 'npc';
    if (id.includes('object') || id.includes('observable') || id.includes('weapon') || id.includes('container') || id.includes('food') || id.includes('corpse')) return 'object';
    if (id.includes('room')) return 'room';
    if (id.includes('exit')) return 'exit';
    return null;
};
