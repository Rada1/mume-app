import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Edit3, Settings, MoreVertical, FolderOpen, RotateCcw, ChevronDown, Check, ChevronLeft, Eye, EyeOff, Crosshair, WifiOff, RefreshCw, Circle, Save, X, FileText } from 'lucide-react';
import { EnvControls } from '../Layout/EnvControls';
import { RecorderHUD } from '../Layout/HUD/RecorderHUD';
import { LightingType, WeatherType } from '../../types';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import ModernVitals from './ModernVitals';

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
        status,
        telnet,
        executeCommand,
        triggerHaptic
    } = useGame();

    const { stats, setStats, target, setTarget } = useVitals();
    const { 
        ui, setUI, setIsSettingsOpen, setIsSetManagerOpen, setIsLibraryOpen, setPopoverState,
        isRecording, startRecording, stopRecording, stopAndSave, saveLog, characterName,
        replayer
    } = useUI();

    const handleWimpyChange = (val: number) => {
        triggerHaptic(10);
        setStats(prev => ({ ...prev, wimpy: val }));
        executeCommand(`change wimpy ${val}`);
    };

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

            // Portaled menu check: if the click is inside the dropdown itself, don't close.
            if (target instanceof HTMLElement && target.closest('.header-dropdown-menu')) {
                return;
            }

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

    const handleReplayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            console.log('[Header] Replay file loaded');
            try {
                if (event.target?.result) {
                    const log = JSON.parse(event.target.result as string);
                    console.log('[Header] Parsed log entries:', log.entries?.length);
                    replayer.loadLog(log);
                }
            } catch (err) {
                console.error('[Header] Failed to parse MUME log:', err);
            }
        };
        reader.readAsText(file);
        setIsMenuOpen(false);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Portal-positioned coords for the main menu dropdown (escapes content-layer stacking)
    const [menuDropdownPos, setMenuDropdownPos] = useState<{ top: number; right: number } | null>(null);
    useLayoutEffect(() => {
        if (!ui.isMenuOpen || !menuRef.current) {
            setMenuDropdownPos(null);
            return;
        }
        const update = () => {
            const rect = menuRef.current?.getBoundingClientRect();
            if (!rect) return;
            setMenuDropdownPos({
                top: rect.bottom + 10,
                right: window.innerWidth - rect.right,
            });
        };
        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [ui.isMenuOpen]);

    return (
        <header className={`header ${viewport.isMobile ? 'mobile-header' : ''}`} style={{ flexWrap: 'nowrap', gap: 6 }}>
            {/* Middle: Status Indicators (Flexible/Clipped) */}
            <EnvControls getLightingIcon={getLightingIcon} getWeatherIcon={getWeatherIcon} isLandscape={isLandscape} />
            <RecorderHUD />

            {/* Theater Mode Banner */}
            {replayer.state.isVisible && replayer.log && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(255,180,0,0.12)',
                    border: '1px solid rgba(255,180,0,0.5)',
                    color: '#ffb400',
                    fontWeight: 700, fontSize: 11, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 8px rgba(255,180,0,0.25)',
                    animation: 'theaterPulse 2s ease-in-out infinite',
                    flexShrink: 0,
                    cursor: 'pointer',
                    userSelect: 'none',
                }}>
                    <span style={{ fontSize: 8, color: '#ffb400' }}>⏺</span>
                    THEATER MODE
                    <button onClick={() => replayer.clearLog()} style={{
                        background: 'none', border: 'none', color: '#ffb400',
                        cursor: 'pointer', padding: '0 0 0 4px', fontSize: 12, lineHeight: 1,
                        opacity: 0.7
                    }} title="Exit Theater Mode">✕</button>
                </div>
            )}

            {/* Right: Master Controls (Always Visible/Fixed) */}
            <div className="controls" style={{ flexShrink: 0, marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                {status === 'disconnected' && (
                    <button
                        className="reconnect-btn"
                        onClick={() => telnet.connect()}
                        title="Disconnected from server. Click to reconnect."
                    >
                        <RefreshCw size={14} />
                        {viewport.isMobile ? '' : 'RECONNECT'}
                    </button>
                )}

                <div
                    className="status-indicator"
                    style={{
                        color: target ? 'var(--map-accent)' : 'var(--text-faded)',
                        gap: 4, padding: '4px 6px',
                        cursor: 'pointer',
                        opacity: target ? 1 : 0.6,
                        border: target ? '1px solid var(--map-accent)' : '1px solid var(--border-color)',
                        maxWidth: viewport.isMobile ? '80px' : 'none',
                        overflow: 'hidden',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title={target ? "Current Target (Click to clear)" : "No Target"}
                    onClick={() => target && onClearTarget && onClearTarget()}
                >
                    <Crosshair size={12} />
                    <span style={{ fontWeight: 'bold', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {target ? target.toUpperCase() : (viewport.isMobile ? '' : 'NO TARGET')}
                    </span>
                </div>

                {teleportTargetsCount > 0 && (
                    <div
                        className="status-indicator"
                        style={{
                            color: 'var(--accent)',
                            gap: 4, padding: '4px 6px',
                            cursor: 'pointer',
                            opacity: 1,
                            border: '1px solid var(--accent)',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                        title="Stored Teleport Rooms"
                        onClick={() => onTeleportClick && onTeleportClick()}
                    >
                        <Crosshair size={12} style={{ transform: 'rotate(45deg)' }} />
                        <span style={{ fontWeight: 'bold', fontSize: '0.75rem' }}>{teleportTargetsCount}</span>
                    </div>
                )}

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
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".mume-log,.json" 
                        onChange={handleReplayUpload}
                    />
                    <button
                        className={`menu-toggle-btn ${isMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        title="More Actions"
                        style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                    >
                        <MoreVertical size={20} />
                    </button>

                    {isMenuOpen && menuDropdownPos && createPortal(
                        <div
                            className="header-dropdown-menu"
                            style={{
                                position: 'fixed',
                                top: menuDropdownPos.top,
                                right: menuDropdownPos.right,
                            }}
                        >
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
                                        <span>{isEditMode ? 'Exit Design Mode' : 'Enter Design Mode'}</span>
                                    </div>

                                    <div
                                        className={`dropdown-item ${isRecording ? 'active' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isRecording) {
                                                stopAndSave();
                                            } else {
                                                startRecording(characterName || undefined);
                                            }
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        {isRecording ? <Save size={16} color="#ff4444" /> : <Circle size={16} color="#ff4444" />}
                                        <span style={{ color: isRecording ? '#ff4444' : 'inherit' }}>
                                            {isRecording ? 'Stop & Save Recording' : 'Start Session Recording'}
                                        </span>
                                    </div>

                                    <div
                                        className="dropdown-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsLibraryOpen(true);
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <FileText size={16} />
                                        <span>Session Library</span>
                                    </div>

                                    <div
                                        className="dropdown-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                            setIsMenuOpen(false);
                                        }}
                                    >
                                        <FolderOpen size={16} />
                                        <span>Open Replay (.mume-log)</span>
                                    </div>

                                    {replayer.log && !replayer.state.isVisible && (
                                        <div
                                            className="dropdown-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                replayer.setIsVisible(true);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <Eye size={16} />
                                            <span>Show Replay Controls</span>
                                        </div>
                                    )}

                                    {replayer.log && (
                                        <div
                                            className="dropdown-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                replayer.clearLog();
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <X size={16} color="#ff4444" />
                                            <span style={{ color: '#ff4444' }}>Exit Replay Mode</span>
                                        </div>
                                    )}

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
                        </div>,
                        document.body
                    )}
                </div>
            </div>
        </header>
    );
};

export default React.memo(Header);
