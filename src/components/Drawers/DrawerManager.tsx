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
import { User, Shield, Users, Map as MapIcon } from 'lucide-react';

const SIDEBAR_TABS = [
    { id: 'character', label: 'Char', Icon: User },
    { id: 'players',   label: 'Players', Icon: Users },
    { id: 'equipment', label: 'Gear', Icon: Shield },
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
    const { characterName, viewport, triggerHaptic, gameState, executeCommand } = useGame();
    const {
        ui, setUI, handleTabClick,
        displayInventoryLines, displayEqLines,
        infoLines, questLines, practiceLines,
        whoLines, whereLines,
        setWhoLines, setWhereLines,
        gearTab, setGearTab, playersTab, setPlayersTab, charTab, setCharTab
    } = useUI();
    const { groupMembers } = useVitals();

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
                    <div className="drawer-content" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}>
                        <MapperRoomInfo />
                        <Mapper
                            characterName={characterName || ''}
                            isMobile={viewport.isMobile}
                            isExpanded={true}
                            heldButton={heldButton}
                            heldButtonRef={heldButtonRef}
                            setHeldButton={setHeldButton}
                            setCommandPreview={setCommandPreview}
                        />
                    </div>
                </div>
            )}

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
