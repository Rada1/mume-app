/**
 * @file timers.ts
 * @description Timer types for spells, herblores, affects, and target effects.
 */

export type EffectTimerKind = 'spell' | 'herblore' | 'poison' | 'blind' | 'sanctuary' | 'charm' | 'stored-spell' | 'cooldown' | 'affect';

export type EffectTimerSource = 'command' | 'parser' | 'gmcp' | 'manual';

export type EffectTimerConfidence = 'estimated' | 'confirmed' | 'unknown';

export interface EffectTimerPhase {
    label: string;
    durationMs: number;
    effects?: string[];
}

export interface EffectTimerCatalogEntry {
    id: string;
    name: string;
    kind: EffectTimerKind;
    aliases: string[];
    durationMs?: number;
    phases?: EffectTimerPhase[];
    startPatterns?: RegExp[];
    endPatterns?: RegExp[];
}

export interface EffectTimer {
    id: string;
    catalogId: string;
    name: string;
    kind: EffectTimerKind;
    target?: string;
    startedAt: number;
    expiresAt?: number;
    durationMs?: number;
    source: EffectTimerSource;
    confidence: EffectTimerConfidence;
    phaseIndex?: number;
    phases?: EffectTimerPhase[];
    notes?: string;
}
