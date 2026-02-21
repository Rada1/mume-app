import React, { useState, useRef, useEffect } from 'react';
import { Wifi, WifiOff, Layers, Edit3, Settings, CloudFog, Swords, Crosshair, MoreVertical, FolderOpen } from 'lucide-react';
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
    onClearTarget
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
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

                <div className="controls">
                    <div className="action-menu-wrapper" ref={menuRef}>
                        <button
                            className={`menu-toggle-btn ${isMenuOpen ? 'active' : ''}`}
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            title="More Actions"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {isMenuOpen && (
                            <div className="header-dropdown-menu">
                                <div className="menu-group">
                                    <label>Button Set</label>
                                    <div className="dropdown-item">
                                        <Layers size={14} />
                                        <select
                                            value={activeSet}
                                            onChange={(e) => {
                                                setActiveSet(e.target.value);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            {availableSets.map(set => (
                                                <option key={set} value={set}>
                                                    {set}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="menu-divider" />

                                <div
                                    className={`dropdown-item ${isEditMode ? 'active' : ''}`}
                                    onClick={() => {
                                        setIsEditMode(!isEditMode);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <Edit3 size={16} />
                                    <span>{isEditMode ? 'Exit Design Mode' : 'Enter Design Mode'}</span>
                                </div>

                                {isEditMode && (
                                    <div
                                        className="dropdown-item"
                                        onClick={() => {
                                            onOpenSetManager();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <FolderOpen size={16} />
                                        <span>Manage Button Sets</span>
                                    </div>
                                )}

                                <div
                                    className="dropdown-item"
                                    onClick={() => {
                                        setIsSettingsOpen(true);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default React.memo(Header);
