import React, { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, Layers, Edit3, Settings, CloudFog, Swords, Crosshair, MoreVertical, FolderOpen, RotateCcw, ChevronDown, Check, ChevronLeft } from 'lucide-react';
import { LightingType, WeatherType } from '../types';

interface HeaderProps {
    lighting: LightingType;
    weather: WeatherType;
    isFoggy: boolean;
    inCombat: boolean;
    activeSet: string;
    isEditMode: boolean;
    getLightingIcon: () => React.ReactNode;
    getWeatherIcon: () => React.ReactNode;
    setIsEditMode: (val: boolean) => void;
    setIsSettingsOpen: (val: boolean) => void;
    availableSets: string[];
    setActiveSet: (val: string) => void;
    onOpenSetManager: () => void;
    target?: string | null;
    onClearTarget?: () => void;
    onResetMap?: () => void;
    onTeleportClick?: () => void;
    teleportTargetsCount?: number;
}

const Header: React.FC<HeaderProps> = ({
    lighting,
    weather,
    isFoggy,
    inCombat,
    activeSet,
    isEditMode,
    getLightingIcon,
    getWeatherIcon,
    setIsEditMode,
    setIsSettingsOpen,
    availableSets,
    setActiveSet,
    onOpenSetManager,
    target,
    onClearTarget,
    onResetMap,
    onTeleportClick,
    teleportTargetsCount
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSetMenuOpen, setIsSetMenuOpen] = useState(false);
    const [menuView, setMenuView] = useState<'main' | 'sets'>('main');
    const menuRef = useRef<HTMLDivElement>(null);
    const setMenuRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
                setMenuView('main'); // Reset view on close
            }
            if (setMenuRef.current && !setMenuRef.current.contains(event.target as Node)) {
                setIsSetMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="header">
            <div className="title">
                MUME Client
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {(lighting !== 'none' || weather !== 'none' || isFoggy) && (
                    <div
                        className="status-indicator"
                        style={{ color: '#fff', gap: 8 }}
                        title="Lighting/Weather Status"
                    >
                        {getLightingIcon()}
                        {getWeatherIcon()}
                        {isFoggy && <CloudFog size={16} className="text-gray-400" />}
                        <span>
                            {lighting !== 'none' ? lighting.toUpperCase() : ''}
                            {weather !== 'none' && weather !== 'clear' ? ` | ${weather.toUpperCase().replace('-', ' ')}` : ''}
                            {isFoggy ? ' | FOG' : ''}
                        </span>
                    </div>
                )}
                {inCombat && (
                    <div
                        className="status-indicator"
                        style={{ color: '#ef4444', gap: 6, animation: 'combat-pulse 1s ease-in-out infinite' }}
                        title="In Combat"
                    >
                        <Swords size={14} />
                        <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>COMBAT</span>
                    </div>
                )}
                <div
                    className="status-indicator"
                    style={{
                        color: target ? '#facc15' : 'var(--text-faded)',
                        gap: 6,
                        cursor: 'pointer',
                        opacity: target ? 1 : 0.6,
                        border: target ? '1px solid rgba(250, 204, 21, 0.4)' : '1px solid rgba(255,255,255,0.1)'
                    }}
                    title={target ? "Current Target (Click to clear)" : "No Target Set (Type 'target <name>' or click a char)"}
                    onClick={() => target && onClearTarget && onClearTarget()}
                >
                    <Crosshair size={14} />
                    <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>{target ? `TARGET: ${target.toUpperCase()}` : 'NO TARGET'}</span>
                </div>

                <div
                    className="status-indicator"
                    style={{
                        color: teleportTargetsCount && teleportTargetsCount > 0 ? 'var(--accent)' : 'var(--text-faded)',
                        gap: 6,
                        cursor: 'pointer',
                        opacity: teleportTargetsCount && teleportTargetsCount > 0 ? 1 : 0.6,
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    title="Stored Teleport Rooms"
                    onClick={() => onTeleportClick && onTeleportClick()}
                >
                    <Crosshair size={14} style={{ transform: 'rotate(45deg)' }} />
                    <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>ROOMS: {teleportTargetsCount || 0}</span>
                </div>

                <div className="controls">
                    {isEditMode && (
                        <div className="action-menu-wrapper" ref={setMenuRef}>
                            <div
                                className={`set-switcher ${isSetMenuOpen ? 'active' : ''}`}
                                onClick={() => setIsSetMenuOpen(!isSetMenuOpen)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                    <Layers size={14} style={{ flexShrink: 0 }} />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeSet}</span>
                                </div>
                                <ChevronDown size={14} style={{ flexShrink: 0, transform: isSetMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                            </div>

                            {isSetMenuOpen && (
                                <div className="header-dropdown-menu" style={{ minWidth: '200px', maxHeight: '350px', overflowY: 'auto' }}>
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
                        >
                            <MoreVertical size={20} />
                        </button>

                        {isMenuOpen && (
                            <div className="header-dropdown-menu">
                                {menuView === 'main' ? (
                                    <>
                                        <div className="menu-group">
                                            <label>Button Set</label>
                                            <div
                                                className="dropdown-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMenuView('sets');
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
            </div>
        </header>
    );
};

export default React.memo(Header);
