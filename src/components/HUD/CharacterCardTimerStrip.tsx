/**
 * @file CharacterCardTimerStrip.tsx
 * @description Compact active affect summary for the character card status header.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { getTimerPhase, useEffectTimerStore } from '../../stores/useEffectTimerStore';

import { parseStoredSpell, capitalizeWords } from '../../utils/affectUtils';

interface CharacterCardTimerStripProps {
    affects?: string[];
}

const formatTimerTime = (ms?: number): string => {
    if (!ms) return 'active';
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    }
    return minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`;
};

const normalizeAffectName = (value: string): string => (
    value.toLowerCase().replace(/[^a-z0-9]+/g, '')
);

export const CharacterCardTimerStrip: React.FC<CharacterCardTimerStripProps> = ({ affects = [] }) => {
    const { timers, clearExpired } = useEffectTimerStore();
    const [now, setNow] = React.useState(Date.now());

    React.useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
            clearExpired();
        }, 1000);
        return () => window.clearInterval(interval);
    }, [clearExpired]);

    const activeTimers = React.useMemo(
        () => [...timers]
            .filter(timer => !timer.expiresAt || timer.expiresAt > now)
            .sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity)),
        [now, timers]
    );

    const activeAffects = React.useMemo(() => {
        const groupedMap = new Map<string, {
            key: string;
            originalName: string;
            displayName: string;
            isStored: boolean;
            count: number;
        }>();

        for (const affect of affects) {
            const trimmed = affect.trim();
            if (!trimmed) continue;

            const storedSpellName = parseStoredSpell(trimmed);
            if (storedSpellName) {
                const key = `stored:${storedSpellName.toLowerCase()}`;
                const existing = groupedMap.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    groupedMap.set(key, {
                        key,
                        originalName: trimmed,
                        displayName: `stored - ${capitalizeWords(storedSpellName)}`,
                        isStored: true,
                        count: 1
                    });
                }
            } else {
                const key = `affect:${trimmed.toLowerCase()}`;
                const existing = groupedMap.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    groupedMap.set(key, {
                        key,
                        originalName: trimmed,
                        displayName: trimmed,
                        isStored: false,
                        count: 1
                    });
                }
            }
        }

        return Array.from(groupedMap.values());
    }, [affects]);

    const affectEntries = React.useMemo(() => activeAffects.map(entry => {
        const normalized = normalizeAffectName(entry.originalName);
        const timer = activeTimers.find(item => {
            const timerName = normalizeAffectName(item.name);
            const timerId = normalizeAffectName(item.catalogId);
            return timerName === normalized || timerName.includes(normalized) || normalized.includes(timerName) || timerId.includes(normalized);
        });
        const displayNameWithCount = entry.count > 1 ? `${entry.displayName} ${entry.count}x` : entry.displayName;
        return {
            key: entry.key,
            displayName: displayNameWithCount,
            isStored: entry.isStored,
            originalName: entry.originalName,
            timer
        };
    }), [activeAffects, activeTimers]);

    if (affectEntries.length === 0) return null;

    const visibleAffects = affectEntries.slice(0, 6);
    const hiddenCount = affectEntries.length - visibleAffects.length;

    return (
        <div className="character-card-timer-strip" aria-label="Active affects">
            <div className="character-card-timer-strip-label">
                <Sparkles size={10} strokeWidth={2.6} />
                <span>Affects</span>
            </div>
            <div className="character-card-timer-chips">
                {visibleAffects.map(({ key, displayName, isStored, originalName, timer }) => {
                    const remainingMs = timer?.expiresAt ? timer.expiresAt - now : undefined;
                    const pct = timer?.durationMs && remainingMs !== undefined
                        ? Math.max(0, Math.min(100, (remainingMs / timer.durationMs) * 100))
                        : 0;
                    const phase = timer ? getTimerPhase(timer, now) : null;
                    const phaseText = phase ? ` - ${phase.label}` : '';
                    const chipKind = isStored ? 'stored-spell' : (timer?.kind || 'affect');
                    return (
                        <div
                            key={key}
                            className={`character-card-timer-chip timer-kind-${chipKind}${timer ? '' : ' is-untimed'}`}
                            title={timer ? `${originalName} - ${formatTimerTime(remainingMs)}${phaseText}` : displayName}
                            style={{ '--timer-progress': `${pct}%` } as React.CSSProperties}
                        >
                            <span className="character-card-timer-name">{displayName}</span>
                            {timer && <span className="character-card-timer-time">{formatTimerTime(remainingMs)}</span>}
                        </div>
                    );
                })}
                {hiddenCount > 0 && (
                    <div className="character-card-timer-chip character-card-timer-more">+{hiddenCount}</div>
                )}
            </div>
        </div>
    );
};

export default React.memo(CharacterCardTimerStrip);
