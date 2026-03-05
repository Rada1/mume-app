import React, { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, Layers, Edit3, Settings, CloudFog, Swords, Crosshair, MoreVertical, FolderOpen, RotateCcw, ChevronDown, Check, ChevronLeft, Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { LightingType, WeatherType } from '../types';
import { useGame } from '../context/GameContext';

interface HeaderProps {
    isLandscape?: boolean;
    getLightingIcon: () => React.ReactNode;
    getWeatherIcon: () => React.ReactNode;
    onResetMap?: () => void;
}

const Header: React.FC<HeaderProps> = ({
    isLandscape,
    getLightingIcon,
    getWeatherIcon,
    onResetMap
}) => {
    const {
        lighting,
        weather,
        isFoggy,
        inCombat,
        btn,
        target,
        setTarget,
        setIsSettingsOpen,
        setIsSetManagerOpen,
        teleportTargets,
        setPopoverState,
        showControls,
        setShowControls,
        viewport,
        ui,
        setUI
    } = useGame();

    const effectiveShowControls = showControls;
    const { activeSet, isEditMode, setIsEditMode, availableSets, setActiveSet } = btn;
    const teleportTargetsCount = teleportTargets.length;
    const onClearTarget = () => setTarget(null);
    const onOpenSetManager = () => setIsSetManagerOpen(true);
    const onTeleportClick = () => {
        setPopoverState({
            type: 'teleport-manage',
            setId: 'teleport',
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
        });
    };
    const [isMenuOpen, setIsMenuOpen] = [ui.isMenuOpen, (val: boolean) => setUI(prev => ({ ...prev, isMenuOpen: val })) as any];
    const [isSetMenuOpen, setIsSetMenuOpen] = [ui.isSetMenuOpen, (val: boolean) => setUI(prev => ({ ...prev, isSetMenuOpen: val })) as any];
    const [menuView, setMenuView] = [ui.menuView, (val: 'main' | 'availableSets') => setUI(prev => ({ ...prev, menuView: val })) as any];

    const menuRef = useRef<HTMLDivElement>(null);
    const setMenuRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (ui.isMenuOpen && menuRef.current && !menuRef.current.contains(target)) {
                setIsMenuOpen(false);
                setMenuView('main');
            }
            if (ui.isSetMenuOpen && setMenuRef.current && !setMenuRef.current.contains(target)) {
                setIsSetMenuOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside, { capture: true });
        return () => document.removeEventListener('pointerdown', handleClickOutside, { capture: true });
    }, [ui.isMenuOpen, ui.isSetMenuOpen, setIsMenuOpen, setIsSetMenuOpen, setMenuView]);


    return (
        <header className="header" style={{ flexWrap: 'nowrap', gap: 6 }}>
            {/* Left: Brand/Logo (Hidden on Mobile Design Mode to save critical space) */}
            {!isLandscape && (!viewport.isMobile || !isEditMode) && (
                <div className="title" style={{ flexShrink: 0, fontSize: viewport.isMobile ? '1.1rem' : '1.4rem' }}>
                    MUME
                </div>
            )}

            {/* Middle: Status Indicators (Flexible/Clipped) */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1, minWidth: 0, justifyContent: 'center' }}>
                {(lighting !== 'none' || weather !== 'none' || isFoggy) && (
                    <div
                        className="status-indicator"
                        style={{ color: 'var(--text-primary)', gap: 4, padding: '4px 6px' }}
                        title="Lighting/Weather Status"
                    >
                        {getLightingIcon()}
                        {getWeatherIcon()}
                        {isFoggy && <CloudFog size={14} className="text-gray-400" />}
                        {!viewport.isMobile && (
                            <span style={{ fontSize: '0.75rem' }}>
                                {lighting !== 'none' ? lighting.toUpperCase() : ''}
                                {weather !== 'none' && weather !== 'clear' ? ` | ${weather.toUpperCase().replace('-', ' ')}` : ''}
                                {isFoggy ? ' | FOG' : ''}
                            </span>
                        )}
                    </div>
                )}
                {!isLandscape && inCombat && (
                    <div
                        className="status-indicator"
                        style={{ color: '#ef4444', gap: 4, padding: '4px 6px', animation: 'combat-pulse 1s ease-in-out infinite' }}
                        title="In Combat"
                    >
                        <Swords size={12} />
                        {!viewport.isMobile && <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>COMBAT</span>}
                    </div>
                )}
                {!isLandscape && (
                    <div
                        className="status-indicator"
                        style={{
                            color: target ? 'var(--map-accent)' : 'var(--text-faded)',
                            gap: 4, padding: '4px 6px',
                            cursor: 'pointer',
                            opacity: target ? 1 : 0.6,
                            border: target ? '1px solid var(--map-accent)' : '1px solid var(--border-color)',
                            maxWidth: viewport.isMobile ? '80px' : 'none',
                            overflow: 'hidden'
                        }}
                        title={target ? "Current Target (Click to clear)" : "No Target"}
                        onClick={() => target && onClearTarget && onClearTarget()}
                    >
                        <Crosshair size={12} />
                        <span style={{ fontWeight: 'bold', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {target ? target.toUpperCase() : (viewport.isMobile ? '' : 'NO TARGET')}
                        </span>
                    </div>
                )}

                {!isLandscape && (
                    <div
                        className="status-indicator"
                        style={{
                            color: teleportTargetsCount && teleportTargetsCount > 0 ? 'var(--accent)' : 'var(--text-faded)',
                            gap: 4, padding: '4px 6px',
                            cursor: 'pointer',
                            opacity: teleportTargetsCount && teleportTargetsCount > 0 ? 1 : 0.6,
                            border: '1px solid var(--border-color)'
                        }}
                        title="Stored Teleport Rooms"
                        onClick={() => onTeleportClick && onTeleportClick()}
                    >
                        <Crosshair size={12} style={{ transform: 'rotate(45deg)' }} />
                        <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{teleportTargetsCount || 0}</span>
                    </div>
                )}
            </div>

            {/* Right: Master Controls (Always Visible/Fixed) */}
            <div className="controls" style={{ flexShrink: 0, marginLeft: 'auto' }}>
                {isEditMode && !isLandscape && (
                    <div className="action-menu-wrapper" ref={setMenuRef} style={{ flexShrink: 1, minWidth: 0 }}>
                        <div
                            className={`set-switcher ${isSetMenuOpen ? 'active' : ''}`}
                            onClick={() => setIsSetMenuOpen(!isSetMenuOpen)}
                            style={{
                                padding: '4px 8px',
                                height: '32px',
                                fontSize: '0.7rem',
                                maxWidth: viewport.isMobile ? '90px' : '120px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                                <Layers size={12} style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSet}</span>
                            </div>
                            <ChevronDown size={12} style={{ flexShrink: 0, transform: isSetMenuOpen ? 'rotate(180deg)' : 'none' }} />
                        </div>

                        {isSetMenuOpen && (
                            <div className="header-dropdown-menu" style={{ minWidth: '180px', maxHeight: '350px', overflowY: 'auto', right: 0 }}>
                                <div className="menu-group" style={{ padding: '4px' }}>
                                    <label style={{ margin: '8px 0 10px 8px' }}>Button Set</label>
                                    {availableSets.map(set => (
                                        <div
                                            key={set}
                                            className={`dropdown-item ${activeSet === set ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveSet(set);
                                                setIsSetMenuOpen(false);
                                            }}
                                            style={{ padding: '8px 10px', gap: '10px' }}
                                        >
                                            <Layers size={14} style={{ opacity: activeSet === set ? 1 : 0.4 }} />
                                            <span style={{ flex: 1 }}>{set}</span>
                                            {activeSet === set && <Check size={14} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="action-menu-wrapper main-menu-dots" ref={menuRef} style={{ flexShrink: 0 }}>
                    <button
                        className={`menu-toggle-btn ${isMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        title="More Actions"
                        style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                    >
                        <MoreVertical size={20} />
                    </button>

                    {isMenuOpen && (
                        <div className="header-dropdown-menu" style={{ right: 0 }}>
                            {menuView === 'main' ? (
                                <>
                                    <div className="menu-group">
                                        <label>Button Set</label>
                                        <div
                                            className="dropdown-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuView('availableSets');
                                            }}
                                            style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
                                        >
                                            <Layers size={14} />
                                            <span style={{ flex: 1 }}>{activeSet}</span>
                                            <ChevronDown size={14} opacity={0.5} style={{ transform: 'rotate(-90deg)' }} />
                                        </div>
                                    </div>

                                    <div className="menu-divider" />

                                    <div
                                        className={`dropdown-item ${isEditMode ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsEditMode(!isEditMode);
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <Edit3 size={16} />
                                        <span>{isEditMode ? 'Exit Design Mode' : 'Enter Design Mode'}</span>
                                    </div>

                                    <div
                                        className={`dropdown-item ${effectiveShowControls ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowControls(effectiveShowControls ? false : true);
                                        }}
                                    >
                                        {effectiveShowControls ? <Eye size={16} /> : <EyeOff size={16} />}
                                        <span>{effectiveShowControls ? 'Hide HUD Controls' : 'Show HUD Controls'}</span>
                                    </div>

                                    {isEditMode && (
                                        <>
                                            <div
                                                className="dropdown-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenSetManager();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <FolderOpen size={16} />
                                                <span>Manage Button Sets</span>
                                            </div>
                                            <div
                                                className="dropdown-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onResetMap) onResetMap();
                                                    setIsMenuOpen(false);
                                                }}
                                            >
                                                <RotateCcw size={16} />
                                                <span>Reset Map Position</span>
                                            </div>
                                        </>
                                    )}

                                    <div
                                        className="dropdown-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsSettingsOpen(true);
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <Settings size={16} />
                                        <span>Settings</span>
                                    </div>
                                </>
                            ) : (
                                <div className="menu-group" style={{ padding: '4px' }}>
                                    <div
                                        className="dropdown-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuView('main');
                                        }}
                                        style={{ marginBottom: '8px', opacity: 0.8 }}
                                    >
                                        <ChevronLeft size={16} />
                                        <span style={{ fontWeight: 'bold' }}>Back to Menu</span>
                                    </div>
                                    <label style={{ margin: '4px 0 8px 10px' }}>SELECT SET</label>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {availableSets.map(set => (
                                            <div
                                                key={set}
                                                className={`dropdown-item ${activeSet === set ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveSet(set);
                                                    setIsMenuOpen(false);
                                                    setMenuView('main');
                                                }}
                                                style={{ padding: '8px 10px', gap: '10px' }}
                                            >
                                                <Layers size={14} style={{ opacity: activeSet === set ? 1 : 0.4 }} />
                                                <span style={{ flex: 1 }}>{set}</span>
                                                {activeSet === set && <Check size={14} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default React.memo(Header);
