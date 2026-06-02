/**
 * @file DrawerManager.tsx
 * @description Tabbed side drawers: Gear (Worn/Inventory), Players (Online/Nearby/Group), Character (Info/Quests/Skills).
 */

import React from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { DrawerShell } from './DrawerShell';
import { Mapper } from '../Mapper/Mapper';
import { MapperRoomInfo } from '../Mapper/MapperRoomInfo';
import { RoomChipRows } from '../Mapper/RoomChipRows';
import { useMumeTime } from '../../hooks/useMumeTime';
import { LineCluster } from '../Layout/HUD/LineCluster';
import { Map as MapIcon, UtensilsCrossed, Droplets, CloudFog, Clock } from 'lucide-react';
import { DrawerResizeHandle } from './DrawerResizeHandle';
import { AccountDrawer } from './AccountDrawer';
import { DrawerUnifiedPanel } from './DrawerUnifiedPanel';

interface DrawerManagerProps {
    heldButton: any;
    heldButtonRef?: React.RefObject<any>;
    setHeldButton: React.Dispatch<React.SetStateAction<any>>;
    setCommandPreview: React.Dispatch<React.SetStateAction<string | null>>;
}

export const DrawerManager: React.FC<DrawerManagerProps> = ({
    heldButton,
    heldButtonRef,
    setHeldButton,
    setCommandPreview
}) => {
    const {
        characterName, viewport, triggerHaptic, gameState, executeCommand,
        btn, joystick, handleButtonClick, editor, env, isFoggy, gameTime, roomItems,
        sessionMode
    } = useGame();
    const currentTime = useMumeTime(gameTime);
    const {
        ui, setUI,
        setPopoverState,
        displayInventoryLines, displayEqLines,

        infoLines, questLines, achievementLines, practiceLines,
        whoLines, whereLines,
        setWhoLines, setWhereLines,
        gearTab, setGearTab, playersTab, setPlayersTab, charTab, setCharTab
    } = useUI();
    const { groupMembers, target, activePrompt, stats } = useVitals();
    const activeDesktopDrawer =
        ui.drawer !== 'none'
            ? ui.drawer
            : gameState === 'account' && sessionMode !== 'replay'
                ? 'account'
                : 'status';
    const drawerData = {
        gearTab, setGearTab, playersTab, setPlayersTab, charTab, setCharTab,
        displayInventoryLines, displayEqLines, roomItems, whoLines, whereLines,
        infoLines, questLines, achievementLines, practiceLines, groupMembers,
        triggerHaptic, executeCommand, setWhoLines, setWhereLines
    };

    // Body classes for desktop layout
    React.useEffect(() => {
        if (!viewport.isMobile) {
            document.body.classList.add('map-drawer-open', 'utility-drawer-open');
            return;
        }

        document.body.classList.remove('map-drawer-open', 'utility-drawer-open');
    }, [viewport.isMobile]);

    React.useEffect(() => {
        if (viewport.isMobile) return;
        if (sessionMode === 'replay') {
            if (ui.drawer === 'account' || ui.drawer === 'none') {
                setUI(prev => ({ ...prev, drawer: 'status' }));
            }
            return;
        }
        if (gameState === 'account' && ui.drawer !== 'account') {
            setUI(prev => ({ ...prev, drawer: 'account' }));
        } else if (gameState !== 'account' && ui.drawer === 'account') {
            setUI(prev => ({ ...prev, drawer: 'status' }));
        }
    }, [gameState, setUI, ui.drawer, viewport.isMobile, sessionMode]);

    // Keep desktop drawers persistent; mobile portrait still switches between map and utility.
    React.useEffect(() => {
        const isDesktop = !viewport.isMobile;
        const isPortrait = viewport.isMobile && !viewport.isLandscape;

        if (isDesktop && (!ui.mapExpanded || ui.drawer === 'none')) {
            const defaultDrawer = gameState === 'account' && sessionMode !== 'replay' ? 'account' : 'status';
            setUI(prev => ({
                ...prev,
                drawer: prev.drawer === 'none' ? defaultDrawer : prev.drawer,
                mapExpanded: true
            }));
            return;
        }

        if (isPortrait && ui.drawer === 'none' && !ui.mapExpanded) {
            const defaultDrawer = gameState === 'account' && sessionMode !== 'replay' ? 'account' : 'status';
            setUI(prev => ({ ...prev, drawer: defaultDrawer }));
        }
    }, [ui.drawer, ui.mapExpanded, viewport.isMobile, viewport.isLandscape, gameState, sessionMode, setUI]);

    // Restore saved layout values on load
    React.useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('mume-desktop-layout-v2') || '{}');
        Object.entries(stored).forEach(([key, val]) => {
            if (typeof val === 'number') {
                document.documentElement.style.setProperty(key, `${val}vw`);
            }
        });
    }, []);

    if (viewport.isMobile && !viewport.isLandscape) {
        return null;
    }

    return (
        <>
            <div
                className={`drawer-backdrop ${viewport.isMobile && ui.drawer !== 'none' ? 'open' : ''}`}
                style={{ background: 'rgba(0,0,0,0.2)' }}
                onClick={() => {
                    const isPortrait = viewport.isMobile && !viewport.isLandscape;
                    if (!isPortrait) {
                        setUI(prev => ({ ...prev, drawer: 'none' }));
                    }
                }}
            />

            {!viewport.isMobile && (
                <div className="map-drawer-desktop open">
                    <DrawerResizeHandle handleType="left" widthVar="--desktop-map-width" leftVar="--desktop-map-left" />
                    <DrawerResizeHandle handleType="right" widthVar="--desktop-map-width" />
                    <DrawerResizeHandle handleType="top" widthVar="--desktop-map-width" topVar="--desktop-map-top" bottomVar="--desktop-map-bottom" />
                    <DrawerResizeHandle handleType="bottom" widthVar="--desktop-map-width" topVar="--desktop-map-top" bottomVar="--desktop-map-bottom" />
                    <DrawerResizeHandle handleType="top-left" widthVar="--desktop-map-width" leftVar="--desktop-map-left" topVar="--desktop-map-top" bottomVar="--desktop-map-bottom" />
                    <DrawerResizeHandle handleType="top-right" widthVar="--desktop-map-width" topVar="--desktop-map-top" bottomVar="--desktop-map-bottom" />
                    <DrawerResizeHandle handleType="bottom-left" widthVar="--desktop-map-width" leftVar="--desktop-map-left" topVar="--desktop-map-top" bottomVar="--desktop-map-bottom" />
                    <DrawerResizeHandle handleType="bottom-right" widthVar="--desktop-map-width" topVar="--desktop-map-top" bottomVar="--desktop-map-bottom" />
                    <div className="drawer-header">
                        <span className="drawer-title">
                            Map
                        </span>
                    </div>
                    <div className="drawer-content" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="mapper-header-desktop">
                            <div>
                                <MapperRoomInfo />
                            </div>
                            <RoomChipRows />
                            
                            {/* Persistent Tactical Buttons - now horizontal under the room card on desktop */}
                            <div className="desktop-tactical-buttons-persistent">
                                <LineCluster
                                    isEditMode={btn.isEditMode}
                                    handleDragStart={editor.handleDragStart as any}
                                    buttons={btn.buttons}
                                    selectedButtonIds={btn.selectedButtonIds}
                                    dragState={btn.dragState}
                                    handleButtonClick={handleButtonClick}
                                    wasDraggingRef={editor.wasDraggingRef as any}
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
                                    isMobile={viewport.isMobile}
                                />
                            </div>
                        </div>

                        <Mapper
                            characterName={characterName || ''}
                            isMobile={viewport.isMobile}
                            isExpanded={true}
                            heldButton={heldButton}
                            heldButtonRef={heldButtonRef}
                            setHeldButton={setHeldButton}
                            setCommandPreview={setCommandPreview}
                        />

                        {/* Desktop Env Indicator - Bottom Right corner of map drawer */}
                        {(env.lighting !== 'none' || env.weather !== 'none' || isFoggy || stats.conditions?.hungry || stats.conditions?.thirsty || currentTime) && (
                            <div className="desktop-env-indicator" style={{
                                position: 'absolute',
                                bottom: '16px',
                                right: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                zIndex: 2800,
                                pointerEvents: 'none',
                                color: 'var(--text-faded)',
                                textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                            }}>
                                {currentTime && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px' }}>
                                        <Clock size={14} style={{ opacity: 0.8 }} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                                            {currentTime.hour === 0 ? '12' : (currentTime.hour > 12 ? currentTime.hour - 12 : currentTime.hour)}
                                            :{currentTime.minute < 10 ? `0${currentTime.minute}` : currentTime.minute}
                                            {currentTime.hour >= 12 ? ' PM' : ' AM'}
                                        </span>
                                    </div>
                                )}
                                {stats.conditions?.hungry && (
                                    <UtensilsCrossed size={14} style={{ color: '#fbbf24' }} />
                                )}
                                {stats.conditions?.thirsty && (
                                    <Droplets size={14} style={{ color: '#60a5fa' }} />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {env.getLightingIcon()}
                                    {env.getWeatherIcon()}
                                    {isFoggy && <CloudFog size={14} style={{ opacity: 0.8 }} />}
                                </div>
                                <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                    {env.lighting && env.lighting !== 'none' ? env.lighting : ''}
                                    {env.weather && env.weather !== 'none' && env.weather !== 'clear' ? ` | ${env.weather.replace('-', ' ')}` : ''}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="desktop-drawer-tabs-in-shell left-shell-tabs">
                        <div
                            className="desktop-edge-tab left active"
                            onClick={(e) => { e.stopPropagation(); triggerHaptic(15); setUI(prev => ({ ...prev, mapExpanded: true })); }}
                        >
                            <MapIcon className="tab-icon" />
                            <span className="tab-text">Map</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Account Drawer */}
            <DrawerShell id="account" side="right" title="Account">
                <AccountDrawer />
            </DrawerShell>

            {/* Unified Gameplay Utility Drawer */}
            {(gameState !== 'account' || sessionMode === 'replay') && activeDesktopDrawer !== 'account' && (
                <DrawerShell 
                    key="gameplay-utility-drawer"
                    id={activeDesktopDrawer} 
                    side="right" 
                    title={
                        activeDesktopDrawer === 'status' ? 'Status' :
                        activeDesktopDrawer === 'character' ? 'Character' :
                        activeDesktopDrawer === 'players' ? 'Players' : 'Gear'
                    }
                >
                    <DrawerUnifiedPanel drawer={activeDesktopDrawer} drawerData={drawerData} />
                </DrawerShell>
            )}
        </>
    );
};
