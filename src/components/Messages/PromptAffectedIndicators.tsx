/**
 * @file PromptAffectedIndicators.tsx
 * @description Compact self-affect summary displayed beside prompt combat stats.
 */

// --- Logic Section ---
import React, { useEffect, useMemo, useState } from 'react';
import { useActiveVitals } from '../../stores/useActiveGameState';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { normalizeAffectName } from '../../utils/affectUtils';

const conditionLabel = (condition: string) => condition
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

type DisplayedAffect = { name: string; key: string; state: 'enter' | 'exit'; animationKey: number };

// --- Render Section ---
export const PromptAffectedIndicators: React.FC = () => {
    const vitals = useActiveVitals();
    const timers = useEffectTimerStore(state => state.timers);
    const clearExpired = useEffectTimerStore(state => state.clearExpired);
    const [now, setNow] = useState(() => Date.now());
    const [displayedAffects, setDisplayedAffects] = useState<DisplayedAffect[]>([]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
            clearExpired();
        }, 60_000);
        return () => window.clearInterval(interval);
    }, [clearExpired]);

    const affects = useMemo(() => {
        const names = [
            ...(vitals.characterInfo.affectedBy || []),
            ...timers
                .filter(timer => !timer.target && (!timer.expiresAt || timer.expiresAt > now))
                .map(timer => timer.name),
            ...Object.entries(vitals.conditions || {})
                .filter(([name, active]) => active && name !== 'waiting')
                .map(([name]) => conditionLabel(name)),
        ];
        // The server can legitimately report the same named affect more than
        // once (for example, multiple "unable to quit" sources). Keep each
        // occurrence so each one gets its own entry/animation.
        return names.filter(name => Boolean(normalizeAffectName(name)));
    }, [now, timers, vitals.characterInfo.affectedBy, vitals.conditions]);

    const affectEntries = useMemo(() => {
        const occurrences = new Map<string, number>();
        return affects.map(name => {
            const normalized = normalizeAffectName(name);
            const occurrence = (occurrences.get(normalized) || 0) + 1;
            occurrences.set(normalized, occurrence);
            return { key: `${normalized}:${occurrence}`, name };
        });
    }, [affects]);
    const affectSignature = affectEntries.map(affect => affect.key).join('|');

    useEffect(() => {
        const nextNames = new Map(affectEntries.map(affect => [affect.key, affect.name]));
        setDisplayedAffects(current => {
            const prior = new Map(current.map(affect => [affect.key, affect]));
            const next = affectEntries.map(({ key, name }) => {
                const existing = prior.get(key);
                return existing && existing.state !== 'exit'
                    ? existing
                    : { name, key, state: 'enter' as const, animationKey: (existing?.animationKey || 0) + 1 };
            });
            const exiting = current.filter(affect => !nextNames.has(affect.key) && affect.state !== 'exit')
                .map(affect => ({ ...affect, state: 'exit' as const, animationKey: affect.animationKey + 1 }));
            return [...next, ...exiting];
        });
    }, [affectEntries, affectSignature]);

    useEffect(() => {
        const exits = displayedAffects.filter(affect => affect.state === 'exit');
        if (exits.length === 0) return;
        const timeout = window.setTimeout(() => {
            setDisplayedAffects(current => current.filter(affect => affect.state !== 'exit'));
        }, 900);
        return () => window.clearTimeout(timeout);
    }, [displayedAffects]);

    if (displayedAffects.length === 0) return null;

    return (
        <>
            <span className="prompt-group-divider" aria-hidden="true">│</span>
            <span className="prompt-affected-indicators" aria-label="Active affects">
                {displayedAffects.map((affect, index) => (
                    <React.Fragment key={affect.key}>
                        {index > 0 && <span className="prompt-affected-divider" aria-hidden="true">·</span>}
                        <span key={affect.animationKey} className={`prompt-affected-name affected-change-${affect.state === 'enter' ? 'up' : 'down'}`} title={`Affected by ${affect.name}`}>{affect.name}</span>
                    </React.Fragment>
                ))}
            </span>
        </>
    );
};

export default React.memo(PromptAffectedIndicators);
