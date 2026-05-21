/**
 * @file DrawerShell.tsx
 * @description Common container for all side drawers.
 */

import React, { ReactNode } from 'react';
import { X, User, Shield, Users, Activity } from 'lucide-react';
import { useUI, useGame } from '../../context/GameContext';
import { EnvironmentGlow } from '../Atmosphere/EnvironmentGlow';

interface DrawerShellProps {
    id: string;
    side: 'left' | 'right';
    title?: string;
    children: ReactNode;
}

const SIDEBAR_TABS = [
    { id: 'status',    label: 'Status',  Icon: Activity },
    { id: 'character', label: 'Char',    Icon: User },
    { id: 'players',   label: 'Players', Icon: Users },
    { id: 'equipment', label: 'Gear',    Icon: Shield },
];

export const DrawerShell: React.FC<DrawerShellProps> = ({ id, side, title, children }) => {
    const { ui, setUI, handleTabClick } = useUI();
    const { triggerHaptic, handleLogClick, handleLogPointerDown, handleLogPointerUp, viewport, currentTerrain, lighting, input } = useGame() as any;
    const isOpen = ui.drawer === id;

    if (!isOpen) return null;

    const handleClose = () => {
        triggerHaptic(15);
        setUI(prev => ({ ...prev, drawer: 'none' }));
    };

    return (
        <div className={`log-card-drawer drawer-shell ${id}-drawer ${side}-drawer open`}>
            <EnvironmentGlow terrain={currentTerrain || undefined} lighting={lighting} input={input} />
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
            {!viewport.isMobile && (
                <div className="desktop-drawer-tabs-in-shell">
                    {SIDEBAR_TABS.map(({ id: tabId, label, Icon }) => (
                        <div
                            key={tabId}
                            className={`desktop-edge-tab right ${ui.drawer === tabId ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick(tabId as any); }}
                        >
                            <Icon className="tab-icon" />
                            <span className="tab-text">{label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
