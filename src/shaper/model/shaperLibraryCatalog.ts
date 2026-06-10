/**
 * @file shaperLibraryCatalog.ts
 * @description Installable /lib behaviour catalog, sourced from
 *              docs/lib_commands_reference.md, grouped by target type.
 */

import type { ShaperLibraryTargetType } from './shaperTypes';

// --- Types Section ---
export interface ShaperLibraryCatalogEntry {
    name: string;
    description: string;
    // Libraries the help text marks as restricted, experimental, or CPU-intensive.
    supervisorReview?: boolean;
}

// --- Catalog Section ---
const roomLibraries: ShaperLibraryCatalogEntry[] = [
    { name: 'alignment', description: 'Set the alignment of a room.' },
    { name: 'block', description: 'Makes mobs in the room block an exit.' },
    { name: 'caradhras', description: 'For usage on Redhorn Pass.', supervisorReview: true },
    { name: 'city-defense', description: 'Makes room a city defense central.', supervisorReview: true },
    { name: 'coords', description: 'Set room coordinates.' },
    { name: 'damage-exit', description: 'Makes exits inflict damage.' },
    { name: 'death-reason', description: 'Set death reason for deathtraps.' },
    { name: 'embed-gem', description: 'Embeds an item with a gem.' },
    { name: 'fall', description: 'Makes people fall if they enter.' },
    { name: 'fishable', description: 'Allows players to fish in this room.' },
    { name: 'fog', description: 'Override the fog level in a room.' },
    { name: 'generic-key', description: 'Set dressup ID on a generic key loaded via /com.' },
    { name: 'heavy-door', description: 'Makes a door hard to open/close.' },
    { name: 'hide-exits', description: 'Hide exits in a room.' },
    { name: 'holdable-door', description: 'Allows creating a door that can be held open.' },
    { name: 'justice', description: 'Handles justice in town.', supervisorReview: true },
    { name: 'legendhome-door', description: 'Legendhome doors - V+ use only.', supervisorReview: true },
    { name: 'legendhome-mob', description: 'Customize legendhome mobiles.', supervisorReview: true },
    { name: 'mine', description: 'Allows players to mine for ore.' },
    { name: 'mob-barrier', description: 'Sets a mob-barrier.' },
    { name: 'mobtrap-room', description: 'Protects players from reconnecting in a mobtrap.' },
    { name: 'move-dropped', description: 'Dropped stuff falls into another room.' },
    { name: 'no-camp', description: 'Prevents camping or burning corpses in this room.' },
    { name: 'no-drink-pour', description: 'Prevents drinking/pouring of water from the room.' },
    { name: 'no-lead-mount', description: 'Prevents leading mounts through exit.' },
    { name: 'no-ride', description: 'Makes exits unrideable.' },
    { name: 'no-scout', description: 'Makes a direction impossible to scout.' },
    { name: 'no-scout-from-room', description: 'Cannot scout in any direction.' },
    { name: 'no-track', description: 'Prevent people from tracking in a room.' },
    { name: 'note', description: 'Initialize notes loaded in room.' },
    { name: 'partial-reset', description: 'Selectively avoid zone resets.' },
    { name: 'petshop', description: 'Installs a pet shop in the room.' },
    { name: 'poisonroom', description: 'Poison people as they enter/leave a room.' },
    { name: 'qtoken', description: 'Set qname on a qtoken loaded via /com.' },
    { name: 'random-movement', description: 'Makes all exits random; no group splitting.' },
    { name: 'redress-corpse', description: 'Replace descriptions of a corpse loading here.' },
    { name: 'redress-mob', description: 'Replace descriptions of a mobile loading here.' },
    { name: 'redress-obj', description: 'Replace descriptions of an object loading here.' },
    { name: 'room-echo', description: 'Makes a room send echoes now and then.' },
    { name: 'room-water', description: 'Customize message drinking in water-flagged rooms.' },
    { name: 'shake-tree', description: 'Makes a tree shake-able in the room.' },
    { name: 'sign', description: 'Place a language-specific sign in the room.' },
    { name: 'slope', description: 'Make a room slope in a certain direction.' },
    { name: 'special-door', description: 'Special messages and door delay.' },
    { name: 'stable', description: 'Makes the room a stable.' },
    { name: 'stringdata', description: 'Add string data to something.' },
    { name: 'temperature', description: 'Set or modify temperature on a room.' },
    { name: 'thorns', description: 'Makes exits take time to open and cause damage.' },
    { name: 'treasure-guard', description: 'Makes mobs block an item from being taken.' },
    { name: 'treasure-room', description: 'Protects treasure room from cheaters.' },
    { name: 'underwater-entrance', description: 'Entrance room to underwater.' },
    { name: 'underwater-room', description: 'Makes the room underwater.' },
    { name: 'warrens-alarmer', description: 'Special use - do not install.', supervisorReview: true },
    { name: 'watch-tower', description: 'Makes the room a watchtower.' },
    { name: 'watched-room', description: 'Makes exits from a room seeable from a watch-tower.' },
    { name: 'weight-based-fall', description: 'Fall to another room if too many people.' }
];

const mobileLibraries: ShaperLibraryCatalogEntry[] = [
    { name: 'actor', description: 'Makes a mobile "act" now and then.' },
    { name: 'aggressive', description: 'Be aggressive.' },
    { name: 'amnesia', description: 'Forget attackers.' },
    { name: 'archer', description: 'Makes the mobile fight with a missile weapon.' },
    { name: 'assist-mode', description: 'Sets mobs a mobile shall assist and/or rescue.' },
    { name: 'attack-mode', description: 'Specifies switching and special attacks.' },
    { name: 'citizen', description: 'Makes mobile a citizen.' },
    { name: 'cityguard', description: 'Makes mobile a cityguard.' },
    { name: 'converse', description: 'Answer spoken messages.' },
    { name: 'diurnal', description: 'Makes a mob diurnal.' },
    { name: 'elven-cityguard', description: 'Mob will attack and hunt evil people.' },
    { name: 'flee-at-low-hps', description: 'Flee when hps fall below x%.' },
    { name: 'flee-on-entry', description: 'Flee when players enter room.' },
    { name: 'flee-when-hit', description: 'Flee before being hit. Use sparingly.' },
    { name: 'free-prisoners', description: 'Experimental. V+ approval required.', supervisorReview: true },
    { name: 'group', description: 'Sets a number of mobs that a mobile shall group.' },
    { name: 'hard-to-blind', description: 'Multiple successful spells required to blind.' },
    { name: 'homesick', description: 'Experimental /lib, do not use!', supervisorReview: true },
    { name: 'hunt', description: 'Hunt players.' },
    { name: 'hunt-on-sight', description: 'Make the mobile hunt on sight.' },
    { name: 'hunter', description: 'Make the mobile hunt its victims.' },
    { name: 'justice-secretary', description: 'Act as justice secretary in complain room.' },
    { name: 'lamp-holder', description: 'Hold/remove lantern at nightfall/dawn.' },
    { name: 'legendhome-keyholder', description: 'Gives legendhome keys - Aratar use only.', supervisorReview: true },
    { name: 'looter', description: 'Makes this mobile try to loot things.' },
    { name: 'mended-equipment', description: 'Mend inventory at creation.' },
    { name: 'milk', description: 'Mobile will be milkable.' },
    { name: 'nice-thief', description: 'Be nice to thieves.' },
    { name: 'no-bash', description: 'Makes a mobile unbashable.' },
    { name: 'no-blind', description: 'Prevent people from blinding this mobile.' },
    { name: 'no-flee', description: 'Prevent people from making this mobile flee.' },
    { name: 'no-give', description: 'Do not accept gifts.' },
    { name: 'no-rescue', description: 'Prevents people from rescuing this mobile.' },
    { name: 'no-sleep', description: 'Prevent people from sleeping this mobile.' },
    { name: 'nocturnal', description: 'Makes a mob nocturnal.' },
    { name: 'poison', description: 'Afflict enemies with poison or a disease.' },
    { name: 'rescue-mode', description: 'Sets a number of mobs that a mobile shall rescue.' },
    { name: 'scavenger', description: 'Scavenge objects.' },
    { name: 'scout', description: 'Makes mob yell about other races.' },
    { name: 'script', description: 'You must get V+ approval to use this library.', supervisorReview: true },
    { name: 'searchmob', description: 'Make a mob do a periodic search (find hidden).' },
    { name: 'sentimental', description: 'React to other mobs being attacked or killed.' },
    { name: 'sentinel', description: 'Prevent random movement.' },
    { name: 'skill', description: 'Sets a skill on a mobile.' },
    { name: 'socialise', description: 'React to socials.' },
    { name: 'stay-area', description: 'Stay in same area.' },
    { name: 'stay-flags', description: 'Stay with room flags.' },
    { name: 'stay-sector', description: 'Restrict sector type of a mobile.' },
    { name: 'stay-zone', description: 'Stay in zone.' },
    { name: 'test-scout', description: 'Makes mob yell about other races.' },
    { name: 'thief', description: 'Makes this mobile act like a thief.' },
    { name: 'troll-random', description: 'Sundying trolls.' },
    { name: 'walk-back', description: 'Makes mobile try to stay in one room.' },
    { name: 'wimpy', description: 'For wimpy monsters.' }
];

const objectLibraries: ShaperLibraryCatalogEntry[] = [
    { name: 'colorable', description: 'Makes this object colorable.' },
    { name: 'custom-identify', description: 'Add custom info into identify output.' },
    { name: 'herb', description: 'Makes item crushable.' },
    { name: 'herblore-book', description: 'Makes this item teach a herblore.' },
    { name: 'inscription', description: 'Do not use! Experimental /lib.', supervisorReview: true },
    { name: 'instrument', description: 'Makes this obj a playable instrument.' },
    { name: 'light-desc', description: 'Set dynamic description depending on light state.' },
    { name: 'meat-object', description: 'Change object description by the mob it comes from.' },
    { name: 'no-shopinv', description: 'Prevent from storing in shops.' },
    { name: 'not-edible', description: 'Prevents this object from being eaten.' },
    { name: 'not-hidable', description: 'Prevents this object from being hidden.' },
    { name: 'poisoned-weapon', description: 'Poison a weapon on creation.' },
    { name: 'scalp-knife', description: 'Allow people to take scalps with this object.' },
    { name: 'sheath', description: 'Makes object a sheath.' },
    { name: 'social', description: 'Customize a social for an object.' },
    { name: 'surface-prefix', description: 'Customize surface display prefix.' },
    { name: 'timed-object', description: 'Sets the timer field of the object.' }
];

export const SHAPER_LIBRARY_CATALOG: Record<ShaperLibraryTargetType, ShaperLibraryCatalogEntry[]> = {
    room: roomLibraries,
    mobile: mobileLibraries,
    object: objectLibraries
};

export const findShaperLibraryEntry = (
    targetType: ShaperLibraryTargetType,
    name: string
): ShaperLibraryCatalogEntry | undefined =>
    SHAPER_LIBRARY_CATALOG[targetType].find(entry => entry.name === name);
