/**
 * @file TimerExpiryToast.tsx
 * @description Main-screen alert for effect timers inside their final minute.
 */

import React from 'react';
import { Timer } from 'lucide-react';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { EffectTimer } from '../../types';
import './TimerExpiryToast.css';

const WARNING_WINDOW_MS = 60_000;
const RADIUS = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const START_VISIBLE_MS = 3_000;
const EXIT_MS = 220;

type TimerToastMode = 'started' | 'ending';

interface StartedToastState {
    timer: EffectTimer;
    exiting: boolean;
}

const getUrgentTimer = (timers: EffectTimer[], now: number) => (
    timers
        .filter(timer => {
            if (!timer.expiresAt) return false;
            const remainingMs = timer.expiresAt - now;
            return remainingMs > 0 && remainingMs <= WARNING_WINDOW_MS;
        })
        .sort((a, b) => (a.expiresAt || Infinity) - (b.expiresAt || Infinity))[0] || null
);

const formatDuration = (ms?: number) => {
    if (!ms) return 'active';
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    return `${seconds}s`;
};

const getTimerBody = (mode: TimerToastMode, timer: EffectTimer, now: number) => {
    if (mode === 'started') {
        return {
            detail: formatDuration(timer.durationMs),
            progress: 1,
            label: `${timer.name} timer started`
        };
    }
    const remainingMs = Math.max(0, (timer.expiresAt || now) - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
        detail: `${remainingSeconds}s`,
        progress: Math.max(0, Math.min(1, remainingMs / WARNING_WINDOW_MS)),
        label: `${timer.name} timer ending in ${remainingSeconds} seconds`
    };
};

export const TimerExpiryToast: React.FC = () => {
    const { timers, clearExpired } = useEffectTimerStore();
    const [now, setNow] = React.useState(Date.now());
    const [startedToast, setStartedToast] = React.useState<StartedToastState | null>(null);
    const knownTimerIdsRef = React.useRef<Set<string> | null>(null);
    const hideTimerRef = React.useRef<number | null>(null);
    const clearTimerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
            clearExpired();
        }, 1000);
        return () => window.clearInterval(interval);
    }, [clearExpired]);

    React.useEffect(() => {
        const currentIds = new Set(timers.map(timer => timer.id));
        const knownIds = knownTimerIdsRef.current;
        if (knownIds) {
            const newTimers = timers.filter(timer => !knownIds.has(timer.id));
            const newestTimer = newTimers.sort((a, b) => b.startedAt - a.startedAt)[0];
            if (newestTimer) {
                if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
                if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
                setStartedToast({ timer: newestTimer, exiting: false });
                hideTimerRef.current = window.setTimeout(() => {
                    setStartedToast(prev => prev ? { ...prev, exiting: true } : prev);
                    clearTimerRef.current = window.setTimeout(() => {
                        setStartedToast(null);
                    }, EXIT_MS);
                }, START_VISIBLE_MS);
            }
        }
        knownTimerIdsRef.current = currentIds;
    }, [timers]);

    React.useEffect(() => () => {
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    }, []);

    const urgentTimer = React.useMemo(() => getUrgentTimer(timers, now), [now, timers]);
    const mode: TimerToastMode | null = startedToast ? 'started' : urgentTimer ? 'ending' : null;
    const activeTimer = startedToast?.timer || urgentTimer;
    if (!mode || !activeTimer) return null;

    const body = getTimerBody(mode, activeTimer, now);
    const progress = mode === 'started' && startedToast?.exiting ? 0 : body.progress;
    const dashOffset = CIRCUMFERENCE * (1 - progress);

    return (
        <div
            className={`timer-expiry-toast ${mode === 'started' ? 'is-started' : 'is-ending'}${startedToast?.exiting ? ' is-exiting' : ''}`}
            role="status"
            aria-live="polite"
            aria-label={body.label}
        >
            <div className="timer-expiry-ring" aria-hidden="true">
                <svg viewBox="0 0 36 36">
                    <circle className="timer-expiry-ring-bg" cx="18" cy="18" r={RADIUS} />
                    <circle
                        className="timer-expiry-ring-fill"
                        cx="18"
                        cy="18"
                        r={RADIUS}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                    />
                </svg>
                <Timer size={13} className="timer-expiry-icon" />
            </div>
            <div className="timer-expiry-copy">
                <span className="timer-expiry-name">{activeTimer.name}</span>
                <span className="timer-expiry-seconds">
                    {mode === 'started' ? `start ${body.detail}` : body.detail}
                </span>
            </div>
        </div>
    );
};
