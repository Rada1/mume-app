export const GRID_SIZE = 50;
export const ROAD_COLOR_DARK = '#a08858'; // Muted tan for roads
export const ROAD_COLOR_LIGHT = '#a06828';
export const PATH_COLOR_DARK = '#8a6850'; // Muted peach-brown for paths
export const PATH_COLOR_LIGHT = '#884020';
export const WALL_COLOR = '#3a3c42';
export const LONG_CONNECTION_COLOR = 'rgba(120, 120, 120, 0.45)'; // Subtle gray for long exits/stairs

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

// Pure over a tiny set of distinct terrain inputs, but called many times per tile
// during a cache rebuild (thousands of tiles × several calls each). Memoize so each
// distinct input pays the string-scan cost once.
const normalizeTerrainCache = new Map<string | number, string>();

export const normalizeTerrain = (t: string | number | null): string => {
    if (t === null || t === undefined) return 'Field';

    const cached = normalizeTerrainCache.get(t);
    if (cached !== undefined) return cached;

    const result = computeNormalizeTerrain(t);
    normalizeTerrainCache.set(t, result);
    return result;
};

const computeNormalizeTerrain = (t: string | number): string => {
    const tStr = typeof t === 'number' ? TERRAIN_MAP[String(t)] || String(t) : t;

    const low = tStr.toLowerCase().trim();
    if (low.includes('city') || low.includes('town') || low.includes('street')) return 'City';
    if (low.includes('build') || low.includes('room') || low.includes('inside') || low.includes('indoor') || low.includes('inn') || low.includes('shop') || low.includes('stable') || low.includes('tavern') || low.includes('basement') || low.includes('cellar')) return 'Building';
    if (low.includes('forest') || low.includes('thick')) return 'Forest';
    if (low.includes('field') || low.includes('plain') || low.includes('grass')) return 'Field';
    if (low.includes('hill')) return 'Hills';
    if (low.includes('mountain')) return 'Mountains';
    if (low.includes('underwater')) return 'Underwater';
    if (low.includes('shallow')) return 'Shallows';
    if (low.includes('rapid')) return 'Rapids';
    if (low.includes('water') || low.includes('sea') || low.includes('ocean') || low.includes('river')) return 'Water';
    if (low.includes('road') || low.includes('trail') || low.includes('path')) return 'Road';
    if (low.includes('tunnel')) return 'Tunnel';
    if (low.includes('cavern')) return 'Cavern';
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

export const DEFAULT_TERRAIN_COLORS: Record<string, string> = {
    City: '#78716b',
    Building: '#7a756c',
    Forest: '#436847',
    Field: '#6a9263',
    Grasslands: '#6a9263',
    Hills: '#8a796f',
    Mountains: '#7e6656',
    Water: '#376d95',
    Shallows: '#5d694e',
    Rapids: '#5c8b99',
    Underwater: '#34546f',
    Road: '#616863',
    Tunnel: '#6a6d6d',
    Cavern: '#5b5e75',
    Brush: '#5c7659',
    Base: '#617669',
    Unknown: '#6b6e7b',
};

const darkenTerrainHex = (hex: string, factor: number = 0.62): string => {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

export const getTerrainColor = (
    terrain: string | number,
    isDarkMode: boolean,
    darkModeBrightness: number = 0.62,
    terrainColors?: Record<string, string>
): string => {
    let t = typeof terrain === 'number' ? TERRAIN_MAP[String(terrain)] : terrain;
    t = normalizeTerrain(t);

    const override = terrainColors?.[t] || terrainColors?.Unknown;
    if (override) return isDarkMode ? darkenTerrainHex(override, darkModeBrightness) : override;

    // Rich, distinct atmospheric colors that match the LotR palette.
    const baseColor = (() => {
        switch (t) {
            case 'City': return '#c2b7ad';
            case 'Building': return '#c4bdae';
            case 'Forest': return '#6ca873';
            case 'Field':
            case 'Grasslands': return '#abeb9f';
            case 'Hills': return '#dfc3b3';
            case 'Mountains': return '#cca48b';
            case 'Water': return '#59aff0';
            case 'Shallows': return '#899971';
            case 'Rapids': return '#95e0f7';
            case 'Underwater': return '#5488b3';
            case 'Road': return '#9da89f';
            case 'Tunnel': return '#abafb0';
            case 'Cavern': return '#9297bd';
            case 'Brush': return '#94be8f';
            case 'Base': return '#9cbeaa';
            default: return '#adb2c7';
        }
    })();

    return isDarkMode ? darkenTerrainHex(baseColor, darkModeBrightness) : baseColor;
};


export const getExitTargetId = (exit: any): string => {
    if (!exit) return '';
    if (typeof exit === 'string' || typeof exit === 'number') return String(exit);
    return String(exit.target || exit.gmcpDestId || exit.id || exit.to || exit.to_vnum || '');
};

export const getPreloadedExit = (preloadedExitOrMap: any, d: string) => {
    if (!preloadedExitOrMap) return undefined;
    if (getExitTargetId(preloadedExitOrMap) || preloadedExitOrMap.hasDoor !== undefined || preloadedExitOrMap.flags) {
        return preloadedExitOrMap;
    }
    return preloadedExitOrMap[d];
};

export const getGateState = (rA: any, wE: any, d: string, allRooms: Record<string, any>, preloaded: Record<string, any>) => {
    // Authoritative data source: trust live exits if they exist, but fallback to preloaded if specific exit is missing
    const exA = (rA?.exits && rA.exits[d]) ? rA.exits[d] : getPreloadedExit(wE, d);
    if (!exA) return { hasExit: false, hasDoor: false, isClosed: false };

    const tV = getExitTargetId(exA), oD = DIRS[d]?.opp;
    const nId = tV && !tV.startsWith('m_') ? `m_${tV}` : tV;
    const n = tV ? (allRooms[nId] || allRooms[tV] || (preloaded[tV] ? { exits: preloaded[tV][4] } : null)) : null;
    const exB = n?.exits?.[oD], hasDF = (f?: any[]) => f?.some(x => /^(door|gate|portcullis|secret)$/i.test(String(x)));

    // Neighbor check: if the neighbor is discovered but has no exit back, we shouldn't draw a door.
    const neighborIsLive = n && (allRooms[nId] || allRooms[tV]);
    if (neighborIsLive && !exB) return { hasExit: true, hasDoor: false, isClosed: false };

    const neighborPointsBack = exB && getExitTargetId(exB).replace(/^m_/, '') === String(rA?.id || "").replace(/^m_/, '');
    const hasD = !!(exA.hasDoor || hasDF(exA.flags) || (neighborPointsBack && (exB.hasDoor || hasDF(exB.flags))));

    if (!hasD) return { hasExit: true, hasDoor: false, isClosed: false };

    let isC = (exA.closed !== false);
    if (exB && exB.closed === false) isC = false;

    return { hasExit: true, hasDoor: hasD, isClosed: isC };
};

// --- Organic Map Utilities ---

/**
 * Generates seeded random values for a room based on its VNUM.
 * Ensures the map looks "hand-drawn" but stays consistent on every render.
 */
export const getRoomDNA = (vnum: string | number) => {
    const seed = typeof vnum === 'string' ? parseInt(vnum.replace(/\D/g, '')) || 0 : vnum;
    
    // Simple LCG-like seeded randoms
    const rng = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
    };

    return {
        offsetX: (rng(seed * 1.1) - 0.5) * 12, // ±6px jitter
        offsetY: (rng(seed * 2.2) - 0.5) * 12,
        scale: 0.85 + rng(seed * 3.3) * 0.3,   // 0.85x to 1.15x
        rotation: (rng(seed * 4.4) - 0.5) * 0.1, // ±0.05rad tilt
        mutation: rng(seed * 5.5),             // 0.0 to 1.0 for "Lonely Peak" chance
        flip: rng(seed * 6.6) > 0.5            // Mirroring
    };
};

/**
 * Calculates the "Clump Depth" of a room within its own terrain type.
 * Used to make central mountains taller than outskirts.
 */
export const getTerrainDepth = (vnum: string, allRooms: Record<string, any>, preloaded: Record<string, any>) => {
    const room = allRooms[vnum] || allRooms[`m_${vnum}`];
    const rData = preloaded[vnum.startsWith('m_') ? vnum.substring(2) : vnum];
    if (!rData) return 1;

    const terrain = normalizeTerrain(room?.terrain || rData[3]);
    const exits = room?.exits || rData[4] || {};
    
    let neighborCount = 0;
    const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

    for (const d of dirs) {
        const ex = exits[d];
        if (ex) {
            const targetVnum = String(typeof ex === 'object' ? ex.target : ex);
            const targetData = preloaded[targetVnum] || allRooms[targetVnum] || allRooms[`m_${targetVnum}`];
            if (targetData) {
                const targetTerrain = normalizeTerrain(targetData.terrain || (Array.isArray(targetData) ? targetData[3] : ''));
                if (targetTerrain === terrain) {
                    neighborCount++;
                }
            }
        }
    }

    // Depth logic:
    // 0-2 neighbors: Foothills (Depth 1)
    // 3-5 neighbors: Range (Depth 2)
    // 6-8 neighbors: High Peaks (Depth 3)
    if (neighborCount <= 2) return 1;
    if (neighborCount <= 5) return 2;
    return 3;
};

// Category → flag mappings (authoritative source for checkRoomFilter and BFS)
const CATEGORY_MOB_FLAGS: Record<string, string[]> = {
    shops:    ['SHOP', 'WEAPON_SHOP', 'ARMOUR_SHOP', 'FOOD_SHOP', 'PET_SHOP'],
    guilds:   ['GUILD', 'SCOUT_GUILD', 'MAGE_GUILD', 'CLERIC_GUILD', 'WARRIOR_GUILD', 'RANGER_GUILD'],
    services: ['RENT'],
    danger:   ['AGGRESSIVE_MOB'],
    mobs:     ['AGGRESSIVE_MOB', 'ELITE_MOB', 'SUPER_MOB'],
    quests:   ['QUEST_MOB'],
};

const CATEGORY_LOAD_FLAGS: Record<string, string[]> = {
    mounts:    ['HORSE', 'MULE', 'PACK_HORSE', 'TRAINED_HORSE', 'ROHIRRIM', 'WARG', 'STABLE'],
    travel:    ['BOAT', 'FERRY', 'COACH'],
    resources: ['HERB', 'WATER', 'FOOD'],
    services:  ['MAIL'],
    danger:    ['DEATHTRAP'],
};

const ALL_MOB_FLAG_SET = new Set([
    'RENT', 'SHOP', 'WEAPON_SHOP', 'ARMOUR_SHOP', 'FOOD_SHOP', 'PET_SHOP',
    'GUILD', 'SCOUT_GUILD', 'MAGE_GUILD', 'CLERIC_GUILD', 'WARRIOR_GUILD', 'RANGER_GUILD',
    'AGGRESSIVE_MOB', 'QUEST_MOB', 'PASSIVE_MOB', 'ELITE_MOB', 'SUPER_MOB', 'MILKABLE', 'RATTLESNAKE',
]);

const ALL_LOAD_FLAG_SET = new Set([
    'TREASURE', 'ARMOUR', 'WEAPON', 'WATER', 'FOOD', 'HERB', 'KEY',
    'MULE', 'HORSE', 'PACK_HORSE', 'TRAINED_HORSE', 'ROHIRRIM', 'WARG',
    'BOAT', 'ATTENTION', 'TOWER', 'CLOCK', 'MAIL', 'STABLE',
    'WHITE_WORD', 'DARK_WORD', 'EQUIPMENT', 'COACH', 'FERRY', 'DEATHTRAP',
]);

/**
 * Checks if a room matches the selected filter (category name or specific flag) and optional notes query.
 * When filter is empty and query is set, matches rooms whose notes contain the query string.
 */
export const checkRoomFilter = (
    _roomId: string,
    localRoom: any,
    preloadedData: any,
    filter: string,
    query: string
): boolean => {
    const mobFlags = (localRoom?.mobFlags || preloadedData?.[7] || []) as string[];
    const loadFlags = (localRoom?.loadFlags || preloadedData?.[8] || []) as string[];
    
    const notes = (localRoom?.notes || preloadedData?.[15] || '') as string;
    const name = (localRoom?.name || preloadedData?.[5] || '') as string;
    const desc = (localRoom?.desc || preloadedData?.[17] || '') as string;

    const searchableText = `${name} ${desc} ${notes}`.toLowerCase();

    // Search query check (no filter active)
    if (!filter) {
        if (!query) return false;
        return searchableText.includes(query.toLowerCase());
    }

    // Category filter
    const catMob = CATEGORY_MOB_FLAGS[filter];
    const catLoad = CATEGORY_LOAD_FLAGS[filter];
    let flagMatch: boolean;

    if (catMob || catLoad) {
        flagMatch = (catMob ? mobFlags.some(f => catMob.includes(f)) : false)
            || (catLoad ? loadFlags.some(f => catLoad.includes(f)) : false);
    } else if (ALL_MOB_FLAG_SET.has(filter)) {
        flagMatch = mobFlags.includes(filter);
    } else if (ALL_LOAD_FLAG_SET.has(filter)) {
        flagMatch = loadFlags.includes(filter);
    } else {
        return false;
    }

    if (!flagMatch) return false;

    // Narrow by search query when both filter and query are set
    if (query) return searchableText.includes(query.toLowerCase());

    return true;
};

export interface FindMatchOptions {
    treatMapAsExplored?: boolean;
    explored?: Set<string>;
}

/**
 * Performs a BFS search starting from startId to find the closest room matching the filter and query.
 */
export const findClosestMatchingRoom = (
    startId: string | null,
    rooms: Record<string, any>,
    preloadedCoords: Record<string, any>,
    filter: string,
    query: string,
    options?: FindMatchOptions
): string | null => {
    return findClosestMatchingRoomPath(startId, rooms, preloadedCoords, filter, query, options)?.targetId || null;
};

/**
 * Performs a BFS search and returns the closest matching room plus the route to it.
 *
 * Mode semantics:
 *  - treatMapAsExplored=true: pathfind across the full preloaded map using ghost exits (entire Arda known).
 *  - treatMapAsExplored=false: pathfind only through rooms the player has actually explored (vnums in `explored`)
 *    or custom local rooms, using ghost exit topology but rejecting any neighbor not yet explored.
 */
export const findClosestMatchingRoomPath = (
    startId: string | null,
    rooms: Record<string, any>,
    preloadedCoords: Record<string, any>,
    filter: string,
    query: string,
    options?: FindMatchOptions
): { targetId: string, pathIds: string[], distance: number } | null => {
    if (!startId) return null;

    const treatAsExplored = options?.treatMapAsExplored ?? false;
    const explored = options?.explored;

    const normalizeId = (id: string | null) => {
        if (!id) return '';
        if (id.startsWith('m_')) return id.substring(2);
        if (id.startsWith('r_')) return id.substring(2);
        return id;
    };

    const normStart = normalizeId(startId);

    // In normal mode, only step through rooms the player has explored or rooms they created.
    const isTraversable = (id: string): boolean => {
        if (treatAsExplored) return true;
        if (!explored) return true;
        const normId = normalizeId(id);
        if (explored.has(normId)) return true;
        if (rooms[id] || rooms[`m_${normId}`] || rooms[normId]) return true;
        return false;
    };

    // Ghost exits are the authoritative topology of the world. Local exits are useful only
    // as additions for purely-custom rooms (no preloaded entry). Mixing partial local exits
    // into the BFS was the source of the phantom-teleport / dead-end-line bug.
    const getExits = (id: string) => {
        const normId = normalizeId(id);
        const ghost = preloadedCoords[normId];
        const combined: Record<string, { target: string }> = {};

        if (ghost && ghost[4]) {
            const ghostExits = ghost[4] as Record<string, { target: string }>;
            for (const [dir, ex] of Object.entries(ghostExits)) {
                if (!ex || !ex.target) continue;
                const targetVnum = String(ex.target);
                const formattedTarget = targetVnum.startsWith('m_') ? targetVnum : `m_${targetVnum}`;
                if (isTraversable(formattedTarget)) {
                    combined[dir] = { target: formattedTarget };
                }
            }
        }

        // Pull in exits from custom local rooms that don't exist in preloaded data
        const local = rooms[id] || rooms[`m_${normId}`] || rooms[normId];
        if (local && local.exits) {
            for (const dir in local.exits) {
                if (combined[dir]) continue;
                const ex = local.exits[dir];
                if (!ex || !ex.target) continue;
                if (isTraversable(ex.target)) {
                    combined[dir] = { target: ex.target };
                }
            }
        }

        return Object.keys(combined).length > 0 ? combined : null;
    };

    const startLocal = rooms[startId] || rooms[`m_${normStart}`] || rooms[normStart];
    const startPre = preloadedCoords[normStart];
    if (checkRoomFilter(startId, startLocal, startPre, filter, query)) {
        return { targetId: startId, pathIds: [startId], distance: 0 };
    }

    const queue: { id: string, pathIds: string[] }[] = [{ id: startId, pathIds: [startId] }];
    const visited = new Set<string>([normStart]);
    let iterations = 0;
    const MAX_ITERATIONS = 50000;

    while (queue.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        const { id: curr, pathIds } = queue.shift()!;
        const exits = getExits(curr);
        if (!exits) continue;

        for (const exit of Object.values(exits) as any[]) {
            if (!exit.target) continue;

            const targetId = String(exit.target);
            const normNext = normalizeId(targetId);

            if (!visited.has(normNext)) {
                visited.add(normNext);

                const nextLocal = rooms[targetId] || rooms[`m_${normNext}`] || rooms[normNext];
                const nextPre = preloadedCoords[normNext];
                if (checkRoomFilter(targetId, nextLocal, nextPre, filter, query)) {
                    const standardTargetId = targetId.startsWith('m_') ? targetId : (preloadedCoords[normNext] ? `m_${normNext}` : targetId);
                    const nextPath = [...pathIds, standardTargetId];
                    return {
                        targetId: standardTargetId,
                        pathIds: nextPath,
                        distance: Math.max(0, nextPath.length - 1)
                    };
                }

                const standardId = targetId.startsWith('m_') ? targetId : (preloadedCoords[normNext] ? `m_${normNext}` : targetId);
                queue.push({ id: standardId, pathIds: [...pathIds, standardId] });
            }
        }
    }

    return null;
};

