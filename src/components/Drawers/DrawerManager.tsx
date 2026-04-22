/**
 * @file DrawerManager.tsx
 * @description Orchestrates the side drawers (Inventory, Equipment, Stats, Map).
 */

import React from 'react';
import { useGame, useUI } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';
import { InventoryDrawer } from './InventoryDrawer';
import { StatsDrawer } from './StatsDrawer';
import { CharacterDrawer } from './CharacterDrawer';
import { PlayersDrawer } from './PlayersDrawer';
import { Mapper } from '../Mapper/Mapper';
import { User, Shield, BarChart2, Users, Map as MapIcon } from 'lucide-react';

interface DrawerManagerProps {
    ui: any;
    setUI: (val: any) => void;
    inventoryLines: any[];
    statsLines: any[];
    scoreLines: any[];
    eqLines: any[];
    executeCommand: (cmd: string, silent?: boolean) => void;
    handleButtonClick: (e: React.PointerEvent, btn: any) => void;
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    bgImage: string;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    soundTriggers: any[];
    newSoundPattern: string;
    setNewSoundPattern: (val: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (val: boolean) => void;
    handleSoundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setSoundTriggers: (val: any[]) => void;
}

export const DrawerManager: React.FC<DrawerManagerProps> = ({
    ui,
    setUI,
    inventoryLines,
    statsLines,
    scoreLines,
    eqLines,
    executeCommand,
    handleButtonClick,
    loginName,
    setLoginName,
    loginPassword,
    setLoginPassword,
    bgImage,
    handleFileUpload,
    soundTriggers,
    newSoundPattern,
    setNewSoundPattern,
    newSoundRegex,
    setNewSoundRegex,
    handleSoundUpload,
    setSoundTriggers
}) => {
    const { 
        characterName, viewport, triggerHaptic, 
        displayInventoryLines, displayEqLines, 
        pendingDrawerContainerRef, inlineCategories, entities, keywordOverrides,
        gameState
    } = useGame();
    const { handleTabClick } = useUI();
    const mapperRef = React.useRef<any>(null);

    // On desktop, push the log right/left so side drawers sit beside it instead of over it
    React.useEffect(() => {
        if (!viewport.isMobile) {
            if (ui.mapExpanded) document.body.classList.add('map-drawer-open');
            else document.body.classList.remove('map-drawer-open');

            if (ui.drawer !== 'none') document.body.classList.add('utility-drawer-open');
            else document.body.classList.remove('utility-drawer-open');
        } else {
            document.body.classList.remove('map-drawer-open');
            document.body.classList.remove('utility-drawer-open');
        }

        return () => { 
            document.body.classList.remove('map-drawer-open'); 
            document.body.classList.remove('utility-drawer-open'); 
        };
    }, [ui.mapExpanded, ui.drawer, viewport.isMobile]);

    const isMapDrawerOpen = ui.mapExpanded && !viewport.isMobile;
    const isMobilePortrait = viewport.isMobile && !viewport.isLandscape;
    const showBackdrop = !viewport.isMobile && ui.drawer !== 'none';

    return (
        <>
            <div
                className={`drawer-backdrop ${showBackdrop && ui.drawer !== 'character' && ui.drawer !== 'players' ? 'open' : ''}`}
                style={{ background: 'rgba(0,0,0,0.2)' }}
                onClick={() => {
                    if (!viewport.isMobile) {
                        setUI(prev => ({ ...prev, drawer: 'none', peekingSource: 'none' }));
                    }
                }}
            />

            {!viewport.isMobile && (
                <div
                    className={`map-drawer-desktop ${ui.mapExpanded ? 'open' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="drawer-content" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}>
                        <Mapper
                            ref={mapperRef}
                            characterName={characterName || ''}
                            isMobile={viewport.isMobile}
                            isExpanded={true}
                        />
                    </div>
                </div>
            )}

            <StatsDrawer
                isOpen={ui.drawer === 'stats'}
                onClose={() => { if (!viewport.isMobile) setUI(prev => ({ ...prev, drawer: 'none' })); }}
                statsLines={statsLines}
                scoreLines={scoreLines}
                executeCommand={executeCommand}
            />

            <CharacterDrawer
                isOpen={ui.drawer === 'character'}
                onClose={() => { if (!viewport.isMobile) setUI(prev => ({ ...prev, drawer: 'none' })); }}
                executeCommand={executeCommand}
            />

            <PlayersDrawer
                isOpen={ui.drawer === 'players'}
                onClose={() => { if (!viewport.isMobile) setUI(prev => ({ ...prev, drawer: 'none' })); }}
                executeCommand={executeCommand}
            />

            {(ui.drawer === 'inventory' || ui.drawer === 'equipment') && (
                <InventoryDrawer
                    isOpen={true}
                    onClose={() => { if (!viewport.isMobile) setUI(prev => ({ ...prev, drawer: 'none' })); }}
                    inventoryLines={displayInventoryLines}
                    eqLines={displayEqLines}
                    handleButtonClick={handleButtonClick}
                    triggerHaptic={triggerHaptic}
                    executeCommand={executeCommand}
                    pendingDrawerContainerRef={pendingDrawerContainerRef}
                    inlineCategories={inlineCategories}
                    entities={entities}
                    keywordOverrides={keywordOverrides}
                />
            )}

            {/* Desktop-only side tabs */}
            {!viewport.isMobile && gameState !== 'disconnected' && (
                <div className="desktop-drawer-tabs">
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'stats' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick('stats'); }}
                    >
                        <BarChart2 className="tab-icon" />
                        <span className="tab-text">Stats</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'character' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick('character'); }}
                    >
                        <User className="tab-icon" />
                        <span className="tab-text">Char</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'players' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick('players'); }}
                    >
                        <Users className="tab-icon" />
                        <span className="tab-text">Players</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'equipment' || ui.drawer === 'inventory' ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); triggerHaptic(15); handleTabClick('equipment'); }}
                    >
                        <Shield className="tab-icon" />
                        <span className="tab-text">Gear</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.mapExpanded ? 'active' : ''}`}
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
