import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Settings, MoreVertical, ChevronDown, Check, ChevronLeft, Eye, RefreshCw, X, User, Map as MapIcon, Music, Cog, Activity, HelpCircle, Film, LogOut, Mail, DraftingCompass, MessageSquare, TerminalSquare, Shield, UsersRound } from 'lucide-react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { useMapper } from '../../context/MapperContext';
import { useModeStore } from '../../stores/useModeStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useArchiveStore } from '../../stores/useArchiveStore';
import { useMobileHeaderTabs } from '../../hooks/useMobileHeaderTabs';
import { useUIStore } from '../../stores/useUIStore';
import { canAccessShaper } from '../../shaper/access/shaperAccess';
import { MobileHeaderTime } from './MobileHeaderTime';

interface HeaderProps {
    isLandscape?: boolean;
    getWeatherIcon: () => React.ReactNode;
}

const Header: React.FC<HeaderProps> = () => {
    const {
        btn,
        viewport,
        status,
        telnet,
        triggerHaptic,
        gameState,
        clearObjectSelection,
        roomNpcs,
        roomPlayers,
        roomItems,
        executeCommand,
        addMessage,
        entities
    } = useGame() as any;

    const { setActiveMapFilter, currentRoomId, rooms, preloadedCoordsRef } = useMapper();

    // Get mode state
    const mode = useModeStore();
    const isSpectating = mode.isSpectating;
    const { spectateTarget, activeView, setActiveView } = mode;
    const { target, setTarget, characterInfo } = useVitals() as any;
    const {
        ui, setUI, setIsSettingsOpen, setPopoverState,
        setSettingsTab, replayer
    } = useUI();

    const selectedTarget = useUIStore(state => state.selectedTarget);

    const isReplayHUDMinimized = useSessionStore(state => state.isReplayHUDMinimized);
    const setIsReplayHUDMinimized = useSessionStore(state => state.setIsReplayHUDMinimized);
    const openArchive = useArchiveStore(state => state.setIsOpen);
    const setArchiveView = useArchiveStore(state => state.setActiveView);
    const setArchivePanelMode = useArchiveStore(state => state.setPanelMode);
    const showDeveloperTools = useSettingsStore(state => state.showDeveloperTools ?? false);
    const isClassicMode = useSettingsStore(state => state.isClassicMode);

    const [isEnteringTarget, setIsEnteringTarget] = useState(false);
    const [manualTargetInput, setManualTargetInput] = useState('');
    const targetInputRef = useRef<HTMLInputElement>(null);
    const isAccountScreen = gameState === 'account';
    const canOpenShaper = canAccessShaper();
    const displayedSpectateName = isSpectating
        ? (activeView === 'target' ? (characterInfo.name || spectateTarget) : spectateTarget)
        : null;
    const getTargetColor = () => {
        if (!target) return null;
        
        const normTarget = target.trim().toLowerCase();

        // 1. Try matching with selectedTarget from the UIStore
        if (selectedTarget) {
            const isMatch = 
                selectedTarget.context?.toLowerCase() === normTarget ||
                selectedTarget.keyword?.toLowerCase() === normTarget ||
                selectedTarget.displayName?.toLowerCase().includes(normTarget);
            if (isMatch && selectedTarget.accentColor) {
                return selectedTarget.accentColor;
            }
        }

        // 2. If no direct match in selectedTarget, search the entities registry
        if (entities) {
            const matchingEntity = Object.values(entities).find((entity): entity is { id?: string; noun?: string; name?: string } => {
                if (!entity || typeof entity !== 'object') return false;
                const e = entity as { noun?: string; name?: string };
                return (
                    e.noun?.toLowerCase() === normTarget ||
                    e.name?.toLowerCase() === normTarget ||
                    e.name?.toLowerCase().includes(normTarget)
                );
            });

            if (matchingEntity) {
                const id = matchingEntity.id || '';
                if (id.startsWith('roomplayers') || id.startsWith('player')) {
                    return 'var(--color-player)';
                }
                if (id.startsWith('roomnpcs') || id.startsWith('npc')) {
                    return 'var(--color-npc)';
                }
                if (id.startsWith('roomitems') || id.startsWith('inv') || id.startsWith('eq') || id.startsWith('item')) {
                    return 'var(--color-obj)';
                }
            }
        }

        // 3. Fallbacks for room lists (if entity wasn't in registry yet)
        if (roomNpcs) {
            const npcMatch = roomNpcs.find((npc: any) => {
                const npcName = (npc.name || npc.short || '').toLowerCase();
                return npcName.includes(normTarget);
            });
            if (npcMatch) {
                return 'var(--color-npc)';
            }
        }

        if (roomPlayers) {
            const playerMatch = roomPlayers.find((p: any) => {
                const pName = (p.name || p.short || '').toLowerCase();
                return pName.includes(normTarget);
            });
            if (playerMatch) {
                return 'var(--color-player)';
            }
        }

        if (roomItems) {
            const itemMatch = roomItems.find((i: any) => {
                const iName = (i.name || i.short || '').toLowerCase();
                return iName.includes(normTarget);
            });
            if (itemMatch) {
                return 'var(--color-obj)';
            }
        }

        // 4. Default fallback to Target Gold
        return 'var(--color-target, #facc15)';
    };

    const currentRoomLoadFlags = React.useMemo(() => {
        if (!currentRoomId) return [];
        const rawId = String(currentRoomId).replace(/^m_/, '');
        const mapRoom = rooms[currentRoomId] || rooms[`m_${rawId}`];
        const preloadedRoom = preloadedCoordsRef.current?.[rawId];
        return [
            ...(Array.isArray(preloadedRoom?.[8]) ? preloadedRoom[8] : []),
            ...(Array.isArray(mapRoom?.loadFlags) ? mapRoom.loadFlags : [])
        ];
    }, [currentRoomId, rooms, preloadedCoordsRef]);

    const hasMailLoadFlag = React.useMemo(
        () => currentRoomLoadFlags.some(flag => String(flag).toUpperCase() === 'MAIL'),
        [currentRoomLoadFlags]
    );

    // Auto-focus the input when it appears
    useEffect(() => {
        if (isEnteringTarget && targetInputRef.current) {
            targetInputRef.current.focus();
        }
    }, [isEnteringTarget]);

    useEffect(() => {
        if (characterInfo.name) {
            console.log('[Header] Character Info detected:', characterInfo);
        }
    }, [characterInfo]);

    const { activeSet, isEditMode, availableSets, setActiveSet } = btn;
    const onClearTarget = () => { setTarget(null); clearObjectSelection(); };
    const [isMenuOpen, setIsMenuOpen] = [ui.isMenuOpen, (val: boolean) => setUI(prev => ({ ...prev, isMenuOpen: val })) as any];
    const [isSetMenuOpen, setIsSetMenuOpen] = [ui.isSetMenuOpen, (val: boolean) => setUI(prev => ({ ...prev, isSetMenuOpen: val })) as any];
    const [menuView, setMenuView] = [ui.menuView, (val: 'main' | 'availableSets') => setUI(prev => ({ ...prev, menuView: val })) as any];
    const { isCommandPanelOpen, isGearPanelOpen, showChatWindow, showGroupPanel,
        isHelpOpen, helpData, toggleHeaderTab } = useMobileHeaderTabs(viewport.isMobile, isMenuOpen, setIsMenuOpen);

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
                
                if (toggleHeaderTab('menu')) setMenuView('main');
                triggerHaptic(10);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [toggleHeaderTab, setMenuView, triggerHaptic]);

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
            {viewport.isMobile && gameState === 'playing' ? <MobileHeaderTime /> : <div style={{ flex: 1 }} />}

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
                    <>
                        {hasMailLoadFlag && (
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

                        <button
                            className={`menu-toggle-btn${isCommandPanelOpen ? ' active' : ''}`}
                            onClick={() => {
                                toggleHeaderTab('commands');
                                triggerHaptic?.(10);
                            }}
                            title="Toggle Commands Panel"
                            aria-label="Toggle Commands Panel"
                            aria-pressed={isCommandPanelOpen}
                            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                        >
                            <TerminalSquare size={17} />
                        </button>

                        <button
                            className={`menu-toggle-btn${isGearPanelOpen ? ' active' : ''}`}
                            onClick={() => {
                                toggleHeaderTab('gear');
                                triggerHaptic?.(10);
                            }}
                            title="Toggle Equipment and Inventory"
                            aria-label="Toggle Equipment and Inventory"
                            aria-pressed={isGearPanelOpen}
                            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                        >
                            <Shield size={17} />
                        </button>

                        <button
                            className={`menu-toggle-btn${showChatWindow ? ' active' : ''}`}
                            onClick={() => {
                                toggleHeaderTab('chat');
                                triggerHaptic?.(10);
                            }}
                            title="Toggle Chat Panel"
                            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                        >
                            <MessageSquare size={17} />
                        </button>

                        <button
                            className={`menu-toggle-btn${showGroupPanel ? ' active' : ''}`}
                            onClick={() => {
                                toggleHeaderTab('group');
                                triggerHaptic?.(10);
                            }}
                            title="Toggle Group Status"
                            aria-label="Toggle Group Status"
                            aria-pressed={showGroupPanel}
                            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                        >
                            <UsersRound size={17} />
                        </button>

                        <button
                            className={`menu-toggle-btn${isHelpOpen ? ' active' : ''}`}
                            onClick={() => {
                                if (!isHelpOpen && !helpData) {
                                    executeCommand('help', false, false, false, true);
                                }
                                toggleHeaderTab('help');
                                triggerHaptic?.(10);
                            }}
                            title="Toggle Help Window"
                            style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                        >
                            <HelpCircle size={17} />
                        </button>
                    </>
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
                            if (toggleHeaderTab('menu')) setMenuView('main');
                        }}
                        title={isClassicMode ? 'Main Menu' : 'More Actions'}
                        aria-label={isClassicMode ? 'Main Menu' : 'More Actions'}
                        style={{ width: '32px', height: '32px', padding: 0, justifyContent: 'center' }}
                    >
                        {isClassicMode && <span className="classic-main-menu-label">MENU</span>}
                        <MoreVertical size={20} />
                    </button>

                    {isMenuOpen && menuDropdownPos && createPortal(
                        <div
                            className="header-dropdown-menu header-dropdown-menu--terminal"
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
                                            <div className="header-dropdown-divider" />
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
