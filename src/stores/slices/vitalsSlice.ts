/**
 * @file vitalsSlice.ts
 * @description Shared logic for character vitals, health status, and character info.
 * This slice is used by both the main useVitalsStore and the useSpectateVitalsStore.
 */

import { GmcpCharVitals, CombatHealthStatus, WeatherType, GmcpCharInfo, LightingType } from '../../types';
import { normalizeGmcpWeather } from '../../utils/weatherUtils';

export interface CharacterInfo {
    name: string | null;
    fullname: string | null;
    level: number;
    xp: number;
    xpMax: number;
    tnl: number;
    tp: number;
    tpMax: number;
    tpnl: number;
    race: string;
    subrace: string;
    subclass: string;
    class: string;
    gold: number;
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
    ob?: number;
    db?: number;
    pb?: number;
    armour?: number;
    hpStatus: CombatHealthStatus | null;
    manaStatus: string | null;
    moveStatus: string | null;
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
    conditions?: Record<string, boolean>;
    carrying: string | null;
    isRidden: boolean;
    climb: string | null;
    sneak: string | null;
    isHidden: boolean;
    isSwimming: boolean;
    mountMoves: string | null;
    spellEffort: string | null;
    alertness: string | null;
    gmcpVitals: {
        hp: number;
        maxHp: number;
        mana: number;
        maxMana: number;
        move: number;
        maxMove: number;
        hpStatus: CombatHealthStatus | null;
        manaStatus: string | null;
        moveStatus: string | null;
    };

    applyCharVitals: (data: GmcpCharVitals) => void;
    applyCharInfo: (data: GmcpCharInfo) => void;
    setVitals: (vitals: Partial<VitalsState>) => void;
    setStats: (stats: Partial<{ hp: number; maxHp: number; mana: number; maxMana: number; move: number; maxMove: number }> | ((prev: VitalsState) => Partial<VitalsState>)) => void;
    setHpStatus: (status: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => void;
    setPosition: (pos: string | ((prev: string) => string)) => void;
    setInCombat: (val: boolean | ((prev: boolean) => boolean)) => void;
    setLighting: (l: LightingType | ((prev: LightingType) => LightingType)) => void;
    setWeather: (w: WeatherType | ((prev: WeatherType) => WeatherType)) => void;
    setIsFoggy: (f: boolean | ((prev: boolean) => boolean)) => void;
    setCurrentTerrain: (t: string | ((prev: string) => string)) => void;
    setTarget: (t: string | null | ((prev: string | null) => string | null)) => void;
    setActivePrompt: (p: any) => void;
    setCharacterName: (name: string | null) => void;
}

export const initialVitalsState = {
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100,
    move: 100,
    maxMove: 100,
    ob: undefined,
    db: undefined,
    pb: undefined,
    armour: undefined,
    hpStatus: null,
    manaStatus: null,
    moveStatus: null,
    position: 'standing',
    inCombat: false,
    currentTerrain: '',
    lighting: 'none' as LightingType,
    weather: 'none' as WeatherType,
    isFoggy: false,
    characterInfo: {
        name: null,
        fullname: null,
        level: 0,
        xp: 0,
        xpMax: 0,
        tnl: 0,
        tp: 0,
        tpMax: 0,
        tpnl: 0,
        race: '',
        subrace: '',
        subclass: '',
        class: '',
        gold: 0
    },
    target: null,
    activePrompt: null,
    wimpy: 0,
    conditions: {},
    carrying: null,
    isRidden: false,
    climb: null,
    sneak: null,
    isHidden: false,
    isSwimming: false,
    mountMoves: null,
    spellEffort: null,
    alertness: null,
    gmcpVitals: {
        hp: 100,
        maxHp: 100,
        mana: 100,
        maxMana: 100,
        move: 100,
        maxMove: 100,
        hpStatus: null as CombatHealthStatus | null,
        manaStatus: null as string | null,
        moveStatus: null as string | null
    }
};

// --- Logic Section ---

/**
 * Utility to parse health status strings into strongly typed CombatHealthStatus.
 */
const findStatus = (str: string | undefined): CombatHealthStatus | null => {
    if (!str) return null;
    const lower = str.toLowerCase();
    if (lower.includes('healthy')) return 'Healthy';
    if (lower.includes('fine')) return 'Fine';
    if (lower.includes('hurt')) return 'Hurt';
    if (lower.includes('wounded')) return 'Wounded';
    if (lower.includes('bad')) return 'Bad';
    if (lower.includes('awful')) return 'Awful';
    if (lower.includes('dying')) return 'Dying';
    if (lower.includes('stunned')) return 'Stunned';
    return 'None';
};

const resolveWaitingCondition = (data: GmcpCharVitals): boolean | null => {
    if (typeof data.waiting === 'boolean') return data.waiting;
    const fields = [data.position, data.status, data.state].filter(Boolean).map(value => String(value).toLowerCase());
    if (fields.some(value => value === 'waiting' || value.includes('waiting'))) return true;
    if (fields.some(value => ['standing', 'fighting', 'sleeping', 'sitting', 'resting'].includes(value))) return false;

    const conditions = data.conditions;
    if (Array.isArray(conditions)) return conditions.some(condition => String(condition).toLowerCase() === 'waiting');
    if (typeof conditions === 'string') return conditions.toLowerCase().includes('waiting');
    if (conditions && typeof conditions === 'object' && 'waiting' in conditions) return !!conditions.waiting;

    return null;
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
            if (data.hits !== undefined) updates.hp = data.hits;
            if (data.health !== undefined) updates.hp = data.health;
            if (data.h !== undefined) updates.hp = data.h;
            if (data.maxhp !== undefined) updates.maxHp = data.maxhp;
            if (data.maxhits !== undefined) updates.maxHp = data.maxhits;
            if (data.maxhealth !== undefined) updates.maxHp = data.maxhealth;
            if (data.H !== undefined) updates.maxHp = data.H;
            if (data.mana !== undefined) updates.mana = data.mana;
            if (data.m !== undefined) updates.mana = data.m;
            if (data.maxmana !== undefined) updates.maxMana = data.maxmana;
            if (data.M !== undefined) updates.maxMana = data.M;
            if (data.sp !== undefined) updates.mana = data.sp;
            if (data.s !== undefined) updates.mana = data.s;
            if (data.maxsp !== undefined) updates.maxMana = data.maxsp;
            if (data.S !== undefined) updates.maxMana = data.S;
            if (data.move !== undefined) updates.move = data.move;
            if (data.maxmove !== undefined) updates.maxMove = data.maxmove;
            if (data.mp !== undefined) updates.move = data.mp;
            if (data.maxmp !== undefined) updates.maxMove = data.maxmp;
            if (data.moves !== undefined) updates.move = data.moves;
            if (data.maxmoves !== undefined) updates.maxMove = data.maxmoves;
            if (data.mv !== undefined) updates.move = data.mv;
            if (data.maxmv !== undefined) updates.maxMove = data.maxmv;
            if (data.v !== undefined) updates.move = data.v;
            if (data.V !== undefined) updates.maxMove = data.V;
            if (data.stamina !== undefined) updates.move = data.stamina;
            if (data.maxstamina !== undefined) updates.maxMove = data.maxstamina;

            // --- XP/TP Sync from Vitals ---
            if (data.xp !== undefined || data.xp_max !== undefined || data['next-level-xp'] !== undefined || data.tp !== undefined || data['next-level-tp'] !== undefined) {
                const charInfo = { ...state.characterInfo };
                if (data.xp !== undefined) charInfo.xp = Number(data.xp);
                if (data.xp_max !== undefined) charInfo.xpMax = Number(data.xp_max);
                if (data['next-level-xp'] !== undefined) charInfo.xpMax = Number(data['next-level-xp']);
                if (data.tp !== undefined) charInfo.tp = Number(data.tp);
                if (data['next-level-tp'] !== undefined) charInfo.tpMax = Number(data['next-level-tp']);

                // Calculate TNL/TPNL using threshold - current
                if (charInfo.xpMax > 0) charInfo.tnl = Math.max(0, charInfo.xpMax - charInfo.xp);
                if (charInfo.tpMax > 0) charInfo.tpnl = Math.max(0, charInfo.tpMax - charInfo.tp);
                
                updates.characterInfo = charInfo;
            }

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

            const waitingCondition = resolveWaitingCondition(data);
            if (waitingCondition !== null) {
                updates.conditions = { ...((state as any).conditions || {}), waiting: waitingCondition };
            }

            if (data.position) {
                const rawPosition = String(data.position).toLowerCase();

                // Don't let 'standing' stomp 'riding' because MUME often says 'standing' while mounted.
                const isCurrentlyRiding = state.position === 'riding' || state.position === 'mounted';
                if (!(data.position === 'standing' && isCurrentlyRiding)) {
                    updates.position = rawPosition;
                    // Sync combat state from position
                    updates.inCombat = rawPosition === 'fighting';
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
            if (data.hp_status || data['hp-string'] || data['health-string']) {
                updates.hpStatus = findStatus(data.hp_status ?? data['hp-string'] ?? data['health-string']);
            }

            if (data['mana-string'] !== undefined || data['sp-string'] !== undefined) {
                updates.manaStatus = data['mana-string'] ?? data['sp-string'] ?? null;
            }

            if (data.move_status !== undefined || data.stamina_status !== undefined || data['mp-string'] !== undefined) {
                updates.moveStatus = data.move_status ?? data.stamina_status ?? data['mp-string'] ?? null;
            }

            if (data.weather !== undefined) {
                const weather = normalizeGmcpWeather(data.weather);
                if (weather) updates.weather = weather;
            }

            if (data.fog !== undefined) {
                updates.isFoggy = data.fog === 'on' || data.fog === 'thick' || data.fog === 'yes' || !!data.fog;
            }

            if (data.carrying !== undefined) (updates as any).carrying = data.carrying ?? null;
            if (data.ridden !== undefined) (updates as any).isRidden = !!data.ridden;
            if (data.climb !== undefined) (updates as any).climb = data.climb ?? null;
            if (data.sneak !== undefined) (updates as any).sneak = data.sneak ?? null;
            if (data.hidden !== undefined) (updates as any).isHidden = !!data.hidden;
            if (data.swim !== undefined) (updates as any).isSwimming = !!data.swim;
            if (data['mount-moves'] !== undefined) (updates as any).mountMoves = data['mount-moves'] ?? null;
            if (data['spell-effort'] !== undefined) (updates as any).spellEffort = data['spell-effort'] ?? null;
            if (data.alertness !== undefined) (updates as any).alertness = data.alertness ?? null;

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
                    hpStatus: updates.hpStatus ?? state.gmcpVitals.hpStatus,
                    manaStatus: updates.manaStatus ?? state.gmcpVitals.manaStatus,
                    moveStatus: updates.moveStatus ?? state.gmcpVitals.moveStatus
                }
            };
        });
    },

    applyCharInfo: (data: GmcpCharInfo) => {
        set((state: VitalsState) => ({
            ...state,
            characterInfo: {
                ...state.characterInfo,
                name: data.name ?? state.characterInfo.name,
                fullname: data.fullname ?? state.characterInfo.fullname,
                level: data.level !== undefined ? Number(data.level) : state.characterInfo.level,
                xp: data.xp !== undefined ? Number(data.xp) : state.characterInfo.xp,
                xpMax: data.xp_max !== undefined ? Number(data.xp_max) : (data['next-level-xp'] !== undefined ? Number(data['next-level-xp']) : state.characterInfo.xpMax),
                tp: data.tp !== undefined ? Number(data.tp) : state.characterInfo.tp,
                tpMax: data.tp_max !== undefined ? Number(data.tp_max) : (data['next-level-tp'] !== undefined ? Number(data['next-level-tp']) : state.characterInfo.tpMax),
                tnl: (data.xp_max !== undefined || data['next-level-xp'] !== undefined || data.xp !== undefined) 
                    ? Math.max(0, (data.xp_max !== undefined ? Number(data.xp_max) : (data['next-level-xp'] !== undefined ? Number(data['next-level-xp']) : state.characterInfo.xpMax)) - (data.xp !== undefined ? Number(data.xp) : state.characterInfo.xp))
                    : state.characterInfo.tnl,
                tpnl: (data.tp_max !== undefined || data['next-level-tp'] !== undefined || data.tp !== undefined)
                    ? Math.max(0, (data.tp_max !== undefined ? Number(data.tp_max) : (data['next-level-tp'] !== undefined ? Number(data['next-level-tp']) : state.characterInfo.tpMax)) - (data.tp !== undefined ? Number(data.tp) : state.characterInfo.tp))
                    : state.characterInfo.tpnl,
                race: data.race ?? state.characterInfo.race,
                subrace: data.subrace ?? state.characterInfo.subrace,
                subclass: data.subclass ?? state.characterInfo.subclass,
                class: data.class ?? state.characterInfo.class,
                description: data.description ?? state.characterInfo.description,
                whois: data.whois ?? state.characterInfo.whois
            }
        }));
    },
    setCharacterInfo: (info: Partial<CharacterInfo>) => {
        set((state: VitalsState) => ({
            ...state,
            characterInfo: {
                ...state.characterInfo,
                ...info
            }
        }));
    },

    setVitals: (vitals: Partial<VitalsState>) => {
        set((state: VitalsState) => ({ ...state, ...vitals }));
    },

    setStats: (stats: Partial<{ hp: number; maxHp: number; mana: number; maxMana: number; move: number; maxMove: number }> | ((prev: VitalsState) => Partial<VitalsState>)) => {
        set((state: VitalsState) => {
            const next = typeof stats === 'function' ? stats(state) : stats;
            return { ...state, ...next };
        });
    },

    setHpStatus: (hpStatus: CombatHealthStatus | null | ((prev: CombatHealthStatus | null) => CombatHealthStatus | null)) => 
        set((state: VitalsState) => ({ ...state, hpStatus: typeof hpStatus === 'function' ? hpStatus(state.hpStatus) : hpStatus })),

    setPosition: (pos: string | ((prev: string) => string)) => {
        set((state: VitalsState) => {
            const nextPos = typeof pos === 'function' ? pos(state.position) : pos;
            const rawPosition = String(nextPos).toLowerCase();
            const isCurrentlyRiding = state.position === 'riding' || state.position === 'mounted';
            if (rawPosition === 'standing' && isCurrentlyRiding) return state;
            const waiting = rawPosition === 'waiting' || rawPosition.includes('waiting');
            return {
                ...state,
                position: rawPosition,
                inCombat: rawPosition === 'fighting',
                conditions: { ...((state as any).conditions || {}), waiting }
            };
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
    },
    
    setCharacterName: (name: string | null) => {
        set((state: VitalsState) => ({
            ...state,
            characterInfo: {
                ...state.characterInfo,
                name
            }
        }));
    }
});
