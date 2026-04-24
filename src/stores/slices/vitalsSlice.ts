/**
 * @file vitalsSlice.ts
 * @description Shared logic for character vitals, health status, and character info.
 * This slice is used by both the main useVitalsStore and the useSpectateVitalsStore.
 */

import { GmcpCharVitals, CombatHealthStatus, WeatherType, GmcpCharInfo, LightingType } from '../../types';

export interface CharacterInfo {
    name: string | null;
    level: number;
    xp: number;
    xpMax: number;
    tp: number;
    tpMax: number;
    race: string;
    subrace: string;
    subclass: string;
    class: string;
    description?: string;
    whois?: string;
}

export interface VitalsState {
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    move: number;
    maxMove: number;
    hpStatus: CombatHealthStatus | null;
    position: string;
    inCombat: boolean;
    currentTerrain: string;
    lighting: LightingType;
    weather: WeatherType;
    isFoggy: boolean;
    characterInfo: CharacterInfo;
    target: string | null;
    activePrompt: any;
    wimpy: number;
    gmcpVitals: {
        hp: number;
        maxHp: number;
        mana: number;
        maxMana: number;
        move: number;
        maxMove: number;
        hpStatus: CombatHealthStatus | null;
    };

    applyCharVitals: (data: GmcpCharVitals) => void;
    applyCharInfo: (data: GmcpCharInfo) => void;
    setVitals: (vitals: Partial<VitalsState>) => void;
    setStats: (stats: Partial<{ hp: number; maxHp: number; mana: number; maxMana: number; move: number; maxMove: number }>) => void;
    setHpStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => void;
    setPosition: (pos: string | ((prev: string) => string)) => void;
    setInCombat: (val: boolean | ((prev: boolean) => boolean)) => void;
    setLighting: (l: LightingType | ((prev: LightingType) => LightingType)) => void;
    setWeather: (w: WeatherType | ((prev: WeatherType) => WeatherType)) => void;
    setIsFoggy: (f: boolean | ((prev: boolean) => boolean)) => void;
    setCurrentTerrain: (t: string | ((prev: string) => string)) => void;
    setTarget: (t: string | null | ((prev: string | null) => string | null)) => void;
    setActivePrompt: (p: any) => void;
}

export const initialVitalsState = {
    hp: 0,
    maxHp: 0,
    mana: 0,
    maxMana: 0,
    move: 0,
    maxMove: 0,
    hpStatus: null,
    position: 'standing',
    inCombat: false,
    currentTerrain: '',
    lighting: 'none' as LightingType,
    weather: 'none' as WeatherType,
    isFoggy: false,
    characterInfo: {
        name: null,
        level: 0,
        xp: 0,
        xpMax: 0,
        tp: 0,
        tpMax: 0,
        race: '',
        subrace: '',
        subclass: '',
        class: ''
    },
    target: null,
    activePrompt: null,
    wimpy: 0,
    gmcpVitals: {
        hp: 0,
        maxHp: 0,
        mana: 0,
        maxMana: 0,
        move: 0,
        maxMove: 0,
        hpStatus: null as CombatHealthStatus | null
    }
};

// --- Logic Section ---

/**
 * Utility to parse health status strings into strongly typed CombatHealthStatus.
 */
const findStatus = (str: string | undefined): CombatHealthStatus | null => {
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower.includes('healthy') || lower.includes('fine')) return 'Healthy';
    if (lower.includes('hurt')) return 'Hurt';
    if (lower.includes('wounded')) return 'Wounded';
    if (lower.includes('bad')) return 'Bad';
    if (lower.includes('awful')) return 'Awful';
    if (lower.includes('dying')) return 'Dying';
    if (lower.includes('stunned')) return 'Stunned';
    return 'None';
};

/**
 * Creates the vitals actions for a Zustand store.
 * @param set The Zustand set function
 * @param get The Zustand get function
 */
export const createVitalsActions = (set: any, get: any) => ({
    applyCharVitals: (data: GmcpCharVitals) => {
        set((state: VitalsState) => {
            const updates: Partial<VitalsState> = {};

            if (data.hp !== undefined) updates.hp = data.hp;
            if (data.maxhp !== undefined) updates.maxHp = data.maxhp;
            if (data.mana !== undefined) updates.mana = data.mana;
            if (data.maxmana !== undefined) updates.maxMana = data.maxmana;
            if (data.sp !== undefined) updates.mana = data.sp;
            if (data.maxsp !== undefined) updates.maxMana = data.maxsp;
            if (data.move !== undefined) updates.move = data.move;
            if (data.maxmove !== undefined) updates.maxMove = data.maxmove;
            if (data.moves !== undefined) updates.move = data.moves;
            if (data.maxmoves !== undefined) updates.maxMove = data.maxmoves;
            if (data.mv !== undefined) updates.move = data.mv;
            if (data.maxmv !== undefined) updates.maxMove = data.maxmv;
            if (data.stamina !== undefined) updates.move = data.stamina;
            if (data.maxstamina !== undefined) updates.maxMove = data.maxstamina;

            if (data.terrain !== undefined && data.terrain !== null) {
                updates.currentTerrain = data.terrain;
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-terrain', { detail: data.terrain }));
                }
            }

            if (data.light !== undefined && data.light !== null) {
                // Determine LightingType from GMCP data
                let type: LightingType = 'none';
                if (typeof data.light === 'number') {
                    type = data.light <= 0 ? 'dark' : 'sun';
                } else if (typeof data.light === 'string') {
                    const l = data.light.toLowerCase();
                    if (l.includes('dark') || l.includes('night') || l.includes('o')) type = 'dark';
                    else if (l.includes('light') || l.includes('day') || l.includes('bright') || l.includes('*')) type = 'sun';
                    else if (l.includes('moon') || l.includes('moonlight') || l.includes(')') || l.includes('(')) type = 'moon';
                    else if (l.includes('!') || l.includes('artificial')) type = 'artificial';
                }
                
                if (type !== 'none') {
                    updates.lighting = type;
                }

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-lighting', { detail: data.light }));
                }
            }

            if (data.position) {
                // Don't let 'standing' stomp 'riding' because MUME often says 'standing' while mounted.
                const isCurrentlyRiding = state.position === 'riding' || state.position === 'mounted';
                if (!(data.position === 'standing' && isCurrentlyRiding)) {
                    updates.position = data.position;
                    // Sync combat state from position
                    updates.inCombat = data.position === 'fighting';
                }
            }

            if (data.wimpy !== undefined) {
                updates.wimpy = data.wimpy;
            }

            // Strict clearing signal: if opponent is null/empty, we ARE NOT fighting
            if (
                data.opponent === null ||
                data.opponent === "" ||
                (data.opponent === undefined && updates.position === 'standing') ||
                (data.opponent === undefined && !updates.position && state.position === 'standing')
            ) {
                updates.inCombat = false;
            }

            // Combat Info via Vitals
            if (data.hp_status) {
                updates.hpStatus = findStatus(data.hp_status);
            }

            if (data.weather !== undefined) {
                if (data.weather === null || data.weather === 'clear') {
                    updates.weather = 'clear';
                } else if (data.weather.includes('rain')) {
                    updates.weather = data.weather.includes('heavy') ? 'heavy-rain' : 'rain';
                } else if (data.weather.includes('snow')) {
                    updates.weather = 'snow';
                } else if (data.weather.includes('cloud')) {
                    updates.weather = 'cloud';
                }
            }

            if (data.fog !== undefined) {
                updates.isFoggy = data.fog === 'on' || data.fog === 'thick' || data.fog === 'yes' || !!data.fog;
            }

            return { 
                ...state, 
                ...updates,
                gmcpVitals: {
                    hp: updates.hp ?? state.gmcpVitals.hp,
                    maxHp: updates.maxHp ?? state.gmcpVitals.maxHp,
                    mana: updates.mana ?? state.gmcpVitals.mana,
                    maxMana: updates.maxMana ?? state.gmcpVitals.maxMana,
                    move: updates.move ?? state.gmcpVitals.move,
                    maxMove: updates.maxMove ?? state.gmcpVitals.maxMove,
                    hpStatus: updates.hpStatus ?? state.gmcpVitals.hpStatus
                }
            };
        });
    },

    applyCharInfo: (data: GmcpCharInfo) => {
        set((state: VitalsState) => ({
            ...state,
            characterInfo: {
                ...state.characterInfo,
                name: data.name ?? data.fullname ?? state.characterInfo.name,
                level: data.level !== undefined ? Number(data.level) : state.characterInfo.level,
                xp: data.xp !== undefined ? Number(data.xp) : state.characterInfo.xp,
                xpMax: data.xp_max !== undefined ? Number(data.xp_max) : (data['next-level-xp'] !== undefined ? Number(data['next-level-xp']) : state.characterInfo.xpMax),
                tp: data.tp !== undefined ? Number(data.tp) : state.characterInfo.tp,
                tpMax: data.tp_max !== undefined ? Number(data.tp_max) : (data['next-level-tp'] !== undefined ? Number(data['next-level-tp']) : state.characterInfo.tpMax),
                race: data.race ?? state.characterInfo.race,
                subrace: data.subrace ?? state.characterInfo.subrace,
                subclass: data.subclass ?? state.characterInfo.subclass,
                class: data.class ?? state.characterInfo.class,
                description: data.description ?? state.characterInfo.description,
                whois: data.whois ?? state.characterInfo.whois
            }
        }));
    },

    setVitals: (vitals: Partial<VitalsState>) => {
        set((state: VitalsState) => ({ ...state, ...vitals }));
    },

    setStats: (stats: Partial<{ hp: number; maxHp: number; mana: number; maxMana: number; move: number; maxMove: number }>) => {
        set((state: VitalsState) => ({ ...state, ...stats }));
    },

    setHpStatus: (hpStatus: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: VitalsState) => ({ ...state, hpStatus: typeof hpStatus === 'function' ? hpStatus(state.hpStatus) : hpStatus })),

    setPosition: (pos: string | ((prev: string) => string)) => {
        set((state: VitalsState) => {
            const nextPos = typeof pos === 'function' ? pos(state.position) : pos;
            const isCurrentlyRiding = state.position === 'riding' || state.position === 'mounted';
            if (nextPos === 'standing' && isCurrentlyRiding) return state;
            return { ...state, position: nextPos, inCombat: nextPos === 'fighting' };
        });
    },

    setInCombat: (inCombat: boolean | ((prev: boolean) => boolean)) => 
        set((state: VitalsState) => ({ ...state, inCombat: typeof inCombat === 'function' ? inCombat(state.inCombat) : inCombat })),

    setLighting: (lighting: LightingType | ((prev: LightingType) => LightingType)) => 
        set((state: VitalsState) => ({ ...state, lighting: typeof lighting === 'function' ? lighting(state.lighting) : lighting })),

    setWeather: (weather: WeatherType | ((prev: WeatherType) => WeatherType)) => 
        set((state: VitalsState) => ({ ...state, weather: typeof weather === 'function' ? weather(state.weather) : weather })),

    setIsFoggy: (isFoggy: boolean | ((prev: boolean) => boolean)) => 
        set((state: VitalsState) => ({ ...state, isFoggy: typeof isFoggy === 'function' ? isFoggy(state.isFoggy) : isFoggy })),

    setCurrentTerrain: (terrain: string | ((prev: string) => string)) => 
        set((state: VitalsState) => ({ ...state, currentTerrain: typeof terrain === 'function' ? terrain(state.currentTerrain) : terrain })),

    setTarget: (target: string | null | ((prev: string | null) => string | null)) => 
        set((state: VitalsState) => ({ ...state, target: typeof target === 'function' ? target(state.target) : target })),

    setActivePrompt: (activePrompt: any) => {
        set((state: VitalsState) => ({ ...state, activePrompt: typeof activePrompt === 'function' ? activePrompt(state.activePrompt) : activePrompt }));
    }
});