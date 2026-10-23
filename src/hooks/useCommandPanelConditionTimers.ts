/**
 * @file useCommandPanelConditionTimers.ts
 * @description Supplies compact condition labels and hover details for the command panel.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveEffectTimers } from './useActiveEffectTimers';
import { useCharacterConditions } from './useCharacterConditions';
import { getEffectTimerTone, isSpellEffectTimer, type EffectTimerTone } from '../utils/effectTimerUtils';
import type { EffectTimer } from '../types';

export interface CommandPanelConditionTimerDetails {
    tone: EffectTimerTone | null;
    title: string;
    ariaLabel: string;
}

const normalizeTimerName = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const formatTimeLeft = (milliseconds: number): string => {
    const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${totalMinutes}m`;
};

const formatTimeElapsed = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return totalMinutes > 0
        ? `${totalMinutes}m ${seconds.toString().padStart(2, '0')}s`
        : `${seconds}s`;
};

// --- Logic Section ---
export const useCommandPanelConditionTimers = (
    affectedBy: string[] | undefined,
    conditionsState: Record<string, boolean> | undefined,
    position: string,
    characterName: string
) => {
    const timers = useActiveEffectTimers();
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const conditions = useCharacterConditions(affectedBy, conditionsState, timers, position, now)
        .filter(condition => condition.toLowerCase() !== 'riding');
    const relevantTimers = useMemo(() => timers.filter(timer => {
        if (timer.expiresAt && timer.expiresAt <= now) return false;
        if (!timer.target || timer.target.toLowerCase() === 'self') return true;
        return normalizeTimerName(timer.target) === normalizeTimerName(characterName);
    }), [characterName, now, timers]);

    const getDetails = useCallback((condition: string): CommandPanelConditionTimerDetails | null => {
        const normalized = normalizeTimerName(condition);
        const timer: EffectTimer | undefined = relevantTimers.find(candidate => {
            const timerName = normalizeTimerName(candidate.name);
            const timerId = normalizeTimerName(candidate.catalogId);
            return timerName === normalized || timerName.includes(normalized) || normalized.includes(timerName)
                || timerId === normalized || timerId.includes(normalized);
        });
        if (!timer) return null;

        const time = isSpellEffectTimer(timer.kind)
            ? { label: 'Time active', value: formatTimeElapsed(now - timer.startedAt) }
            : timer.expiresAt
                ? { label: 'Time remaining', value: formatTimeLeft(timer.expiresAt - now) }
                : null;
        if (!time) return null;

        return {
            tone: getEffectTimerTone(timer.kind),
            title: `${condition} · ${time.label}: ${time.value}`,
            ariaLabel: `${condition}, ${time.label}: ${time.value}`
        };
    }, [now, relevantTimers]);

    return { conditions, getDetails };
};
