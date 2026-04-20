import { create } from 'zustand';
import { GmcpCharVitals, CombatHealthStatus, WeatherType, GmcpCharInfo } from '../types';
import { gmcpBus } from '../events/gmcpBus';
import { useModeStore } from './useModeStore';

interface CharacterInfo {
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
    wimpy: number | null;
    hpStatus: CombatHealthStatus | null;
    position: string;
    inCombat: boolean;
    currentTerrain: string;
    weather: WeatherType;
    isFoggy: boolean;
    characterInfo: CharacterInfo;
    target: string | null;
    activePrompt: import('../types').ActivePrompt | null;
    conditions: Record<string, boolean>;
}

export interface VitalsActions {
    setStats: (stats: any) => void;
    setHpStatus: (status: CombatHealthStatus | null) => void;
    setPosition: (pos: string) => void;
    setInCombat: (val: boolean) => void;
    setTerrain: (t: string) => void;
    setWeather: (w: WeatherType) => void;
    setIsFoggy: (f: boolean) => void;
    setTarget: (target: string | null) => void;
    setActivePrompt: (prompt: import('../types').ActivePrompt | null) => void;
    setConditions: (conditions: Record<string, boolean>) => void;
    setCharacterName: (name: string | null) => void;
    applyCharVitals: (data: GmcpCharVitals) => void;
    applyCharInfo: (data: GmcpCharInfo) => void;
}

export type VitalsStore = VitalsState & VitalsActions;

// Utility to parse status from string
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

export const useSpectateVitalsStore = create<VitalsStore>((set, get) => ({
    hp: 0,
    maxHp: 0,
    mana: 0,
    maxMana: 0,
    move: 0,
    maxMove: 0,
    wimpy: 0,
    hpStatus: null,
    position: 'standing',
    inCombat: false,
    currentTerrain: 'city',
    weather: 'none',
    isFoggy: false,
    target: null,
    activePrompt: null,
    conditions: {},
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

    setStats: (statsUpdate) => {
        set((state) => {
            const next = typeof statsUpdate === 'function' ? statsUpdate(state) : statsUpdate;
            return { ...next };
        });
    },
    setHpStatus: (hpStatus) => set({ hpStatus }),
    setPosition: (position) => set({ position }),
    setInCombat: (inCombat) => set({ inCombat }),
    setTerrain: (currentTerrain) => set({ currentTerrain }),
    setWeather: (weather) => set({ weather }),
    setIsFoggy: (isFoggy) => set({ isFoggy }),
    setTarget: (target) => set({ target }),
    setActivePrompt: (activePrompt) => set({ activePrompt }),
    setConditions: (conditions) => set({ conditions }),
    setCharacterName: (name) => set((state) => ({ characterInfo: { ...state.characterInfo, name } })),

    applyCharVitals: (data: GmcpCharVitals) => {
        set((state) => {
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
            if (data.stamina !== undefined) updates.move = data.stamina;
            if (data.maxstamina !== undefined) updates.maxMove = data.maxstamina;

            if (data.terrain !== undefined && data.terrain !== null) {
                updates.currentTerrain = data.terrain;
            }

            if (data.position) {
                const isCurrentlyRiding = state.position === 'riding' || state.position === 'mounted';
                if (!(data.position === 'standing' && isCurrentlyRiding)) {
                    updates.position = data.position;
                    updates.inCombat = data.position === 'fighting';
                }
            }

            if (data.opponent === null || data.opponent === "") {
                updates.inCombat = false;
            }

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
        set((state) => ({
            characterInfo: {
                ...state.characterInfo,
                name: data.name ?? data.fullname ?? state.characterInfo.name,
                level: data.level !== undefined ? Number(data.level) : state.characterInfo.level,
                xp: data.xp !== undefined ? Number(data.xp) : state.characterInfo.xp,
                xpMax: data.xp_max !== undefined ? Number(data.xp_max) : state.characterInfo.xpMax,
                tp: data.tp !== undefined ? Number(data.tp) : state.characterInfo.tp,
                tpMax: data.tp_max !== undefined ? Number(data.tp_max) : state.characterInfo.tpMax,
                race: data.race ?? state.characterInfo.race,
                class: data.class ?? state.characterInfo.class,
                description: data.description ?? state.characterInfo.description,
            }
        }));
    }
}));

export const getSpectateVitals = () => useSpectateVitalsStore.getState();

gmcpBus.on('Char.Vitals', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateVitals().applyCharVitals(data);
});

gmcpBus.on('Char.Info', (data) => {
    if (!useModeStore.getState().isSpectating) return;
    getSpectateVitals().applyCharInfo(data);
});
