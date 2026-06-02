/**
 * @file CombatRechargeOverlay.tsx
 * @description Displays learned combat charge progress on command buttons.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { CustomButton } from '../../../types';
import { useCombatRechargeStore } from '../../../stores/useCombatRechargeStore';
import { getCombatRechargeActionFromCommand } from '../../../utils/combatRechargeUtils';

interface CombatRechargeOverlayProps {
    button: CustomButton;
}

// --- Logic Section ---

export const CombatRechargeOverlay: React.FC<CombatRechargeOverlayProps> = ({ button }) => {
    const action = useMemo(() => getCombatRechargeActionFromCommand(button.command), [button.command]);
    const timer = useCombatRechargeStore(state => action ? state.active[action] : undefined);
    const clearExpired = useCombatRechargeStore(state => state.clearExpired);
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
        <div
            className={`combat-recharge-overlay confidence-${timer.confidence}${isCharged ? ' is-charged' : ''}`}
            aria-hidden="true"
        >
            <div className="combat-recharge-mask" style={chargeStyle} />
        </div>
    );
};
