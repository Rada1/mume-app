/**
 * @file mechanics.ts
 * @description Shop, Quest, Practice, and Group mechanics.
 */

export interface ShopItem {
    id: string;
    name: string;
    shortName?: string;
    description: string;
    price: string;
    condition?: string;
    age?: string;
    count?: string;
    details?: string;
}

export interface PracticeSkill {
    name: string;
    sessions: string;
    knowledge: string;
    proficiency: number;
    difficulty: string;
    advice: string;
    skillClass?: string;
}

export interface PracticeData {
    sessionsLeft: number;
    skills: PracticeSkill[];
    isAtGuildmaster?: boolean;
}

export interface Quest {
    id: string;
    name: string;
    description: string;
    isUnfinished: boolean;
    area: string;
    fullText?: string;
}

export interface QuestData {
    activeQuests: Quest[];
    lastUpdated: number;
}

import type { DrawerLine } from './game';

export type OptimisticChange =
    | { type: 'wear'; item?: DrawerLine; noun?: string; lineId?: string }
    | { type: 'remove'; item?: DrawerLine; noun?: string; lineId?: string }
    | { type: 'drop'; item?: DrawerLine; from: 'inv' | 'eq'; noun?: string; lineId?: string }
    | { type: 'give'; item?: DrawerLine; from: 'inv' | 'eq'; noun?: string; lineId?: string }
    | { type: 'get'; item?: DrawerLine; noun?: string; lineId?: string }
    | { type: 'put'; item?: DrawerLine; container?: DrawerLine; noun?: string; containerNoun?: string; lineId?: string };

export interface GameAction {
    id: string;
    pattern: string;
    command: string;
    isRegex: boolean;
    enabled: boolean;
}

export interface SoundTrigger {
    id: string;
    pattern: string;
    isRegex: boolean;
    fileName: string | string[];
}

export interface ZoneMusicMapping {
    zone: string;
    url: string | string[];
}
