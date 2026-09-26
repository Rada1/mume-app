/**
 * @file MapFilterCategories.ts
 * @description Category definitions and helper functions for Map room filtering.
 */

export type CategoryId = 'mounts' | 'shops' | 'guilds' | 'travel' | 'resources' | 'services' | 'danger' | 'mobs' | 'quests';

export interface SubFlag {
    id: string;
    label: string;
}

export interface Category {
    id: CategoryId;
    label: string;
    symbol: string;
    subFlags: SubFlag[];
}

export const CATEGORIES: Category[] = [
    {
        id: 'mounts', label: 'Mounts', symbol: '♘',
        subFlags: [
            { id: 'HORSE', label: 'Horse' },
            { id: 'MULE', label: 'Mule' },
            { id: 'PACK_HORSE', label: 'Pack Horse' },
            { id: 'WARG', label: 'Warg' },
            { id: 'STABLE', label: 'Stable' },
        ]
    },
    {
        id: 'shops', label: 'Shops', symbol: '$',
        subFlags: [
            { id: 'SHOP', label: 'General' },
            { id: 'WEAPON_SHOP', label: 'Weapon' },
            { id: 'ARMOUR_SHOP', label: 'Armour' },
            { id: 'FOOD_SHOP', label: 'Food' },
            { id: 'PET_SHOP', label: 'Pet' },
        ]
    },
    {
        id: 'guilds', label: 'Guilds', symbol: 'G',
        subFlags: [
            { id: 'GUILD', label: 'General' },
            { id: 'WARRIOR_GUILD', label: 'Warrior' },
            { id: 'CLERIC_GUILD', label: 'Cleric' },
            { id: 'RANGER_GUILD', label: 'Ranger' },
            { id: 'MAGE_GUILD', label: 'Mage' },
            { id: 'SCOUT_GUILD', label: 'Scout' },
        ]
    },
    {
        id: 'travel', label: 'Travel', symbol: 'T',
        subFlags: [
            { id: 'BOAT', label: 'Boat' },
            { id: 'FERRY', label: 'Ferry' },
            { id: 'COACH', label: 'Coach' },
        ]
    },
    {
        id: 'resources', label: 'Herbs', symbol: '♣',
        subFlags: [
            { id: 'HERB', label: 'Herb' },
            { id: 'WATER', label: 'Water' },
            { id: 'FOOD', label: 'Food' },
        ]
    },
    {
        id: 'services', label: 'Services', symbol: 'R',
        subFlags: [
            { id: 'RENT', label: 'Inn' },
            { id: 'MAIL', label: 'Mail' },
        ]
    },
    {
        id: 'danger', label: 'Danger', symbol: '!',
        subFlags: [
            { id: 'DEATHTRAP', label: 'Deathtrap' },
        ]
    },
    {
        id: 'mobs', label: 'Enemies', symbol: 'X',
        subFlags: [
            { id: 'AGGRESSIVE_MOB', label: 'Aggressive' },
            { id: 'ELITE_MOB', label: 'Elite' },
            { id: 'SUPER_MOB', label: 'Supermob' },
        ]
    },
    {
        id: 'quests', label: 'Quests', symbol: '?',
        subFlags: [
            { id: 'QUEST_MOB', label: 'Quest Mobs' },
        ]
    },
];

export const getCategoryForFilter = (filter: string | null): CategoryId | null => {
    if (!filter) return null;
    for (const cat of CATEGORIES) {
        if (cat.id === filter) return cat.id;
        if (cat.subFlags.some(sf => sf.id === filter)) return cat.id;
    }
    return null;
};

export const getLabelForFilter = (filter: string | null): string | null => {
    if (!filter) return null;
    for (const cat of CATEGORIES) {
        if (cat.id === filter) return cat.label;
        const sf = cat.subFlags.find(f => f.id === filter);
        if (sf) return sf.label;
    }
    return null;
};
