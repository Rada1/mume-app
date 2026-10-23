/**
 * @file useCharacterSessionProgress.ts
 * @description Hook managing session baseline XP and TP, detecting real-time gains for
 * floating animations, and tracking leveling bottlenecks.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    determineLevelBlocker,
    FloatingGainItem
} from '../utils/characterProgressUtils';

export interface CharacterSessionProgress {
    sessionXp: number;
    sessionTp: number;
    floatingGains: FloatingGainItem[];
    lastXpGainKey: number;
    lastTpGainKey: number;
    statusText: string;
    statusClass: string;
    isXpMet: boolean;
    isTpMet: boolean;
}

const sessionBaselines = new Map<string, { xp: number | null; tp: number | null }>();

export const useCharacterSessionProgress = (
    characterName: string | null | undefined,
    currentXp: number | null | undefined,
    currentTp: number | null | undefined,
    tnl: number | null | undefined,
    tpnl: number | null | undefined,
    sessionKey?: string
): CharacterSessionProgress => {
    const lastCharRef = useRef<string | null>(null);
    const startXpRef = useRef<number | null>(null);
    const startTpRef = useRef<number | null>(null);
    const prevXpRef = useRef<number | null>(null);
    const prevTpRef = useRef<number | null>(null);
    const gainTimersRef = useRef<number[]>([]);

    const [floatingGains, setFloatingGains] = useState<FloatingGainItem[]>([]);
    const [lastXpGainKey, setLastXpGainKey] = useState(0);
    const [lastTpGainKey, setLastTpGainKey] = useState(0);

    const safeName = characterName?.trim().toLowerCase() || null;
    const safeSessionKey = sessionKey?.trim().toLowerCase() || safeName;
    const shareSessionBaseline = Boolean(sessionKey?.trim());
    const safeXp = typeof currentXp === 'number' && Number.isFinite(currentXp) ? currentXp : 0;
    const safeTp = typeof currentTp === 'number' && Number.isFinite(currentTp) ? currentTp : 0;
    const safeTnl = typeof tnl === 'number' && Number.isFinite(tnl) ? Math.max(0, tnl) : 0;
    const safeTpnl = typeof tpnl === 'number' && Number.isFinite(tpnl) ? Math.max(0, tpnl) : 0;

    // Detect character switch
    if (safeSessionKey !== lastCharRef.current) {
        if (shareSessionBaseline && lastCharRef.current) sessionBaselines.delete(lastCharRef.current);
        lastCharRef.current = safeSessionKey;
        const sharedBaseline = shareSessionBaseline && safeSessionKey ? sessionBaselines.get(safeSessionKey) : undefined;
        startXpRef.current = sharedBaseline?.xp ?? (safeXp > 0 ? safeXp : null);
        startTpRef.current = sharedBaseline?.tp ?? (safeTp > 0 ? safeTp : null);
        if (shareSessionBaseline && safeSessionKey) sessionBaselines.set(safeSessionKey, { xp: startXpRef.current, tp: startTpRef.current });
        prevXpRef.current = safeXp > 0 ? safeXp : null;
        prevTpRef.current = safeTp > 0 ? safeTp : null;
    } else {
        if (startXpRef.current === null && safeXp > 0) {
            if (shareSessionBaseline && safeSessionKey) {
                const baseline = sessionBaselines.get(safeSessionKey);
                startXpRef.current = baseline?.xp ?? safeXp;
                sessionBaselines.set(safeSessionKey, { xp: startXpRef.current, tp: baseline?.tp ?? startTpRef.current });
            } else {
                startXpRef.current = safeXp;
            }
        }
        if (startTpRef.current === null && safeTp > 0) {
            if (shareSessionBaseline && safeSessionKey) {
                const baseline = sessionBaselines.get(safeSessionKey);
                startTpRef.current = baseline?.tp ?? safeTp;
                sessionBaselines.set(safeSessionKey, { xp: baseline?.xp ?? startXpRef.current, tp: startTpRef.current });
            } else {
                startTpRef.current = safeTp;
            }
        }
    }

    // Monitor both gains independently; a single update may award XP and TP.
    useEffect(() => {
        if (safeXp <= 0 && safeTp <= 0) return;
        const gains: FloatingGainItem[] = [];
        if (prevXpRef.current !== null && safeXp > prevXpRef.current) {
            gains.push({
                id: `xp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: 'xp',
                amount: safeXp - prevXpRef.current
            });
            setLastXpGainKey(k => k + 1);
        }
        prevXpRef.current = safeXp;
        if (prevTpRef.current !== null && safeTp > prevTpRef.current) {
            gains.push({
                id: `tp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: 'tp',
                amount: safeTp - prevTpRef.current
            });
            setLastTpGainKey(k => k + 1);
        }
        prevTpRef.current = safeTp;
        if (!gains.length) return;
        setFloatingGains(prev => [...prev, ...gains].slice(-5));
        gains.forEach(item => {
            const timer = window.setTimeout(() => {
                setFloatingGains(prev => prev.filter(gain => gain.id !== item.id));
                gainTimersRef.current = gainTimersRef.current.filter(active => active !== timer);
            }, 2400);
            gainTimersRef.current.push(timer);
        });
    }, [safeXp, safeTp]);

    useEffect(() => () => {
        gainTimersRef.current.forEach(window.clearTimeout);
    }, []);

    const baselineXp = startXpRef.current ?? safeXp;
    const baselineTp = startTpRef.current ?? safeTp;

    const sessionXp = Math.max(0, safeXp - baselineXp);
    const sessionTp = Math.max(0, safeTp - baselineTp);

    const { statusText, statusClass } = useMemo(
        () => determineLevelBlocker(safeTnl, safeTpnl),
        [safeTnl, safeTpnl]
    );

    return {
        sessionXp,
        sessionTp,
        floatingGains,
        lastXpGainKey,
        lastTpGainKey,
        statusText,
        statusClass,
        isXpMet: safeTnl === 0,
        isTpMet: safeTpnl === 0
    };
};
