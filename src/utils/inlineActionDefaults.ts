/**
 * @file inlineActionDefaults.ts
 * @description Default inline action category and trait catalog.
 */

import type { CategoryConfig, TraitConfig } from './inlineActionModel';
import { HERB_DESCRIPTIVE_KEYWORDS, MUME_HERB_KEYWORDS } from './herbKeywords';
import { DOOR_BUTTONS, EXIT_BUTTONS } from '../constants/buttons/doors';
import { SELF_STATE_BUTTON_IDS } from '../constants/buttons/state';
import { SOCIAL_BUTTONS } from '../constants/buttons/socials';
import { INLINE_ABILITY_BUTTON_IDS, INLINE_BASH_DISENGAGE_BUTTON_ID, getInlineClassTargetButtonIds } from './inlineAbilityActions';
import type { PracticeClassKey } from './practiceClassCatalog';

// --- Default Model ---

const INLINE_CLASS_TRAITS: Array<{ classKey: PracticeClassKey; label: string }> = [
    { classKey: 'mage', label: 'Mage' },
    { classKey: 'warrior', label: 'Warrior' },
    { classKey: 'ranger', label: 'Ranger' },
    { classKey: 'thief', label: 'Thief' },
    { classKey: 'cleric', label: 'Cleric' }
];
const INLINE_CLASS_TRAIT_IDS = INLINE_CLASS_TRAITS.map(({ classKey }) => `trait-${classKey}`);

export const DEFAULT_CATEGORY_CONFIGS: CategoryConfig[] = [
    { id: 'cat-mount-object', label: 'Mount Object', color: '#ababab', isLocationCategory: true, defaultTraitIds: ['trait-mount-object'] },
    { id: 'cat-ally', label: 'Ally', color: '#55b054', isGmcpCategory: true, legacyIds: ['inline-ally', 'player', 'ally'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-combat', ...INLINE_CLASS_TRAIT_IDS, 'trait-communication', 'trait-social', 'trait-group', 'trait-identify', 'trait-observable'] },
    { id: 'cat-enemy', label: 'Enemy', color: '#f35353', isGmcpCategory: true, legacyIds: ['inline-enemy', 'enemy'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-combat', ...INLINE_CLASS_TRAIT_IDS, 'trait-social', 'trait-communication', 'trait-identify', 'trait-observable'] },
    { id: 'cat-neutral', label: 'Neutral', color: '#61c290', isGmcpCategory: true, legacyIds: ['inline-neutral', 'neutral'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-combat', ...INLINE_CLASS_TRAIT_IDS, 'trait-social', 'trait-communication', 'trait-observable'] },
    { id: 'cat-ally-remote', label: 'Remote Ally', color: '#55b054', isLocationCategory: true, legacyIds: ['inline-ally-remote', 'ally-remote'], defaultTraitIds: ['trait-identify', 'trait-converse', 'trait-communication'] },
    { id: 'cat-npc', label: 'NPC', color: '#d8be18', isGmcpCategory: true, legacyIds: ['inline-npc', 'npc'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-combat', ...INLINE_CLASS_TRAIT_IDS, 'trait-group', 'trait-social', 'trait-communication', 'trait-observable'] },
    { id: 'cat-mount', label: 'Mount', color: '#ffd700', isGmcpCategory: true, legacyIds: ['inline-mounts', 'mount', 'mounts'], defaultTraitIds: ['trait-mount', 'trait-retreat', ...INLINE_CLASS_TRAIT_IDS, 'trait-communication', 'trait-buffs', 'trait-healing'] },
    { id: 'cat-room-object', label: 'Room Object', color: '#ababab', isLocationCategory: true, legacyIds: ['inline-in-room-obj', 'object-room', 'obj-room'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-room-object', 'trait-object-magic', 'trait-observable'] },
    { id: 'cat-inventory-object', label: 'Inventory Object', color: '#ababab', isLocationCategory: true, legacyIds: ['inline-inventory', 'inventory', 'obj-char'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-inventory-object', 'trait-mage', 'trait-cleric', 'trait-observable'] },
    { id: 'cat-worn-object', label: 'Worn Object', color: '#ababab', isLocationCategory: true, legacyIds: ['inline-worn', 'worn', 'obj-worn'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-worn-object', 'trait-mage', 'trait-cleric', 'trait-observable'] },
    { id: 'cat-container-item', label: 'Container Item', color: '#ababab', isLocationCategory: true, legacyIds: ['inline-container-item'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-get-container-item', 'trait-object-magic', 'trait-observable'] },
    { id: 'cat-object', label: 'Object', color: '#ababab', legacyIds: ['inline-object', 'object', 'default'], defaultTraitIds: ['trait-examine', 'trait-consider', 'trait-object-magic', 'trait-observable'] },
    { id: 'cat-room', label: 'Room Name', color: '#59bd3d', legacyIds: ['room', 'roomname', 'room-name'], defaultTraitIds: ['trait-watchtower', 'trait-campable', 'trait-numenorean-camp', 'trait-room-water', 'trait-room-weather'] },
    { id: 'cat-exit', label: 'Exit', legacyIds: ['exit', 'inline-exit'], defaultTraitIds: ['trait-examine', 'trait-exit', 'trait-door-actions'] },
    { id: 'cat-weather', label: 'Weather', color: '#94a3b8', defaultTraitIds: ['trait-weather'] },
];

const targetedSocialButtonIds = SOCIAL_BUTTONS
    .filter(button => button.command.includes('%n'))
    .map(button => button.id);
const doorButtonIds = DOOR_BUTTONS.map(button => button.id);
const exitButtonIds = EXIT_BUTTONS.map(button => button.id);

export const DEFAULT_TRAIT_CONFIGS: TraitConfig[] = [
    { id: 'trait-saddle', label: 'Saddle', kind: 'object', keywords: ['saddle'], categoryIds: ['cat-inventory-object', 'cat-mount-object'], buttonIds: ['btn-saddle-mount', 'btn-saddle-unsaddle'] },
    { id: 'trait-mount-object', label: 'Mount Object', kind: 'object', keywords: [], buttonIds: ['btn-mount-object-unsaddle'] },
    { id: 'trait-personal-information', label: 'Personal Information', keywords: [], buttonIds: ['command-personal-info', 'command-personal-stat', 'command-personal-score'] },
    { id: 'trait-state', label: 'State', keywords: [], buttonIds: SELF_STATE_BUTTON_IDS },
    { id: 'trait-consider', label: 'Consider', legacySetIds: ['inline-ally'], keywords: [], buttonIds: ['btn-consider'] },
    { id: 'trait-examine', label: 'Examine', legacySetIds: ['inline-ally', 'inline-object'], keywords: [], buttonIds: ['btn-examine', 'btn-obj-examine'] },
    { id: 'trait-identify', label: 'Identify', legacySetIds: ['inline-ally'], keywords: [], buttonIds: ['btn-whois'] },
    { id: 'trait-communication', label: 'Communication', keywords: [], buttonIds: [
        'command-communication-tell', 'command-communication-whisper', 'command-communication-ask',
        'command-communication-say', 'command-communication-narrate', 'command-communication-shout',
        'command-communication-yell', 'command-communication-sing', 'command-communication-emote', 'command-communication-act',
        'command-communication-group', 'command-communication-pray'
    ] },
    { id: 'trait-social', label: 'Social', legacySetIds: ['inline-neutral', 'inline-ally'], keywords: [], buttonIds: ['btn-converse', ...targetedSocialButtonIds] },
    { id: 'trait-combat', label: 'Combat', keywords: [], buttonIds: ['cat-default-kill', 'btn-hit', 'btn-disengage', 'btn-flee', 'btn-assist'] },
    ...INLINE_CLASS_TRAITS.map(({ classKey, label }) => ({
        id: `trait-${classKey}`,
        label,
        keywords: [],
        buttonIds: getInlineClassTargetButtonIds(classKey)
    })),
    { id: 'trait-offense', label: 'Offense', keywords: [], buttonIds: ['cat-default-kill', 'btn-hit', INLINE_BASH_DISENGAGE_BUTTON_ID, ...INLINE_ABILITY_BUTTON_IDS.offense] },
    { id: 'trait-retreat', label: 'Retreat', keywords: [], buttonIds: ['btn-disengage', 'btn-flee'] },
    { id: 'trait-control', label: 'Control', keywords: [], buttonIds: INLINE_ABILITY_BUTTON_IDS.control },
    { id: 'trait-buffs', label: 'Buffs', keywords: [], buttonIds: INLINE_ABILITY_BUTTON_IDS.buffs },
    { id: 'trait-healing', label: 'Healing', keywords: [], buttonIds: INLINE_ABILITY_BUTTON_IDS.healing },
    { id: 'trait-support', label: 'Support', keywords: [], buttonIds: ['btn-assist', ...INLINE_ABILITY_BUTTON_IDS.support] },
    { id: 'trait-utility', label: 'Utility', keywords: [], buttonIds: INLINE_ABILITY_BUTTON_IDS.utility },
    { id: 'trait-door-actions', label: 'Doors', kind: 'exit', keywords: [], buttonIds: [...doorButtonIds, ...INLINE_ABILITY_BUTTON_IDS.doors] },
    { id: 'trait-object-magic', label: 'Item Magic', kind: 'object', keywords: [], buttonIds: INLINE_ABILITY_BUTTON_IDS['object-magic'] },
    { id: 'trait-resurrection', label: 'Resurrection', kind: 'object', keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], buttonIds: INLINE_ABILITY_BUTTON_IDS.resurrection },
    { id: 'trait-converse', label: 'Converse', legacySetIds: ['inline-ally-remote'], keywords: [], buttonIds: ['btn-converse'] },
    { id: 'trait-group', label: 'Group', legacySetIds: ['inline-ally', 'inline-npc'], keywords: [], buttonIds: ['btn-group', 'btn-ungroup'] },
    { id: 'trait-shopkeeper', label: 'Shopkeeper', kind: 'npc', legacySetIds: ['inline-shopkeeper'], keywords: ['shopkeeper', 'dealer', 'keeper', 'merchant', 'weaponsmith', 'armourer', 'smith', 'trader', 'grocer', 'librarian', 'provisioner', 'alchemist', 'herbalist', 'tailor', 'blacksmith', 'vendor', 'cobbler', 'peddler'], buttonIds: ['btn-shopkeeper-shop'] },
    { id: 'trait-innkeeper', label: 'Innkeeper', kind: 'npc', legacySetIds: ['inline-innkeeper'], keywords: ['innkeeper', 'barman', 'tender', 'lodging', 'receptionist', 'tavern keeper', 'barliman', 'steward', 'vit', 'vubur'], buttonIds: ['btn-innkeeper-offer', 'btn-innkeeper-rent'] },
    { id: 'trait-mount', label: 'Mount', kind: 'npc', legacySetIds: ['inline-mounts'], keywords: ['horse', 'pony', 'steed', 'donkey', 'mule', 'warg', 'brown wolf'], buttonIds: ['btn-mount-ride', 'btn-mount-lead', 'btn-mount-abandon', 'btn-mount-dismount', ...INLINE_ABILITY_BUTTON_IDS.mount] },
    { id: 'trait-guildmaster', label: 'Guildmaster', kind: 'npc', legacySetIds: ['inline-guildmaster'], keywords: ['guildmaster', 'teacher', 'master', 'trainer', 'huor'], buttonIds: ['btn-guildmaster-practice'] },
    { id: 'trait-corpse', label: 'Corpse', kind: 'object', legacySetIds: ['inline-corpses'], keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], buttonIds: ['btn-corpse-butcher', 'btn-corpse-drag', 'btn-corpse-look-in', 'btn-corpse-get-all'] },
    { id: 'trait-corpse-disposal', label: 'Corpse Disposal', kind: 'object', keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], buttonIds: ['btn-corpse-burn', 'btn-corpse-bury'] },
    { id: 'trait-darkie-corpse', label: 'Orc/Troll Corpse', kind: 'object', keywords: ['corpse'], categoryIds: ['cat-room-object', 'cat-inventory-object'], requirement: { race: ['Orc', 'Troll'] }, buttonIds: ['btn-corpse-drain', 'btn-corpse-scalp', 'btn-corpse-hang', 'btn-corpse-decapitate'] },
    { id: 'trait-container', label: 'Container', kind: 'object', legacySetIds: ['inline-containers'], keywords: ['bag', 'pouch', 'sack', 'backpack', 'satchel', 'quiver', 'chest', 'box', 'case', 'wallet', 'crate', 'cabinet', 'bookshelf', 'jar', 'web', 'saddlebag', 'vase', 'pallet', 'rack', 'table', 'saddle', 'saddlecloth', 'moneybag', 'keyring'], buttonIds: ['btn-container-look-in', 'btn-container-open', 'btn-container-close', 'btn-get'] },
    { id: 'trait-food', label: 'Food', kind: 'object', legacySetIds: ['inline-food'], keywords: ['meat', 'mutton', 'bread', 'biscuit', 'lembas', 'mushroom', 'honey', 'wafer', 'cookie', 'candy', 'apple', 'grape', 'fruit', 'eg', 'dumpling', 'bannock', 'cheese', 'pastry', 'flour', 'cake', 'pie'], buttonIds: ['btn-food-eat', 'v2-taste'] },
    { id: 'trait-water', label: 'Water', kind: 'object', legacySetIds: ['inline-water'], keywords: ['water', 'fountain', 'pond', 'stream', 'well', 'spring', 'lake', 'river', 'sea', 'ocean', 'puddle', 'basin'], buttonIds: ['btn-water-drink'] },
    { id: 'trait-fluid-container', label: 'Fluid Container', kind: 'object', legacySetIds: ['inline-fluidcontainer'], keywords: ['flask', 'bottle', 'cup', 'skin', 'flagon', 'goblet', 'vial', 'keg', 'barrel', 'waterskin', 'pitcher', 'jug', 'mug', 'stein', 'pot', 'bowl', 'bucket', 'pail', 'calabash', 'gourd', 'glass', 'firebreather', 'tincture', 'pint', 'bladder'], buttonIds: ['btn-fluid-drink', 'btn-fluid-pour', 'btn-fluid-empty', 'btn-fluid-look-in', 'v2-sip'] },
    { id: 'trait-weapon', label: 'Wieldable', kind: 'object', legacySetIds: ['inline-weapon'], keywords: ['sword', 'blade', 'claymore', 'sabre', 'cutlass', 'falchion', 'rapier', 'stiletto', 'dirk', 'eket', 'dagger', 'knife', 'shiv', 'fang', 'thorn', 'talon', 'claw', 'axe', 'handaxe', 'waraxe', 'cleaver', 'hatchet', 'halberd', 'hammer', 'warhammer', 'mattock', 'poleaxe', 'mace', 'morningstar', 'club', 'maul', 'cudgel', 'flail', 'spear', 'pike', 'lance', 'pitchfork', 'battle-standard', 'staff', 'wand', 'sceptre', 'branch', 'whip', 'scourge', 'bow', 'longbow', 'shortbow', 'crossbow', 'sling', 'slingstone', 'shovel', 'spade', 'pry-bar', 'pick', 'scimitar', 'longsword', 'backsword', 'broadsword', 'shortsword', 'sickle', 'horn'], buttonIds: ['btn-weapon-wield'] },
    { id: 'trait-shield', label: 'Shield', kind: 'object', keywords: ['shield', 'buckler'], buttonIds: [] },
    { id: 'trait-armour', label: 'Armour', kind: 'object', keywords: ['armour', 'armor', 'helmet', 'helm', 'coif', 'hood', 'hat', 'crown', 'robe', 'tunic', 'shirt', 'mail', 'cuirass', 'breastplate', 'plate', 'sleeves', 'leggings', 'greaves', 'vambraces', 'boots', 'gloves', 'gauntlets', 'mantle', 'cloak', 'cape', 'collar', 'wrappings', 'fur', 'hide', 'jerkin', 'vest', 'tabard', 'belt', 'wristband', 'bracer', 'wrist guard', 'arm guard'], buttonIds: [] },
    { id: 'trait-herb', label: 'Herb', kind: 'object', keywords: [...HERB_DESCRIPTIVE_KEYWORDS, ...MUME_HERB_KEYWORDS], buttonIds: ['btn-herb-crush'] },
    { id: 'trait-jewelry', label: 'Jewelry', kind: 'object', keywords: ['ring', 'amulet', 'necklace', 'bracelet', 'bracer', 'brooch', 'pendant', 'medallion', 'circlet', 'pearl', 'gem', 'jewel'], buttonIds: [] },
    { id: 'trait-treasure', label: 'Treasure', kind: 'object', keywords: ['gold', 'silver', 'copper', 'bronze', 'ore', 'nugget', 'diamond', 'opal', 'sapphire', 'ruby', 'emerald', 'garnet', 'topaz', 'amber', 'onyx', 'agate', 'citrine', 'amethyst', 'spinel', 'corberyl', 'adamant', 'quartzite', 'tourmaline', 'rubellite'], buttonIds: [] },
    { id: 'trait-ammunition', label: 'Ammunition', kind: 'object', keywords: ['arrow', 'bolt', 'slingstone'], buttonIds: [] },
    { id: 'trait-tool', label: 'Tool', kind: 'object', keywords: ['lockpick', 'lock picks', 'rope', 'pan', 'tongs', 'net', 'fishing net', 'whetstone', 'key', 'keys', 'kit'], buttonIds: [] },
    { id: 'trait-instrument', label: 'Instrument', kind: 'object', keywords: ['reed pipes', 'flute', 'harp', 'lute', 'drum', 'war-drums'], buttonIds: [] },
    { id: 'trait-vehicle', label: 'Boat', kind: 'object', keywords: ['boat', 'skiff', 'canoe', 'raft'], buttonIds: [] },
    { id: 'trait-throwable', label: 'Throwable', kind: 'object', legacySetIds: ['inline-throwable'], keywords: ['twisted-rock', 'glass-flask'], buttonIds: ['btn-throw'] },
    { id: 'trait-useable', label: 'Useable', kind: 'object', legacySetIds: ['inline-useable'], keywords: ['pale-blue-stone', 'bejewelled-oak-staff', 'bejeweled-oak-staff', 'bejewelled-oaken-staff', 'bejeweled-oaken-staff', 'golden-topaz-ring', 'golden-garnet-ring', 'golden-emerald-ring', 'golden-opal-ring', 'obsidian-eye', 'black-candle', 'small-pouch', 'small-crystal-phial'], buttonIds: ['btn-use'] },
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
    { id: 'trait-lightsource', label: 'Lightsource', kind: 'object', legacySetIds: ['inline-lantern', 'inline-lightsource', 'inline-coverable'], keywords: ['lantern', 'lamp', 'torch', 'globe', 'candle', 'ruby', 'candlestick'], buttonIds: ['btn-lantern-light', 'btn-lantern-snuff', 'btn-lightsource-light', 'btn-lightsource-snuff', 'btn-lightsource-cover', 'btn-lightsource-uncover'] },
    { id: 'trait-watchtower', label: 'Watch Tower', kind: 'room', keywords: ['watch tower', 'watchtower', 'tower'], buttonIds: ['btn-watch'] },
    { id: 'trait-campable', label: 'Campable', kind: 'room', keywords: ['camp', 'clearing', 'campsite', 'forest', 'garden'], buttonIds: ['btn-camp'] },
    { id: 'trait-numenorean-camp', label: 'Camp Rent', kind: 'room', keywords: [], requirement: { race: ['Numenorean', 'Black Numenorean', 'Black Númenórean'] }, buttonIds: ['btn-camp-rent'] },
    { id: 'trait-room-water', label: 'Drink Water', kind: 'room', keywords: [], buttonIds: ['btn-room-drink-water'] },
    { id: 'trait-exit', label: 'Exits', kind: 'exit', legacySetIds: ['inline-exit'], keywords: ['north', 'south', 'east', 'west', 'up', 'down'], buttonIds: ['btn-exit-go', 'btn-look', ...exitButtonIds] },
    { id: 'trait-weather', label: 'Weather', keywords: [], buttonIds: ['command-weather-global', 'command-weather-fog'] },
    { id: 'trait-room-weather', label: 'Weather', kind: 'room', keywords: [], buttonIds: ['command-weather-local'] }
];
