/**
 * @file useCombatRechargeStore.ts
 * @description Learns short combat recharge timers from sent commands and confirmed player combat lines.
 */

import { create } from 'zustand';
import {
    CombatRechargeAction,
    CombatRechargeConfidence,
    getCombatRechargeActionFromCommand,
    getCombatRechargeActionFromVerb,
    getDefaultRechargeDuration,
    getMedianDuration
} from '../utils/combatRechargeUtils';

interface PendingCombatAttempt {
    action: CombatRechargeAction;
    sentAt: number;
}

export interface CombatRechargeTimer {
    action: CombatRechargeAction;
    startedAt: number;
    expiresAt: number;
    staleAt: number;
    durationMs: number;
    confidence: CombatRechargeConfidence;
    isLanded?: boolean;
}

interface CombatRechargeStats {
    samples: number[];
    lastConfirmedAt?: number;
    lastBlockedAt?: number;
}

interface CombatRechargeState {
    active: Partial<Record<CombatRechargeAction, CombatRechargeTimer>>;
    opponentActive: Partial<Record<CombatRechargeAction, CombatRechargeTimer>>;
    stats: Partial<Record<CombatRechargeAction, CombatRechargeStats>>;
    opponentStats: Partial<Record<CombatRechargeAction, CombatRechargeStats>>;
    pendingAttempts: PendingCombatAttempt[];
    recordCommandAttempt: (command: string, now?: number) => void;
    recordCombatConfirmation: (verb?: string, isLanded?: boolean, now?: number) => void;
    recordOpponentCombatConfirmation: (verb?: string, isLanded?: boolean, now?: number) => void;
    recordBlockedLine: (line: string, now?: number) => void;
    clearExpired: (now?: number) => void;
}

const MIN_SAMPLE_MS = 900;
const MAX_SAMPLE_MS = 20000;
const PENDING_TTL_MS = 12000;
const MAX_SAMPLES = 9;
const MIN_READY_MARGIN_MS = 250;
const MAX_READY_MARGIN_MS = 600;
const READY_MARGIN_RATIO = 0.08;
const COMBAT_RECHARGE_ENABLED = true;

// --- Logic Section ---

const getStats = (
    stats: Partial<Record<CombatRechargeAction, CombatRechargeStats>>,
    action: CombatRechargeAction
) => stats[action] || { samples: [] };

const getPredictedDuration = (action: CombatRechargeAction, stats: CombatRechargeStats) => {
    const learned = getMedianDuration(stats.samples);
    if (learned) {
        return {
            durationMs: learned,
            confidence: stats.samples.length >= 3 ? 'learned' : 'estimated' as CombatRechargeConfidence
        };
    }
    return {
        durationMs: getDefaultRechargeDuration(action),
        confidence: 'unknown' as CombatRechargeConfidence
    };
};

const getChargeHoldDuration = (durationMs: number) =>
    Math.max(2500, Math.round(durationMs * 0.75));

const getConservativeChargeDuration = (durationMs: number) => {
    const margin = Math.round(durationMs * READY_MARGIN_RATIO);
    const clampedMargin = Math.max(MIN_READY_MARGIN_MS, Math.min(MAX_READY_MARGIN_MS, margin));
    return durationMs + clampedMargin;
};

export const useCombatRechargeStore = create<CombatRechargeState>((set, get) => ({
    active: {},
    opponentActive: {},
    stats: {},
    opponentStats: {},
    pendingAttempts: [],

    recordCommandAttempt: (command, now = Date.now()) => {
        const action = getCombatRechargeActionFromCommand(command);
        if (!action) return;
        set((state) => ({
            pendingAttempts: [
                ...state.pendingAttempts.filter(attempt => now - attempt.sentAt < PENDING_TTL_MS),
                { action, sentAt: now }
            ].slice(-8)
        }));
    },

    recordCombatConfirmation: (verb, isLanded = true, now = Date.now()) => {
        const pendingAction = [...get().pendingAttempts]
            .reverse()
            .find(attempt => now - attempt.sentAt < PENDING_TTL_MS)?.action;
        const action = getCombatRechargeActionFromVerb(verb) || pendingAction;
        if (!action) return;

        set((state) => {
            const previousStats = getStats(state.stats, action);
            const elapsed = previousStats.lastConfirmedAt ? now - previousStats.lastConfirmedAt : null;
            const shouldLearn = elapsed !== null && elapsed >= MIN_SAMPLE_MS && elapsed <= MAX_SAMPLE_MS;
            const samples = shouldLearn
                ? [...previousStats.samples, elapsed].slice(-MAX_SAMPLES)
                : previousStats.samples;
            const nextStats = { ...previousStats, samples, lastConfirmedAt: now };
            const prediction = getPredictedDuration(action, nextStats);
            const chargeDurationMs = getConservativeChargeDuration(prediction.durationMs);
            const activeTimer: CombatRechargeTimer = {
                action,
                startedAt: now,
                expiresAt: now + chargeDurationMs,
                staleAt: now + chargeDurationMs + getChargeHoldDuration(chargeDurationMs),
                durationMs: chargeDurationMs,
                confidence: prediction.confidence,
                isLanded
            };

            return {
                stats: { ...state.stats, [action]: nextStats },
                active: { ...state.active, [action]: activeTimer },
                pendingAttempts: state.pendingAttempts.filter(attempt => now - attempt.sentAt < PENDING_TTL_MS)
            };
        });
    },

    recordOpponentCombatConfirmation: (verb, isLanded = true, now = Date.now()) => {
        const action = getCombatRechargeActionFromVerb(verb) || 'hit';

        set((state) => {
            const previousStats = getStats(state.opponentStats, action);
            const elapsed = previousStats.lastConfirmedAt ? now - previousStats.lastConfirmedAt : null;
            const shouldLearn = elapsed !== null && elapsed >= MIN_SAMPLE_MS && elapsed <= MAX_SAMPLE_MS;
            const samples = shouldLearn
                ? [...previousStats.samples, elapsed].slice(-MAX_SAMPLES)
                : previousStats.samples;
            const nextStats = { ...previousStats, samples, lastConfirmedAt: now };
            const prediction = getPredictedDuration(action, nextStats);
            const chargeDurationMs = getConservativeChargeDuration(prediction.durationMs);
            const activeTimer: CombatRechargeTimer = {
                action,
                startedAt: now,
                expiresAt: now + chargeDurationMs,
                staleAt: now + chargeDurationMs + getChargeHoldDuration(chargeDurationMs),
                durationMs: chargeDurationMs,
                confidence: prediction.confidence,
                isLanded
            };

            return {
                opponentStats: { ...state.opponentStats, [action]: nextStats },
                opponentActive: { ...state.opponentActive, [action]: activeTimer }
            };
        });
    },

    recordBlockedLine: (line, now = Date.now()) => {
        if (!/\b(?:not ready|recover|busy|too exhausted|can't do that yet|wait)\b/i.test(line)) return;
        const pending = [...get().pendingAttempts].reverse().find(attempt => now - attempt.sentAt < PENDING_TTL_MS);
        if (!pending) return;
        set((state) => ({
            stats: {
                ...state.stats,
                [pending.action]: { ...getStats(state.stats, pending.action), lastBlockedAt: now }
            }
        }));
    },

    clearExpired: (now = Date.now()) => set((state) => ({
        active: Object.fromEntries(
            Object.entries(state.active).filter(([, timer]) => timer && timer.staleAt > now)
        ) as Partial<Record<CombatRechargeAction, CombatRechargeTimer>>,
        opponentActive: Object.fromEntries(
            Object.entries(state.opponentActive).filter(([, timer]) => timer && timer.staleAt > now)
        ) as Partial<Record<CombatRechargeAction, CombatRechargeTimer>>
    }))
}));

export const recordCombatRechargeCommand = (command: string) =>
    COMBAT_RECHARGE_ENABLED && useCombatRechargeStore.getState().recordCommandAttempt(command);

export const recordCombatRechargeConfirmation = (verb?: string, isLanded?: boolean) =>
    COMBAT_RECHARGE_ENABLED && useCombatRechargeStore.getState().recordCombatConfirmation(verb, isLanded);

export const recordOpponentCombatRechargeConfirmation = (verb?: string, isLanded?: boolean) =>
    COMBAT_RECHARGE_ENABLED && useCombatRechargeStore.getState().recordOpponentCombatConfirmation(verb, isLanded);

export const recordCombatRechargeBlockedLine = (line: string) =>
    COMBAT_RECHARGE_ENABLED && useCombatRechargeStore.getState().recordBlockedLine(line);
