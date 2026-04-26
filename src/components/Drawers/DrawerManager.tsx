/**
 * @file DrawerManager.tsx
 * @description Orchestrates the side drawers (Inventory, Equipment, Stats, Map).
 * Now using the "Shell & View" pattern with zero-prop architecture.
 */

import React from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { DrawerShell } from './DrawerShell';
import { StatsView } from './Views/StatsView';
import { CharacterView } from './Views/CharacterView';
import { PlayersView } from './Views/PlayersView';
import { InventoryView } from './Views/InventoryView';
import { Mapper } from '../Mapper/Mapper';
import { User, Shield, BarChart2, Users, Map as MapIcon } from 'lucide-react';

export const DrawerManager: React.FC = () => {
    const { 
        characterName, viewport, triggerHaptic, 
        gameState, executeCommand,
        mood, setMood, spellSpeed, setSpellSpeed, alertness, setAlertness,
    } = useGame();
    
    const { 
        ui, setUI, handleTabClick,
        displayInventoryLines, displayEqLines,
        statsLines, scoreLines
    } = useUI();
    const [activeSlider, setActiveSlider] = React.useState<string | null>(null);
    const [activeButtonRect, setActiveButtonRect] = React.useState<DOMRect | null>(null);

    // Body classes for layout shifts
    React.useEffect(() => {
        if (!viewport.isMobile) {
            document.body.classList.toggle('map-drawer-open', ui.mapExpanded);
            document.body.classList.toggle('utility-drawer-open', ui.drawer !== 'none');
        } else {
            document.body.classList.remove('map-drawer-open', 'utility-drawer-open');
        }
    }, [ui.mapExpanded, ui.drawer, viewport.isMobile]);

    if (viewport.isMobile && !viewport.isLandscape) {
        return null;
    }

    // On desktop, we want drawers to feel like docked panels (no backdrop).
    // On mobile landscape, a backdrop helps focus the drawer.
    const showBackdrop = viewport.isMobile && ui.drawer !== 'none';

    return (
        <>
            <div
                className={`drawer-backdrop ${showBackdrop && ui.drawer !== 'character' && ui.drawer !== 'players' ? 'open' : ''}`}
                style={{ background: 'rgba(0,0,0,0.2)' }}
                onClick={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
            />

            {!viewport.isMobile && (
                <div className={`map-drawer-desktop ${ui.mapExpanded ? 'open' : ''}`}>
                    <div className="drawer-content" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}>
                        <Mapper characterName={characterName || ''} isMobile={viewport.isMobile} isExpanded={true} />
                    </div>
                </div>
            )}

            {/* Stats Drawer */}
            <DrawerShell id="stats" side="right" title="Statistics">
                <StatsView
                    statsLines={statsLines}
                    scoreLines={scoreLines}
                    executeCommand={executeCommand}
                    mood={mood} setMood={setMood}
                    spellSpeed={spellSpeed} setSpellSpeed={setSpellSpeed}
                    alertness={alertness} setAlertness={setAlertness}
                    triggerHaptic={triggerHaptic}
                    activeSlider={activeSlider} setActiveSlider={setActiveSlider}
                    activeButtonRect={activeButtonRect} setActiveButtonRect={setActiveButtonRect}
                />
            </DrawerShell>

            {/* Character Drawer */}
            <DrawerShell id="character" side="right" title="Character Info">
                <CharacterView
                    isOpen={ui.drawer === 'character'}
                    onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                    executeCommand={executeCommand}
                />
            </DrawerShell>

            {/* Players Drawer */}
            <DrawerShell id="players" side="right" title="World Interaction">
                <PlayersView
                    isOpen={ui.drawer === 'players'}
                    onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                    executeCommand={executeCommand}
                />
            </DrawerShell>

            {/* Inventory / Gear Drawer */}
            <DrawerShell id="inventory" side="right" title="Equipment & Items">
                <InventoryView
                    isOpen={ui.drawer === 'inventory' || ui.drawer === 'equipment'}
                    onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                    triggerHaptic={triggerHaptic}
                    inventoryLines={displayInventoryLines}
                    eqLines={displayEqLines}
                    executeCommand={executeCommand}
                />
            </DrawerShell>

            {/* Desktop Side Tabs */}
            {!viewport.isMobile && gameState !== 'disconnected' && (
                <>
                    {/* Utility Tabs (Right) */}
                    <div className="desktop-drawer-tabs right">
                        {[
                            { id: 'stats', label: 'Stats', icon: BarChart2 },
                            { id: 'character', label: 'Char', icon: User },
                            { id: 'players', label: 'Players', icon: Users },
                            { id: 'equipment', label: 'Gear', icon: Shield }
                        ].map(tab => (
                            <div
                                key={tab.id}
                                className={`desktop-edge-tab right ${ui.drawer === tab.id || (tab.id === 'equipment' && ui.drawer === 'inventory') ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick(tab.id as any); }}
                            >
                                <tab.icon className="tab-icon" />
                                <span className="tab-text">{tab.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Map Tab (Left) */}
                    <div className="desktop-drawer-tabs left">
                        <div
                            className={`desktop-edge-tab left ${ui.mapExpanded ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); triggerHaptic(15); setUI(prev => ({ ...prev, mapExpanded: !prev.mapExpanded })); }}
                        >
                            <MapIcon className="tab-icon" />
                            <span className="tab-text">Map</span>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
