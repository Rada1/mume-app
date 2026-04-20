/**
 * @file entities.ts
 * @description NPC, Player, and Item registry definitions.
 */

export type EntityLocation = 'room' | 'inv' | 'eq' | string;

export enum EntityCapability {
    Wearable = 'wearable',
    Weapon = 'weapon',
    Blade = 'blade',
    Blunt = 'blunt',
    Axe = 'axe',
    Spear = 'spear',
    Staff = 'staff',
    Container = 'container',
    DrinkContainer = 'drink',
    Food = 'food',
    Readable = 'readable',
    Light = 'light',
    Shield = 'shield',
    FluidContainer = 'fluid',
    Npc = 'npc',
    Player = 'player',
    Mount = 'mount',
    Innkeeper = 'innkeeper',
    Shopkeeper = 'shopkeeper',
    Guildmaster = 'guildmaster',
    Corpse = 'corpse',
    Exit = 'exit'
}

export interface GameEntity {
    id: string;
    originalId?: string; // If it's a proxy from GMCP Room.Occupants
    name: string;
    category?: string;
    level?: number;
    noun: string;
    location: EntityLocation;
    parentId?: string;
    capabilities: EntityCapability[];
    weight?: number;
    value?: number;
    vnum?: number;
    shortDesc?: string;
    longDesc?: string;
}

export interface WhereEntry { 
    name: string; 
    room: string; 
}
