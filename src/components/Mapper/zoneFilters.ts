/**
 * @file zoneFilters.ts
 * @description Defines the color overrides applied directly to map elements (walls, roads, terrain) for each zone in Middle-earth.
 */

// --- Types Section ---

export interface ZoneVisualConfig {
    wallColor?: string;
    roadColor?: string;
    pathColor?: string;
    doorColor?: string;
    terrainColors?: Record<string, string>; // overrides for specific terrain types (e.g. Forest, Field, Water, Hills)
}

export interface ZoneFilterConfig { // Keep the name for compatibility with useSettingsStore types
    dark: ZoneVisualConfig;
    light: ZoneVisualConfig;
}

// --- Registry Section ---

export const ZONE_FILTERS: Record<string, ZoneFilterConfig> = {
    'shire': {
        dark: {
            wallColor: '#3e3025',
            pathColor: '#a9a8a7',
            terrainColors: {},
            doorColor: '#b5f962'
        },
        light: {
            wallColor: '#5d4838',
            roadColor: '#9b7e60',
            pathColor: '#826950',
            terrainColors: { Forest: '#436d49', Field: '#7bbf73', Hills: '#a89487' }
        }
    },
    'bree': {
        dark: {
            wallColor: '#3c3e44',
            roadColor: '#8a785d',
            pathColor: '#6d5d47',
            terrainColors: { Forest: '#3b543e', Field: '#232f1d', Shallows: '#426a75', City: '#302821' }
        },
        light: {
            wallColor: '#52555e',
            roadColor: '#bfae93',
            pathColor: '#9c8c73',
            terrainColors: { Forest: '#56755a', Field: '#86a882', Shallows: '#5f8f9c' }
        }
    },
    'old forest': {
        dark: {
            wallColor: '#252d27',
            roadColor: '#4f4b3f',
            pathColor: '#3f3b31',
            terrainColors: {}
        },
        light: {
            wallColor: '#3a443c',
            roadColor: '#7a7465',
            pathColor: '#656052',
            terrainColors: { Forest: '#325039', Brush: '#5c7056', Water: '#3f5f7f' }
        }
    },
    'moria': {
        dark: {
            wallColor: '#000000',
            roadColor: '#40424a',
            pathColor: '#35373d',
            terrainColors: { Building: '#686e8d' },
            doorColor: '#ff1900'
        },
        light: {
            wallColor: '#32353d',
            roadColor: '#656873',
            pathColor: '#525560',
            terrainColors: { Cavern: '#3c3e47', Tunnel: '#4c4e57', Water: '#2f495e' }
        }
    },
    'goblin town': {
        dark: {
            wallColor: '#000000',
            roadColor: '#423d38',
            pathColor: '#332e29',
            terrainColors: { Tunnel: '#413a4b', Water: '#2b3038', Building: '#413a4b', Cavern: '#413a4b' },
            doorColor: '#ff0000'
        },
        light: {
            wallColor: '#453c37',
            roadColor: '#666057',
            pathColor: '#524c45',
            terrainColors: { Cavern: '#4d413b', Tunnel: '#3b342f', Water: '#454a54' }
        }
    },
    'barrow downs': {
        dark: {
            wallColor: '#2b353a',
            roadColor: '#515e63',
            pathColor: '#414d52',
            terrainColors: { Hills: '#3a454d', Field: '#34453b', Forest: '#243b30' }
        },
        light: {
            wallColor: '#424f57',
            roadColor: '#7a898f',
            pathColor: '#65747a',
            terrainColors: { Hills: '#566670', Field: '#4e6657', Forest: '#3b5c4b' }
        }
    },
    'rivendell': {
        dark: {
            wallColor: '#3f4b5c',
            roadColor: '#8a9ab0',
            pathColor: '#6f7f94',
            terrainColors: { Forest: '#2d5438', Water: '#2d5f8c', Shallows: '#3b8ba8', City: '#54472c', Building: '#4e4837', Road: '#3d471a', Field: '#3d471a' },
            doorColor: '#46fe39'
        },
        light: {
            wallColor: '#5a687c',
            roadColor: '#b5c6de',
            pathColor: '#94a5bd',
            terrainColors: { Forest: '#457a53', Water: '#4c8cb8', Shallows: '#5eb3db' }
        }
    },
    'lorien': {
        dark: {
            wallColor: '#5c543f',
            roadColor: '#b0a48a',
            pathColor: '#94886f',
            terrainColors: { Water: '#2d6e8c' },
            doorColor: '#8adcff'
        },
        light: {
            wallColor: '#7c725a',
            roadColor: '#decfae',
            pathColor: '#bdad8c',
            terrainColors: { Forest: '#547a43', Water: '#4c9eb8', Shallows: '#5ecddb' }
        }
    },
    'fangorn': {
        dark: {
            wallColor: '#352718',
            terrainColors: {},
            doorColor: '#00ff55'
        },
        light: {}
    },
    'goblin-town': {
        dark: {
            terrainColors: { Building: '#1f1f1e' }
        },
        light: {}
    },
    'emyn-nu-fuin': {
        dark: {
            terrainColors: { Forest: '#466d4a', Mountains: '#735d4e' }
        },
        light: {}
    },
    'lorien surroundings': {
        dark: {
            terrainColors: {}
        },
        light: {}
    },
    'misty mountains': {
        dark: {
            terrainColors: {}
        },
        light: {}
    },
    'southern mirkwood': {
        dark: {
            wallColor: '#3c2f25'
        },
        light: {}
    },
    'emyn nu fuin': {
        dark: {
            terrainColors: {},
            doorColor: '#ff7b00'
        },
        light: {}
    },
    'grey havens': {
        dark: {
            doorColor: '#00d5ff',
            terrainColors: { City: '#343932' }
        },
        light: {}
    },
    'blue mountains': {
        dark: {
            terrainColors: { City: '#402b2b' }
        },
        light: {}
    },
    'old forest road': {
        dark: {
            terrainColors: {},
            doorColor: '#cfff4d',
            wallColor: '#555c4d'
        },
        light: {}
    },
    'dunland': {
        dark: {
            terrainColors: {}
        },
        light: {}
    },
    'tower hills': {
        dark: {
            doorColor: '#c2d8ab',
            terrainColors: { Building: '#473d2e' }
        },
        light: {}
    },
    'road to grey havens': {
        dark: {
            doorColor: '#6afba9'
        },
        light: {}
    },
    'troll warrens': {
        dark: {
            doorColor: '#ff0000',
            terrainColors: {},
            wallColor: '#2c1c16'
        },
        light: {}
    },
    'redhorn pass': {
        dark: {
            terrainColors: { Hills: '#374733', Field: '#374733', Mountains: '#374633' },
            roadColor: '#cdcbc6',
            pathColor: '#b5b5b5'
        },
        light: {}
    }
};

// --- Logic Section ---

/**
 * Resolves the visual overrides configuration for a given zone.
 * Normalizes the zone name and performs substring matching.
 */
export const getZoneVisuals = (
    zoneName: string | null | undefined,
    isDarkMode: boolean,
    customFilters?: Record<string, ZoneFilterConfig>
): ZoneVisualConfig => {
    const defaultTheme: ZoneVisualConfig = {};

    if (!zoneName) return defaultTheme;

    // Normalize: lowercase, trim, remove leading "the ", replace hyphens with spaces
    const normalized = zoneName.toLowerCase().trim().replace(/^the\s+/i, '').replace(/-/g, ' ');

    const filters = customFilters || ZONE_FILTERS;

    // 1. Check exact match
    if (filters[normalized]) {
        return isDarkMode ? filters[normalized].dark : filters[normalized].light;
    }

    // 2. Check substring/partial match, sorting by length descending to match more specific zones first
    const sortedKeys = Object.keys(filters).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        const cleanKey = key.replace(/-/g, ' ');
        if (normalized.includes(cleanKey) || cleanKey.includes(normalized)) {
            return isDarkMode ? filters[key].dark : filters[key].light;
        }
    }

    return defaultTheme;
};
