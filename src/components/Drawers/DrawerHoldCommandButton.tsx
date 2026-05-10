/**
 * @file DrawerHoldCommandButton.tsx
 * @description Reusable hold-to-target command button for drawer object lists.
 */

import React from 'react';

interface DrawerHoldCommandButtonProps {
    id: string;
    label: string;
    command: string;
    isHeld: boolean;
    triggerHaptic: (ms: number) => void;
    setHeldButton: (val: any) => void;
    setCommandPreview: (val: string | null) => void;
}

export const DrawerHoldCommandButton: React.FC<DrawerHoldCommandButtonProps> = ({
    id,
    label,
    command,
    isHeld,
    triggerHaptic,
    setHeldButton,
    setCommandPreview
}) => {
    const startHold = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        triggerHaptic(15);
        setCommandPreview(label.toLowerCase());
        setHeldButton({
            id,
            baseCommand: command,
            modifiers: [],
            dx: 0,
            dy: 0,
            didFire: false,
            initialX: rect.left + rect.width / 2,
            initialY: rect.top + rect.height / 2
        });
    };

    const endHold = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setCommandPreview(null);
        setHeldButton((prev: any) => prev?.id === id ? null : prev);
    };

    return (
        <button
            type="button"
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerCancel={endHold}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            style={{
                flex: 1,
                height: '34px',
                borderRadius: '6px',
                border: `1px solid ${isHeld ? 'var(--accent)' : 'rgba(255,255,255,0.14)'}`,
                background: isHeld ? 'rgba(var(--accent-rgb), 0.18)' : 'rgba(255,255,255,0.06)',
                color: isHeld ? 'var(--accent)' : 'rgba(255,255,255,0.82)',
                fontSize: '0.72em',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer'
            }}
        >
            {label}
        </button>
    );
};
