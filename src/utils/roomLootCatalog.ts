/** @file roomLootCatalog.ts — Matches visible room objects against supplied MUME item lists. */
import { ROOM_LOOT_ARMOR_NAMES } from '../data/roomLootArmorCatalog';
import { ROOM_LOOT_HERB_NAMES } from '../data/roomLootHerbCatalog';
import { ROOM_LOOT_MISC_NAMES_A } from '../data/roomLootMiscCatalogA';
import { ROOM_LOOT_MISC_NAMES_B } from '../data/roomLootMiscCatalogB';
import { ROOM_LOOT_WEAPON_NAMES } from '../data/roomLootWeaponCatalog';

// --- Logic Section ---
const normalizeName = (name: string): string => name
    .replace(/<[^>]*>/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/^(?:a|an|the|some)\s+/i, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const catalogNames = [
    ...ROOM_LOOT_ARMOR_NAMES,
    ...ROOM_LOOT_HERB_NAMES,
    ...ROOM_LOOT_MISC_NAMES_A,
    ...ROOM_LOOT_MISC_NAMES_B,
    ...ROOM_LOOT_WEAPON_NAMES
];

const normalizedCatalog = new Set(catalogNames.map(normalizeName).filter(Boolean));

const getKnownNameVariants = (normalized: string): string[] => {
    const variants = [normalized];
    const removablePrefixes = [
        'pair of ',
        'small pile of ',
        'pile of ',
        'handful of ',
        'piece of '
    ];
    removablePrefixes.forEach(prefix => {
        if (normalized.startsWith(prefix)) variants.push(normalized.slice(prefix.length));
    });
    return variants;
};

/** True only when the described room object closely matches a supplied item name. */
export const isLikelyLootableRoomItem = (label: string): boolean => {
    const normalized = normalizeName(label);
    return normalized.length > 0 && getKnownNameVariants(normalized)
        .some(variant => normalizedCatalog.has(variant));
};
