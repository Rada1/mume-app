/**
 * @file vitalsSlice.ts
 * @description Shared logic for character vitals, health status, and character info.
 * This slice is used by both the main useVitalsStore and the useSpectateVitalsStore.
 */

import { GmcpCharVitals, CombatHealthStatus, WeatherType, GmcpCharInfo } from '../../types';

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
    weather: WeatherType;
    isFoggy: boolean;
    characterInfo: CharacterInfo;

    applyCharVitals: (data: GmcpCharVitals) => void;
    applyCharInfo: (data: GmcpCharInfo) => void;
    setVitals: (vitals: Partial<VitalsState>) => void;
    setStats: (stats: Partial<{ hp: number; maxHp: number; mana: number; maxMana: number; move: number; maxMove: number }>) => void;
    setHpStatus: (status: CombatHealthStatus | null) => void;
    setPosition: (pos: string) => void;
    setInCombat: (val: boolean) => void;
    setWeather: (w: WeatherType) => void;
    setIsFoggy: (f: boolean) => void;
    setCurrentTerrain: (t: string) => void;
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

            return updates;
        });
    },

    applyCharInfo: (data: GmcpCharInfo) => {
        set((state: VitalsState) => ({
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

    setHpStatus: (status: CombatHealthStatus | null) => {
        set({ hpStatus: status });
    },

    setPosition: (pos: string) => {
        set((state: VitalsState) => {
            const isCurrentlyRiding = state.position === 'riding' || state.position === 'mounted';
            if (pos === 'standing' && isCurrentlyRiding) return state;
            return { position: pos, inCombat: pos === 'fighting' };
        });
    },

    setInCombat: (val: boolean) => {
        set({ inCombat: val });
    },

    setWeather: (weather: WeatherType) => {
        set({ weather });
    },

    setIsFoggy: (isFoggy: boolean) => {
        set({ isFoggy });
    },

    setCurrentTerrain: (currentTerrain: string) => {
        set({ currentTerrain });
    }
});
