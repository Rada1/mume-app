/**
 * @file inlineActionDefaults.ts
 * @description Default inline action category and trait catalog.
 */

import type { CategoryConfig, TraitConfig } from './inlineActionModel';

// --- Default Model ---

export const DEFAULT_CATEGORY_CONFIGS: CategoryConfig[] = [
    { id: 'cat-ally', label: 'Ally', color: '#55a5e2', isGmcpCategory: true, legacyIds: ['inline-ally', 'player', 'ally'], defaultTraitIds: ['trait-group', 'trait-social', 'trait-identify', 'trait-examine', 'trait-consider', 'trait-observable'] },
    { id: 'cat-enemy', label: 'Enemy', color: '#ef4444', isGmcpCategory: true, legacyIds: ['inline-enemy', 'enemy'], defaultTraitIds: ['trait-identify', 'trait-examine', 'trait-consider', 'trait-observable'] },
    { id: 'cat-neutral', label: 'Neutral', color: '#eab308', isGmcpCategory: true, legacyIds: ['inline-neutral', 'neutral'], defaultTraitIds: ['trait-social', 'trait-identify', 'trait-examine', 'trait-consider', 'trait-observable'] },
    { id: 'cat-ally-remote', label: 'Remote Ally', color: '#55a5e2', isLocationCategory: true, legacyIds: ['inline-ally-remote', 'ally-remote'], defaultTraitIds: ['trait-identify', 'trait-converse', 'trait-observable'] },
    { id: 'cat-npc', label: 'NPC', isGmcpCategory: true, legacyIds: ['inline-npc', 'npc'], defaultTraitIds: ['trait-group', 'trait-examine', 'trait-consider', 'trait-observable'] },
    { id: 'cat-room-object', label: 'Room Object', isLocationCategory: true, legacyIds: ['inline-in-room-obj', 'object-room', 'obj-room'], defaultTraitIds: ['trait-room-object', 'trait-observable'] },
    { id: 'cat-inventory-object', label: 'Inventory Object', isLocationCategory: true, legacyIds: ['inline-inventory', 'inventory', 'obj-char'], defaultTraitIds: ['trait-inventory-object', 'trait-observable'] },
    { id: 'cat-worn-object', label: 'Worn Object', isLocationCategory: true, legacyIds: ['inline-worn', 'worn', 'obj-worn'], defaultTraitIds: ['trait-worn-object', 'trait-observable'] },
    { id: 'cat-container-item', label: 'Container Item', isLocationCategory: true, legacyIds: ['inline-container-item'], defaultTraitIds: ['trait-get-container-item', 'trait-observable'] },
    { id: 'cat-object', label: 'Object', legacyIds: ['inline-object', 'object', 'default'], defaultTraitIds: ['trait-observable'] },
    { id: 'cat-room', label: 'Room Name', legacyIds: ['room', 'roomname', 'room-name'], defaultTraitIds: ['trait-watchtower', 'trait-campable', 'trait-numenorean-camp'] },
    { id: 'cat-exit', label: 'Exit', legacyIds: ['exit', 'inline-exit'], defaultTraitIds: ['trait-exit'] },
];

export const DEFAULT_TRAIT_CONFIGS: TraitConfig[] = [
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
    { id: 'trait-corpse', label: 'Corpse', kind: 'object', legacySetIds: ['inline-corpses'], keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], buttonIds: ['btn-corpse-butcher', 'btn-corpse-drag', 'btn-corpse-look-in', 'btn-corpse-get-all'] },
    { id: 'trait-corpse-disposal', label: 'Corpse Disposal', kind: 'object', keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], buttonIds: ['btn-corpse-burn', 'btn-corpse-bury'] },
    { id: 'trait-darkie-corpse', label: 'Orc/Troll Corpse', kind: 'object', keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], requirement: { race: ['Orc', 'Troll'] }, buttonIds: ['btn-corpse-drain', 'btn-corpse-scalp', 'btn-corpse-hang', 'btn-corpse-decapitate'] },
    { id: 'trait-container', label: 'Container', kind: 'object', legacySetIds: ['inline-containers'], keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box', 'case', 'wallet', 'crate', 'cabinet', 'bookshelf', 'jar', 'web', 'saddlebag', 'vase', 'pallet', 'rack', 'table', 'saddle', 'saddlecloth', 'moneybag', 'keyring'], buttonIds: ['btn-container-look-in', 'btn-container-open', 'btn-container-close', 'btn-container-get-all'] },
    { id: 'trait-food', label: 'Food', kind: 'object', legacySetIds: ['inline-food'], keywords: ['meat', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer', 'cookie', 'eg', 'dumpling', 'bannock', 'cheese', 'pastry', 'flour', 'cake', 'pie'], buttonIds: ['btn-food-eat'] },
    { id: 'trait-water', label: 'Water', kind: 'object', legacySetIds: ['inline-water'], keywords: ['water', 'fountain', 'pond', 'stream', 'well', 'spring', 'lake', 'river', 'sea', 'ocean', 'puddle', 'basin'], buttonIds: ['btn-water-drink'] },
    { id: 'trait-fluid-container', label: 'Fluid Container', kind: 'object', legacySetIds: ['inline-fluidcontainer'], keywords: ['flask', 'bottle', 'cup', 'skin', 'flagon', 'goblet', 'vial', 'keg', 'barrel', 'waterskin', 'pitcher', 'jug', 'mug', 'stein', 'pot', 'bowl', 'bucket', 'pail', 'calabash', 'gourd', 'glass', 'firebreather', 'tincture', 'pint', 'bladder'], buttonIds: ['btn-fluid-drink', 'btn-fluid-pour', 'btn-fluid-empty', 'btn-fluid-look-in'] },
    { id: 'trait-weapon', label: 'Wieldable', kind: 'object', legacySetIds: ['inline-weapon'], keywords: ['sword', 'blade', 'claymore', 'sabre', 'cutlass', 'falchion', 'rapier', 'stiletto', 'dirk', 'eket', 'dagger', 'knife', 'shiv', 'fang', 'thorn', 'axe', 'cleaver', 'hatchet', 'halberd', 'hammer', 'mace', 'morningstar', 'club', 'maul', 'cudgel', 'flail', 'spear', 'pike', 'lance', 'pitchfork', 'battle-standard', 'staff', 'wand', 'sceptre', 'branch', 'whip', 'scourge', 'bow', 'crossbow', 'sling', 'shovel', 'spade', 'pry-bar', 'pick'], buttonIds: ['btn-weapon-wield'] },
    { id: 'trait-throwable', label: 'Throwable', kind: 'object', legacySetIds: ['inline-throwable'], keywords: ['twisted-rock', 'glass-flask'], buttonIds: ['btn-throw'] },
    { id: 'trait-useable', label: 'Useable', kind: 'object', legacySetIds: ['inline-useable'], keywords: ['pale-blue-stone', 'topaz-ring', 'ruby-ring', 'garnet-ring', 'emerald-ring', 'opal-ring', 'obsidian-eye', 'black-candle', 'small-pouch', 'fragile-parchment', 'deep-black-orb'], buttonIds: ['btn-use'] },
    { id: 'trait-room-object', label: 'Room Object', kind: 'object', legacySetIds: ['inline-in-room-obj'], keywords: [], buttonIds: ['btn-get'] },
    { id: 'trait-inventory-object', label: 'Inventory Object', kind: 'object', legacySetIds: ['inline-inventory'], keywords: [], buttonIds: ['btn-inv-drop', 'btn-inv-wear', 'btn-inv-give', 'btn-inv-put'] },
    { id: 'trait-worn-object', label: 'Worn Object', kind: 'object', legacySetIds: ['inline-worn'], keywords: [], buttonIds: ['btn-worn-remove'] },
    { id: 'trait-get-container-item', label: 'Get Container Item', kind: 'object', legacySetIds: ['inline-container-item'], keywords: [], buttonIds: ['btn-container-get-item'] },
    { id: 'trait-observable', label: 'Observable', kind: 'object', legacySetIds: ['inline-object', 'trait-object'], keywords: [], buttonIds: ['btn-obj-examine'] },
    { id: 'trait-whetstone', label: 'Whetstone', kind: 'object', keywords: ['a stone'], buttonIds: ['btn-whet'] },
    { id: 'trait-reciteable', label: 'Reciteable', kind: 'object', keywords: ['scroll'], buttonIds: ['btn-recite'] },
    { id: 'trait-sheath', label: 'Sheath', kind: 'object', legacySetIds: ['inline-drawable', 'inline-sheath'], keywords: ['scabbard', 'sheath', 'harness', 'baldric', 'bow', 'crossbow'], buttonIds: ['btn-draw'] },
    { id: 'trait-book', label: 'Book', kind: 'object', legacySetIds: ['inline-book'], keywords: ['book', 'journal', 'herbal', 'libram', 'guestbook'], buttonIds: ['btn-book-read'] },
    { id: 'trait-lantern-worn', label: 'Lantern (Worn)', kind: 'object', keywords: ['lantern'], categoryIds: ['cat-worn-object'], buttonIds: ['btn-lantern-fill'] },
    { id: 'trait-pipe-worn', label: 'Pipe (Worn)', kind: 'object', keywords: ['pipe'], categoryIds: ['cat-worn-object'], buttonIds: ['btn-pipe-smoke'] },
    { id: 'trait-quaffable', label: 'Quaffable', kind: 'object', keywords: ['flask', 'cup', 'bowl', 'mug', 'bottle', 'potion', 'philtre', 'brew', 'balm', 'vial', 'leaf-cake'], categoryIds: ['cat-inventory-object', 'cat-worn-object'], buttonIds: ['btn-quaff'] },
    { id: 'trait-poison', label: 'Poison', kind: 'object', keywords: ['vial', 'draught'], categoryIds: ['cat-inventory-object', 'cat-worn-object'], buttonIds: ['btn-poison'] },
    { id: 'trait-lightsource', label: 'Lightsource', kind: 'object', legacySetIds: ['inline-lightsource', 'inline-coverable'], keywords: ['lantern', 'lamp', 'torch', 'globe', 'candle', 'ruby', 'candlestick'], buttonIds: ['btn-lightsource-cover', 'btn-lightsource-uncover'] },
    { id: 'trait-watchtower', label: 'Watch Tower', kind: 'room', keywords: ['watch tower', 'watchtower', 'tower'], buttonIds: ['btn-watch'] },
    { id: 'trait-campable', label: 'Campable', kind: 'room', keywords: ['camp', 'clearing', 'campsite', 'forest', 'garden'], buttonIds: ['btn-camp'] },
    { id: 'trait-numenorean-camp', label: 'Camp Rent', kind: 'room', keywords: [], requirement: { race: ['Numenorean', 'Black Numenorean', 'Black Númenórean'] }, buttonIds: ['btn-camp-rent'] },
    { id: 'trait-exit', label: 'Exit', kind: 'exit', legacySetIds: ['inline-exit'], keywords: ['north', 'south', 'east', 'west', 'up', 'down'], buttonIds: ['btn-exit-go', 'btn-look'] }
];
