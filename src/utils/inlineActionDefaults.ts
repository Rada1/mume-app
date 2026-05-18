/**
 * @file inlineActionDefaults.ts
 * @description Default inline action category and trait catalog.
 */

import type { CategoryConfig, TraitConfig } from './inlineActionModel';

// --- Default Model ---

export const DEFAULT_CATEGORY_CONFIGS: CategoryConfig[] = [
    { id: 'cat-target', label: 'Target', color: '#facc15', legacyIds: ['target'], defaultTraitIds: ['trait-target'] },
    { id: 'cat-ally', label: 'Ally', color: '#22c55e', isGmcpCategory: true, legacyIds: ['inline-ally', 'player', 'ally'], defaultTraitIds: ['trait-group', 'trait-social', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-enemy', label: 'Enemy', color: '#ef4444', isGmcpCategory: true, legacyIds: ['inline-enemy', 'enemy'], defaultTraitIds: ['trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-neutral', label: 'Neutral', color: '#eab308', isGmcpCategory: true, legacyIds: ['inline-neutral', 'neutral'], defaultTraitIds: ['trait-social', 'trait-identify', 'trait-examine', 'trait-consider'] },
    { id: 'cat-ally-remote', label: 'Remote Ally', color: '#22c55e', isLocationCategory: true, legacyIds: ['inline-ally-remote', 'ally-remote'], defaultTraitIds: ['trait-identify', 'trait-converse'] },
    { id: 'cat-npc', label: 'NPC', isGmcpCategory: true, legacyIds: ['inline-npc', 'npc'], defaultTraitIds: ['trait-group', 'trait-examine', 'trait-consider'] },
    { id: 'cat-room-object', label: 'Room Object', isLocationCategory: true, legacyIds: ['inline-in-room-obj', 'object-room', 'obj-room'], defaultTraitIds: ['trait-room-object'] },
    { id: 'cat-inventory-object', label: 'Inventory Object', isLocationCategory: true, legacyIds: ['inline-inventory', 'inventory', 'obj-char'], defaultTraitIds: ['trait-inventory-object'] },
    { id: 'cat-worn-object', label: 'Worn Object', isLocationCategory: true, legacyIds: ['inline-worn', 'worn', 'obj-worn'], defaultTraitIds: ['trait-worn-object'] },
    { id: 'cat-object', label: 'Object', legacyIds: ['inline-object', 'object', 'default'], defaultTraitIds: ['trait-observable'] },
    { id: 'cat-room', label: 'Room Name', legacyIds: ['room', 'roomname', 'room-name'], defaultTraitIds: ['trait-watchtower', 'trait-campable', 'trait-numenorean-camp'] },
    { id: 'cat-exit', label: 'Exit', legacyIds: ['exit', 'inline-exit'], defaultTraitIds: ['trait-exit'] },
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
    { id: 'trait-corpse', label: 'Corpse', kind: 'object', legacySetIds: ['inline-corpses'], keywords: ['corpse'], buttonIds: ['btn-corpse-butcher', 'btn-corpse-drag'] },
    { id: 'trait-corpse-disposal', label: 'Corpse Disposal', kind: 'object', keywords: ['corpse'], buttonIds: ['btn-corpse-burn', 'btn-corpse-bury'] },
    { id: 'trait-darkie-corpse', label: 'Orc/Troll Corpse', kind: 'object', keywords: ['corpse'], requirement: { race: ['Orc', 'Troll'] }, buttonIds: ['btn-corpse-drain', 'btn-corpse-scalp', 'btn-corpse-hang', 'btn-corpse-decapitate'] },
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
    { id: 'trait-numenorean-camp', label: 'Camp Rent', kind: 'room', keywords: [], requirement: { race: ['Numenorean', 'Black Numenorean', 'Black Númenórean'] }, buttonIds: ['btn-camp-rent'] },
    { id: 'trait-exit', label: 'Exit', kind: 'exit', legacySetIds: ['inline-exit'], keywords: ['north', 'south', 'east', 'west', 'up', 'down'], buttonIds: ['btn-exit-go', 'btn-look'] }
];
