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
                    <div className="map-drawer-desktop open" style={{ opacity: mapDrawerOpacity } as React.CSSProperties}>
                        <DrawerResizeHandle handleType="left" widthVar="--desktop-map-width" leftVar="--desktop-map-left" />
                        <DrawerResizeHandle handleType="right" widthVar="--desktop-map-width" />
                        <div className="drawer-header">
                            <span className="drawer-title">
                                Map & Room
                            </span>
                        </div>
                        <div className="drawer-content" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

                                {/* Floating Opacity Slider */}
                                <div className="map-opacity-slider-container" onPointerDown={(e) => e.stopPropagation()}>
                                    <span className="map-opacity-label">Opacity:</span>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="1.0"
                                        step="0.05"
                                        value={mapDrawerOpacity}
                                        onChange={(e) => setMapDrawerOpacity(parseFloat(e.target.value))}
                                        className="map-opacity-slider"
                                    />
                                    <span className="map-opacity-value">{Math.round(mapDrawerOpacity * 100)}%</span>
                                </div>

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

                        </div>
                    </div>
                </div>
            )}

            {/* Portal target for the tactical action buttons (LineCluster), relocated here
                from ActionBox. Fixed to the viewport (same technique as .app-terrain-strip)
                rather than nested inside .left-drawer-stack, so it isn't at the mercy of that
                ancestor's percentage-height resolution — it fills the gap below the map drawer
                (between its bottom edge and the terrain strip) with its own explicit sizing. */}
            {!viewport.isMobile && (
                // Frosted-glass backdrop for the whole bottom band (stat bar + input box +
                // the map/character drawer gap-fillers). Rendered at this same top level
                // (rather than inside .content-layer, which sits at z-index 5000 as a whole
                // stacking context) so a low z-index here actually puts it behind the action
                // box / actions-slot content instead of blurring it from the front.
                <div
                    className="app-bottom-glass-strip"
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 'var(--log-terrain-bottom-offset, 0px)',
                        zIndex: 2000,
                        pointerEvents: 'none'
                    }}
                />
            )}

            {!viewport.isMobile && (
                <div className="right-drawer-stack open">
                    <div
                        className="character-drawer-desktop open"
                        style={{
                            opacity: characterDrawerOpacity,
                            ...(!isImmersionMode ? { filter: 'grayscale(100%)' } : {})
                        } as React.CSSProperties}
                    >
                        <DrawerResizeHandle handleType="left" widthVar="--desktop-character-width" />
                        <DrawerResizeHandle handleType="right" widthVar="--desktop-character-width" rightVar="--desktop-character-right" />
                        <div className="drawer-header">
                            <span className="drawer-title">
                                Character
                            </span>
                        </div>
                        <div className="drawer-content character-drawer-content" style={{ position: 'relative' }}>
                            <CharacterCard embedded forceOpen />

                            {/* Floating Opacity Slider */}
                            <div className="character-opacity-slider-container" onPointerDown={(e) => e.stopPropagation()}>
                                <span className="character-opacity-label">Opacity:</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1.0"
                                    step="0.05"
                                    value={characterDrawerOpacity}
                                    onChange={(e) => setCharacterDrawerOpacity(parseFloat(e.target.value))}
                                    className="character-opacity-slider"
                                />
                                <span className="character-opacity-value">{Math.round(characterDrawerOpacity * 100)}%</span>
                            </div>

                            {gameState === 'account' && (
                                <div className="character-card-locked-overlay">
                                    <div className="character-card-locked-icon-ring">
                                        <Lock size={20} />
                                    </div>
                                    <span className="character-card-locked-title">Character Status</span>
                                    <span className="character-card-locked-subtitle">Log in to activate character profile</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Account Drawer — mobile only; desktop uses the AccountDeck in the bottom bar. */}
            {viewport.isMobile && (
                <DrawerShell id="account" side="right" title="Account">
                    <AccountDrawer />
                </DrawerShell>
            )}

        </>
    );
};
