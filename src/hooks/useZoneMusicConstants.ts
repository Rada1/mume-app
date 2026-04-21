/**
 * @file useZoneMusicConstants.ts
 * @description Constants and type definitions for the zone music system.
 */

import { ZoneMusicMapping, MumeTime } from '../types';

export interface ZoneMusicDeps {
    roomZone: string | null;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    zoneMusic: ZoneMusicMapping[];
    isInCombat?: boolean;
    /** MUME game clock. Day/night is derived from this instead of the lighting flag. */
    gameTime: MumeTime | null;
    isSleeping?: boolean;
    gameState?: string;
    masterVolume: number;
    musicVolume: number;
}

/**
 * Compute the current MUME in-game hour (0-23), advancing from the last sync point.
 * Returns null when no time data is available.
 */
export const getMumeHour = (gameTime: MumeTime | null): number | null => {
    if (!gameTime) return null;
    const realTimeElapsedMs = Date.now() - gameTime.lastSyncRealTime;
    const mumeMinutesElapsed = Math.floor(realTimeElapsedMs / 1000); // 1 MUME minute = 1 real second
    const totalMinutes = gameTime.hour * 60 + gameTime.minute + mumeMinutesElapsed;
    return Math.floor(totalMinutes / 60) % 24;
};

/**
 * Returns true when it is daytime in MUME (approx. 6 AM – 8 PM game time).
 * Falls back to true (assume day) when no clock data is available so music
 * always plays rather than being silenced unnecessarily.
 */
export const isGameDay = (gameTime: MumeTime | null): boolean => {
    const hour = getMumeHour(gameTime);
    // If we have no clock data, assume it's daytime so music plays by default.
    if (hour === null) return true;
    // MUME Daytime: 6 AM to 8 PM (20:00)
    const isDay = hour >= 6 && hour <= 20;
    return isDay;
};

/**
 * Standardizes a zone name for mapping lookups.
 * Removes 'the ', trims whitespace, collapses double spaces, and handles dashes.
 */
export const normalizeZoneName = (name: string | null): string => {
    if (!name) return '';
    return name.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim()
        .replace(/^the\s+/i, '')
        .trim()
        .replace(/-/g, ' ')             // Convert dashes to spaces for unified lookup
        .replace(/\s+/g, ' ');          // Collapse multiple spaces
};

export interface TrackState {
    source: AudioBufferSourceNode | null;
    gain: GainNode | null;
    filter?: BiquadFilterNode | null;
    drumSource?: AudioBufferSourceNode | null;
    drumGain?: GainNode | null;
    drumFilter?: BiquadFilterNode | null;
    drumBuffer?: AudioBuffer | null;
    url: string | null;
    buffer?: AudioBuffer | null;
    startTime?: number;
    pauseOffset?: number;
}

export const STATIC_MUSIC_MAP: Record<string, string | string[]> = {
    'bree': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'bree land': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'the bree land': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'old east road': [
        '/assets/Sounds/Zone Sounds/oldeastroad.mp3', 
        '/assets/Sounds/Zone Sounds/oldeastroad2.mp3'
    ],
    'the old east road': [
        '/assets/Sounds/Zone Sounds/oldeastroad.mp3', 
        '/assets/Sounds/Zone Sounds/oldeastroad2.mp3'
    ],
    'shire': [
        '/assets/Sounds/Zone Sounds/Shire1.mp3', 
        '/assets/Sounds/Zone Sounds/Shire2.mp3'
    ],
    'the shire': [
        '/assets/Sounds/Zone Sounds/Shire1.mp3', 
        '/assets/Sounds/Zone Sounds/Shire2.mp3'
    ],
    'blue mountains': '/assets/Sounds/Zone Sounds/Blue Mountains.mp3',
    'the blue mountains': '/assets/Sounds/Zone Sounds/Blue Mountains.mp3',
    'old forest': '/assets/Sounds/Zone Sounds/Old Forest.mp3',
    'the old forest': '/assets/Sounds/Zone Sounds/Old Forest.mp3',
    'rivendell': [
        '/assets/Sounds/Zone Sounds/Rivendell1.mp3', 
        '/assets/Sounds/Zone Sounds/Rivendell2.mp3', 
        '/assets/Sounds/Zone Sounds/Rivendell3.mp3'
    ],
    'grey havens': '/assets/Sounds/Zone Sounds/Gray Havens1.mp3',
    'the grey havens': '/assets/Sounds/Zone Sounds/Gray Havens1.mp3',
    'north anduin': [
        '/assets/Sounds/Zone Sounds/northanduin.mp3',
        '/assets/Sounds/Zone Sounds/North Anduin.mp3'
    ],
    'the northern anduin vale': [
        '/assets/Sounds/Zone Sounds/northanduin.mp3',
        '/assets/Sounds/Zone Sounds/North Anduin.mp3'
    ],
    'road to tharbad': [
        '/assets/Sounds/Zone Sounds/roadtotharbad.mp3',
        '/assets/Sounds/Zone Sounds/Road to Tharbad.mp3'
    ],
    'the road to tharbad': [
        '/assets/Sounds/Zone Sounds/roadtotharbad.mp3',
        '/assets/Sounds/Zone Sounds/Road to Tharbad.mp3'
    ],
    'road to fornost': '/assets/Sounds/Zone Sounds/roadtofornost1.mp3',
    'the road to fornost': '/assets/Sounds/Zone Sounds/roadtofornost1.mp3',
    'fornost': '/assets/Sounds/Zone Sounds/Fornost.mp3',
    "deadmen's dike": '/assets/Sounds/Zone Sounds/Fornost.mp3',
    'lhun valley': '/assets/Sounds/Zone Sounds/Lhun Valley.mp3',
    'ancient broken road': '/assets/Sounds/Zone Sounds/Ancient Broken Road.mp3',
    'the ancient broken road': '/assets/Sounds/Zone Sounds/Ancient Broken Road.mp3',
    'barrow downs': '/assets/Sounds/Zone Sounds/barrow downs2.mp3',
    'the barrow downs': '/assets/Sounds/Zone Sounds/barrow downs2.mp3',
    'dunland': '/assets/Sounds/Zone Sounds/Dunland.mp3',
    'emyn nu fuin': '/assets/Sounds/Zone Sounds/Emyn.mp3',
    'eregion': '/assets/Sounds/Zone Sounds/Eregion.mp3',
    'ettenmoors': '/assets/Sounds/Zone Sounds/Ettenmoors.mp3',
    'the ettenmoors': '/assets/Sounds/Zone Sounds/Ettenmoors.mp3',
    'gladden fields': '/assets/Sounds/Zone Sounds/Gladden Fields.mp3',
    'the gladden fields': '/assets/Sounds/Zone Sounds/Gladden Fields.mp3',
    'goblin town': '/assets/Sounds/Zone Sounds/Goblin Town.mp3',
    'the goblin town': '/assets/Sounds/Zone Sounds/Goblin Town.mp3',
    'lorien': '/assets/Sounds/Zone Sounds/Lorien1.mp3',
    'the lorien surroundings': '/assets/Sounds/Zone Sounds/Lorien1.mp3',
    'midgewaters': '/assets/Sounds/Zone Sounds/MidgeWater.mp3',
    'the midgewaters': '/assets/Sounds/Zone Sounds/MidgeWater.mp3',
    'moria': '/assets/Sounds/Zone Sounds/Moria.mp3',
    'the moria': '/assets/Sounds/Zone Sounds/Moria.mp3',
    'misty mountains': [
        '/assets/Sounds/Zone Sounds/Misty Mountains.mp3',
        '/assets/Sounds/Zone Sounds/Misty Mountains 2.mp3'
    ],
    'the misty mountains': [
        '/assets/Sounds/Zone Sounds/Misty Mountains.mp3',
        '/assets/Sounds/Zone Sounds/Misty Mountains 2.mp3'
    ],
    'ost in edhil': '/assets/Sounds/Zone Sounds/Ost-in-edhil.mp3',
    'road to grey havens': '/assets/Sounds/Zone Sounds/Road to Grey Havens.mp3',
    'the road to grey havens': '/assets/Sounds/Zone Sounds/Road to Grey Havens.mp3',
    'rohan': '/assets/Sounds/Zone Sounds/Rohan.mp3',
    'central anduin': '/assets/Sounds/Zone Sounds/Central Anduin.mp3',
    'isengard': '/assets/Sounds/Zone Sounds/Isengard.mp3',
    'southern mirkwood': '/assets/Sounds/Zone Sounds/Southern Mirkwood.mp3',
    'old forest road': '/assets/Sounds/Zone Sounds/The Old Forest Road.mp3',
    'tower hills': '/assets/Sounds/Zone Sounds/Tower Hills.mp3',
    'redhorn': '/assets/Sounds/Zone Sounds/Redhorn.mp3',
    'redhorn pass': '/assets/Sounds/Zone Sounds/Redhorn.mp3',
    'tharbad': '/assets/Sounds/Zone Sounds/Tharbad.mp3',
    'trollshaws': '/assets/Sounds/Zone Sounds/Troll Shaws.mp3',
    'the trollshaws': '/assets/Sounds/Zone Sounds/Troll Shaws.mp3',
    'troll warrens': '/assets/Sounds/Zone Sounds/warrens.mp3',
    'the troll warrens': '/assets/Sounds/Zone Sounds/warrens.mp3',
    'weathertop': '/assets/Sounds/Zone Sounds/Weathertop.mp3',
    'the weathertop': '/assets/Sounds/Zone Sounds/Weathertop.mp3',
    'valinor': '/assets/Sounds/Zone Sounds/Valinor.mp3',
    'the valinor': '/assets/Sounds/Zone Sounds/Valinor.mp3',
    'fangorn': '/assets/Sounds/Zone Sounds/Fangorn Forest.mp3',
    'the fangorn': '/assets/Sounds/Zone Sounds/Fangorn Forest.mp3',
};

export const FIGHT_MUSIC_URLS = [
    '/assets/Sounds/Sound effects/fight.mp3',
    '/assets/Sounds/Sound effects/fight2.mp3'
];

export const DRUM_LOOP_URL = '/assets/Sounds/Sound effects/drumbeat.mp3';

export const BPM_MAP: Record<string, number> = {
    'Ancient Broken Road.mp3': 72,
    'Blue Mountains.mp3': 64,
    'BreeSound.wav': 96,
    'Central Anduin.mp3': 60,
    'Dunland.mp3': 112,
    'Emyn.mp3': 104,
    'Eregion.mp3': 76,
    'Ettenmoors.mp3': 72,
    'Fangorn Forest.mp3': 88,
    'Fornost.mp3': 72,
    'Gladden Fields.mp3': 64,
    'Goblin Town.mp3': 100,
    'Gray Havens1.mp3': 76,
    'Isengard.mp3': 96,
    'Lhun Valley.mp3': 96,
    'Lorien1.mp3': 112,
    'MidgeWater.mp3': 88,
    'Misty Mountains.mp3': 96,
    'Misty Mountains 2.mp3': 60,
    'Moria.mp3': 92,
    'North Anduin.mp3': 64,
    'northanduin.mp3': 64,
    'Old Forest.mp3': 88,
    'oldeastroad.mp3': 64,
    'oldeastroad2.mp3': 64,
    'Ost-in-edhil.mp3': 112,
    'Redhorn.mp3': 80,
    'Rivendell1.mp3': 60,
    'Rivendell2.mp3': 92,
    'Rivendell3.mp3': 112,
    'Road to Grey Havens.mp3': 92,
    'Road to Tharbad.mp3': 88,
    'roadtofornost1.mp3': 96,
    'roadtotharbad.mp3': 64,
    'Rohan.mp3': 80,
    'Shire1.mp3': 64,
    'Shire2.mp3': 62,
    'Southern Mirkwood.mp3': 64,
    'Tharbad.mp3': 88,
    'The Old Forest Road.mp3': 64,
    'Tower Hills.mp3': 80,
    'Troll Shaws.mp3': 64,
    'Valinor.mp3': 76,
    'warrens.mp3': 94,
    'Weathertop.mp3': 112,
    'barrow downs2.mp3': 60,
    'drumbeat.mp3': 112,
};

export const ALWAYS_PLAY_ZONES = ['moria', 'goblin town', 'troll warrens', 'the moria', 'the goblin town'];
