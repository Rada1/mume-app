/**
 * @file OpponentRechargeTimer.tsx
 * @description Shows learned combat charge progress until the next observed combat action.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useCombatRechargeStore } from '../../stores/useCombatRechargeStore';

interface OpponentRechargeTimerProps {
    lane?: 'player' | 'opponent';
}

// --- Logic Section ---

const getLatestTimer = (
    timers: ReturnType<typeof useCombatRechargeStore.getState>['active']
) =>
    Object.values(timers)
        .filter(Boolean)
        .sort((a, b) => b.startedAt - a.startedAt)[0] || null;

const OpponentRechargeTimer: React.FC<OpponentRechargeTimerProps> = ({ lane = 'opponent' }) => {
    const active = useCombatRechargeStore(state => lane === 'player' ? state.active : state.opponentActive);
    const clearExpired = useCombatRechargeStore(state => state.clearExpired);
    const timer = useMemo(() => getLatestTimer(active), [active]);
    const initialNow = Date.now();
    const [isCharged, setIsCharged] = useState(() => !!timer && initialNow >= timer.expiresAt);
    const [isVisible, setIsVisible] = useState(() => !!timer && initialNow < timer.staleAt);

    useEffect(() => {
        if (!timer) return;
        const now = Date.now();
        setIsVisible(now < timer.staleAt);
        setIsCharged(now >= timer.expiresAt);

        const chargeDelay = Math.max(0, timer.expiresAt - now);
        const staleDelay = Math.max(0, timer.staleAt - now);
        const chargeTimeout = window.setTimeout(() => setIsCharged(true), chargeDelay);
        const staleTimeout = window.setTimeout(() => {
            setIsVisible(false);
            clearExpired(Date.now());
        }, staleDelay);

        return () => {
            window.clearTimeout(chargeTimeout);
            window.clearTimeout(staleTimeout);
        };
    }, [timer, clearExpired]);

    if (!timer || !isVisible) return null;

    const now = Date.now();
    const elapsedMs = now - timer.startedAt;
    const progress = isCharged ? 1 : Math.max(0, Math.min(1, elapsedMs / timer.durationMs));
    const remainingChargeMs = Math.max(0, timer.expiresAt - now);
    const chargeStyle = {
        '--charge-start': progress.toString(),
        '--charge-duration': `${remainingChargeMs}ms`
    } as React.CSSProperties;

    return (
        <div className={`combat-recharge-pill ${lane}-recharge confidence-${timer.confidence}${isCharged ? ' is-charged' : ''}`}>
            <span className="opponent-recharge-track">
                <span className="opponent-recharge-fill" style={chargeStyle} />
            </span>
        </div>
    );
};

export default OpponentRechargeTimer;
