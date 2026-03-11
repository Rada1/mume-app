import React, { useState, useRef, useEffect } from 'react';
import { Layers, Edit3, Settings, MoreVertical, FolderOpen, RotateCcw, ChevronDown, Check, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { EnvControls } from './Layout/EnvControls';
import { LightingType, WeatherType } from '../types';
import { useGame, useUI, useVitals } from '../context/GameContext';

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
        teleportTargets,
        showControls,
        setShowControls,
        viewport,
    } = useGame();

    const { target, setTarget } = useVitals();
    const { ui, setUI, setIsSettingsOpen, setIsSetManagerOpen, setPopoverState } = useUI();

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
        <header className={`header ${viewport.isMobile ? 'mobile-header' : ''}`} style={{ flexWrap: 'nowrap', gap: 6 }}>
            {/* Left: Brand/Logo (Hidden on Mobile Design Mode to save critical space) */}
            {!isLandscape && (!viewport.isMobile || !isEditMode) && (
                <div className="title" style={{ flexShrink: 0, fontSize: viewport.isMobile ? '1.1rem' : '1.4rem' }}>
                    MUME
                </div>
            )}

            {/* Middle: Status Indicators (Flexible/Clipped) */}
            <EnvControls getLightingIcon={getLightingIcon} getWeatherIcon={getWeatherIcon} isLandscape={isLandscape} />

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
                                    <label style={{ margin: '8px 0 10px 8px', color: 'var(--text-dim, #94a3b8)' }}>Button Set</label>
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
                                            style={{ border: '1px solid var(--border-color, rgba(255,255,255,0.05))', background: 'var(--bg-panel, rgba(255,255,255,0.02))' }}
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
                                    <label style={{ margin: '4px 0 8px 10px', color: 'var(--text-dim, #94a3b8)' }}>SELECT SET</label>
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
