import { GmcpCharVitals, GmcpRoomInfo, GmcpRoomPlayers, GmcpRoomItems, GmcpOccupant, GmcpExitInfo } from '../types';

export function isGmcpCharVitals(data: any): data is GmcpCharVitals {
    if (!data || typeof data !== 'object') return false;
    const keys = Object.keys(data).map(k => k.toLowerCase());
    return (
        keys.some(k => ['hp', 'hits', 'health', 'h', 'maxhp', 'maxhits', 'H'].includes(k)) ||
        keys.some(k => ['mana', 'sp', 'spirit', 's', 'm', 'maxmana', 'maxsp', 'maxspirit', 'S', 'M'].includes(k)) ||
        keys.some(k => ['move', 'mv', 'mp', 'moves', 'v', 'maxmove', 'maxmv', 'maxmp', 'V'].includes(k)) ||
        keys.some(k => ['light', 'l'].includes(k)) ||
        keys.some(k => ['terrain', 'environment'].includes(k))
    );
}

export function isGmcpRoomInfo(data: any): data is GmcpRoomInfo {
    return data && typeof data === 'object' && (
        'num' in data ||
        'vnum' in data ||
        'id' in data ||
        'name' in data ||
        'terrain' in data ||
        'environment' in data ||
        'light' in data ||
        'l' in data
    );
}

export function isGmcpRoomPlayers(data: any): data is GmcpRoomPlayers {
    return data && (Array.isArray(data) || (typeof data === 'object' && ('players' in data || 'members' in data)));
}

export function isGmcpRoomItems(data: any): data is GmcpRoomItems {
    return data && (Array.isArray(data) || (typeof data === 'object' && ('items' in data || 'objects' in data)));
}

export function isGmcpOccupant(data: any): data is GmcpOccupant {
    return data && typeof data === 'object' && (typeof data.name === 'string' || typeof data.short === 'string');
}

export function isGmcpExitInfoMap(data: any): data is Record<string, GmcpExitInfo | false> {
    return data && typeof data === 'object' && !Array.isArray(data);
}
