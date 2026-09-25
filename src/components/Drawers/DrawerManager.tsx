/**
 * @file DrawerManager.tsx
 * @description Tabbed side drawers: Gear (Worn/Inventory), Players (Online/Nearby/Group), Character (Info/Quests/Skills).
 */

import React from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerShell } from './DrawerShell';
import { Mapper } from '../Mapper/Mapper';
import { MapperRef } from '../Mapper/mapperTypes';
import { Lock, Compass } from 'lucide-react';
import { DrawerResizeHandle } from './DrawerResizeHandle';
import { AccountDrawer } from './AccountDrawer';
import { CharacterCard } from '../HUD/CharacterCard';
import { MapRoomInfoFooter } from '../HUD/MapRoomInfoFooter';
import { MapRoomInfoHeader } from '../HUD/MapRoomInfoHeader';
import { MovementPad } from '../HUD/MovementPad';
import { useSettingsStore } from '../../stores/useSettingsStore';
import './PlaceholderDrawers.css';

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
        characterName, viewport, gameState,
        sessionMode, isImmersionMode
    } = useGame() as any;
    const mapperDesktopRef = React.useRef<MapperRef>(null);
    const { ui, setUI } = useUI();
    const { mapDrawerOpacity, setMapDrawerOpacity, characterDrawerOpacity, setCharacterDrawerOpacity } = useSettingsStore();

    // Body classes for desktop layout
    React.useEffect(() => {
        if (!viewport.isMobile) {
            document.body.classList.add('map-drawer-open');
            document.body.classList.remove('utility-drawer-open');
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

    // Keep the desktop map persistent; mobile portrait still switches between map and utility.
    React.useEffect(() => {
        const isDesktop = !viewport.isMobile;
        const isPortrait = viewport.isMobile && !viewport.isLandscape;

        if (isDesktop && !ui.mapExpanded) {
            setUI(prev => ({
                ...prev,
                mapExpanded: true
            }));
            return;
        }

        if (isPortrait && ui.drawer === 'none' && !ui.mapExpanded) {
            if (gameState === 'account' && sessionMode !== 'replay') {
                setUI(prev => ({ ...prev, drawer: 'account' }));
            } else {
                setUI(prev => ({ ...prev, mapExpanded: true }));
            }
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
                <div className="left-drawer-stack open">
                    <DrawerResizeHandle handleType="right" widthVar="--desktop-map-width" minWidth={15} maxWidth={45} />
                    <div className="map-drawer-desktop open" style={{ opacity: mapDrawerOpacity } as React.CSSProperties}>
                        <div className="drawer-content" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <MapRoomInfoHeader />
                            {/* Pinned Full Map Canvas */}
                            <div className="map-canvas-full-viewport" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
                                <Mapper
                                    ref={mapperDesktopRef}
                                    characterName={characterName || ''}
                                    isMobile={viewport.isMobile}
                                    isExpanded={true}
                                    heldButton={heldButton}
                                    heldButtonRef={heldButtonRef}
                                    setHeldButton={setHeldButton}
                                    setCommandPreview={setCommandPreview}
                                />

                                {gameState === 'account' && (
                                    <div className="map-placeholder-overlay">
                                        <div className="map-placeholder-icon-ring">
                                            <Compass size={24} className="placeholder-pulse-element" />
                                        </div>
                                        <span className="map-placeholder-title">Map & Navigation</span>
                                        <span className="map-placeholder-subtitle">Log in to activate navigation map</span>
                                    </div>
                                 )}
                            </div>
                            {gameState === 'playing' && (
                                <div className="map-movement-controls" aria-label="Map movement controls">
                                    <span className="map-movement-label">move</span>
                                    <MovementPad />
                                </div>
                            )}
                            <MapRoomInfoFooter />
                        </div>
                    </div>
                </div>
            )}

            {/* Portal target for the tactical action buttons (LineCluster), relocated here
                from ActionBox. Fixed to the viewport (same technique as .app-terrain-strip)
                rather than nested inside .left-drawer-stack, so it isn't at the mercy of that
                ancestor's percentage-height resolution — it fills the gap below the map drawer
                (between its bottom edge and the terrain strip) with its own explicit sizing. */}


            {/* Account Drawer — mobile only; desktop uses the AccountDeck in the bottom bar. */}
            {viewport.isMobile && (
                <DrawerShell id="account" side="right" title="Account">
                    <AccountDrawer />
                </DrawerShell>
            )}

        </>
    );
};
