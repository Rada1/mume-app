/** @file herbKeywords.ts — MUME herb names and common aliases for object matching. */

// --- Data Section ---
export const MUME_HERB_KEYWORDS = [
    'anemone', 'athelas', 'baneberries', 'belladonna', 'blackberries', 'blackcurrant', 'black currant',
    'blackflower', 'blighted mushroom', 'bluebells', 'blueberries', 'bulrushes', 'buttercups', 'cardamom',
    'cherries', 'cinnamon', 'clover', 'cloves', 'coneflower', 'echinacea', 'conker', 'comfrey', 'coriander',
    'daisy-chain', 'elanor', 'elderberries', 'ferns', 'figwort', 'turtlehead', 'foxglove', 'foxtail', 'ginseng',
    'goosegrass', 'grapes', 'grey fluid-sack', 'small fluid-sack', 'fluid-sack', 'green mushroom', 'hawkweed',
    'heather', 'hemlock', 'hithlain', 'hollyberries', 'honey', 'honeysuckle', 'inkberries', 'iris', 'ivory rose',
    'juniper', 'lissuin', 'marjoram', 'mauve petals', 'milkweed', 'mint', 'mistletoe', 'niphredil', 'orchid',
    'paprika', 'pepper', 'phosporescent moss', 'phosphorescent moss', 'poppy', 'ragwort', 'red mushroom',
    'red rose', 'rosemary', 'simbelmyne', 'silvery moss', 'stinging nettle', 'strawberries', 'sunflower',
    'tarragon', 'estragon', 'thistles', 'thyme', 'tincture of oil', 'toadstool', 'valerian', 'vanilla',
    'water-lily', 'white rose'
] as const;

export const HERB_DESCRIPTIVE_KEYWORDS = [
    'herb', 'herbal', 'plant', 'root', 'flower', 'petal', 'leaf', 'moss', 'berry', 'berries', 'mushroom',
    'mushrooms', 'toadstool', 'toadstools', 'rose'
] as const;
