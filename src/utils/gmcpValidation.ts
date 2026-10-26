/** @file gmcpValidation.ts — Recognizes full and partial GMCP state packets. */
import type { GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpOccupant, GmcpExitInfo } from '../types';

// --- Partial Packet Recognition Section ---
const VITAL_FIELDS = new Set([
    'hp', 'hits', 'health', 'h', 'maxhp', 'maxhits', 'maxhealth',
    'mana', 'sp', 'spirit', 's', 'm', 'maxmana', 'maxsp', 'maxspirit',
    'move', 'mv', 'mp', 'moves', 'v', 'maxmove', 'maxmv', 'maxmp', 'maxmoves', 'stamina', 'maxstamina', 'st', 'maxst',
    'light', 'l', 'weather', 'w', 'fog', 'f', 'terrain', 'environment',
    'position', 'pos', 'p', 'opponent', 'opp', 'o', 'buff', 'b', 'opponent-hits', 'opponent-hp', 'buffer-hits',
    'hp_status', 'hp-string', 'health-string', 'mana-string', 'mana_status', 'mana-status', 'sp-string',
    'mp-string', 'move-string', 'moves-string', 'mv-string', 'moves_status', 'moves-status', 'move_status', 'stamina_status',
    'waiting', 'status', 'state', 'conditions', 'mood', 'spell-effort', 'alertness', 'wimpy',
    'xp', 'xp_max', 'next-level-xp', 'tp', 'tp_max', 'next-level-tp', 'carrying',
    'ridden', 'ride', 'climb', 'sneak', 'hidden', 'swim', 'mount-moves',
]);
export function isGmcpCharVitals(data: unknown): data is GmcpCharVitals {
    return !!data && typeof data === 'object' && !Array.isArray(data)
        && Object.keys(data).some(key => VITAL_FIELDS.has(key.toLowerCase()));
}

export function isGmcpRoomInfo(data: unknown): data is GmcpRoomInfo {
    return !!data && typeof data === 'object' && (
        'num' in data ||
        'vnum' in data ||
        'id' in data ||
        'name' in data ||
        'terrain' in data ||
        'environment' in data ||
        'weather' in data ||
        'w' in data ||
        'light' in data ||
        'l' in data || 'desc' in data || 'area' in data || 'zone' in data ||
        'exits' in data || 'details' in data || 'sundeath' in data
    );
}

export function isGmcpRoomPlayers(data: unknown): data is GmcpRoomPlayers {
    return !!data && (Array.isArray(data) || (typeof data === 'object' && ('players' in data || 'members' in data || 'chars' in data || 'char' in data || 'npcs' in data || 'list' in data || Object.keys(data).length > 0)));
}

export function isGmcpOccupant(data: unknown): data is GmcpOccupant {
    return !!data && typeof data === 'object' && (('name' in data && typeof data.name === 'string') || ('short' in data && typeof data.short === 'string'));
}

export function isGmcpExitInfoMap(data: unknown): data is Record<string, GmcpExitInfo | false> {
    return !!data && typeof data === 'object' && !Array.isArray(data);
}
