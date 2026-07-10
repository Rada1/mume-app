/**
 * @file OpponentRechargeTimer.tsx
 * @description Shows learned combat charge progress until the next observed combat action.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useCombatRechargeStore } from '../../stores/useCombatRechargeStore';
import { useActiveVitals } from '../../stores/useActiveGameState';

interface OpponentRechargeTimerProps {
    lane?: 'player' | 'opponent';
}

// --- Logic Section ---

// Fixed window the bar fills over, regardless of any learned/predicted timing.
// We don't actually know the real recharge interval, so the bar is a neutral
// "measuring stick": it resets to empty on every hit and creeps up at a constant
// rate, letting the user eyeball how long each hit takes to land.
const FILL_MS = 10000;

const getLatestTimer = (
    timers: ReturnType<typeof useCombatRechargeStore.getState>['active']
) =>
    Object.values(timers)
        .filter(Boolean)
        .sort((a, b) => b.startedAt - a.startedAt)[0] || null;

const OpponentRechargeTimer: React.FC<OpponentRechargeTimerProps> = ({ lane = 'opponent' }) => {
    const active = useCombatRechargeStore(state => lane === 'player' ? state.active : state.opponentActive);
    const clearExpired = useCombatRechargeStore(state => state.clearExpired);
    const isInCombat = useActiveVitals().position === 'fighting';
    const timer = useMemo(() => getLatestTimer(active), [active]);
    const initialNow = Date.now();
    const [isFull, setIsFull] = useState(() => !!timer && initialNow - timer.startedAt >= FILL_MS);
    const [isVisible, setIsVisible] = useState(() => !!timer && initialNow < timer.staleAt);
    const [elapsedMs, setElapsedMs] = useState(0);

    useEffect(() => {
        if (!timer) return;
        if (!isInCombat) {
            setIsVisible(false);
            return;
        }
        const now = Date.now();
        setIsVisible(now < timer.staleAt);
        setIsFull(now - timer.startedAt >= FILL_MS);
        setElapsedMs(now - timer.startedAt);

        let animationFrameId: number;

        const update = () => {
            const currentNow = Date.now();
            const elapsed = currentNow - timer.startedAt;
            setElapsedMs(elapsed);

            if (elapsed < FILL_MS && currentNow < timer.staleAt) {
                animationFrameId = requestAnimationFrame(update);
            } else {
                setIsFull(true);
            }
        };

        if (now - timer.startedAt < FILL_MS) {
            animationFrameId = requestAnimationFrame(update);
        }

        const staleDelay = Math.max(0, timer.staleAt - now);
        const staleTimeout = window.setTimeout(() => {
            setIsVisible(false);
            clearExpired(Date.now());
        }, staleDelay);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.clearTimeout(staleTimeout);
        };
    }, [timer, clearExpired, isInCombat]);

    const getStatusAndLabel = () => {
        if (!timer) return { label: '', status: '' };
        
        const actionVerb = timer.action || 'hit';
        const label = actionVerb === 'hit' ? 'SWING' : actionVerb.toUpperCase();
        let status = 'Attempting';
        
        if (isFull) {
            status = 'Ready';
        } else if (elapsedMs < 2000) {
            if (timer.isLanded) {
                status = 'Hit connection!';
            } else {
                status = actionVerb === 'hit' ? 'Missed!' : 'Failed!';
            }
        } else {
            if (actionVerb === 'hit') {
                status = 'Swing...';
            } else {
                status = `${actionVerb}...`;
            }
        }
        
        return { label, status };
    };

    if (!timer || !isVisible || !isInCombat) return null;

    const { label, status } = getStatusAndLabel();
    const stopwatchText = `${Math.min(FILL_MS / 1000, elapsedMs / 1000).toFixed(2)}s`;
    const hasConnected = !!timer.isLanded && elapsedMs < 2000;
    const statusColor = hasConnected || isFull
        ? '#22c55e'
        : (lane === 'player' ? '#22d3ee' : '#ef4444');

    return (
        <div className={`combat-recharge-pill ${lane}-recharge confidence-${timer.confidence}${isFull ? ' is-charged' : ''}${hasConnected ? ' is-connected' : ''}`}>
            <span 
                style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap'
                }}
            >
                {label}
            </span>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    color: statusColor,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'nowrap'
                }}
            >
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.2px' }}>{status}</span>
                <span style={{ fontFamily: 'monospace', opacity: 0.8, color: '#fff' }}>{stopwatchText}</span>
            </div>
        </div>
    );
};

export default React.memo(OpponentRechargeTimer);
