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
    | 'player'   // legacy — prefer 'all' for who-list context
    | 'all'      // who-list / online players
    | 'ally'     // in-room ally character
    | 'enemy'    // in-room enemy character
    | 'neutral'  // in-room neutral character
    | 'object'
    | 'room'
    | 'exit'
    | 'control'  // UI/meta-elements like account buttons or quests
    | 'none';

export interface InlineCategoryConfig {
    id: string;                  // legacy category/trait id; migration accepts inline-*, cat-*, and trait-*
    kind: EntityKind;
    parent?: string;             // canonical ID of parent
    keywords: string[];
    color?: string;              // optional; defaults to kind's color
    defaultTraitIds?: string[];   // migration bridge: category -> trait selections
    categoryType?: EntityKind | 'account' | 'target' | 'quest' | 'none'; // legacy support
    buttonSetId?: string;        // legacy only: old button set alias for saved custom traits
    isGmcpCategory?: boolean;    // if true, driven by GMCP type field — hidden from the trait UI
    isLocationCategory?: boolean; // if true, driven by item location (room/carried/worn) — shown as always-active, non-toggleable
}

export interface CategoryOverride {
    id: string;
    kind?: EntityKind;
    color?: string;
    defaultTraitIds?: string[];
}

export interface CustomTraitConfig {
    id: string;
    kind: EntityKind;
    keywords: string[];
    buttonIds?: string[];
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
