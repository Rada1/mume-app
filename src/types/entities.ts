/**
 * @file entities.ts
 * @description NPC, Player, and Item registry definitions.
 */

/** Entity location axis for action filtering and button classification. */
export type EntityLocation = 
    | 'room'      // Present in the current room
    | 'carried'   // In inventory
    | 'worn'      // Equipped
    | 'shop'      // In a shop listing
    | 'none';     // UI controls/meta-actions with no world location

/** Entity kind axis. */
export type EntityKind = 
    | 'npc' 
    | 'player' 
    | 'object' 
    | 'room'
    | 'exit' 
    | 'control'  // UI/meta-elements like account buttons or quests
    | 'none';

export interface InlineCategoryConfig {
    id: string;                  // canonical, always starts 'inline-'
    kind: EntityKind;
    parent?: string;             // canonical ID of parent
    keywords: string[];
    color?: string;              // optional; defaults to kind's color
    categoryType?: EntityKind | 'account' | 'target' | 'quest' | 'none'; // legacy support
    buttonSetId?: string;        // The button set (menu) to display for this trait
}

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
    Ally = 'ally',
    Enemy = 'enemy',
    Neutral = 'neutral',
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
    kind?: EntityKind;
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
