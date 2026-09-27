/**
 * @file MobileAccountCharacterActionButton.tsx
 * @description Character actions with the account target picker on long press.
 */

// --- Logic Section ---
import React, { FC, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAccountTargetStore } from '../../stores/useAccountTargetStore';

type TargetCommand = 'play' | 'info' | 'practice';

interface MobileAccountCharacterActionButtonProps {
    command: TargetCommand;
    label: string;
    disabled?: boolean;
    primary?: boolean;
    onClick: () => void;
}

export const MobileAccountCharacterActionButton: FC<MobileAccountCharacterActionButtonProps> = ({ command, label, disabled, primary, onClick }) => {
    const { triggerHaptic } = useGame();
    const timerRef = useRef<number | null>(null);
    const longPressFiredRef = useRef(false);
    const clearTimer = () => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = null;
    };
    useEffect(() => clearTimer, []);

    return (
        <button
            type="button"
            className={`mobile-account-action${primary ? ' is-primary' : ''}`}
            disabled={disabled}
            onPointerDown={() => {
                if (disabled) return;
                longPressFiredRef.current = false;
                clearTimer();
                timerRef.current = window.setTimeout(() => {
                    timerRef.current = null;
                    longPressFiredRef.current = true;
                    triggerHaptic?.(30);
                    useAccountTargetStore.getState().openMenu(command, true);
                }, 350);
            }}
            onPointerUp={clearTimer}
            onPointerCancel={() => { clearTimer(); longPressFiredRef.current = false; }}
            onPointerLeave={clearTimer}
            onClick={() => {
                if (longPressFiredRef.current) {
                    longPressFiredRef.current = false;
                    return;
                }
                triggerHaptic?.(15);
                onClick();
            }}
        >
            {primary && <Play size={17} strokeWidth={2.2} />}
            {label}
        </button>
    );
};
