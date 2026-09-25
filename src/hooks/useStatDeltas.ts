/**
 * @file useStatDeltas.ts
 * @description Tracks short-lived changes to numeric character stats.
 */

import { useEffect, useRef, useState } from 'react';

// --- Logic Section ---
const DELTA_DURATION_MS = 2400;
type StatValues = Record<string, number | null>;
type StatDeltas = Record<string, { amount: number; id: number }>;

export const useStatDeltas = (identity: string, values: StatValues): StatDeltas => {
    const previousRef = useRef<{ identity: string; values: StatValues } | null>(null);
    const timersRef = useRef<Record<string, number>>({});
    const sequenceRef = useRef(0);
    const [deltas, setDeltas] = useState<StatDeltas>({});

    useEffect(() => {
        const previous = previousRef.current;
        previousRef.current = { identity, values };
        if (!identity || !previous || previous.identity !== identity) {
            Object.values(timersRef.current).forEach(window.clearTimeout);
            timersRef.current = {};
            setDeltas({});
            return;
        }

        for (const [key, value] of Object.entries(values)) {
            const prior = previous.values[key];
            if (value === null || prior === null || prior === undefined || value === prior) continue;
            const id = ++sequenceRef.current;
            window.clearTimeout(timersRef.current[key]);
            setDeltas(current => ({ ...current, [key]: { amount: value - prior, id } }));
            timersRef.current[key] = window.setTimeout(() => {
                setDeltas(current => {
                    if (current[key]?.id !== id) return current;
                    const next = { ...current };
                    delete next[key];
                    return next;
                });
                delete timersRef.current[key];
            }, DELTA_DURATION_MS);
        }
    }, [identity, values]);

    useEffect(() => () => {
        Object.values(timersRef.current).forEach(window.clearTimeout);
    }, []);

    return deltas;
};
