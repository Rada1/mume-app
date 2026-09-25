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

    // Effect to monitor XP & TP increments for floating gain animation
    useEffect(() => {
        if (safeXp <= 0 && safeTp <= 0) return;

        // Check XP increment
        if (prevXpRef.current !== null && safeXp > prevXpRef.current) {
            const delta = safeXp - prevXpRef.current;
            const newItem: FloatingGainItem = {
                id: `xp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: 'xp',
                amount: delta
            };

            setFloatingGains(prev => [...prev.slice(-4), newItem]);
            setLastXpGainKey(k => k + 1);

            const timer = window.setTimeout(() => {
                setFloatingGains(prev => prev.filter(item => item.id !== newItem.id));
            }, 1300);

            prevXpRef.current = safeXp;
            return () => window.clearTimeout(timer);
        }
        prevXpRef.current = safeXp;

        // Check TP increment
        if (prevTpRef.current !== null && safeTp > prevTpRef.current) {
            const delta = safeTp - prevTpRef.current;
            const newItem: FloatingGainItem = {
                id: `tp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                type: 'tp',
                amount: delta
            };

            setFloatingGains(prev => [...prev.slice(-4), newItem]);
            setLastTpGainKey(k => k + 1);

            const timer = window.setTimeout(() => {
                setFloatingGains(prev => prev.filter(item => item.id !== newItem.id));
            }, 1300);

            prevTpRef.current = safeTp;
            return () => window.clearTimeout(timer);
        }
        prevTpRef.current = safeTp;
    }, [safeXp, safeTp]);

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
