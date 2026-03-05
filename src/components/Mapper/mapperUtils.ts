export const GRID_SIZE = 50;

export const DIRS: Record<string, { dx: number, dy: number, dz?: number, opp: string }> = {
    n: { dx: 0, dy: -1, opp: 's' },
    s: { dx: 0, dy: 1, opp: 'n' },
    e: { dx: 1, dy: 0, opp: 'w' },
    w: { dx: -1, dy: 0, opp: 'e' },
    u: { dx: 0, dy: 0, dz: 1, opp: 'd' },
    d: { dx: 0, dy: 0, dz: -1, opp: 'u' }
};

export const TERRAIN_MAP: Record<string, string> = {
    // Character codes
    '[': 'Building', '#': 'City', '.': 'Field', 'f': 'Forest',
    '(': 'Hills', '<': 'Mountains', '%': 'Shallows', '~': 'Water',
    '+': 'Road', 'W': 'Rapids', 'U': 'Underwater', ':': 'Brush',
    '=': 'Tunnel',
    // Numeric codes (from standard MUD mappers)
    '0': 'Inside/Cavern', '1': 'City', '2': 'Field', '3': 'Grasslands', '4': 'Forest',
    '5': 'Hills', '6': 'Mountains', '7': 'Water (Shallow)', '8': 'Water (Deep)',
    '9': 'Underwater', '10': 'Air', '11': 'Road', '12': 'Brush'
};

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const normalizeTerrain = (t: string | null): string => {
    if (!t) return 'Field';
    const low = t.toLowerCase().trim();
    if (low.includes('city') || low.includes('town')) return 'City';
    if (low.includes('build')) return 'Building';
    if (low.includes('forest') || low.includes('thick')) return 'Forest';
    if (low.includes('field') || low.includes('plain') || low.includes('grass')) return 'Field';
    if (low.includes('hill')) return 'Hills';
    if (low.includes('mountain')) return 'Mountains';
    if (low.includes('water') || low.includes('sea') || low.includes('ocean')) return 'Water';
    if (low.includes('shallow')) return 'Shallows';
    if (low.includes('rapid')) return 'Rapids';
    if (low.includes('river')) return 'Water';
    if (low.includes('road') || low.includes('trail') || low.includes('path')) return 'Road';
    if (low.includes('tunnel')) return 'Tunnel';
    if (low.includes('cavern')) return 'Cavern';
    if (low.includes('underwater')) return 'Underwater';
    if (low.includes('brush') || low.includes('swamp') || low.includes('shrub')) return 'Brush';
    // Match symbols
    for (const [sym, val] of Object.entries(TERRAIN_MAP)) {
        if (t === sym) return val;
    }
    return t.charAt(0).toUpperCase() + t.slice(1);
};

export const DRAG_SENSITIVITY = 0.95;
export const ZOOM_SENSITIVITY = 0.85;

export const PEAK_IMAGES = [
    '/assets/map/m_peaks/peak1.png',
    '/assets/map/m_peaks/peak2.png',
    '/assets/map/m_peaks/peak3.png',
    '/assets/map/m_peaks/peak_tall.png'
];

export const FOREST_IMAGES = [
    '/assets/map/forest/tree1.png'
];

export const HILL_IMAGES = [
    '/assets/map/hills/hill.png'
];
