/**
 * @file useZoneMusicConstants.ts
 * @description Constants and type definitions for the zone music system.
 */

import { ZoneMusicMapping } from '../types';

export interface ZoneMusicDeps {
    roomZone: string | null;
    isSoundEnabled: boolean;
    audioCtxRef: React.MutableRefObject<AudioContext | null>;
    zoneMusic: ZoneMusicMapping[];
    isInCombat?: boolean;
    lighting?: string;
    isSleeping?: boolean;
    gameState?: string;
}

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
    'bree-land': '/assets/Sounds/Zone Sounds/BreeSound.wav',
    'the bree-land': '/assets/Sounds/Zone Sounds/BreeSound.wav',
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
    "the deadmen's dike": '/assets/Sounds/Zone Sounds/Fornost.mp3',
    'lhun valley': '/assets/Sounds/Zone Sounds/Lhun Valley.mp3',
    'the lhun valley': '/assets/Sounds/Zone Sounds/Lhun Valley.mp3',
    'ancient broken road': '/assets/Sounds/Zone Sounds/Ancient Broken Road.mp3',
    'the ancient broken road': '/assets/Sounds/Zone Sounds/Ancient Broken Road.mp3',
    'barrow-downs': '/assets/Sounds/Zone Sounds/barrow downs2.mp3',
    'the barrow-downs': '/assets/Sounds/Zone Sounds/barrow downs2.mp3',
    'dunland': '/assets/Sounds/Zone Sounds/Dunland.mp3',
    'emyn-nu-fuin': '/assets/Sounds/Zone Sounds/Emyn.mp3',
    'eregion': '/assets/Sounds/Zone Sounds/Eregion.mp3',
    'ettenmoors': '/assets/Sounds/Zone Sounds/Ettenmoors.mp3',
    'the ettenmoors': '/assets/Sounds/Zone Sounds/Ettenmoors.mp3',
    'gladden fields': '/assets/Sounds/Zone Sounds/Gladden Fields.mp3',
    'the gladden fields': '/assets/Sounds/Zone Sounds/Gladden Fields.mp3',
    'goblin-town': '/assets/Sounds/Zone Sounds/Goblin Town.mp3',
    'the goblin-town': '/assets/Sounds/Zone Sounds/Goblin Town.mp3',
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
    'ost-in-edhil': '/assets/Sounds/Zone Sounds/Ost-in-edhil.mp3',
    'road to grey havens': '/assets/Sounds/Zone Sounds/Road to Grey Havens.mp3',
    'the road to grey havens': '/assets/Sounds/Zone Sounds/Road to Grey Havens.mp3',
    'rohan': '/assets/Sounds/Zone Sounds/Rohan.mp3',
    'tharbad': '/assets/Sounds/Zone Sounds/Tharbad.mp3',
    'trollshaws': '/assets/Sounds/Zone Sounds/Troll Shaws.mp3',
    'the trollshaws': '/assets/Sounds/Zone Sounds/Troll Shaws.mp3',
    'troll warrens': '/assets/Sounds/Zone Sounds/warrens.mp3',
    'the troll warrens': '/assets/Sounds/Zone Sounds/warrens.mp3',
    'weathertop': '/assets/Sounds/Zone Sounds/Weathertop.mp3',
    'the weathertop': '/assets/Sounds/Zone Sounds/Weathertop.mp3',
    'valinor': '/assets/Sounds/Zone Sounds/Valinor.mp3',
    'the valinor': '/assets/Sounds/Zone Sounds/Valinor.mp3',
};

export const FIGHT_MUSIC_URLS = [
    '/assets/Sounds/Sound effects/fight.mp3',
    '/assets/Sounds/Sound effects/fight2.mp3'
];

export const DRUM_LOOP_URL = '/assets/Sounds/Sound effects/drumbeat.mp3';

export const BPM_MAP: Record<string, number> = {
    'Ancient Broken Road.mp3': 80,
    'barrow downs2.mp3': 60,
    'Blue Mountains.mp3': 64,
    'Dunland.mp3': 104,
    'Emyn.mp3': 100,
    'Eregion.mp3': 100,
    'Ettenmoors.mp3': 100,
    'Fangorn Forest.mp3': 104,
    'Fornost.mp3': 96,
    'Gladden Fields.mp3': 100,
    'Goblin Town.mp3': 64,
    'Gray Havens1.mp3': 96,
    'Lhun Valley.mp3': 64,
    'Lorien1.mp3': 100,
    'MidgeWater.mp3': 100,
    'Misty Mountains.mp3': 100,
    'Misty Mountains 2.mp3': 64,
    'Moria.mp3': 100,
    'North Anduin.mp3': 80,
    'northanduin.mp3': 100,
    'Old Forest.mp3': 100,
    'oldeastroad.mp3': 100,
    'oldeastroad2.mp3': 100,
    'Ost-in-edhil.mp3': 88,
    'Rivendell1.mp3': 100,
    'Rivendell2.mp3': 60,
    'Rivendell3.mp3': 100,
    'Road to Grey Havens.mp3': 71,
    'Road to Tharbad.mp3': 100,
    'roadtofornost1.mp3': 80,
    'roadtotharbad.mp3': 88,
    'Rohan.mp3': 100,
    'Shire1.mp3': 100,
    'Shire2.mp3': 72,
    'Tharbad.mp3': 72,
    'Troll Shaws.mp3': 64,
    'Valinor.mp3': 100,
    'warrens.mp3': 88,
    'Weathertop.mp3': 100,
    'drumbeat.mp3': 104,
};

export const ALWAYS_PLAY_ZONES = ['moria', 'goblin-town', 'troll warrens', 'the moria', 'the goblin-town'];
