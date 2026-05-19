/**
 * @file DrawerShell.tsx
 * @description Common container for all side drawers.
 */

import React, { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useUI, useGame } from '../../context/GameContext';

interface DrawerShellProps {
    id: string;
    side: 'left' | 'right';
    title?: string;
    children: ReactNode;
}

export const DrawerShell: React.FC<DrawerShellProps> = ({ id, side, title, children }) => {
    const { ui, setUI } = useUI();
    const { triggerHaptic, handleLogClick, handleLogPointerDown, handleLogPointerUp } = useGame();
    const isOpen = ui.drawer === id;

    if (!isOpen) return null;

    const handleClose = () => {
        triggerHaptic(15);
        setUI(prev => ({ ...prev, drawer: 'none' }));
    };

    return (
        <div className={`log-card-drawer drawer-shell ${id}-drawer ${side}-drawer open`}>
            <div className="drawer-header">
                <span className="drawer-title">
                    {title || id}
                </span>
                <button
                    className="drawer-close-btn"
                    onClick={handleClose}
                    title="Close Drawer"
                >
                    <X size={14} />
                </button>
            </div>
            <div
                className="drawer-content"
                style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                onClick={handleLogClick as any}
                onPointerDown={handleLogPointerDown}
                onPointerUp={handleLogPointerUp}
                onPointerCancel={handleLogPointerUp}
            >
                {children}
            </div>
        </div>
    );
};
