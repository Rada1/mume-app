import React, { useState, useRef, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { useInputStore } from '../../../stores/useInputStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { DrawerType, GameContextType, UIContextType } from '../../../context/GameContext/types';
import { ArrowLeft, BookOpen, CloudFog, Info, Map as MapIcon, User, Shield, UtensilsCrossed, Droplets, Activity, Clock, Menu, ChevronLeft, HelpCircle } from 'lucide-react';
import { useMapper } from '../../../context/useMapper';
import { MapFilterBar } from '../../Mapper/MapFilterBar';

import { useMumeTime } from '../../../hooks/useMumeTime';
import InputArea from '../../Controls/InputArea';
import OpponentRechargeTimer from '../../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from '../../HUD/ActionTimerDisplay';
import { UiPositions, SwipeDirection } from '../../../types';
import { GutterDrawerPanel } from './GutterDrawerPanel';
import { AccountAnsiLine } from '../../Drawers/AccountAnsiLine';

type CreationOption = { id: string; label: string };
const EMPTY_CREATION_OPTIONS: CreationOption[] = [];
const MOBILE_GUTTER_HEIGHT_KEY = 'mume.mobileGutterHeightPx';
const MIN_MOBILE_GUTTER_HEIGHT = 180;
const MAX_MOBILE_GUTTER_RATIO = 0.58;

const capitalize = (str: string): string => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

interface MapperClusterProps {
    uiPositions: UiPositions;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: string, force?: boolean) => void;
    characterName: string;
    isMobile: boolean;
    mapperRef: React.RefObject<any>;
    dragState: { id: string; type: string; startX: number; startY: number } | null;
    isLandscape?: boolean;
    wasDraggingRef: React.MutableRefObject<boolean>;
    heldButton: any;
    heldButtonRef?: React.MutableRefObject<any>;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: SwipeDirection) => void;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMobile, mapperRef,
    dragState, isLandscape, wasDraggingRef, heldButton, setHeldButton, setCommandPreview,
    handleSend, handleInputSwipe
}) => {
    const {
        triggerHaptic, viewport, btn, handleButtonClick, executeCommand, joystick,
        spatButtons, setSpatButtons, parley, setParley, whoList,
        inlineCategories, env, isFoggy, gameState, currentTerrain, gameTime, accountState, setAccountState,
    } = useGame() as GameContextType;
    const { target, activePrompt, stats } = useVitals();
    const currentTime = useMumeTime(gameTime);
    const {
        ui, setPopoverState,
        handleTabClick, toggleMap
    } = useUI() as UIContextType;
    const { getLightingIcon, getWeatherIcon, lighting, weather } = env;
    const isExpanded = ui.mapExpanded;
    const { isKeyboardOpen } = viewport;
    const gutterResizeRef = useRef<{ pointerId: number } | null>(null);
    const [isGutterResizing, setIsGutterResizing] = useState(false);
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const isDarkMode = useSettingsStore(s => s.theme) === 'dark';
    const { viewZ, currentRoomId, rooms, activeMapFilter, mapSearchQuery, setActiveMapFilter, setMapSearchQuery } = useMapper();
    const setRememberLogin = useSettingsStore(s => s.setRememberLogin);
    const setLoginName = useSettingsStore(s => s.setLoginName);
    const setLoginPassword = useSettingsStore(s => s.setLoginPassword);

    // Mobile DOCKED (Gutter) Mode
    const isReplaying = (useGame() as GameContextType).sessionMode === 'replay';

    // Remember the most recent non-'none' drawer so the drawer slide keeps rendering
    // its content while sliding out of view (otherwise the panel would go blank mid-animation).
    const [lastShownDrawer, setLastShownDrawer] = useState<DrawerType>(
        ui.drawer !== 'none' ? ui.drawer : 'status'
    );
    useEffect(() => {
        if (ui.drawer !== 'none') setLastShownDrawer(ui.drawer);
    }, [ui.drawer]);

    useEffect(() => {
        const app = document.querySelector<HTMLElement>('.app-container');
        if (!app) return;
        const isResizableGutterOpen = viewport.isMobile && !viewport.isLandscape && gameState !== 'account' && (ui.mapExpanded || ui.drawer !== 'none');
        if (!isResizableGutterOpen) {
            app.style.removeProperty('--mobile-gutter-height');
            return;
        }

        const applySavedHeight = () => {
            const saved = Number(window.localStorage.getItem(MOBILE_GUTTER_HEIGHT_KEY));
            if (!Number.isFinite(saved) || saved <= 0) return;
            const maxHeight = Math.round(window.innerHeight * MAX_MOBILE_GUTTER_RATIO);
            const nextHeight = Math.max(MIN_MOBILE_GUTTER_HEIGHT, Math.min(maxHeight, saved));
            app.style.setProperty('--mobile-gutter-height', `${nextHeight}px`);
        };

        applySavedHeight();
        window.addEventListener('resize', applySavedHeight);
        return () => window.removeEventListener('resize', applySavedHeight);
    }, [gameState, ui.drawer, ui.mapExpanded, viewport.isLandscape, viewport.isMobile]);

    const setMobileGutterHeight = React.useCallback((clientY: number) => {
        const app = document.querySelector<HTMLElement>('.app-container');
        if (!app) return;
        const reservedRaw = getComputedStyle(app).getPropertyValue('--mobile-bottom-reserved-space').trim();
        const reserved = Number.parseFloat(reservedRaw) || 0;
        const maxHeight = Math.round(window.innerHeight * MAX_MOBILE_GUTTER_RATIO);
        const desiredHeight = window.innerHeight - clientY - reserved;
        const nextHeight = Math.max(MIN_MOBILE_GUTTER_HEIGHT, Math.min(maxHeight, Math.round(desiredHeight)));
        app.style.setProperty('--mobile-gutter-height', `${nextHeight}px`);
        window.localStorage.setItem(MOBILE_GUTTER_HEIGHT_KEY, String(nextHeight));
    }, []);

    const handleGutterResizeStart = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!viewport.isMobile || viewport.isLandscape || isKeyboardOpen || gameState === 'account') return;
        event.preventDefault();
        event.stopPropagation();
        gutterResizeRef.current = { pointerId: event.pointerId };
        setIsGutterResizing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        setMobileGutterHeight(event.clientY);
        triggerHaptic?.(10);
    }, [gameState, isKeyboardOpen, setMobileGutterHeight, triggerHaptic, viewport.isLandscape, viewport.isMobile]);

    const handleGutterResizeMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!gutterResizeRef.current || gutterResizeRef.current.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        setMobileGutterHeight(event.clientY);
    }, [setMobileGutterHeight]);

    const handleGutterResizeEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        if (!gutterResizeRef.current || gutterResizeRef.current.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        gutterResizeRef.current = null;
        setIsGutterResizing(false);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        triggerHaptic?.(6);
    }, [triggerHaptic]);


    // --- Sticky options for smooth creation-screen transitions ---
    // Holds the last non-empty set of options so we never flash to an empty state
    // while waiting for the server's next set to arrive.
    const stickyOptionsRef = useRef<CreationOption[]>([]);
    const [displayedOptions, setDisplayedOptions] = useState<CreationOption[]>([]);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const liveOptions = (accountState.creationPrompt?.options ?? EMPTY_CREATION_OPTIONS)
        .filter(opt => opt.id.toLowerCase() !== 'quit' && opt.label.toLowerCase() !== 'quit');
    const liveOptionsKey = liveOptions.map(opt => `${opt.id}:${opt.label}`).join('|');

    useEffect(() => {
        if (liveOptions.length > 0) {
            // New options arrived — if we were transitioning, snap in cleanly.
            if (transitionTimerRef.current) {
                clearTimeout(transitionTimerRef.current);
                transitionTimerRef.current = null;
            }
            stickyOptionsRef.current = liveOptions;
            setIsTransitioning(false);
            setDisplayedOptions(liveOptions);
        } else if (stickyOptionsRef.current.length > 0) {
            // Options were cleared (user tapped a button) — hold the last set
            // briefly to avoid a flash, then allow the new set to render in.
            setIsTransitioning(true);
            // After a short grace period (server round-trip) with no new options
            // arriving, we surrender the sticky hold so text-entry prompts work.
            transitionTimerRef.current = setTimeout(() => {
                stickyOptionsRef.current = [];
                setDisplayedOptions([]);
                setIsTransitioning(false);
            }, 800);
        }
    }, [liveOptions.length, liveOptionsKey]);

    const selectedMenuCommand = accountState.selectedMenuCommand ?? null;

    const [playNameInput, setPlayNameInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const selectedPlayName = playNameInput.trim();

    const requestCharacterData = (mode: 'info' | 'practice') => {
        const name = selectedPlayName || accountState.selectedCharacter?.name;
        if (!name) return;
        const character = accountState.characters.find(char => char.name.toLowerCase() === name.toLowerCase()) ?? {
            name,
            race: '',
            level: '',
            logon: '',
            area: '',
            rent: '',
        };
        triggerHaptic(10);
        setAccountState(prev => ({
            ...prev,
            selectedCharacter: character,
            charSelectTab: mode,
            charCapture: { type: mode },
            ...(mode === 'info' ? { charInfoLines: [] } : { charPracticeLines: [] }),
        }));
        executeCommand(`${mode === 'info' ? 'info' : 'practice'} ${name}`, true);
    };

    // Long-press drag-to-select on character lines:
    // - Normal swipe → cancels timer, scrolls as usual
    // - Hold still ~400ms → enters selection mode; subsequent drag changes selection and prevents scroll
    useEffect(() => {
        let longPressTimer: ReturnType<typeof setTimeout> | null = null;
        let isDragSelecting = false;
        let startX = 0;
        let startY = 0;
        const LONG_PRESS_MS = 400;
        const CANCEL_THRESHOLD = 10;

        const cancel = () => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            isDragSelecting = false;
        };

        const onTouchStart = (e: TouchEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.account-char-name')) { cancel(); return; }
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragSelecting = false;
            longPressTimer = setTimeout(() => {
                isDragSelecting = true;
                triggerHaptic(20);
            }, LONG_PRESS_MS);
        };

        const onTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            if (!isDragSelecting) {
                // Cancel long press if finger moved too much before timer fired
                if (longPressTimer && (
                    Math.abs(touch.clientX - startX) > CANCEL_THRESHOLD ||
                    Math.abs(touch.clientY - startY) > CANCEL_THRESHOLD
                )) {
                    cancel();
                }
                return;
            }
            // Selection drag mode: block scroll, update selection under finger
            e.preventDefault();
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const charEl = el?.closest<HTMLElement>('.account-char-name');
            if (!charEl) return;
            const name = charEl.getAttribute('data-context');
            if (!name) return;
            setAccountState(prev => {
                if (prev.selectedCharacter?.name === name) return prev;
                const char = prev.characters.find(c => c.name === name);
                return char
                    ? { ...prev, selectedCharacter: char, charSelectTab: null, charInfoLines: [], charPracticeLines: [] }
                    : prev;
            });
            triggerHaptic(8);
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', cancel, { passive: true });
        document.addEventListener('touchcancel', cancel, { passive: true });
        return () => {
            cancel();
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', cancel);
            document.removeEventListener('touchcancel', cancel);
        };
    }, [setAccountState, triggerHaptic]);

    // On mobile portrait, we show the gutter. On desktop/landscape, Mapper is in DrawerManager
    if (!isMobile || isLandscape || (gameState === 'disconnected' && !isReplaying)) {
        return null;
    }

    // Account screen: full-height gutter with account drawer, no map or tabs
    if (gameState === 'account' && !isReplaying) {
        const isLoginStage = accountState.stage === 'login';
        const isMenuStage = accountState.stage === 'account-menu';
        const isCreationStage = ['character-creation', 'stat-editing', 'account-confirmation'].includes(accountState.stage);

        const isPasswordPrompt = isLoginStage && (
            accountState.currentPrompt?.toLowerCase().includes('password') ||
            accountState.currentPrompt?.toLowerCase().includes('verify')
        );
        const loginHandleSend = (e?: React.FormEvent) => {
            const inputVal = useInputStore.getState().input;
            if (isLoginStage && rememberLogin && inputVal.trim()) {
                if (isPasswordPrompt) setLoginPassword(inputVal.trim());
                else setLoginName(inputVal.trim());
            }
            handleSend(e);
        };


        return (
            <div className="mobile-bottom-gutter account-gutter">
                <div
                    className="account-gutter-content"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        justifyContent: 'center', // Consistently center for balance
                        alignItems: 'center',
                        width: '100%',
                        padding: '0 8px',
                        position: 'relative' // Allow absolute anchoring if needed
                    }}
                >
                    {/* Character Select panel removed per user request */}

                    <div className="account-gutter-inner">
                        {(isMenuStage || isCreationStage) && <div className="account-centered-interactive-zone">
    









                        {isMenuStage && (
                            <div className="char-select-panel">
                                {!accountState.selectedCharacter ? (
                                    selectedMenuCommand === 'create' ? (
                                        <div className="cmd-action-panel">
                                            <div className="cmd-action-header">
                                                <button className="char-back-btn" onClick={() => { triggerHaptic(10); setAccountState(prev => ({ ...prev, selectedMenuCommand: null })); executeCommand('menu'); }}><Menu size={16} /></button>
                                                <span className="cmd-action-title">New Character</span>
                                            </div>
                                            <div className="cmd-action-body">
                                                <button className="char-play-btn" onClick={() => { triggerHaptic(30); executeCommand('create'); }}>
                                                    Create Character
                                                </button>
                                            </div>
                                        </div>
                                    ) : selectedMenuCommand === 'play' ? (
                                        <div className="cmd-action-panel">
                                            <div className="cmd-action-header">
                                                <button className="char-back-btn" onClick={() => { triggerHaptic(10); setPlayNameInput(''); setAccountState(prev => ({ ...prev, selectedMenuCommand: null, characters: [] })); executeCommand('menu'); }}><Menu size={16} /></button>
                                                <div className="cmd-action-title-stack">
                                                    <span className="cmd-action-title">Play Character</span>
                                                    <span className="cmd-action-subtitle">Name / Rce / Sub / Lvl / Logon area / Rent / Delete</span>
                                                </div>
                                            </div>
                                            <div className="cmd-play-char-list">
                                                {accountState.characters.length === 0 ? (
                                                    <div className="char-data-loading">Loading…</div>
                                                ) : (
                                                    accountState.characters.map(char => (
                                                        <button
                                                            key={char.name}
                                                            className={`cmd-play-char-item${playNameInput === char.name ? ' selected' : ''}`}
                                                            onClick={() => { triggerHaptic(15); setPlayNameInput(char.name); }}
                                                        >
                                                            {char.rawLine || char.name}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            <div className="cmd-action-body">
                                                <input
                                                    className="cmd-name-input"
                                                    type="text"
                                                    placeholder="Character name…"
                                                    value={playNameInput}
                                                    onChange={e => setPlayNameInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && playNameInput.trim()) { triggerHaptic(30); executeCommand('play ' + playNameInput.trim()); setPlayNameInput(''); } }}
                                                    autoCapitalize="words"
                                                    spellCheck={false}
                                                />
                                                <div className="cmd-play-action-row">
                                                    <button
                                                        className="char-secondary-btn"
                                                        disabled={!selectedPlayName}
                                                        onClick={() => requestCharacterData('info')}
                                                        aria-label="Show character info"
                                                        title="Info"
                                                    >
                                                        <Info size={16} />
                                                        <span>Info</span>
                                                    </button>
                                                    <button
                                                        className="char-play-btn"
                                                        disabled={!selectedPlayName}
                                                        onClick={() => { if (!selectedPlayName) return; triggerHaptic(30); executeCommand('play ' + selectedPlayName); setPlayNameInput(''); }}
                                                    >
                                                        Play {selectedPlayName ? capitalize(selectedPlayName) : '...'}
                                                    </button>
                                                    <button
                                                        className="char-secondary-btn"
                                                        disabled={!selectedPlayName}
                                                        onClick={() => requestCharacterData('practice')}
                                                        aria-label="Show character skills and spells"
                                                        title="Skills and spells"
                                                    >
                                                        <BookOpen size={16} />
                                                        <span>Skills</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : selectedMenuCommand === 'time' ? (
                                        <div className="cmd-action-panel">
                                            <div className="cmd-action-header">
                                                <button className="char-back-btn" onClick={() => { triggerHaptic(10); setAccountState(prev => ({ ...prev, selectedMenuCommand: null })); executeCommand('menu'); }}><Menu size={16} /></button>
                                                <span className="cmd-action-title">Game Time</span>
                                            </div>
                                            <div className="char-detail-content">
                                                {(accountState.timeLines ?? []).length > 0
                                                    ? <div className="char-data-lines">{(accountState.timeLines ?? []).map((line, i) => <AccountAnsiLine key={i} line={line} />)}</div>
                                                    : accountState.charCapture?.type === 'time'
                                                        ? <div className="char-data-loading">Loading…</div>
                                                        : null}
                                            </div>
                                            <div className="char-detail-play">
                                                <button className="char-play-btn" onClick={() => { triggerHaptic(20); setAccountState(prev => ({ ...prev, charCapture: { type: 'time' }, timeLines: [] })); executeCommand('time'); }}>Refresh</button>
                                            </div>
                                        </div>
                                    ) : selectedMenuCommand === 'link' ? (
                                        <div className="cmd-action-panel">
                                            <div className="cmd-action-header">
                                                <button className="char-back-btn" onClick={() => { triggerHaptic(10); setAccountState(prev => ({ ...prev, selectedMenuCommand: null })); executeCommand('menu'); }}><Menu size={16} /></button>
                                                <span className="cmd-action-title">Link Status</span>
                                            </div>
                                            <div className="char-detail-content">
                                                {(accountState.linkLines ?? []).length > 0
                                                    ? <div className="char-data-lines">{(accountState.linkLines ?? []).map((line, i) => <AccountAnsiLine key={i} line={line} />)}</div>
                                                    : accountState.charCapture?.type === 'link'
                                                        ? <div className="char-data-loading">Loading…</div>
                                                        : null}
                                            </div>
                                            <div className="char-detail-play">
                                                <button className="char-play-btn" onClick={() => { triggerHaptic(20); setAccountState(prev => ({ ...prev, charCapture: { type: 'link' }, linkLines: [] })); executeCommand('link'); }}>Refresh</button>
                                            </div>
                                        </div>
                                    ) : selectedMenuCommand === 'lag' ? (
                                        <div className="cmd-action-panel">
                                            <div className="cmd-action-header">
                                                <button className="char-back-btn" onClick={() => { triggerHaptic(10); setAccountState(prev => ({ ...prev, selectedMenuCommand: null })); executeCommand('menu'); }}><Menu size={16} /></button>
                                                <span className="cmd-action-title">Lag Report</span>
                                            </div>
                                            <div className="char-detail-content">
                                                {(accountState.lagLines ?? []).length > 0
                                                    ? <div className="char-data-lines">{(accountState.lagLines ?? []).map((line, i) => <AccountAnsiLine key={i} line={line} />)}</div>
                                                    : accountState.charCapture?.type === 'lag'
                                                        ? <div className="char-data-loading">Loading…</div>
                                                        : null}
                                            </div>
                                            <div className="char-detail-play">
                                                <button className="char-play-btn" onClick={() => { triggerHaptic(20); setAccountState(prev => ({ ...prev, charCapture: { type: 'lag' }, lagLines: [] })); executeCommand('lag'); }}>Refresh</button>
                                            </div>
                                        </div>
                                    ) : selectedMenuCommand === 'password' ? (
                                        <div className="cmd-action-panel">
                                            <div className="cmd-action-header">
                                                <button className="char-back-btn" onClick={() => { triggerHaptic(10); setPasswordInput(''); setAccountState(prev => ({ ...prev, selectedMenuCommand: null })); executeCommand('menu'); }}><Menu size={16} /></button>
                                                <span className="cmd-action-title">Change Password</span>
                                            </div>
                                            <div className="cmd-action-body">
                                                <input
                                                    className="cmd-name-input"
                                                    type="password"
                                                    placeholder="New password…"
                                                    value={passwordInput}
                                                    onChange={e => setPasswordInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter' && passwordInput.trim()) { triggerHaptic(30); executeCommand('password ' + passwordInput.trim()); setPasswordInput(''); } }}
                                                    autoCapitalize="none"
                                                    autoComplete="new-password"
                                                    spellCheck={false}
                                                />
                                                <button
                                                    className="char-play-btn"
                                                    disabled={!passwordInput.trim()}
                                                    onClick={() => { if (!passwordInput.trim()) return; triggerHaptic(30); executeCommand('password ' + passwordInput.trim()); setPasswordInput(''); }}
                                                >
                                                    Change Password
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="char-select-hint">
                                            {accountState.characters.length === 0 ? (
                                                <>
                                                    <span className="char-select-label">Commands</span>
                                                    <span className="char-select-sublabel">Tap a command in the log to run it</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="char-select-label">Characters</span>
                                                    <span className="char-select-sublabel">Tap a name in the log to select</span>
                                                </>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="char-detail-panel">
                                        <div className="char-detail-header">
                                            <button
                                                className="char-back-btn"
                                                onClick={() => {
                                                    triggerHaptic(10);
                                                    setAccountState(prev => ({ ...prev, selectedCharacter: null }));
                                                }}
                                            >
                                                <ArrowLeft size={18} strokeWidth={2.8} />
                                            </button>
                                            <span className="char-detail-name">{accountState.selectedCharacter.name}</span>
                                        </div>

                                        <div className="char-detail-tabs">
                                            <button
                                                className={`char-tab-btn${accountState.charSelectTab === 'info' ? ' active' : ''}`}
                                                onClick={() => {
                                                    triggerHaptic(10);
                                                    const name = accountState.selectedCharacter!.name;
                                                    setAccountState(prev => ({ ...prev, charSelectTab: 'info', charCapture: { type: 'info' }, charInfoLines: [] }));
                                                    executeCommand('info ' + name, true);
                                                }}
                                            >
                                                <Info size={16} />
                                                <span>Info</span>
                                            </button>
                                            <button
                                                className={`char-tab-btn${accountState.charSelectTab === 'practice' ? ' active' : ''}`}
                                                onClick={() => {
                                                    triggerHaptic(10);
                                                    const name = accountState.selectedCharacter!.name;
                                                    setAccountState(prev => ({ ...prev, charSelectTab: 'practice', charCapture: { type: 'practice' }, charPracticeLines: [] }));
                                                    executeCommand('practice ' + name, true);
                                                }}
                                            >
                                                <BookOpen size={16} />
                                                <span>Skills</span>
                                            </button>
                                        </div>

                                        <div className="char-detail-content">
                                            {accountState.charSelectTab === 'info' ? (
                                                <div className="char-data-lines">
                                                    {(accountState.charInfoLines ?? []).length > 0
                                                        ? (accountState.charInfoLines ?? []).map((line, i) => (
                                                            <AccountAnsiLine key={i} line={line} />
                                                        ))
                                                        : accountState.charCapture?.type === 'info'
                                                            ? <div className="char-data-loading">Loading…</div>
                                                            : null
                                                    }
                                                </div>
                                            ) : accountState.charSelectTab === 'practice' ? (
                                                <div className="char-data-lines">
                                                    {(accountState.charPracticeLines ?? []).length > 0
                                                        ? (accountState.charPracticeLines ?? []).map((line, i) => (
                                                            <AccountAnsiLine key={i} line={line} />
                                                        ))
                                                        : accountState.charCapture?.type === 'practice'
                                                            ? <div className="char-data-loading">Loading…</div>
                                                            : null
                                                    }
                                                </div>
                                            ) : (
                                                <div className="char-detail-hint">Select Info or Skills to view details</div>
                                            )}
                                        </div>

                                        <div className="char-detail-play">
                                            <button
                                                className="char-play-btn"
                                                onClick={() => {
                                                    triggerHaptic(30);
                                                    executeCommand('play ' + accountState.selectedCharacter!.name);
                                                }}
                                            >
                                                Play {capitalize(accountState.selectedCharacter.name)}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {isCreationStage && (
                            <div className="creation-flow-container" style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                flex: 1, 
                                width: '100%', 
                                minHeight: 0, 
                                overflow: 'hidden',
                                justifyContent: 'flex-start'
                            }}>
                                <div style={{ 
                                    color: 'rgba(255,255,255,0.4)', 
                                    fontSize: '11px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1.5px', 
                                    marginBottom: '2px', 
                                    width: '100%', 
                                    textAlign: 'center',
                                    marginTop: '8px'
                                }}>
                                    {accountState.stage === 'account-confirmation' ? 'New Account' : (accountState.stage === 'stat-editing' ? 'Stat Editing' : 'Create Character')}
                                </div>
                                {(() => {
                                    const isConfirmation = accountState.stage === 'account-confirmation';
                                    const isStatStage = accountState.stage === 'stat-editing';

                                    if (isConfirmation) {
                                        return (
                                            <div style={{ display: 'flex', width: '100%', gap: '8px', padding: '8px', justifyContent: 'center' }}>
                                                {displayedOptions.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        className="account-menu-btn"
                                                        style={{ flex: 1, textAlign: 'center', padding: '12px', fontWeight: 'bold' }}
                                                        onClick={() => {
                                                            triggerHaptic(15);
                                                            executeCommand(opt.id);
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    }

                                    if (isStatStage && accountState.pointsLeft !== undefined) {
                                        return (
                                            <div className="creation-points-header" style={{ 
                                                padding: '2px 12px', 
                                                textAlign: 'center', 
                                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                width: '100%'
                                            }}>
                                                <div style={{
                                                    color: '#00ff00',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px',
                                                    background: 'rgba(0, 255, 0, 0.1)',
                                                    padding: '2px 10px',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(0, 255, 0, 0.2)'
                                                }}>
                                                    {accountState.pointsLeft} {accountState.pointsLeft === 1 ? 'Point' : 'Points'} Left
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                                <div className="creation-options-list" style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    flexWrap: 'nowrap',
                                    gap: '0px', 
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    flex: '1 1 auto',
                                    width: '100%',
                                    padding: '10px 4px',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    WebkitOverflowScrolling: 'touch',
                                    maxHeight: '100%',
                                    scrollbarWidth: 'none',
                                    opacity: isTransitioning ? 0.35 : 1,
                                    transition: 'opacity 0.18s ease'
                                }}>
                                    {(() => {
                                        if (accountState.stage === 'account-confirmation') return null;
                                        const isStatStage = accountState.stage === 'stat-editing';
                                        const statOptions = displayedOptions.filter(opt => ['str', 'int', 'wis', 'dex', 'con', 'wil', 'per'].includes(opt.id));
                                        const actionOptions = displayedOptions.filter(opt => !['str', 'int', 'wis', 'dex', 'con', 'wil', 'per'].includes(opt.id));

                                        if (isStatStage) {
                                            return (
                                                <div style={{ display: 'flex', width: '100%', gap: '8px', padding: '0 4px', alignItems: 'stretch' }}>
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                        {statOptions.map(opt => {
                                                            const currentValue = accountState.stats?.[opt.id];
                                                            return (
                                                                <div key={opt.id} className="stat-editor-row" style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    width: '100%',
                                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                                    padding: '0 10px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                    height: '24px',
                                                                    boxSizing: 'border-box'
                                                                }}>
                                                                    <span style={{ color: 'var(--text-faded)', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>
                                                                        {opt.id === 'str' ? 'Strength (str)' :
                                                                         opt.id === 'int' ? 'Intelligence (int)' :
                                                                         opt.id === 'wis' ? 'Wisdom (wis)' :
                                                                         opt.id === 'dex' ? 'Dexterity (dex)' :
                                                                         opt.id === 'con' ? 'Constitution (con)' :
                                                                         opt.id === 'wil' ? 'Willpower (wil)' :
                                                                         opt.id === 'per' ? 'Perception (per)' : opt.id}
                                                                    </span>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                triggerHaptic(10);
                                                                                executeCommand(`${opt.id} ${currentValue! - 1}`);
                                                                            }}
                                                                            style={{
                                                                                background: 'rgba(255, 255, 255, 0.07)',
                                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                                borderRadius: '4px',
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                color: 'rgba(255, 255, 255, 0.6)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '16px',
                                                                                fontWeight: 900,
                                                                                cursor: 'pointer',
                                                                                padding: 0
                                                                            }}
                                                                        >
                                                                            −
                                                                        </button>
                                                                        <span style={{ color: 'var(--ansi-green, #55ff55)', fontSize: '13px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>
                                                                            {currentValue}
                                                                        </span>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                triggerHaptic(10);
                                                                                executeCommand(`${opt.id} ${currentValue! + 1}`);
                                                                            }}
                                                                            style={{
                                                                                background: 'rgba(255, 255, 255, 0.07)',
                                                                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                                                                borderRadius: '4px',
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                color: 'rgba(255, 255, 255, 0.6)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '16px',
                                                                                fontWeight: 900,
                                                                                cursor: 'pointer',
                                                                                padding: 0
                                                                            }}
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    <div style={{ width: '85px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        {actionOptions.map(opt => (
                                                                                            <button
                                                                                                key={opt.id}
                                                                                                className="account-menu-btn creation-option-btn no-arrow"
                                                                                                style={{
                                                                                                    width: '100%',
                                                                                                    textAlign: 'center',
                                                                                                    display: 'flex',
                                                                                                    alignItems: 'center',
                                                                                                    justifyContent: 'center',
                                                                                                    padding: '0 8px',
                                                                                                    flex: 1,
                                                                                                    minHeight: '40px',
                                                                                                    fontSize: '11px',
                                                                                                    fontWeight: 'bold'
                                                                                                }}
                                                                                                onClick={() => {
                                                                                                    triggerHaptic(20);
                                                                                                    executeCommand(opt.id);
                                                                                                }}
                                                                                            >
                                                                                                {opt.label.split(' ')[0]}
                                                                                            </button>
                                                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return displayedOptions.map(opt => (
                                            <button
                                                key={opt.id}
                                                className="account-menu-btn creation-option-btn"
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '10px 16px',
                                                    margin: '1px 0'
                                                }}
                                                onClick={() => {
                                                    triggerHaptic(15);
                                                    setAccountState?.(prev => ({
                                                        ...prev,
                                                        lastSelectedId: opt.id
                                                    }));
                                                    executeCommand(opt.id);
                                                }}
                                            >
                                                <span style={{ color: '#fff', marginRight: '8px', fontWeight: 'bold', minWidth: '16px' }}>
                                                    {/^\d+$/.test(opt.id) ? (
                                                        <>
                                                            (<span style={{ color: '#4ade80' }}>{opt.id}</span>)
                                                        </>
                                                    ) : opt.id}
                                                </span>
                                                <span style={{ flex: 1, fontWeight: 'bold' }}>{opt.label}</span>
                                            </button>
                                        ));
                                    })()}
                                </div>


                            </div>
                        )}
                        </div>} {/* End account-centered-interactive-zone */}

                        {!isMenuStage && (!isCreationStage || (!displayedOptions.length && !isTransitioning)) && (
                            <div
                                className={`mobile-gutter-input-wrapper account-bar-anchor${isLoginStage ? ' account-login-glow' : ''}`}
                                style={{
                                    position: 'relative',
                                    zIndex: 1,
                                    padding: '0',
                                    flexShrink: 0,
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}
                            >
                            <InputArea
                                onSend={loginHandleSend}
                                onSwipe={handleInputSwipe}
                                isMobile={isMobile}
                                isKeyboardOpen={isKeyboardOpen}
                                commandPreview={null}
                                spatButtons={spatButtons}
                                setActiveSet={btn.setActiveSet}
                                executeCommand={executeCommand}
                                setSpatButtons={setSpatButtons}
                                setPopoverState={setPopoverState}
                                parley={parley}
                                setParley={setParley}
                                whoList={whoList}
                                gameState={gameState}
                                terrain={currentTerrain}
                            />
                            </div>
                        )}

                        {isCreationStage && accountState.stage !== 'account-confirmation' && (
                            <div className="creation-nav-buttons" style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                justifyContent: 'center', 
                                padding: '12px 12px 24px 12px',
                                width: '100%',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(0,0,0,0.3)',
                                opacity: isTransitioning ? 0 : 1,
                                pointerEvents: isTransitioning ? 'none' : undefined,
                                transition: 'opacity 0.18s ease',
                                flexShrink: 0,
                                marginTop: 'auto',
                                position: 'relative',
                                bottom: 0
                            }}>
                                <button 
                                    className="account-menu-btn no-arrow"
                                    style={{ width: 'auto', padding: '8px 12px', flex: 1, fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    onClick={() => { triggerHaptic(20); executeCommand('back'); }}
                                >
                                    <ChevronLeft size={14} />
                                    Back
                                </button>
                                <button
                                    className="account-menu-btn no-arrow"
                                    style={{ width: 'auto', padding: '8px 12px', flex: 1, fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    onClick={() => {
                                        triggerHaptic(20);
                                        executeCommand('');
                                        executeCommand('');
                                        executeCommand('menu');
                                    }}
                                >
                                    <Menu size={14} />
                                    Menu
                                </button>
                                <button
                                    className="account-menu-btn no-arrow"
                                    style={{ width: 'auto', padding: '8px 12px', flex: 1, fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    onClick={() => { triggerHaptic(20); executeCommand('?'); }}
                                >
                                    <HelpCircle size={14} />
                                    Help
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    const isShown = ui.mapExpanded && ui.drawer === 'none';
    
    return (
        <div
            className={`mobile-bottom-gutter ${isShown ? 'map-expanded' : ''}${isGutterResizing ? ' is-resizing' : ''}`}
            style={{
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '0'
            }}
        >
            {gameState !== 'account' && (
                <div
                    className="mobile-gutter-resize-handle"
                    aria-label="Resize map drawer"
                    role="separator"
                    aria-orientation="horizontal"
                    onPointerDown={handleGutterResizeStart}
                    onPointerMove={handleGutterResizeMove}
                    onPointerUp={handleGutterResizeEnd}
                    onPointerCancel={handleGutterResizeEnd}
                />
            )}
            {/* Horizontal slide-track holding [drawer | map] so switching between
                them animates with the same swipe transition used between drawers. */}
            <div
                className="mobile-gutter-slide-viewport"
                style={{
                    position: 'relative',
                    flex: 1,
                    minHeight: 0,
                    overflow: isShown ? 'visible' : 'hidden'
                }}
            >
                <div
                    className="mobile-gutter-slide-track"
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: '200%',
                        height: '100%',
                        transform: isShown ? 'translateX(-50%)' : 'translateX(0)',
                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    {/* Drawer slide (left half) */}
                    <div
                        style={{
                            width: '50%',
                            height: '100%',
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            pointerEvents: ui.drawer !== 'none' ? 'auto' : 'none'
                        }}
                    >
                        <GutterDrawerPanel displayDrawer={lastShownDrawer} />
                    </div>

                    {/* Map slide (right half) */}
                    <div
                        className="mobile-mapper-touch-surface gutter-panel-card map-under-command-bar"
                        style={{
                            width: '50%',
                            height: 'calc(100% + 124px)',
                            flexShrink: 0,
                            position: 'relative',
                            marginBottom: '-124px',
                            pointerEvents: isShown ? 'auto' : 'none',
                            touchAction: 'none'
                        }}
                    >
                        {/* Header Group: Tactical Buttons */}
                        <div style={{
                            position: 'absolute',
                            top: '0',
                            left: '0',
                            right: '0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            zIndex: 2800,
                            pointerEvents: 'none'
                        }}>
                            {/* Persistent Tactical Buttons */}
                            <div
                                className="mobile-tactical-buttons-persistent"
                                style={{
                                    position: 'relative',
                                    marginTop: '10px',
                                    zIndex: 20,
                                    overflow: 'visible',
                                    pointerEvents: 'auto'
                                }}
                            >
                                <LineCluster
                                    isEditMode={isEditMode}
                                    handleDragStart={handleDragStart}
                                    buttons={btn.buttons}
                                    selectedButtonIds={btn.selectedButtonIds}
                                    dragState={dragState}
                                    handleButtonClick={handleButtonClick}
                                    wasDraggingRef={wasDraggingRef}
                                    triggerHaptic={triggerHaptic}
                                    setPopoverState={setPopoverState}
                                    setEditingButtonId={btn.setEditingButtonId}
                                    setSelectedIds={btn.setSelectedIds}
                                    activePrompt={activePrompt}
                                    executeCommand={executeCommand}
                                    setCommandPreview={setCommandPreview}
                                    heldButton={heldButton}
                                    setHeldButton={setHeldButton}
                                    joystick={joystick}
                                    target={target}
                                    isGridEnabled={btn.isGridEnabled}
                                    gridSize={btn.gridSize}
                                    setActiveSet={btn.setActiveSet}
                                    setButtons={btn.setButtons}
                                    isMobile={isMobile}
                                />
                            </div>
                        </div>

                        <Mapper
                            ref={mapperRef}
                            isDesignMode={isEditMode}
                            characterName={characterName}
                            isMobile={true}
                            isExpanded={isExpanded}
                            setIsMinimized={(min) => {
                                handleTabClick('none' as any);
                            }}
                            heldButton={heldButton}
                            setHeldButton={setHeldButton}
                            setCommandPreview={setCommandPreview}
                        />
                    </div>
                </div>
            </div>

            {/* Command Bar at the BOTTOM of the gutter */}
            <div
                className="mobile-gutter-input-wrapper"
                style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '8px 0 0 0',
                    flexShrink: 0,
                    marginBottom: '16px' 
                }}
            >
                {/* Z-indicator and Find button - bottom-left above command bar */}
                {isShown && (
                    <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 4px)',
                        left: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'flex-start',
                        zIndex: 2,
                        pointerEvents: 'none',
                    }}>
                        <div className="gutter-map-filter-host" style={{ pointerEvents: 'auto' }}>
                            <MapFilterBar
                                activeMapFilter={activeMapFilter}
                                mapSearchQuery={mapSearchQuery}
                                setActiveMapFilter={setActiveMapFilter}
                                setMapSearchQuery={setMapSearchQuery}
                                triggerHaptic={triggerHaptic}
                            />
                        </div>
                        <div className="map-z-indicator" style={{
                            position: 'relative',
                            bottom: 'auto',
                            left: 'auto',
                            height: 'auto',
                            minHeight: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            border: isDarkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.12)',
                            color: 'var(--text-faded)',
                            fontSize: '0.55rem',
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            lineHeight: 1,
                            opacity: 1,
                            transform: 'scale(0.9)',
                            transformOrigin: 'bottom left',
                            pointerEvents: 'none',
                        }}>
                            Z: {viewZ !== null ? viewZ : (currentRoomId && rooms[currentRoomId] ? (rooms[currentRoomId].z || 0).toFixed(1) : '0.0')}
                        </div>
                    </div>
                )}

                {/* Mobile Portrait Env Indicator - Bottom Right above command bar */}
                {isMobile && !isLandscape && isShown && (lighting !== 'none' || weather !== 'none' || isFoggy || stats.conditions?.hungry || stats.conditions?.thirsty || currentTime) && (
                    <div className="mobile-portrait-env-indicator" style={{
                        position: 'absolute',
                        bottom: 'calc(100% - 4px)',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        background: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: '4px',
                        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.12)',
                        zIndex: 2,
                        pointerEvents: 'none',
                        color: 'var(--text-faded)',
                        transform: 'scale(0.9)',
                        transformOrigin: 'bottom right'
                    }}>
                        {currentTime && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginRight: '2px', borderRight: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.12)', paddingRight: '4px' }}>
                                <Clock size={11} style={{ opacity: 0.7 }} />
                                <span style={{ fontSize: '0.55rem', fontWeight: 800 }}>
                                    {currentTime.hour === 0 ? '12' : (currentTime.hour > 12 ? currentTime.hour - 12 : currentTime.hour)}
                                    :{currentTime.minute < 10 ? `0${currentTime.minute}` : currentTime.minute}
                                    {currentTime.hour >= 12 ? ' PM' : ' AM'}
                                </span>
                            </div>
                        )}
                        {stats.conditions?.hungry && (
                            <UtensilsCrossed size={12} style={{ color: '#fbbf24' }} />
                        )}
                        {stats.conditions?.thirsty && (
                            <Droplets size={12} style={{ color: '#60a5fa' }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', transform: 'scale(0.85)' }}>
                            {getLightingIcon()}
                            {getWeatherIcon()}
                            {isFoggy && <CloudFog size={12} style={{ opacity: 0.6 }} />}
                        </div>
                        <span style={{ fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.01em', textTransform: 'uppercase', opacity: 0.8 }}>
                            {lighting && lighting !== 'none' ? lighting : ''}
                            {weather && weather !== 'none' && weather !== 'clear' ? ` | ${weather.replace('-', ' ')}` : ''}
                        </span>
                    </div>
                )}

                {gameState !== 'account' && (
                    <div className="prompt-timer-lane mobile-prompt-timer-lane" aria-hidden="true">
                        <OpponentRechargeTimer lane="player" />
                        <ActionTimerDisplay />
                    </div>
                )}

                <InputArea
                    onSend={handleSend}
                    onSwipe={handleInputSwipe}
                    isMobile={isMobile}
                    isKeyboardOpen={viewport.isKeyboardOpen}
                    commandPreview={null}
                    spatButtons={spatButtons}
                    setActiveSet={btn.setActiveSet}
                    executeCommand={executeCommand}
                    setSpatButtons={setSpatButtons}
                    setPopoverState={setPopoverState}
                    parley={parley}
                    setParley={setParley}
                    whoList={whoList}
                    gameState={gameState}
                    terrain={currentTerrain}
                />
            </div>

            {/* Bottom Tab Bar */}
            {!isKeyboardOpen && gameState !== 'disconnected' && (
                <div className="portrait-tab-bar">
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'status' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('status'); }}
                    >
                        <Activity className="tab-icon" />
                        <span className="tab-text">Status</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'character' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('character'); }}
                    >
                        <User className="tab-icon" />
                        <span className="tab-text">Char</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'equipment' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('equipment'); }}
                    >
                        <Shield className="tab-icon" />
                        <span className="tab-text">Gear</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${isShown ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); toggleMap(); }}
                    >
                        <MapIcon className="tab-icon" />
                        <span className="tab-text">Map</span>
                    </div>
                </div>
            )}
        </div>
    );
};
