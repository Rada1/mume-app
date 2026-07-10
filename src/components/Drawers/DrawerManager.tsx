/**
 * @file DrawerManager.tsx
 * @description Tabbed side drawers: Gear (Worn/Inventory), Players (Online/Nearby/Group), Character (Info/Quests/Skills).
 */

import React from 'react';
import { useGame, useUI, useVitals } from '../../context/GameContext';
import { DrawerShell } from './DrawerShell';
import { Mapper } from '../Mapper/Mapper';
import { MapperRef } from '../Mapper/mapperTypes';
import { useMumeTime } from '../../hooks/useMumeTime';
import { UtensilsCrossed, Droplets, CloudFog, Clock } from 'lucide-react';
import { DrawerResizeHandle } from './DrawerResizeHandle';
import { AccountDrawer } from './AccountDrawer';
import { CharacterCard } from '../HUD/CharacterCard';

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
        env, isFoggy, gameTime,
        sessionMode
    } = useGame() as any;
    const currentTime = useMumeTime(gameTime);
    const mapperDesktopRef = React.useRef<MapperRef>(null);
    const { ui, setUI } = useUI();
    const { stats } = useVitals();

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
                <div className="left-drawer-stack open">
                    <div className="map-drawer-desktop open">
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

                                {/* Desktop Env Indicator - Bottom Right corner of map section */}
                                {(env.lighting !== 'none' || env.weather !== 'none' || isFoggy || stats.conditions?.hungry || stats.conditions?.thirsty || currentTime) && (
                                    <div className="desktop-env-indicator" style={{
                                        position: 'absolute',
                                        bottom: '12px',
                                        right: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '4px 10px',
                                        background: 'rgba(0, 0, 0, 0.45)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        zIndex: 2800,
                                        pointerEvents: 'none',
                                        color: 'var(--text-faded)',
                                        textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                                    }}>
                                        {currentTime && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px' }}>
                                                <Clock size={12} style={{ opacity: 0.8 }} />
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800 }}>
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {env.getLightingIcon()}
                                            {env.getWeatherIcon()}
                                            {isFoggy && <CloudFog size={12} style={{ opacity: 0.8 }} />}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                                            {env.lighting && env.lighting !== 'none' ? env.lighting : ''}
                                            {env.weather && env.weather !== 'none' && env.weather !== 'clear' ? ` | ${env.weather.replace('-', ' ')}` : ''}
                                        </span>
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

            {!viewport.isMobile && gameState !== 'account' && (
                <div className="right-drawer-stack open">
                    <div className="character-drawer-desktop open">
                        <DrawerResizeHandle handleType="left" widthVar="--desktop-character-width" />
                        <DrawerResizeHandle handleType="right" widthVar="--desktop-character-width" rightVar="--desktop-character-right" />
                        <div className="drawer-header">
                            <span className="drawer-title">
                                Character
                            </span>
                        </div>
                        <div className="drawer-content character-drawer-content">
                            <CharacterCard embedded forceOpen />
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
