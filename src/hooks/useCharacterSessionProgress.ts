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

export const useCharacterSessionProgress = (
    characterName: string | null | undefined,
    currentXp: number | null | undefined,
    currentTp: number | null | undefined,
    tnl: number | null | undefined,
    tpnl: number | null | undefined
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
    const safeXp = typeof currentXp === 'number' && Number.isFinite(currentXp) ? currentXp : 0;
    const safeTp = typeof currentTp === 'number' && Number.isFinite(currentTp) ? currentTp : 0;
    const safeTnl = typeof tnl === 'number' && Number.isFinite(tnl) ? Math.max(0, tnl) : 0;
    const safeTpnl = typeof tpnl === 'number' && Number.isFinite(tpnl) ? Math.max(0, tpnl) : 0;

    // Detect character switch
    if (safeName !== lastCharRef.current) {
        lastCharRef.current = safeName;
        startXpRef.current = safeXp > 0 ? safeXp : null;
        startTpRef.current = safeTp > 0 ? safeTp : null;
        prevXpRef.current = safeXp > 0 ? safeXp : null;
        prevTpRef.current = safeTp > 0 ? safeTp : null;
    } else {
        if (startXpRef.current === null && safeXp > 0) {
            startXpRef.current = safeXp;
        }
        if (startTpRef.current === null && safeTp > 0) {
            startTpRef.current = safeTp;
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
