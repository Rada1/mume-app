/**
 * @file buttonHierarchyUtils.ts
 * @description Utilities for resolving button set traits and inheritance.
 */

import { EntityCapability, GameEntity } from '../types/entities';

// --- Trait Mapping Section ---

/**
 * Maps an EntityCapability to the corresponding button setId.
 */
export const CAPABILITY_TO_SET_ID: Record<string, string> = {
    [EntityCapability.Npc]: 'inline-npc',
    [EntityCapability.Player]: 'inline-player',
    [EntityCapability.Ally]: 'inline-player',
    [EntityCapability.Enemy]: 'inline-player',
    [EntityCapability.Neutral]: 'inline-player',
    [EntityCapability.Mount]: 'inline-mounts',
    [EntityCapability.Innkeeper]: 'inline-innkeeper',
    [EntityCapability.Shopkeeper]: 'inline-shopkeeper',
    [EntityCapability.Guildmaster]: 'inline-guildmaster',
    [EntityCapability.Corpse]: 'corpses',
    [EntityCapability.Weapon]: 'object-weapon',
    [EntityCapability.Wearable]: 'object-armour',
    [EntityCapability.Shield]: 'object-shield',
    [EntityCapability.Container]: 'object-container',
    [EntityCapability.FluidContainer]: 'object-fluidcontainer',
    [EntityCapability.Food]: 'object-food',
    [EntityCapability.Light]: 'object-lightsource',
    [EntityCapability.Readable]: 'object-readable',
};

export const TRAIT_WEIGHTS: Record<string, number> = {
    'inline-innkeeper': 100,
    'inline-shopkeeper': 100,
    'inline-guildmaster': 100,
    'inline-mounts': 80,
    'inline-player': 60,
    'inline-npc': 50,
    'object-weapon': 40,
    'object-armour': 40,
    'object-container': 30,
    'object': 10, // Base level
};

/**
 * Human-readable labels for button sets.
 */
export const SET_DISPLAY_LABELS: Record<string, string> = {
    'inline-innkeeper': 'Innkeeper',
    'inline-shopkeeper': 'Shopkeeper',
    'inline-guildmaster': 'Guildmaster',
    'inline-mounts': 'Mount',
    'inline-player': 'Player',
    'inline-npc': 'NPC',
    'object-weapon': 'Weapon',
    'object-armour': 'Armour',
    'object-container': 'Container',
    'object-fluidcontainer': 'Container',
    'object-food': 'Food',
    'object-lightsource': 'Light',
    'object-readable': 'Reading',
    'corpses': 'Corpse',
    'object': 'General',
};

/**
 * Resolves all relevant button set IDs for an entity based on its traits.
 */
export const getRelevantSets = (entity: GameEntity, extraSets: string[] = []): string[] => {
    const sets = new Set<string>(extraSets);
    
    // 1. Every interactive entity gets the 'object' base set
    if (entity.kind !== 'exit' && entity.kind !== 'control') {
        sets.add('object');
    }

    // 2. Add sets based on capabilities
    entity.capabilities?.forEach(cap => {
        const setId = CAPABILITY_TO_SET_ID[cap];
        if (setId) sets.add(setId);
    });

    // 3. Add base kind-based sets as fallback
    if (entity.kind === 'npc') sets.add('inline-npc');
    if (entity.kind === 'player') sets.add('inline-player');
    if (entity.kind === 'object') sets.add('object');

    return Array.from(sets);
};

// --- Legacy Support (To be removed after full refactor) ---
export const getHierarchyChain = (kind: string, location: string, setId?: string): string[] => {
    const sets = new Set<string>();
    if (kind === 'npc') sets.add('inline-npc');
    if (kind === 'player') sets.add('inline-player');
    if (kind === 'object' || kind === 'item') sets.add('object');
    if (setId) sets.add(setId);
    return Array.from(sets);
};

export const LOCATION_SETS: Record<string, string> = {
    'room': 'location-room',
    'carried': 'location-carried',
    'worn': 'location-worn',
    'shop': 'location-shop'
};
