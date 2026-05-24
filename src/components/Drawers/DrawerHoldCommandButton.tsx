/**
 * @file DrawerHoldCommandButton.tsx
 * @description Drawer action button — tap to fire the command at the currently selected inline target.
 */

import React from 'react';
import { useGame } from '../../context/GameContext';
import { useUIStore } from '../../stores/useUIStore';

interface DrawerActionButtonProps {
    label: string;
    command: string;
}

export const DrawerHoldCommandButton: React.FC<DrawerActionButtonProps> = ({ label, command }) => {
    const { executeCommand, triggerHaptic, setParley, parley, viewport } = useGame() as any;
    const selectedTarget = useUIStore(s => s.selectedTarget);

    const hasTarget = !!selectedTarget;

    const handleTap = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedTarget) return;

        const contextStr = selectedTarget.context || '';
        triggerHaptic(60);

        if (command === '__parley__') {
            setParley({ active: true, command: parley?.command || 'tell', target: contextStr, message: '' });
            setTimeout(() => {
                const inputEl = document.querySelector('input') as HTMLInputElement;
                if (!inputEl) return;
                const wasReadOnly = inputEl.readOnly;
                if (viewport?.isMobile) inputEl.readOnly = false;
                inputEl.focus();
                if (viewport?.isMobile) {
                    setTimeout(() => { if (inputEl) inputEl.readOnly = wasReadOnly; }, 100);
                }
            }, 10);
        } else {
            let finalCmd = command;
            if (contextStr) {
                finalCmd = finalCmd.includes('%n')
                    ? finalCmd.replace(/%n/g, contextStr)
                    : `${finalCmd} ${contextStr}`;
            }
            executeCommand(finalCmd);
        }
    };

    return (
        <button
            type="button"
            onPointerDown={handleTap}
            onPointerUp={e => { e.preventDefault(); e.stopPropagation(); }}
            onPointerCancel={e => { e.preventDefault(); e.stopPropagation(); }}
            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
            style={{
                flex: 1,
                height: '34px',
                borderRadius: '6px',
                border: `1px solid ${hasTarget ? 'var(--accent)' : 'rgba(255,255,255,0.14)'}`,
                background: hasTarget ? 'rgba(var(--accent-rgb), 0.18)' : 'rgba(255,255,255,0.06)',
                color: hasTarget ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: hasTarget ? 'pointer' : 'default',
                transition: 'border-color 0.15s, background 0.15s, color 0.15s',
            }}
        >
            {label}
        </button>
    );
};
