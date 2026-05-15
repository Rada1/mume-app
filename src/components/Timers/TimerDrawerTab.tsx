/**
 * @file TimerDrawerTab.tsx
 * @description Status drawer tab for active spell, herblore, and affect timers.
 */

import React from 'react';
import { TimerReset, Trash2 } from 'lucide-react';
import { EFFECT_TIMER_CATALOG } from '../../data/effectTimerCatalog';
import { getTimerPhase, useEffectTimerStore } from '../../stores/useEffectTimerStore';

const formatTime = (ms?: number) => {
    if (!ms) return 'active';
    const total = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    return `${seconds}s`;
};

export const TimerDrawerTab: React.FC = () => {
    const { timers, addTimer, removeTimer, clearAll, clearExpired } = useEffectTimerStore();
    const [now, setNow] = React.useState(Date.now());
    const sortedTimers = React.useMemo(() => [...timers].sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity)), [timers]);

    React.useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
            clearExpired();
        }, 1000);
        return () => window.clearInterval(timer);
    }, [clearExpired]);

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--dynamic-log-size, 16px)' }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <select
                    aria-label="Add timer"
                    onChange={(e) => {
                        const entry = EFFECT_TIMER_CATALOG.find(item => item.id === e.target.value);
                        if (entry) addTimer(entry, 'manual');
                        e.currentTarget.value = '';
                    }}
                    defaultValue=""
                    style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '8px' }}
                >
                    <option value="" disabled>Add known timer...</option>
                    {EFFECT_TIMER_CATALOG.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </select>
                <button title="Clear all timers" onClick={clearAll} style={{ width: 38, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)' }}>
                    <Trash2 size={15} />
                </button>
            </div>

            {sortedTimers.length === 0 && (
                <div style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.8em' }}>
                    No active timers yet.
                </div>
            )}

            {sortedTimers.map(timer => {
                const remainingMs = timer.expiresAt ? timer.expiresAt - now : undefined;
                const phase = getTimerPhase(timer, now);
                const pct = timer.durationMs && remainingMs !== undefined ? Math.max(0, Math.min(100, (remainingMs / timer.durationMs) * 100)) : 100;
                return (
                    <div key={timer.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <strong style={{ color: '#4ade80', textTransform: 'uppercase', fontSize: '0.82em' }}>{timer.name}</strong>
                            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65em' }}>{timer.kind}</span>
                            <span style={{ marginLeft: 'auto', color: '#fff', fontFamily: 'monospace', fontSize: '0.9em' }}>{formatTime(remainingMs)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.08)' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.68em' }}>
                            <span>{phase ? `Phase: ${phase.label}` : timer.confidence}</span>
                            {timer.target && <span>Target: {timer.target}</span>}
                            <button title="Restart timer" onClick={() => {
                                const entry = EFFECT_TIMER_CATALOG.find(item => item.id === timer.catalogId);
                                if (entry) addTimer(entry, 'manual', timer.target);
                            }} style={{ marginLeft: 'auto', color: 'inherit', background: 'transparent', border: 0 }}>
                                <TimerReset size={14} />
                            </button>
                            <button title="Remove timer" onClick={() => removeTimer(timer.id)} style={{ color: 'inherit', background: 'transparent', border: 0 }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
