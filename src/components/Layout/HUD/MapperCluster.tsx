import React, { useState, useRef, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { CommandDeck } from '../../HUD/CommandDeck';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { useInputStore } from '../../../stores/useInputStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { GameContextType, UIContextType } from '../../../context/GameContext/types';
import { ArrowLeft, BookOpen, Info, Menu, ChevronLeft, HelpCircle, Play, Plus, KeyRound, Clock, Link2, Activity, MapPin, Timer, UserCircle, LogOut } from 'lucide-react';
import { useMapper } from '../../../context/useMapper';
import { MapFilterBar } from '../../Mapper/MapFilterBar';
import { MapActionButtons } from './MapActionButtons';
import { useKeyboardMapPreviewScale } from '../../Mapper/hooks/useKeyboardMapPreviewScale';

import InputArea from '../../Controls/InputArea';
import OpponentRechargeTimer from '../../Combat/OpponentRechargeTimer';
import { ActionTimerDisplay } from '../../HUD/ActionTimerDisplay';
import { UiPositions, SwipeDirection } from '../../../types';
import { AccountAnsiLine } from '../../Drawers/AccountAnsiLine';
import './MobileCommandDeck.css';
import './TacticalMapPerimeter.css';

type CreationOption = { id: string; label: string };
const EMPTY_CREATION_OPTIONS: CreationOption[] = [];
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
        inlineCategories, gameState, currentTerrain, accountState, setAccountState,
    } = useGame() as GameContextType;
    const { target, activePrompt } = useVitals();
    const {
        ui, setUI, setPopoverState,
        handleTabClick, toggleMap
    } = useUI() as UIContextType;
    const isExpanded = ui.mapExpanded;
    const mapPanelRef = useRef<HTMLDivElement>(null);
    const mapSurfaceRef = useRef<HTMLDivElement>(null);
    useKeyboardMapPreviewScale(viewport.isKeyboardOpen, mapPanelRef, mapSurfaceRef);
    const rememberLogin = useSettingsStore(s => s.rememberLogin);
    const { viewZ, currentRoomId, rooms, activeMapFilter, mapSearchQuery, setActiveMapFilter, setMapSearchQuery } = useMapper();
    const setRememberLogin = useSettingsStore(s => s.setRememberLogin);
    const setLoginName = useSettingsStore(s => s.setLoginName);
    const setLoginPassword = useSettingsStore(s => s.setLoginPassword);
    const hideMapHeaderFooter = useSettingsStore(s => s.hideMapHeaderFooter);

    // Mobile portrait map panel; CSS places it in normal flow below the log.
    const isReplaying = (useGame() as GameContextType).sessionMode === 'replay';

    useEffect(() => {
        if (!viewport.isMobile || viewport.isLandscape || gameState === 'account' || ui.drawer === 'none') return;
        setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: true }));
    }, [gameState, setUI, ui.drawer, viewport.isLandscape, viewport.isMobile]);

    useEffect(() => {
        if (!viewport.isMobile || viewport.isLandscape) return;
        const app = document.querySelector<HTMLElement>('.app-container');
        if (!app) return;
        // Keep the expanded map at the CSS-defined one-third screen split.
        // Older saved pixel heights would override that responsive layout.
        app.style.removeProperty('--mobile-map-panel-height');
    }, [ui.mapExpanded, viewport.isLandscape, viewport.isMobile]);

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

    const MENU_TABS = [
        { cmd: 'play', label: 'Play', icon: Play },
        { cmd: 'create', label: 'Create', icon: Plus },
        { cmd: 'password', label: 'Password', icon: KeyRound },
        { cmd: 'time', label: 'Time', icon: Clock },
        { cmd: 'link', label: 'Link', icon: Link2 },
        { cmd: 'lag', label: 'Lag', icon: Activity }
    ];

    const selectMenuCommand = (command: string) => {
        triggerHaptic(20);
        if (command === 'play') {
            setAccountState(prev => ({
                ...prev,
                selectedMenuCommand: 'play',
                characters: [],
                selectedCharacter: null,
                charSelectTab: null,
                isGathering: true
            }));
            executeCommand('list', true);
            return;
        }
        if (command === 'time' || command === 'link' || command === 'lag') {
            const captureKey = `${command}Lines` as 'timeLines' | 'linkLines' | 'lagLines';
            setAccountState(prev => ({
                ...prev,
                selectedMenuCommand: command,
                charCapture: { type: command },
                [captureKey]: []
            }));
            executeCommand(command);
            return;
        }
        setAccountState(prev => ({ ...prev, selectedMenuCommand: command }));
    };

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
    if (!isMobile || isLandscape || (gameState === 'disconnected' && !isReplaying) || (gameState === 'account' && !isReplaying)) {
        return null;
    }

    const isShown = ui.mapExpanded;
    
    return (
        <div
            ref={mapPanelRef}
            className={`mobile-map-panel ${isShown ? 'map-expanded' : ''}`}
            style={{
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'stretch',
                gap: '0'
            }}
        >
            {/* The map lives below the log in the app's normal flex flow. */}
            <div
                className="mobile-mapper-touch-surface gutter-panel-card"
                ref={mapSurfaceRef}
                style={{
                    width: '100%',
                    height: '100%',
                    flex: '1 1 auto',
                    minHeight: 0,
                    position: 'relative',
                    pointerEvents: isShown ? 'auto' : 'none',
                    touchAction: 'none',
                    overflow: 'hidden'
                }}
            >
                        {/* Overlay controls keep the map center and edge swipe gutter clear. */}
                        <div className="mobile-map-command-overlay">
                            <div className="mobile-map-edge-vignette" aria-hidden="true" />
                            <div className="mobile-command-deck-persistent">
                                <CommandDeck tactical={{
                                    isEditMode,
                                    dragState,
                                    handleDragStart: (event, id, type) => handleDragStart(event, id, type),
                                    wasDraggingRef,
                                    heldButton,
                                    setHeldButton,
                                    setCommandPreview,
                                }} />
                            </div>
                            {/* Persistent Tactical Buttons */}
                            <div
                                className="mobile-tactical-buttons-persistent"
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

                        <MapActionButtons
                            isGridEnabled={btn.isGridEnabled}
                            gridSize={btn.gridSize}
                            dragState={dragState}
                            handleDragStart={handleDragStart}
                            handleButtonClick={handleButtonClick}
                            wasDraggingRef={wasDraggingRef}
                            triggerHaptic={triggerHaptic}
                            setPopoverState={setPopoverState}
                            setEditButton={button => {
                                btn.setEditingButtonId(button.id);
                                if (!btn.selectedButtonIds.has(button.id)) btn.setSelectedIds(new Set([button.id]));
                            }}
                            activePrompt={activePrompt}
                            executeCommand={executeCommand}
                            setCommandPreview={setCommandPreview}
                            setHeldButton={setHeldButton}
                            heldButton={heldButton}
                            joystick={{
                                isActive: joystick.joystickActive,
                                currentDir: joystick.currentDir,
                                isTargetModifierActive: joystick.isTargetModifierActive,
                                setIsJoystickConsumed: joystick.setIsJoystickConsumed
                            }}
                            target={target}
                            setActiveSet={btn.setActiveSet}
                            setButtons={btn.setButtons}
                            isMobile={isMobile}
                        />

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

                        {/* Docked Map Filter & Z Bar */}
                        {isShown && !isMobile && (
                            <MapFilterBar
                                activeMapFilter={activeMapFilter}
                                mapSearchQuery={mapSearchQuery}
                                setActiveMapFilter={setActiveMapFilter}
                                setMapSearchQuery={setMapSearchQuery}
                                triggerHaptic={triggerHaptic}
                                viewZ={viewZ}
                            />
                        )}

            </div>
        </div>
    );
};
