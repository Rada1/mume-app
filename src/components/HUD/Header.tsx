import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Settings, MoreVertical, ChevronDown, Check, ChevronLeft, Eye, Crosshair, RefreshCw, X, User, Map as MapIcon, Music, Cog, Activity, HelpCircle, Film, LogOut, Mail, DraftingCompass } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useMapper } from '../../context/MapperContext';
import { formatCompactNumber } from '../../utils/gameUtils';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useArchiveStore } from '../../stores/useArchiveStore';
import { canAccessShaper } from '../../shaper/access/shaperAccess';
import XpTicker from '../Combat/XpTicker';

interface HeaderProps {
    isLandscape?: boolean;
    getLightingIcon: () => React.ReactNode;
    getWeatherIcon: () => React.ReactNode;
}

const Header: React.FC<HeaderProps> = () => {
    const {
        btn,
        teleportTargets,
        viewport,
        status,
        telnet,
        triggerHaptic,
        gameState,
        clearObjectSelection,
        roomNpcs,
        executeCommand,
        addMessage
    } = useGame() as any;

    const { setActiveMapFilter } = useMapper();

    // Get mode state
    const mode = useModeStore();
    const isSpectating = mode.isSpectating;
    const { spectateTarget, activeView, setActiveView } = mode;
    const { target, setTarget, characterInfo } = useVitals();
    const {
        ui, setUI, setIsSettingsOpen, setPopoverState,
        setSettingsTab, replayer
    } = useUI();

    const isReplayHUDMinimized = useSessionStore(state => state.isReplayHUDMinimized);
    const setIsReplayHUDMinimized = useSessionStore(state => state.setIsReplayHUDMinimized);
    const openArchive = useArchiveStore(state => state.setIsOpen);
    const setArchiveView = useArchiveStore(state => state.setActiveView);
    const setArchivePanelMode = useArchiveStore(state => state.setPanelMode);
    const showDeveloperTools = useSettingsStore(state => state.showDeveloperTools ?? false);

    const [isEnteringTarget, setIsEnteringTarget] = useState(false);
    const [manualTargetInput, setManualTargetInput] = useState('');
    const targetInputRef = useRef<HTMLInputElement>(null);
    const isAccountScreen = gameState === 'account';
    const canOpenShaper = canAccessShaper();
    const displayedSpectateName = isSpectating
        ? (activeView === 'target' ? (characterInfo.name || spectateTarget) : spectateTarget)
        : null;

    // Auto-focus the input when it appears
    useEffect(() => {
        if (isEnteringTarget && targetInputRef.current) {
            targetInputRef.current.focus();
        }
    }, [isEnteringTarget]);

    useEffect(() => {
        const handleTrigger = () => {
            setIsEnteringTarget(true);
            setManualTargetInput('');
            triggerHaptic?.(10);
        };
        window.addEventListener('mume-trigger-target-input', handleTrigger);
        return () => window.removeEventListener('mume-trigger-target-input', handleTrigger);
    }, [triggerHaptic]);

    useEffect(() => {
        if (characterInfo.name) {
            console.log('[Header] Character Info detected:', characterInfo);
        }
    }, [characterInfo]);

    const { activeSet, isEditMode, availableSets, setActiveSet } = btn;
    const teleportTargetsCount = teleportTargets.length;
    const onClearTarget = () => { setTarget(null); clearObjectSelection(); };
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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true')) {
                    return;
                }
                
                event.preventDefault();
                event.stopPropagation();
                
                setUI((prev: any) => {
                    const nextOpen = !prev.isMenuOpen;
                    return {
                        ...prev,
                        isMenuOpen: nextOpen,
                        menuView: nextOpen ? 'main' : prev.menuView
                    };
                });
                triggerHaptic(10);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [setUI, triggerHaptic]);

    const handleExitGame = () => {
        setIsMenuOpen(false);
        
        const hasRentMob = roomNpcs?.some((npc: any) => {
            const name = npc.name?.toLowerCase() || '';
            return name.includes('innkeeper') ||
                   name.includes('barman') ||
                   name.includes('tender') ||
                   name.includes('lodging') ||
                   name.includes('receptionist') ||
                   name.includes('tavern keeper') ||
                   name.includes('barliman') ||
                   name.includes('steward') ||
                   name.includes('vit') ||
                   name.includes('vubur');
        });

        if (hasRentMob) {
            triggerHaptic(30);
            executeCommand('rent');
        } else {
            triggerHaptic(30);
            setActiveMapFilter('RENT');
            setUI(prev => ({
                ...prev,
                mapExpanded: true,
                drawer: 'none'
            }));
            addMessage('system', 'You must rent a room at an Inn to keep your equipment safe while you rest. The map is now showing the path to the nearest Inn.');
        }
    };

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
        <header className={`header ${viewport.isMobile ? 'mobile-header' : ''}`}>
            {/* Left: Player Status HUD */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'visible', position: 'relative' }}>
                {!isAccountScreen && (
                    <div className="player-status-hud" onClick={() => setUI(prev => ({ ...prev, drawer: 'character' }))}>
                        <div className="player-identity">
                            <span className="player-name">{characterInfo.name || (status === 'connected' ? '...' : 'MUME')}</span>
                            <span className="player-level">{characterInfo.level > 0 ? `Lv.${characterInfo.level}` : ''}</span>
                        </div>
                        <div className="player-stats-mini">
                            <div className="stat-pill xp">
                                <span className="pill-label">XP</span>
                                <span className="pill-value">{formatCompactNumber(characterInfo.xp)}</span>
                            </div>
                            <div className="stat-pill tp">
                                <span className="pill-label">TP</span>
                                <span className="pill-value">{formatCompactNumber(characterInfo.tp)}</span>
                            </div>
                        </div>
                    </div>
                )}
                {!isAccountScreen && (
                    <div style={{ 
                        position: viewport.isMobile && !viewport.isLandscape ? 'absolute' : 'relative',
                        left: viewport.isMobile && !viewport.isLandscape ? 'calc(100% + 8px)' : 'auto',
                        top: viewport.isMobile && !viewport.isLandscape ? '50%' : 'auto',
                        transform: viewport.isMobile && !viewport.isLandscape ? 'translateY(-50%)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 9999,
                        pointerEvents: 'none'
                    }}>
                        <XpTicker variant="header" isLandscape={viewport.isLandscape} />
                        <XpTicker variant="header" isLandscape={viewport.isLandscape} kind="tp" />
                    </div>
                )}
            </div>

            {/* Middle: Flexible spacer */}
            <div style={{ flex: 1 }} />

            <div className="header-right-cluster">

            {/* Theater Mode Banner */}
            {replayer.state.isVisible && replayer.log && (
                <div 
                    onClick={() => setIsReplayHUDMinimized(!isReplayHUDMinimized)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 6,
                        background: 'rgba(212,170,0,0.12)',
                        border: '1px solid rgba(212,170,0,0.5)',
                        color: '#ffb400',
                        fontWeight: 700, fontSize: 11, letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        boxShadow: '0 0 8px rgba(255,180,0,0.25)',
                        animation: 'theaterPulse 2s ease-in-out infinite',
                        flexShrink: 0,
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                >
                    <span style={{ fontSize: 8, color: '#ffb400' }}>⏺</span>
                    REPLAY MODE
                    <button onClick={(e) => { e.stopPropagation(); replayer.clearLog(); }} style={{
                        background: 'none', border: 'none', color: '#ffb400',
                        cursor: 'pointer', padding: '0 0 0 4px', fontSize: 12, lineHeight: 1,
                        opacity: 0.7
                    }} title="Exit Replay Mode">✕</button>
                </div>
            )}

            {/* Snoop Target Banner */}
            {isSpectating && displayedSpectateName && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 6,
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.5)',
                    color: '#a78bfa',
                    fontWeight: 700, fontSize: 11, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                    userSelect: 'none',
                }}>
                    <Eye size={11} />
                    {displayedSpectateName}
                </div>
            )}

            {/* View Switcher for Spectate Mode */}
            {isSpectating && (
                <div className="view-switcher premium-glass">
                    <button 
                        className={`view-btn ${activeView === 'self' ? 'active' : ''}`}
                        onClick={() => {
                            triggerHaptic(10);
                            setActiveView('self');
                        }}
                        title="Switch to My View"
                    >
                        <User size={14} />
                        <span>ME</span>
                    </button>
                    <button 
                        className={`view-btn ${activeView === 'target' ? 'active' : ''}`}
                        onClick={() => {
                            triggerHaptic(10);
                            setActiveView('target');
                        }}
                        title={`Switch to ${spectateTarget}'s View`}
                    >
                        <Eye size={14} />
                        <span>SPECTATEE</span>
                    </button>
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

                {!isAccountScreen && (
                <div
                    className={`status-indicator ${!target ? 'clickable-target' : ''}`}
                    style={{
                        color: target ? 'var(--map-accent)' : 'var(--text-faded)',
                        gap: 4, padding: '4px 6px',
                        cursor: 'pointer',
                        opacity: target ? 1 : 0.8,
                        border: target ? '1px solid var(--map-accent)' : '1px solid var(--border-color)',
                        maxWidth: viewport.isMobile ? (isEnteringTarget ? '100px' : '80px') : 'none',
                        minWidth: viewport.isMobile ? '40px' : '90px',
                        overflow: 'hidden',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s ease',
                        background: isEnteringTarget ? 'rgba(var(--map-accent-rgb, 20, 184, 166), 0.1)' : 'transparent'
                    }}
                    title={target ? "Current Target (Click to clear)" : "Click to set target"}
                    onClick={() => {
                        if (target) {
                            onClearTarget();
                            triggerHaptic(5);
                        } else if (!isEnteringTarget) {
                            setIsEnteringTarget(true);
                            setManualTargetInput('');
                            triggerHaptic(10);
                        }
                    }}
                >
                    <Crosshair size={12} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                        {isEnteringTarget ? (
                            <input
                                ref={targetInputRef}
                                type="text"
                                value={manualTargetInput}
                                onChange={(e) => setManualTargetInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (manualTargetInput.trim()) {
                                            setTarget(manualTargetInput.trim());
                                            triggerHaptic?.(15);
                                        }
                                        setIsEnteringTarget(false);
                                        setTimeout(() => {
                                            const mudInput = document.getElementById('mud-input');
                                            if (mudInput) (mudInput as HTMLElement).focus();
                                        }, 30);
                                    } else if (e.key === 'Escape') {
                                        setIsEnteringTarget(false);
                                        setTimeout(() => {
                                            const mudInput = document.getElementById('mud-input');
                                            if (mudInput) (mudInput as HTMLElement).focus();
                                        }, 30);
                                    }
                                }}
                                onBlur={() => {
                                    // Small delay to allow potential Enter key processing if needed, 
                                    // though mostly just to clean up state
                                    setTimeout(() => setIsEnteringTarget(false), 150);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--map-accent)',
                                    outline: 'none',
                                    width: '100%',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    padding: 0,
                                    margin: 0,
                                    textTransform: 'uppercase'
                                }}
                                placeholder="..."
                            />
                        ) : (
                            <span style={{ 
                                fontWeight: 'bold', 
                                fontSize: '0.75rem', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                opacity: target ? 1 : 0.7
                            }}>
                                {target ? target.toUpperCase() : (viewport.isMobile ? 'TARGET' : 'NO TARGET')}
                            </span>
                        )}
                    </div>
                </div>
                )}

                {!isAccountScreen && teleportTargetsCount > 0 && (
                    <div
                        className="status-indicator"
                        style={{
                            color: 'var(--accent)',
                            gap: 4, padding: '4px 6px',
                            cursor: 'pointer',
                            opacity: 1,
                            border: '1px solid var(--accent)',
                            height: '28px',
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

                {!isAccountScreen && (
                    <button
                        className="menu-toggle-btn"
                        onClick={() => {
                            setArchivePanelMode('mail');
                            setArchiveView('mail-inbox');
                            openArchive(true);
                            executeCommand('look mail', true, true, false, true);
                            triggerHaptic?.(10);
                        }}
                        title="Mailbox"
                        style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                    >
                        <Mail size={17} />
                    </button>
                )}

                {isEditMode && !viewport.isLandscape && (
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
                        onClick={() => {
                            const nextOpen = !ui.isMenuOpen;
                            setUI(prev => ({ 
                                ...prev, 
                                isMenuOpen: nextOpen,
                                menuView: nextOpen ? 'main' : prev.menuView
                            }));
                        }}
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
                                    {replayer.log && !replayer.state.isVisible && (
                                        <div
                                            className="dropdown-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                replayer.setIsVisible(true);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                                                    <Eye size={16} />
                                                </div>
                                                <span>Show Replay Controls</span>
                                            </div>
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                                                    <X size={16} color="#ff4444" />
                                                </div>
                                                <span style={{ color: '#ff4444' }}>Exit Replay Mode</span>
                                            </div>
                                        </div>
                                    )}

                                    {(
                                        [
                                            { tab: 'general',  label: 'General',     icon: <Cog size={16} /> },
                                            { tab: 'sound',    label: 'Sound',       icon: <Music size={16} /> },
                                            { tab: 'actions',  label: 'Actions',     icon: <Activity size={16} /> },
                                            { tab: 'buttons',  label: 'Buttons',     icon: <Settings size={16} /> },
                                            { tab: 'map',      label: 'Map',         icon: <MapIcon size={16} /> },
                                            { tab: 'replays',  label: 'Replays',     icon: <Film size={16} /> },
                                            { tab: 'help',     label: 'Help',        icon: <HelpCircle size={16} /> },
                                        ] as const
                                    ).map(({ tab, label, icon }) => (
                                        <div
                                            key={tab}
                                            className="dropdown-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSettingsTab(tab);
                                                setIsSettingsOpen(true);
                                                setIsMenuOpen(false);
                                            }}
                                        >
                                            <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                                                {icon}
                                            </div>
                                            <span>{label}</span>
                                        </div>
                                    ))}
                                    <div
                                        className="dropdown-item"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUI(prev => ({
                                                ...prev,
                                                isShaperOpen: canOpenShaper,
                                                isShaperAccessOpen: !canOpenShaper,
                                                isMenuOpen: false
                                            }));
                                        }}
                                    >
                                        <div style={{ width: '16px', display: 'flex', justifyContent: 'center' }}>
                                            <DraftingCompass size={16} />
                                        </div>
                                        <span>{canOpenShaper ? 'Shaper' : 'Unlock Shaper'}</span>
                                    </div>
                                    {!isAccountScreen && (
                                        <>
                                            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
                                            <div
                                                className="dropdown-item exit-game-item"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleExitGame();
                                                }}
                                                style={{ color: '#ef4444' }}
                                            >
                                                <div style={{ width: '16px', display: 'flex', justifyContent: 'center', color: '#ef4444' }}>
                                                    <LogOut size={16} />
                                                </div>
                                                <span>Exit Game</span>
                                            </div>
                                        </>
                                    )}
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
            </div>
        </header>
    );
};

export default React.memo(Header);
