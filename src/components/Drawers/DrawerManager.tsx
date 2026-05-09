/**
 * @file DrawerManager.tsx
 * @description Tabbed side drawers: Gear (Worn/Inventory), Players (Online/Nearby/Group), Character (Info/Quests/Skills).
 */

import React from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { DrawerShell } from './DrawerShell';
import { UnifiedDrawerContent } from './UnifiedDrawerContent';
import { Mapper } from '../Mapper/Mapper';
import { MapperRoomInfo } from '../Mapper/MapperRoomInfo';
import { useMumeTime } from '../../hooks/useMumeTime';
import { LineCluster } from '../Layout/HUD/LineCluster';
import { User, Shield, Users, Map as MapIcon, Activity, UtensilsCrossed, Droplets, CloudFog, Clock } from 'lucide-react';
import { StatusDrawer } from './StatusDrawer';

const SIDEBAR_TABS = [
    { id: 'status',    label: 'Status',  Icon: Activity },
    { id: 'character', label: 'Char',    Icon: User },
    { id: 'players',   label: 'Players', Icon: Users },
    { id: 'equipment', label: 'Gear',    Icon: Shield },
];

interface DrawerManagerProps {
    heldButton: any;
    heldButtonRef?: React.MutableRefObject<any>;
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
        btn, joystick, handleButtonClick, editor, env, isFoggy, gameTime
    } = useGame();
    const currentTime = useMumeTime(gameTime);
    const {
        ui, setUI, handleTabClick,
        setPopoverState,
        displayInventoryLines, displayEqLines,

        infoLines, questLines, practiceLines,
        whoLines, whereLines,
        setWhoLines, setWhereLines,
        gearTab, setGearTab, playersTab, setPlayersTab, charTab, setCharTab
    } = useUI();
    const { groupMembers, target, activePrompt, stats } = useVitals();

    // Body classes for desktop layout
    React.useEffect(() => {
        if (!viewport.isMobile) {
            document.body.classList.toggle('map-drawer-open', ui.mapExpanded);
            document.body.classList.toggle('utility-drawer-open', ui.drawer !== 'none');
        }
    }, [ui.mapExpanded, ui.drawer, viewport.isMobile]);

    if (viewport.isMobile && !viewport.isLandscape) {
        return null;
    }

    return (
        <>
            <div
                className={`drawer-backdrop ${viewport.isMobile && ui.drawer !== 'none' ? 'open' : ''}`}
                style={{ background: 'rgba(0,0,0,0.2)' }}
                onClick={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
            />

            {!viewport.isMobile && (
                <div className={`map-drawer-desktop ${ui.mapExpanded ? 'open' : ''}`}>
                    <div className="drawer-content" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="mapper-header-desktop">
                            <MapperRoomInfo />
                            
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
                </div>
            )}

            {/* Status Drawer */}
            <DrawerShell id="status" side="right" title="Status">
                <StatusDrawer />
            </DrawerShell>

            {/* Gear Drawer */}
            <DrawerShell id="equipment" side="right" title="Gear">
                <UnifiedDrawerContent
                    drawer="equipment"
                    gearTab={gearTab}
                    setGearTab={setGearTab}
                    playersTab={playersTab}
                    setPlayersTab={setPlayersTab}
                    charTab={charTab}
                    setCharTab={setCharTab}
                    displayInventoryLines={displayInventoryLines}
                    displayEqLines={displayEqLines}
                    whoLines={whoLines}
                    whereLines={whereLines}
                    infoLines={infoLines}
                    questLines={questLines}
                    practiceLines={practiceLines}
                    groupMembers={groupMembers}
                    triggerHaptic={triggerHaptic}
                    executeCommand={executeCommand}
                    setWhoLines={setWhoLines}
                    setWhereLines={setWhereLines}
                />
            </DrawerShell>

            {/* Players Drawer */}
            <DrawerShell id="players" side="right" title="Players">
                <UnifiedDrawerContent
                    drawer="players"
                    gearTab={gearTab}
                    setGearTab={setGearTab}
                    playersTab={playersTab}
                    setPlayersTab={setPlayersTab}
                    charTab={charTab}
                    setCharTab={setCharTab}
                    displayInventoryLines={displayInventoryLines}
                    displayEqLines={displayEqLines}
                    whoLines={whoLines}
                    whereLines={whereLines}
                    infoLines={infoLines}
                    questLines={questLines}
                    practiceLines={practiceLines}
                    groupMembers={groupMembers}
                    triggerHaptic={triggerHaptic}
                    executeCommand={executeCommand}
                    setWhoLines={setWhoLines}
                    setWhereLines={setWhereLines}
                />
            </DrawerShell>

            {/* Character Drawer */}
            <DrawerShell id="character" side="right" title="Character">
                <UnifiedDrawerContent
                    drawer="character"
                    gearTab={gearTab}
                    setGearTab={setGearTab}
                    playersTab={playersTab}
                    setPlayersTab={setPlayersTab}
                    charTab={charTab}
                    setCharTab={setCharTab}
                    displayInventoryLines={displayInventoryLines}
                    displayEqLines={displayEqLines}
                    whoLines={whoLines}
                    whereLines={whereLines}
                    infoLines={infoLines}
                    questLines={questLines}
                    practiceLines={practiceLines}
                    groupMembers={groupMembers}
                    triggerHaptic={triggerHaptic}
                    executeCommand={executeCommand}
                    setWhoLines={setWhoLines}
                    setWhereLines={setWhereLines}
                />
            </DrawerShell>

            {/* Desktop Side Tabs */}
            {!viewport.isMobile && gameState !== 'disconnected' && (
                <div className="desktop-drawer-tabs right">
                    {SIDEBAR_TABS.map(({ id, label, Icon }) => (
                        <div
                            key={id}
                            className={`desktop-edge-tab right ${ui.drawer === id ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick(id as 'character' | 'players' | 'equipment'); }}
                        >
                            <Icon className="tab-icon" />
                            <span className="tab-text">{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {!viewport.isMobile && (
                <div className="desktop-drawer-tabs left">
                    <div
                        className={`desktop-edge-tab left ${ui.mapExpanded ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); triggerHaptic(15); setUI(prev => ({ ...prev, mapExpanded: !prev.mapExpanded })); }}
                    >
                        <MapIcon className="tab-icon" />
                        <span className="tab-text">Map</span>
                    </div>
                </div>
            )}
        </>
    );
};
