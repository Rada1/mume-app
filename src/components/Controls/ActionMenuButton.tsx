import React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import './ActionMenuButton.css';

interface ActionMenuButtonProps {
    triggerHaptic?: (ms: number) => void;
    className?: string;
}

export const ActionMenuButton: React.FC<ActionMenuButtonProps> = ({ triggerHaptic, className }) => {
    const selectedTarget = useUIStore(s => s.selectedTarget);
    const popoverState = useUIStore(s => s.popoverState);
    const setPopoverState = useUIStore(s => s.setPopoverState);
    const disabled = !selectedTarget;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (disabled || !selectedTarget) return;

        // Toggle: if popover is already open for this target, close it.
        if (popoverState && popoverState.entityId === selectedTarget.id) {
            setPopoverState(null);
            triggerHaptic?.(10);
            return;
        }

        const cx = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
        const cy = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
        setPopoverState({
            x: cx,
            y: cy,
            setId: selectedTarget.setId || 'selection',
            category: selectedTarget.category,
            context: selectedTarget.context,
            entityId: selectedTarget.id,
            accentColor: selectedTarget.accentColor,
            menuDisplay: selectedTarget.menuDisplay,
            parentNoun: selectedTarget.parentNoun,
        });
        triggerHaptic?.(20);
    };

    return (
        <button
            type="button"
            className={`action-menu-button${disabled ? ' is-disabled' : ''}${className ? ' ' + className : ''}`}
            onClick={handleClick}
            disabled={disabled}
            aria-label="Open action menu for selected target"
        >
            <span className="action-menu-button__icon" aria-hidden="true">⋯</span>
        </button>
    );
};
