/** @file Movement point estimates and soft route preferences for MUME map walking. */
// --- Logic Section ---
import type { WalkRouteOptions } from '../types';

const TERRAIN_NAMES = [
    'undefined', 'indoors', 'city', 'field', 'forest', 'hills', 'mountains',
    'shallow', 'water', 'rapids', 'underwater', 'road', 'brush', 'tunnel', 'cavern',
] as const;
const SYMBOL_TERRAIN: Readonly<Record<string, string>> = {
    '[': 'indoors', '#': 'city', '.': 'field', 'f': 'forest', '(': 'hills',
    '<': 'mountains', '%': 'shallow', '~': 'water', 'W': 'rapids',
    'U': 'underwater', '+': 'road', ':': 'brush', '=': 'tunnel', 'O': 'cavern',
};
const RACE_COSTS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
    elf: { forest: 1, mountains: 3 },
    dwarf: { brush: 3, forest: 3, mountains: 1 },
    hobbit: { field: 1, brush: 3, shallow: 3, mountains: 3 },
    orc: { forest: 3, hills: 1, mountains: 1 },
    troll: { field: 1, brush: 1, forest: 1, shallow: 3, mountains: 1 },
    bear: { forest: 1, hills: 1, mountains: 1 },
};

function terrainName(terrain: unknown): string {
    const raw = String(terrain ?? '').trim();
    const numeric = Number(raw);
    if (raw && Number.isInteger(numeric) && numeric >= 0 && numeric < TERRAIN_NAMES.length) {
        return TERRAIN_NAMES[numeric]!;
    }
    const name = SYMBOL_TERRAIN[raw] ?? raw.toLowerCase().replace(/[_-]+/g, ' ');
    if (name.includes('shallow')) return 'shallow';
    if (name.includes('underwater')) return 'underwater';
    if (name.includes('rapid')) return 'rapids';
    if (name.includes('water')) return 'water';
    if (name.includes('mountain')) return 'mountains';
    if (name.includes('forest')) return 'forest';
    if (name.includes('hill')) return 'hills';
    if (name.includes('brush') || name.includes('scrub')) return 'brush';
    if (name.includes('field') || name.includes('meadow')) return 'field';
    if (name.includes('road')) return 'road';
    if (name.includes('city')) return 'city';
    if (name.includes('building') || name.includes('indoor')) return 'indoors';
    if (name.includes('tunnel')) return 'tunnel';
    if (name.includes('cavern')) return 'cavern';
    return name;
}

function raceName(race: string | undefined): string {
    const name = (race ?? '').toLowerCase();
    if (name.includes('elf') || name.includes('elv')) return 'elf';
    if (name.includes('dwarf') || name.includes('dwar')) return 'dwarf';
    if (name.includes('hobbit')) return 'hobbit';
    if (name.includes('orc')) return 'orc';
    if (name.includes('troll')) return 'troll';
    if (name.includes('bear')) return 'bear';
    return 'man';
}

export function movementPointCost(terrain: unknown, race?: string): number {
    const name = terrainName(terrain);
    const raceCost = RACE_COSTS[raceName(race)]?.[name];
    if (raceCost !== undefined) return raceCost;
    if (['road', 'city', 'indoors', 'tunnel', 'cavern'].includes(name)) return 1;
    if (['water', 'rapids', 'underwater'].includes(name)) return 3;
    return 2;
}

export function routePreferencePenalty(roomId: string, noRide: boolean, options: WalkRouteOptions): number {
    const rawId = roomId.replace(/^(m_|r_)/, '');
    // A mounted route can detour by up to three ordinary moves to avoid one NO_RIDE room.
    const ridePenalty = options.riding && noRide ? 6 : 0;
    // Prefer explored rooms by up to one ordinary move per unknown room.
    const explorationPenalty = !options.revealAll && options.exploredVnums &&
        !options.exploredVnums.has(rawId) && !options.exploredVnums.has(`m_${rawId}`) ? 2 : 0;
    return ridePenalty + explorationPenalty;
}
