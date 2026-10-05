/**
 * @file TimerExpiryToast.tsx
 * @description Main-screen alert for effect timers inside their final minute.
 */

import React from 'react';
import { Timer } from 'lucide-react';
import { useEffectTimerStore } from '../../stores/useEffectTimerStore';
import { EffectTimer } from '../../types';
import { isSpellEffectTimer } from '../../utils/effectTimerUtils';
import './TimerExpiryToast.css';

const WARNING_WINDOW_MS = 60_000;
const START_VISIBLE_MS = 3_000;
const EXIT_MS = 220;

type TimerToastMode = 'started' | 'ending' | 'ended';

interface TimerEventToastState {
    timer: EffectTimer;
    mode: 'started' | 'ended';
    eventAt: number;
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
    const minutes = Math.ceil(total / 60);
    const seconds = total % 60;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
};

const formatStopwatch = (milliseconds: number) => `${(Math.max(0, milliseconds) / 1000).toFixed(2)}s`;

const getTimerBody = (mode: TimerToastMode, timer: EffectTimer, now: number, eventAt = now) => {
    if (mode === 'started') {
        return {
            detail: isSpellEffectTimer(timer.kind)
                ? formatStopwatch(now - timer.startedAt)
                : formatDuration(timer.durationMs),
            label: isSpellEffectTimer(timer.kind) ? `${timer.name} Up` : `${timer.name} timer started`
        };
    }
    if (mode === 'ended') {
        const activeDuration = eventAt - timer.startedAt;
        return {
            detail: formatStopwatch(activeDuration),
            label: `${timer.name} Down`
        };
    }
    const remainingMs = Math.max(0, (timer.expiresAt || now) - now);
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    return {
        detail: `${remainingSeconds}s`,
        label: `${timer.name} timer ending in ${remainingSeconds} seconds`
    };
};

export const TimerExpiryToast: React.FC = () => {
    const timers = useEffectTimerStore(state => state.timers);
    const currentCharacter = useEffectTimerStore(state => state.currentCharacter);
    const clearExpired = useEffectTimerStore(state => state.clearExpired);
    const [now, setNow] = React.useState(Date.now());
    const [eventToast, setEventToast] = React.useState<TimerEventToastState | null>(null);
    const knownTimersRef = React.useRef<Map<string, EffectTimer> | null>(null);
    const knownCharacterRef = React.useRef<string | null | undefined>(undefined);
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
        const currentById = new Map(timers.map(timer => [timer.id, timer]));
        const previousById = knownTimersRef.current;
        const characterChanged = knownCharacterRef.current !== undefined
            && knownCharacterRef.current !== currentCharacter;

        if (!previousById || characterChanged) {
            knownTimersRef.current = currentById;
            knownCharacterRef.current = currentCharacter;
            return;
        }

        const newTimers = timers.filter(timer => previousById.get(timer.id)?.startedAt !== timer.startedAt);
        const newestTimer = newTimers.sort((a, b) => b.startedAt - a.startedAt)[0];
        const endedTimer = newestTimer ? null : Array.from(previousById.values())
            .filter(timer => !currentById.has(timer.id) && isSpellEffectTimer(timer.kind))
            .sort((a, b) => b.startedAt - a.startedAt)[0] || null;

        if (newestTimer || endedTimer) {
            if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
            if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
            const mode = newestTimer ? 'started' : 'ended';
            const eventTimer = newestTimer || endedTimer!;
            const eventAt = Date.now();
            setEventToast({ timer: eventTimer, mode, eventAt, exiting: false });
            hideTimerRef.current = window.setTimeout(() => {
                setEventToast(previous => previous ? { ...previous, exiting: true } : previous);
                clearTimerRef.current = window.setTimeout(() => {
                    setEventToast(null);
                }, EXIT_MS);
            }, START_VISIBLE_MS);
        }

        knownTimersRef.current = currentById;
        knownCharacterRef.current = currentCharacter;
    }, [currentCharacter, timers]);

    React.useEffect(() => () => {
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
        if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    }, []);

    const urgentTimer = React.useMemo(() => getUrgentTimer(timers, now), [now, timers]);
    const mode: TimerToastMode | null = eventToast?.mode || (urgentTimer ? 'ending' : null);
    const activeTimer = eventToast?.timer || urgentTimer;
    if (!mode || !activeTimer) return null;

    const isSpellEvent = (mode === 'started' || mode === 'ended') && isSpellEffectTimer(activeTimer.kind);
    const body = getTimerBody(mode, activeTimer, now, eventToast?.eventAt);

    return (
        <div
            className={`timer-expiry-toast is-${mode}${isSpellEvent ? ' is-spell-event' : ''}${eventToast?.exiting ? ' is-exiting' : ''}`}
            role="status"
            aria-live="polite"
            aria-label={body.label}
        >
            {mode === 'started' || mode === 'ended' ? (
                <div className="timer-expiry-copy is-started">
                    <span className="timer-expiry-name">
                        {isSpellEvent ? body.label : activeTimer.name.toLowerCase()}
                    </span>
                    {isSpellEvent ? (
                        <span className="timer-expiry-time-group">
                            <Timer size={11} aria-hidden="true" />
                            <span className="timer-expiry-seconds">{body.detail}</span>
                        </span>
                    ) : <span className="timer-expiry-seconds">{body.detail}</span>}
                </div>
            ) : (
                <div className="timer-expiry-copy">
                    <span className="timer-expiry-name">{activeTimer.name}</span>
                    <span className="timer-expiry-seconds">{body.detail}</span>
                </div>
            )}
        </div>
    );
};
