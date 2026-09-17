/**
 * @file customPromptHelpers.tsx
 * @description Helper mappings, formatters, and icon resolvers for CustomPromptBar.
 */

// --- Logic Section ---
import React from 'react';
import { 
    Sun, Moon, Flame, EyeOff, SunDim, SunMedium,
    Cloud, CloudRain, CloudLightning, Snowflake, Wind, CloudFog,
    Clock, Building, Castle, Trees, Sprout, Mountain, MountainSnow,
    Waves, Footprints, Fish, Route, TreePine, Pickaxe, Compass
} from 'lucide-react';
import { GmcpOccupant, MumeTime } from '../../types';

export interface PromptEntityButton {
    label: string;
    id?: string;
    category: 'cat-npc' | 'cat-object';
}

export interface PromptEnvItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

export const HEALTH_MAP: Record<string, number> = {
    healthy: 100, fine: 83, hurt: 66, wounded: 50,
    bad: 33, awful: 16, dying: 0, stunned: 25, none: 0
};

// MUME reports these descriptive bands during combat rather than exact values.
export const HEALTH_COMBAT_RANGES: Record<string, string> = {
    healthy: '100%', fine: '71–99%', hurt: '51–70%', wounded: '31–50%',
    bad: '16–30%', awful: '6–15%', dying: '1–5%', stunned: '0%', none: '0%'
};

export const MANA_MAP: Record<string, number> = {
    full: 100, burning: 83, hot: 66, warm: 50,
    cold: 33, icy: 16, frozen: 0
};

export const MANA_COMBAT_RANGES: Record<string, string> = {
    full: '100%', burning: '71–99%', hot: '51–70%', warm: '31–50%',
    cold: '16–30%', icy: '6–15%', frozen: '0–5%'
};

export const MOVE_MAP: Record<string, number> = {
    unwearied: 100, steadfast: 85, rested: 71, tired: 57,
    slow: 42, weak: 28, fainting: 14, exhausted: 0
};

export const getLightingLabel = (lighting?: string): string => {
    switch (lighting) {
        case 'sun': return 'Sunlight';
        case 'artificial': return 'Artificial light';
        case 'moon': return 'Moonlight';
        case 'dark': return 'Darkness';
        default: return '';
    }
};

export const getLightingIcon = (lighting?: string): React.ReactNode => {
    switch (lighting) {
        case 'sun':
            return <Sun size={12} className="prompt-env-icon" style={{ color: '#fbbf24' }} />;
        case 'moon':
            return <Moon size={12} className="prompt-env-icon" style={{ color: '#a5b1c2' }} />;
        case 'artificial':
            return <Flame size={12} className="prompt-env-icon" style={{ color: '#f97316' }} />;
        case 'dark':
            return <EyeOff size={12} className="prompt-env-icon" style={{ color: '#9ca3af' }} />;
        case 'normal':
            return <SunDim size={12} className="prompt-env-icon" style={{ color: '#d4cdb8' }} />;
        default:
            return null;
    }
};

export const getTerrainLabel = (terrain?: string | null): string => {
    const value = terrain?.trim() || '';
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

export const getTerrainIcon = (terrain?: string | null): React.ReactNode => {
    const lower = terrain?.trim().toLowerCase() || '';
    if (!lower) return null;

    if (lower.includes('build') || lower.includes('room') || lower.includes('inside') || 
        lower.includes('indoor') || lower.includes('inn') || lower.includes('shop') || 
        lower.includes('stable') || lower.includes('tavern') || lower.includes('house') ||
        lower.includes('basement') || lower.includes('cellar')) {
        return <Building size={12} className="prompt-env-icon" style={{ color: '#d4cdb8' }} />;
    }
    if (lower.includes('city') || lower.includes('town') || lower.includes('street')) {
        return <Castle size={12} className="prompt-env-icon" style={{ color: '#cbd5e1' }} />;
    }
    if (lower.includes('forest') || lower.includes('woods') || lower.includes('jungle') || lower.includes('grove')) {
        return <Trees size={12} className="prompt-env-icon" style={{ color: '#4ade80' }} />;
    }
    if (lower.includes('field') || lower.includes('plain') || lower.includes('grass') || lower.includes('meadow')) {
        return <Sprout size={12} className="prompt-env-icon" style={{ color: '#a3e635' }} />;
    }
    if (lower.includes('hill')) {
        return <Mountain size={12} className="prompt-env-icon" style={{ color: '#d97706' }} />;
    }
    if (lower.includes('mountain') || lower.includes('peak')) {
        return <MountainSnow size={12} className="prompt-env-icon" style={{ color: '#e2e8f0' }} />;
    }
    if (lower.includes('underwater')) {
        return <Fish size={12} className="prompt-env-icon" style={{ color: '#0284c7' }} />;
    }
    if (lower.includes('shallow')) {
        return <Footprints size={12} className="prompt-env-icon" style={{ color: '#67e8f9' }} />;
    }
    if (lower.includes('water') || lower.includes('river') || lower.includes('lake') || 
        lower.includes('sea') || lower.includes('ocean') || lower.includes('rapid')) {
        return <Waves size={12} className="prompt-env-icon" style={{ color: '#38bdf8' }} />;
    }
    if (lower.includes('road') || lower.includes('trail') || lower.includes('path')) {
        return <Route size={12} className="prompt-env-icon" style={{ color: '#94a3b8' }} />;
    }
    if (lower.includes('swamp') || lower.includes('marsh') || lower.includes('bog') || lower.includes('brush') || lower.includes('fen')) {
        return <TreePine size={12} className="prompt-env-icon" style={{ color: '#65a30d' }} />;
    }
    if (lower.includes('cavern') || lower.includes('cave') || lower.includes('tunnel') || lower.includes('underground')) {
        return <Pickaxe size={12} className="prompt-env-icon" style={{ color: '#a8a29e' }} />;
    }
    if (lower.includes('snow') || lower.includes('ice') || lower.includes('arctic') || lower.includes('tundra')) {
        return <Snowflake size={12} className="prompt-env-icon" style={{ color: '#bae6fd' }} />;
    }

    return <Compass size={12} className="prompt-env-icon" style={{ color: '#94a3b8' }} />;
};

export const getWeatherLabel = (weather?: string | null): string => {
    const value = weather?.trim() || '';
    if (!value || value.toLowerCase() === 'none') return '';
    return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

export const getWeatherIcon = (weather?: string | null, isFoggy?: boolean): React.ReactNode => {
    if (isFoggy) {
        return <CloudFog size={12} className="prompt-env-icon" style={{ color: '#94a3b8' }} />;
    }
    const lower = weather?.trim().toLowerCase() || '';
    if (lower.includes('rain')) {
        if (lower.includes('heavy') || lower === '*') {
            return <CloudLightning size={12} className="prompt-env-icon" style={{ color: '#3b82f6' }} />;
        }
        return <CloudRain size={12} className="prompt-env-icon" style={{ color: '#60a5fa' }} />;
    }
    if (lower.includes('snow')) {
        return <Snowflake size={12} className="prompt-env-icon" style={{ color: '#e2e8f0' }} />;
    }
    if (lower.includes('cloud') || lower.includes('overcast') || lower === '~') {
        return <Cloud size={12} className="prompt-env-icon" style={{ color: '#94a3b8' }} />;
    }
    if (lower === 'calm') {
        return <Wind size={12} className="prompt-env-icon" style={{ color: '#94a3b8' }} />;
    }
    if (lower === 'clear') {
        return <SunMedium size={12} className="prompt-env-icon" style={{ color: '#38bdf8' }} />;
    }
    return null;
};

export const formatMumeTime = (t: MumeTime | null): string => {
    if (!t || typeof t.hour !== 'number' || typeof t.minute !== 'number') return '';
    const hour12 = t.hour === 0 ? 12 : (t.hour > 12 ? t.hour - 12 : t.hour);
    const minuteStr = t.minute < 10 ? `0${t.minute}` : `${t.minute}`;
    const ampm = t.hour >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minuteStr} ${ampm}`;
};

export const getTimeIcon = (): React.ReactNode => (
    <Clock size={12} className="prompt-env-icon" style={{ color: 'var(--mume-wiki-link-color, #c9a84c)' }} />
);

export const getRoomEntityLabel = (entity: string | GmcpOccupant): string => {
    if (typeof entity === 'string') return entity.trim();
    return entity.keyword?.trim() || entity.name?.trim() || entity.shortdesc?.trim() || entity.short?.trim() || '';
};

export const getEntityButtonsForPrompt = (
    roomNpcs: Array<string | GmcpOccupant> = [],
    roomItems: Array<string | GmcpOccupant> = [],
): PromptEntityButton[] => {
    const npcs: PromptEntityButton[] = (roomNpcs || [])
        .map(entity => ({
            label: getRoomEntityLabel(entity),
            id: typeof entity === 'string' || entity.id === undefined ? undefined : String(entity.id),
            category: 'cat-npc' as const,
        }))
        .filter(entity => Boolean(entity.label));

    const items: PromptEntityButton[] = (roomItems || [])
        .map(entity => ({
            label: getRoomEntityLabel(entity),
            id: typeof entity === 'string' || entity.id === undefined ? undefined : String(entity.id),
            category: 'cat-object' as const,
        }))
        .filter(entity => Boolean(entity.label));

    return [...npcs, ...items];
};
