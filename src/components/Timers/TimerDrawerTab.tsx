/**
 * @file TimerDrawerTab.tsx
 * @description Status drawer tab for active spell, herblore, and affect timers.
 */

import React from 'react';
import { ChevronDown, TimerReset, Trash2 } from 'lucide-react';
import { EFFECT_TIMER_CATALOG } from '../../data/effectTimerCatalog';
import { getTimerPhase, useEffectTimerStore } from '../../stores/useEffectTimerStore';
import './TimerDrawerTab.css';

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
    const [isPickerOpen, setIsPickerOpen] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    const sortedTimers = React.useMemo(() => [...timers].sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity)), [timers]);

    React.useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
            clearExpired();
        }, 1000);
        return () => window.clearInterval(timer);
    }, [clearExpired]);

    React.useEffect(() => {
        if (!isPickerOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            if (!pickerRef.current?.contains(event.target as Node)) setIsPickerOpen(false);
        };
        window.addEventListener('pointerdown', handlePointerDown);
        return () => window.removeEventListener('pointerdown', handlePointerDown);
    }, [isPickerOpen]);

    const addKnownTimer = (entryId: string) => {
        const entry = EFFECT_TIMER_CATALOG.find(item => item.id === entryId);
        if (entry) addTimer(entry, 'manual');
        setIsPickerOpen(false);
    };

    return (
        <div className="timer-drawer-tab">
            <div className="timer-drawer-toolbar">
                <div className="timer-picker" ref={pickerRef}>
                    <button
                        type="button"
                        className={`timer-picker-trigger${isPickerOpen ? ' open' : ''}`}
                        aria-expanded={isPickerOpen}
                        aria-haspopup="listbox"
                        onClick={() => setIsPickerOpen(open => !open)}
                    >
                        <span>Add known timer...</span>
                        <ChevronDown size={16} />
                    </button>
                    {isPickerOpen && (
                        <div className="timer-picker-menu" role="listbox">
                            {EFFECT_TIMER_CATALOG.map(entry => (
                                <button
                                    key={entry.id}
                                    type="button"
                                    className="timer-picker-option"
                                    role="option"
                                    onClick={() => addKnownTimer(entry.id)}
                                >
                                    <span>{entry.name}</span>
                                    <small>{entry.kind}</small>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <button className="timer-clear-btn" title="Clear all timers" onClick={clearAll}>
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
