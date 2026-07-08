/**
 * @file itemTier.ts
 * @description Classifies notable MUME equipment into compact visual tiers.
 */

export type ItemTier =
    | 'artifact'
    | 'legendary'
    | 'focus'
    | 'power'
    | 'important'
    | 'good'
    | 'usable';

export type ItemStateTier = 'pristine' | 'stable' | 'worn';

export interface ItemTierResult {
    tier?: ItemTier;
    state?: ItemStateTier;
    label?: string;
    stateLabel?: string;
}

const tierLabels: Record<ItemTier, string> = {
    artifact: 'Artifact',
    legendary: 'Legendary',
    focus: 'Focus',
    power: 'Power weapon',
    important: 'Important gear',
    good: 'Good gear',
    usable: 'Usable item',
};

const tierItems: Array<{ tier: ItemTier; items: string[] }> = [
    {
        tier: 'artifact',
        items: [
            'the black sword', 'the dragonhelm', 'the morgul blade', 'a black runed sceptre',
            'a strange black helmet', 'the fine silvery morningstar', 'the black sheath',
            'the great black scimitar', 'a crown of bones', 'the black buckler',
            'a dark curved sword', 'the axe of durin', 'the broad elven blade',
            'the slender elven sword', 'the elven shortsword with a runic inscription',
            'the polished elven shortsword', 'the gleaming broadsword', 'the silvery broadsword',
            'the hammer of belegost', 'the huge, black mace', 'a large visored helmet',
            'a barbed thorny shiv', 'a barbed thorny spear',
        ],
    },
    {
        tier: 'legendary',
        items: [
            'a soft pair of padded boots', 'a wooden ring', 'a pitch-black robe',
            'a pure white robe', 'a grey tunic', 'a finely woven hood', 'a frayed tunic',
            'a tainted grey hood', 'a smelly piece of worm hide',
        ],
    },
    {
        tier: 'focus',
        items: [
            'a metal-shod staff', 'a staff inlaid with gems', 'an ancient, jewelled helmet',
            'a sapphire ring', 'a small crystal phial', 'an iron sapphire ring',
            'a ruby sapphire ring', 'a banded sapphire ring', 'a large, shimmering pearl',
            'a bejewelled oak staff', 'a reinforced oak staff',
        ],
    },
    {
        tier: 'power',
        items: [
            'an ornate, steel-shafted warhammer', 'a darkened orkish axe',
            'a mighty dwarven axe', 'an ashen blade', 'an ornamented sabre',
            'a fell blade', 'a steel claymore', 'a halberd',
        ],
    },
    {
        tier: 'important',
        items: [
            'a brutal cleaver', 'a double-headed axe', 'a dunadan blade',
            'a massive dwarven waraxe', 'a nimble blade', 'a black runed dagger',
            'a blackened spear', 'a burnished hewing-spear', 'a great warsword',
            'a narrow runed awlpike', 'an elven hunting-spear', 'a steel-tipped spear',
            'a defiled dwarven shield', 'an ancient dwarven shield', 'an ebony tunic',
            'a pale blue stone', 'a deep blue stone', 'a copper ring', 'a mithril circlet',
            'a twisted crown', 'a slim silvery wristband', 'a black metal wristband',
            'an archaic copper wristband', 'a tarnished copper wristband',
            'a black-thorned wristband', 'a wide silvery wristband',
            'a supple pair of leather gloves', 'a tainted grey cloak', 'a gleaming belt',
            'a golden belt', 'a belt of fell hide', 'an elven longbow',
            'a spiked horsehide buckler', 'a ceremonial dagger',
        ],
    },
    {
        tier: 'good',
        items: [
            'a battle axe', 'an elven dagger', 'a double edged eket',
            'an engraved warhammer', 'a slender dagger', 'an enruned robe', 'a wightblade',
            'an engraved broadsword', 'a war mattock', 'a ragged, blackened cloak',
            'a roughly stitched cloak', 'a russet cloak', 'a forest green cloak',
            'a black cape', 'a bright red amulet', 'a bejewelled shield', 'a tower shield',
            'a leaf-embossed shield', 'a broad silver belt', 'a red ruby',
            'a golden ruby ring', 'a golden garnet ring', 'a golden emerald ring',
            'a blackened dwarven axe', 'a wicked durbuk-hai axe', 'a steel-shafted mattock',
            'a crossbow', 'a pair of black arm wrappings', 'a yew longbow',
            'an embellished longbow', 'a laced quiver', 'a rough, large quiver',
            'a sable pouch', 'a shining chain mail shirt', 'a shining pair of chain mail sleeves',
            'a shining pair of chain mail leggings', 'a shining breastplate',
            'a shining pair of vambraces', 'a shining pair of greaves', 'an iron ring',
            'a banded ring', 'an ancient ruby ring', 'a golden topaz ring', 'a black amulet',
            'a smoky obsidian amulet', 'a scorched, grisly fur', 'an imposing, golden mantle',
            "an archer's wrist guard", "a bowman's arm guard", 'a fine grey cloak',
            'a black, hooded cloak', 'a black warg fur', 'a soot-black bear hide',
            'an enhanced herbal kit', 'a strange set of lock picks', 'a black horn shortbow',
            'a silvan satchel', 'a fur-cloak with a silvery streak',
        ],
    },
    {
        tier: 'usable',
        items: [
            'a pale blue stone', 'a golden quartzite ring', 'a crude orkish horn',
            'a small elven bag', 'a lambent amulet', 'an opaque amulet',
            'a rough wooden horn',
        ],
    },
];

const stateWords: Record<ItemStateTier, string[]> = {
    pristine: ['flawless'],
    stable: ['well-maintained', 'satisfactory', 'used'],
    worn: ['worn', 'neglected', 'marred', 'unavailing', 'deteriorating', 'worn out'],
};

const normalizeItemText = (text: string): string => (
    text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/[\u2019`]/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
);

const stateFromText = (normalized: string): Pick<ItemTierResult, 'state' | 'stateLabel'> => {
    for (const [state, words] of Object.entries(stateWords) as Array<[ItemStateTier, string[]]>) {
        const match = words.find(word => normalized.includes(`(${word})`));
        if (match) return { state, stateLabel: match };
    }
    return {};
};

export const classifyItemTier = (text: string): ItemTierResult => {
    const normalized = normalizeItemText(text);
    const result: ItemTierResult = stateFromText(normalized);

    for (const group of tierItems) {
        if (group.items.some(item => normalized.includes(item))) {
            result.tier = group.tier;
            result.label = tierLabels[group.tier];
            return result;
        }
    }

    return result;
};
