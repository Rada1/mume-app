export const GRID_SIZE = 50;
export const ROAD_COLOR_DARK = '#8b7d6b'; // Warm tan for roads in dark mode
export const ROAD_COLOR_LIGHT = '#d2b48c'; // Tan for roads in light mode
export const PATH_COLOR_DARK = '#7c6f64'; // Slightly darker sand/path
export const PATH_COLOR_LIGHT = '#c2b280'; // Sand color

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

export const normalizeTerrain = (t: string | number | null): string => {
    if (t === null || t === undefined) return 'Field';
    const tStr = typeof t === 'number' ? TERRAIN_MAP[String(t)] || String(t) : t;
    
    const low = tStr.toLowerCase().trim();
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
        if (tStr === sym) return val;
    }
    return tStr.charAt(0).toUpperCase() + tStr.slice(1);
};

export const getTerrainName = (terrain: string | number | null): string => {
    return normalizeTerrain(terrain);
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

export const getTerrainColor = (terrain: string | number, isDarkMode: boolean): string => {
    let t = typeof terrain === 'number' ? TERRAIN_MAP[String(terrain)] : terrain;
    t = normalizeTerrain(t);

    if (isDarkMode) {
        switch (t) {
            case 'City': return '#313244';
            case 'Building': return '#45475a';
            case 'Forest': return '#1a2e1a';
            case 'Field':
            case 'Grasslands': return '#2d3e2d';
            case 'Hills': return '#3e2d1a';
            case 'Mountains': return '#1e1e24';
            case 'Water':
            case 'Shallows':
            case 'Rapids': return '#1e243e';
            case 'Road': return '#2d241d'; // Using brown base layer color
            case 'Tunnel':
            case 'Cavern': return '#000000';
            case 'Brush': return '#2d352d';
            case 'Base': return '#2d241d'; // Dark dirt
            default: return '#1e1e2e';
        }
    } else {
        switch (t) {
            case 'City': return '#e6e9ef';
            case 'Building': return '#dce0e8';
            case 'Forest': return '#d4ead4';
            case 'Field':
            case 'Grasslands': return '#e9edc9';
            case 'Hills': return '#faedcd';
            case 'Mountains': return '#e5e5e5';
            case 'Water':
            case 'Shallows':
            case 'Rapids': return '#d4e6f1';
            case 'Road': return '#e3d5c8'; // Using brown base layer color
            case 'Tunnel':
            case 'Cavern': return '#d0d0d0';
            case 'Base': return '#e3d5c8'; // Light dirt
            default: return '#ffffff';
        }
    }
};

