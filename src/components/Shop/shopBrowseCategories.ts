/** @file shopBrowseCategories.ts — Keyboard-free shop category and filter commands. */

export interface ShopBrowseFilter {
    id: string;
    label: string;
    command: string;
}

export interface ShopBrowseCategory {
    id: string;
    label: string;
    command?: string;
    filters?: ShopBrowseFilter[];
}

// --- Logic Section ---
// --- Shop Browse Tree ---
export const SHOP_BROWSE_CATEGORIES: ShopBrowseCategory[] = [
    { id: 'all', label: 'All', command: 'list' },
    {
        id: 'weapons', label: 'Weapons', filters: [
            { id: 'all-weapons', label: 'All weapons', command: 'list weapons' },
            { id: 'piercing', label: 'Piercing', command: 'list pweapon' },
            { id: 'slashing', label: 'Slashing', command: 'list sweapon' },
            { id: 'crushing', label: 'Crushing', command: 'list cweapon' },
            { id: 'cleaving', label: 'Cleaving', command: 'list clweapon' },
            { id: 'two-handed', label: 'Two-handed', command: 'list tweapon' },
        ],
    },
    {
        id: 'armour-clothing', label: 'Clothing', filters: [
            { id: 'head', label: 'Head', command: 'list worn head' },
            { id: 'body', label: 'Body', command: 'list worn body' },
            { id: 'arms', label: 'Arms', command: 'list worn on arms' },
            { id: 'back', label: 'Back', command: 'list worn back' },
            { id: 'feet', label: 'Feet', command: 'list worn feet' },
            { id: 'hands', label: 'Hands', command: 'list worn hands' },
            { id: 'legs', label: 'Legs', command: 'list worn legs' },
            { id: 'finger', label: 'Finger', command: 'list worn finger' },
            { id: 'wrist', label: 'Wrist', command: 'list worn wrist' },
            { id: 'about-body', label: 'About body', command: 'list worn about body' },
            { id: 'across-back', label: 'Across back', command: 'list worn across back' },
            { id: 'belt', label: 'Belt', command: 'list worn belt' },
        ],
    },
    { id: 'shields', label: 'Shields', command: 'list shield' },
    { id: 'herbs', label: 'Herbs', command: 'list herb' },
    { id: 'food', label: 'Food & drink', command: 'list edible' },
    {
        id: 'gems-jewelry', label: 'Gems & jewelry', filters: [
            { id: 'gems', label: 'Gems', command: 'list gem' },
            { id: 'jewelry', label: 'Jewelry', command: 'list jewel' },
        ],
    },
    {
        id: 'pipes', label: 'Pipes & pipeweed', filters: [
            { id: 'pipe', label: 'Pipes', command: 'list pipe' },
            { id: 'pipeweed', label: 'Pipeweed', command: 'list pipeweed' },
        ],
    },
    { id: 'containers', label: 'Containers', command: 'list containers' },
    {
        id: 'tools-travel', label: 'Tools & travel', filters: [
            { id: 'tools', label: 'Tools', command: 'list tool' },
            { id: 'travel', label: 'Travel', command: 'list travel' },
        ],
    },
];
