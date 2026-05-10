import React, { useState, useRef, useEffect } from 'react';
import { Mapper } from '../../Mapper/Mapper';
import { LineCluster } from './LineCluster';
import { useGame, useUI, useVitals } from '../../../context/GameContext';
import { GameContextType, UIContextType } from '../../../context/GameContext/types';
import { CloudFog, Map as MapIcon, User, Shield, Users, UtensilsCrossed, Droplets, Activity, Clock } from 'lucide-react';
import { useMumeTime } from '../../../hooks/useMumeTime';
import InputArea from '../../Controls/InputArea';
import CombatStatsPanel from '../../Combat/CombatStatsPanel';
import { MapperRoomInfo } from '../../Mapper/MapperRoomInfo';
import { UiPositions, SwipeDirection } from '../../../types';
import { GutterDrawerPanel } from './GutterDrawerPanel';


interface MapperClusterProps {
    uiPositions: UiPositions;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: string, force?: boolean) => void;
    characterName: string;
    isMmapperMode: boolean;
    isMobile: boolean;
    mapperRef: React.RefObject<any>;
    dragState: { id: string; type: string; startX: number; startY: number } | null;
    isLandscape?: boolean;
    wasDraggingRef: React.MutableRefObject<boolean>;
    heldButton: any;
    heldButtonRef?: React.MutableRefObject<any>;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
    input: string;
    setInput: (val: string) => void;
    handleSend: (e?: React.FormEvent) => void;
    handleInputSwipe: (dir: SwipeDirection) => void;
}

export const MapperCluster: React.FC<MapperClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, characterName, isMmapperMode, isMobile, mapperRef,
    dragState, isLandscape, wasDraggingRef, heldButton, heldButtonRef, setHeldButton, setCommandPreview,
    input, setInput, handleSend, handleInputSwipe
}) => {
    const {
        triggerHaptic, viewport, btn, handleButtonClick, executeCommand, joystick,
        spatButtons, setSpatButtons, parley, setParley, whoList,
        inlineCategories, env, isFoggy, gameState, currentTerrain, gameTime, accountState, setAccountState
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

    // Mobile DOCKED (Gutter) Mode
    const isReplaying = (useGame() as GameContextType).sessionMode === 'replay';

    // --- Sticky options for smooth creation-screen transitions ---
    // Holds the last non-empty set of options so we never flash to an empty state
    // while waiting for the server's next set to arrive.
    const stickyOptionsRef = useRef<{ id: string; label: string }[]>([]);
    const [displayedOptions, setDisplayedOptions] = useState<{ id: string; label: string }[]>([]);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const liveOptions = accountState.creationPrompt?.options ?? [];

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
    }, [liveOptions.length, liveOptions]);

    // On mobile portrait, we show the gutter. On desktop/landscape, Mapper is in DrawerManager
    if (!isMobile || isLandscape || (gameState === 'disconnected' && !isReplaying)) {
        return null;
    }

    // Account screen: full-height gutter with account drawer, no map or tabs
    if (gameState === 'account') {
        const isLoginStage = accountState.stage === 'login';
        const isMenuStage = accountState.stage === 'account-menu';
        const isCreationStage = accountState.stage === 'character-creation' || accountState.stage === 'stat-editing';

        const menuCommands = [
            'create', 'play', 'time', 'list', 'move', 'password', 
            'add', 'info', 'practice', 'link', 'lag', 'help', 'menu', 'quit'
        ];

        return (
            <div className="mobile-bottom-gutter account-gutter">
                <div 
                    className="account-gutter-content" 
                    style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        flex: 1, 
                        justifyContent: isLoginStage ? 'center' : 'flex-start',
                        alignItems: 'center',
                        width: '100%',
                        padding: '0 8px'
                    }}
                >
                    {/* Character Select panel removed per user request */}
                    
                    <div className="account-mobile-gutter-layout" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {isLoginStage && accountState.currentPrompt && (
                            <div className="account-prompt-display">
                                {accountState.currentPrompt}
                            </div>
                        )}

                        {isMenuStage && (
                            <>
                                <div style={{ 
                                    color: 'rgba(255,255,255,0.4)', 
                                    fontSize: '11px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1.5px', 
                                    marginBottom: '2px', 
                                    width: '100%', 
                                    textAlign: 'center',
                                    marginTop: '2px'
                                }}>
                                    Menu
                                </div>
                                <div className="account-menu-buttons-list">
                                    {menuCommands.map(cmd => (
                                        <button
                                            key={cmd}
                                            className="account-menu-btn"
                                            onClick={() => executeCommand(cmd)}
                                        >
                                            {cmd}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        {isCreationStage && (
                            <div className="creation-flow-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' }}>
                                <div style={{ 
                                    color: 'rgba(255,255,255,0.4)', 
                                    fontSize: '11px', 
                                    fontWeight: 900, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1.5px', 
                                    marginBottom: '2px', 
                                    width: '100%', 
                                    textAlign: 'center',
                                    marginTop: '2px'
                                }}>
                                    Create Character
                                </div>
                                {accountState.stage === 'stat-editing' && accountState.pointsLeft !== undefined && (
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
                                )}
                                <div className="creation-options-list" style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    flexWrap: 'nowrap',
                                    gap: '0px', 
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    flex: 1,
                                    width: '100%',
                                    padding: '0px',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    WebkitOverflowScrolling: 'touch',
                                    maxHeight: '100%',
                                    scrollbarWidth: 'none',
                                    opacity: isTransitioning ? 0.35 : 1,
                                    transition: 'opacity 0.18s ease'
                                }}>
                                    {(() => {
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
                                                                    <span style={{ color: 'var(--text-faded)', fontSize: '10px', fontWeight: 800, width: '28px', letterSpacing: '0.04em' }}>{opt.id.toUpperCase()}</span>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                executeCommand(`${opt.id} ${currentValue! - 1}`);
                                                                            }}
                                                                            style={{
                                                                                background: 'rgba(255, 50, 50, 0.15)',
                                                                                border: '1px solid rgba(255, 50, 50, 0.25)',
                                                                                borderRadius: '4px',
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                color: '#ff8888',
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
                                                                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', minWidth: '18px', textAlign: 'center' }}>
                                                                            {currentValue}
                                                                        </span>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                executeCommand(`${opt.id} ${currentValue! + 1}`);
                                                                            }}
                                                                            style={{
                                                                                background: 'rgba(50, 255, 50, 0.15)',
                                                                                border: '1px solid rgba(50, 255, 255, 0.25)',
                                                                                borderRadius: '4px',
                                                                                width: '24px',
                                                                                height: '24px',
                                                                                color: '#88ff88',
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
                                                                onClick={() => executeCommand(opt.id)}
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

                                <div className="creation-nav-buttons" style={{ 
                                    display: 'flex', 
                                    gap: '8px', 
                                    justifyContent: 'center', 
                                    padding: '2px 12px',
                                    width: '100%',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                    background: 'rgba(0,0,0,0.1)',
                                    opacity: isTransitioning ? 0 : 1,
                                    pointerEvents: isTransitioning ? 'none' : undefined,
                                    transition: 'opacity 0.18s ease'
                                }}>
                                    <button 
                                        className="account-menu-btn"
                                        style={{ width: 'auto', padding: '8px 12px', flex: 1, fontSize: '11px', fontWeight: 'bold' }}
                                        onClick={() => executeCommand('back')}
                                    >
                                        Back
                                    </button>
                                    <button 
                                        className="account-menu-btn"
                                        style={{ width: 'auto', padding: '8px 12px', flex: 1, fontSize: '11px', fontWeight: 'bold' }}
                                        onClick={() => {
                                            executeCommand('');
                                            executeCommand('');
                                        }}
                                    >
                                        Main Menu
                                    </button>
                                    <button 
                                        className="account-menu-btn"
                                        style={{ width: 'auto', padding: '8px 12px', flex: 1, fontSize: '11px', fontWeight: 'bold' }}
                                        onClick={() => executeCommand('?')}
                                    >
                                        ?
                                    </button>
                                </div>
                            </div>
                        )}

                        {(!isCreationStage || (!displayedOptions.length && !isTransitioning)) && (
                            <div
                                className="mobile-gutter-input-wrapper"
                                style={{ position: 'relative', zIndex: 1, padding: '0', flexShrink: 0, marginBottom: (isLoginStage || isMenuStage || isCreationStage) ? '0' : '16px', width: '100%' }}
                            >
                            <InputArea
                                input={input}
                                setInput={setInput}
                                onSend={handleSend}
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
                    </div>
                </div>
            </div>
        );
    }

    const isShown = ui.mapExpanded && ui.drawer === 'none';
    
    return (
        <div
            className={`mobile-bottom-gutter ${isShown ? 'map-expanded' : ''}`}
            style={{
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                gap: '0'
            }}
        >
            {/* Map Area at the TOP */}
            <div
                className="mobile-mapper-touch-surface gutter-panel-card"
                style={{
                    display: isShown ? 'block' : 'none',
                    pointerEvents: isShown ? 'auto' : 'none',
                    opacity: isShown ? 1 : 0,
                    touchAction: 'none',
                    position: 'absolute',
                    inset: '0',
                    zIndex: 0
                }}
            >
                
                {/* Header Group: Room Info + Tactical Buttons */}
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
                    <MapperRoomInfo />
                    
                    {/* Persistent Tactical Buttons - now below the room card */}
                    <div
                        className="mobile-tactical-buttons-persistent"
                        style={{
                            position: 'relative',
                            marginTop: '10px', // Now pushes down naturally relative to room card
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
                            heldButtonRef={heldButtonRef}
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

                <div className="mobile-mapper-combat-overlay">
                    <CombatStatsPanel />
                </div>

                <Mapper
                    ref={mapperRef}
                    isDesignMode={isEditMode}
                    characterName={characterName}
                    isMmapperMode={isMmapperMode}
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

            {/* Drawer Area */}
            {!isShown && ui.drawer !== 'none' && (
                <GutterDrawerPanel />
            )}

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
                {/* Mobile Portrait Env Indicator - Bottom Left above command bar */}
                {(lighting !== 'none' || weather !== 'none' || isFoggy || stats.conditions?.hungry || stats.conditions?.thirsty || currentTime) && (
                    <div className="mobile-portrait-env-indicator" style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 4px)',
                        left: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        zIndex: 2,
                        pointerEvents: 'none',
                        color: 'var(--text-faded)',
                        transform: 'scale(0.9)',
                        transformOrigin: 'bottom left'
                    }}>
                        {currentTime && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '4px' }}>
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

                <InputArea
                    input={input}
                    setInput={setInput}
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
                        className={`desktop-edge-tab right ${ui.drawer === 'players' ? 'active' : ''}`}
                        onClick={() => { triggerHaptic(15); handleTabClick('players'); }}
                    >
                        <Users className="tab-icon" />
                        <span className="tab-text">Players</span>
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
