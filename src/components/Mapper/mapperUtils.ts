export const GRID_SIZE = 50;
export const ROAD_COLOR_DARK = '#8b7d6b'; // Warm tan for roads in dark mode
export const ROAD_COLOR_LIGHT = '#d2b48c'; // Tan for roads in light mode
export const PATH_COLOR_DARK = '#7c6f64'; // Slightly darker sand/path
export const PATH_COLOR_LIGHT = '#c2b280'; // Sand color

export const DIRS: Record<string, { dx: number, dy: number, dz?: number, opp: string, name: string }> = {
    n: { dx: 0, dy: -1, opp: 's', name: 'North' },
    north: { dx: 0, dy: -1, opp: 's', name: 'North' },
    s: { dx: 0, dy: 1, opp: 'n', name: 'South' },
    south: { dx: 0, dy: 1, opp: 'n', name: 'South' },
    e: { dx: 1, dy: 0, opp: 'w', name: 'East' },
    east: { dx: 1, dy: 0, opp: 'w', name: 'East' },
    w: { dx: -1, dy: 0, opp: 'e', name: 'West' },
    west: { dx: -1, dy: 0, opp: 'e', name: 'West' },
    u: { dx: 0, dy: 0, dz: 1, opp: 'd', name: 'Up' },
    up: { dx: 0, dy: 0, dz: 1, opp: 'd', name: 'Up' },
    d: { dx: 0, dy: 0, dz: -1, opp: 'u', name: 'Down' },
    down: { dx: 0, dy: 0, dz: -1, opp: 'u', name: 'Down' },
    ne: { dx: 1, dy: -1, opp: 'sw', name: 'Northeast' },
    northeast: { dx: 1, dy: -1, opp: 'sw', name: 'Northeast' },
    nw: { dx: -1, dy: -1, opp: 'se', name: 'Northwest' },
    northwest: { dx: -1, dy: -1, opp: 'se', name: 'Northwest' },
    se: { dx: 1, dy: 1, opp: 'nw', name: 'Southeast' },
    southeast: { dx: 1, dy: 1, opp: 'nw', name: 'Southeast' },
    sw: { dx: -1, dy: 1, opp: 'ne', name: 'Southwest' },
    southwest: { dx: -1, dy: 1, opp: 'ne', name: 'Southwest' }
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
    if (low.includes('tunnel') || low.includes('cavern') || low.includes('inside')) return 'Cavern';
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

export const getTerrainColor = (terrain: string | number, isDarkMode: boolean): string => {
    let t = typeof terrain === 'number' ? TERRAIN_MAP[String(terrain)] : terrain;
    t = normalizeTerrain(t);

    if (isDarkMode) {
        switch (t) {
            case 'City': return '#6b4f35'; 
            case 'Building': return '#585b70';
            case 'Forest': return '#2d5a27';
            case 'Field':
            case 'Grasslands': return '#415e34';
            case 'Hills': return '#5a462d';
            case 'Mountains': return '#313244';
            case 'Water':
            case 'Shallows':
            case 'Rapids': return '#1e66f5';
            case 'Road': return '#3b4b3b'; 
            case 'Tunnel':
            case 'Cavern': return '#1a1a24'; 
            case 'Brush': return '#3a4a3a';
            case 'Base': return '#243324'; 
            default: return '#2a2a35'; 
        }
    } else {
        switch (t) {
            case 'City': return '#8b5e3c'; // Brown for city blobs in light mode
            case 'Building': return '#dce0e8';
            case 'Forest': return '#d4ead4';
            case 'Field':
            case 'Grasslands': return '#e9edc9';
            case 'Hills': return '#faedcd';
            case 'Mountains': return '#e5e5e5';
            case 'Water':
            case 'Shallows':
            case 'Rapids': return '#d4e6f1';
            case 'Road': return '#e1e9d5'; // Grassy base color
            case 'Tunnel':
            case 'Cavern': return '#d0d0d0';
            case 'Base': return '#e1e9d5'; // Grassy green base
            default: return '#ffffff';
        }
    }
};


export const getGateState = (rA: any, wE: any, d: string, allRooms: Record<string, any>, preloaded: Record<string, any>) => {
    // Authoritative data source: trust live exits if they exist.
    const exA = rA?.exits ? rA.exits[d] : wE?.[d];
    if (!exA) return { hasExit: false, hasDoor: false, isClosed: false };

    const tV = String(exA.target || exA.gmcpDestId || ""), oD = DIRS[d]?.opp;
    const nId = tV && !tV.startsWith('m_') ? `m_${tV}` : tV;
    const n = tV ? (allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { exits: preloaded[tV][4] } : null)) : null;
    const exB = n?.exits?.[oD], hasDF = (f?: any[]) => f?.some(x => /^(door|gate|portcullis|secret)$/i.test(String(x)));

    // Neighbor check: if the neighbor is discovered but has no exit back, we shouldn't draw a door.
    const neighborIsLive = n && (allRooms[nId] || allRooms[tV]);
    if (neighborIsLive && !exB) return { hasExit: true, hasDoor: false, isClosed: false };

    const neighborPointsBack = exB && String(exB.target || exB.gmcpDestId || "").replace(/^m_/, '') === String(rA?.id || "").replace(/^m_/, '');
    const hasD = !!(exA.hasDoor || hasDF(exA.flags) || (neighborPointsBack && (exB.hasDoor || hasDF(exB.flags))));

    if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };

    let isC = (exA.closed !== false);
    if (exB && exB.closed === false) isC = false;

    return { hasExit: true, hasDoor: hasD, isClosed: isC };
};
