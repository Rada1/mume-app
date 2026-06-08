/**
 * @file DrawerShell.tsx
 * @description Common container for all side drawers.
 */

import React, { ReactNode } from 'react';
import { X, User, Shield, Users, Activity, LogIn } from 'lucide-react';
import { useUI, useGame } from '../../context/GameContext';
import { useInputStore } from '../../stores/useInputStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { EnvironmentGlow } from '../Atmosphere/EnvironmentGlow';
import { DrawerResizeHandle } from './DrawerResizeHandle';

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

const ACCOUNT_TABS = [
    { id: 'account', label: 'Account', Icon: LogIn },
];

export const DrawerShell: React.FC<DrawerShellProps> = ({ id, side, title, children }) => {
    const { ui, setUI, handleTabClick } = useUI();
    const { triggerHaptic, handleLogClick, handleLogPointerDown, handleLogPointerUp, viewport, currentTerrain, lighting, accountState, gameState, sessionMode } = useGame() as any;
    const input = useInputStore(s => s.input);
    const drawerZoom = useSettingsStore(s => s.drawerZoom ?? 1.0);
    const setDrawerZoom = useSettingsStore(s => s.setDrawerZoom);
    const isOpen = ui.drawer === id;
    const tabs = gameState === 'account' && sessionMode !== 'replay' ? ACCOUNT_TABS : SIDEBAR_TABS;

    if (!isOpen) return null;

    const handleClose = () => {
        triggerHaptic(15);
        setUI(prev => ({ ...prev, drawer: 'none' }));
    };

    return (
        <div
            className={`log-card-drawer drawer-shell ${id}-drawer ${side}-drawer open`}
            style={{ '--drawer-zoom': drawerZoom } as React.CSSProperties}
        >
            <DrawerResizeHandle handleType="left" widthVar="--desktop-right-width" />
            <DrawerResizeHandle handleType="right" widthVar="--desktop-right-width" rightVar="--desktop-right-right" />
            <DrawerResizeHandle handleType="top" widthVar="--desktop-right-width" topVar="--desktop-right-top" bottomVar="--desktop-right-bottom" />
            <DrawerResizeHandle handleType="bottom" widthVar="--desktop-right-width" topVar="--desktop-right-top" bottomVar="--desktop-right-bottom" />
            <DrawerResizeHandle handleType="top-left" widthVar="--desktop-right-width" topVar="--desktop-right-top" bottomVar="--desktop-right-bottom" />
            <DrawerResizeHandle handleType="top-right" widthVar="--desktop-right-width" rightVar="--desktop-right-right" topVar="--desktop-right-top" bottomVar="--desktop-right-bottom" />
            <DrawerResizeHandle handleType="bottom-left" widthVar="--desktop-right-width" topVar="--desktop-right-top" bottomVar="--desktop-right-bottom" />
            <DrawerResizeHandle handleType="bottom-right" widthVar="--desktop-right-width" rightVar="--desktop-right-right" topVar="--desktop-right-top" bottomVar="--desktop-right-bottom" />
            <EnvironmentGlow terrain={accountState?.stage !== 'none' ? undefined : (currentTerrain || undefined)} lighting={lighting} input={input} />
            <div className="drawer-header">
                <span className="drawer-title">
                    {title || id}
                </span>
                {viewport.isMobile && viewport.isLandscape ? (
                    <button
                        className="drawer-close-btn"
                        onClick={handleClose}
                        title="Close Drawer"
                    >
                        <X size={14} />
                    </button>
                ) : (
                    !viewport.isMobile && (
                        <div 
                            className="drawer-zoom-control drawer-zoom-header-control"
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '14px',
                                padding: '1px 4px',
                                height: '26px',
                                bottom: 'auto',
                                boxShadow: 'none'
                            }}
                        >
                            <button
                                className="drawer-zoom-btn"
                                onClick={(e) => { e.stopPropagation(); triggerHaptic(15); setDrawerZoom(Math.max(0.5, Math.round((drawerZoom - 0.1) * 10) / 10)); }}
                                title="Zoom Out"
                                style={{ width: '22px', height: '22px', fontSize: '0.9rem' }}
                            >
                                -
                            </button>
                            <span className="drawer-zoom-value" style={{ minWidth: '28px', fontSize: '0.62rem' }}>
                                {Math.round(drawerZoom * 100)}%
                            </span>
                            <button
                                className="drawer-zoom-btn"
                                onClick={(e) => { e.stopPropagation(); triggerHaptic(15); setDrawerZoom(Math.min(2.0, Math.round((drawerZoom + 0.1) * 10) / 10)); }}
                                title="Zoom In"
                                style={{ width: '22px', height: '22px', fontSize: '0.9rem' }}
                            >
                                +
                            </button>
                        </div>
                    )
                )}
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
                    {tabs.map(({ id: tabId, label, Icon }) => (
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
