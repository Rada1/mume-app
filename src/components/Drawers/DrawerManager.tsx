import React from 'react';
import { InventoryDrawer } from './InventoryDrawer';
import { StatsDrawer } from './StatsDrawer';
import { CharacterDrawer } from './CharacterDrawer';
import { PlayersDrawer } from './PlayersDrawer';
import { Mapper } from '../Mapper/Mapper';
import { User, Shield, Map as MapIcon, Users, BarChart2 } from 'lucide-react';


import { DrawerLine, CustomButton, SoundTrigger } from '../../types';

interface DrawerManagerProps {
    ui: {
        drawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players';
        isDrawerPeeking: boolean;
        peekingDrawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players' | 'map';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    };
    setUI: React.Dispatch<React.SetStateAction<{
        drawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players';
        isDrawerPeeking: boolean;
        peekingDrawer: 'none' | 'stats' | 'equipment' | 'inventory' | 'character' | 'players' | 'map';
        setManagerOpen: boolean;
        mapExpanded: boolean;
        isMenuOpen: boolean;
        isSetMenuOpen: boolean;
        menuView: 'main' | 'availableSets';
    }>>;
    inventoryLines: DrawerLine[];
    statsLines: DrawerLine[];
    eqLines: DrawerLine[];
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent, context?: string) => void;

    // Settings stuff passed down
    loginName: string;
    setLoginName: (val: string) => void;
    loginPassword: string;
    setLoginPassword: (val: string) => void;
    bgImage: string;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    soundTriggers: SoundTrigger[];
    newSoundPattern: string;
    setNewSoundPattern: (val: string) => void;
    newSoundRegex: boolean;
    setNewSoundRegex: (val: boolean) => void;
    handleSoundUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setSoundTriggers: React.Dispatch<React.SetStateAction<SoundTrigger[]>>;
}

import { useGame, useUI } from '../../context/GameContext';
import { useMapper } from '../../context/useMapper';

const MapperDockedGate: React.FC<{ 
    mapperRef: React.RefObject<any>, 
    characterName: string | null, 
    isMobile: boolean,
    onUndock?: () => void 
}> = ({ mapperRef, characterName, isMobile, onUndock }) => {
    const { isMapFloating, setIsMapFloating } = useMapper();
    
    if (isMapFloating) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
                <div style={{ marginBottom: '15px' }}>The map is currently undocked.</div>
                <button 
                    onClick={() => setIsMapFloating(false)}
                    style={{ background: 'var(--accent)', border: 'none', color: '#111', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    Dock Map Here
                </button>
            </div>
        );
    }

    return (
        <Mapper
            ref={mapperRef}
            characterName={characterName || ''}
            isMobile={isMobile}
            isExpanded={true}
            onUndock={onUndock}
        />
    );
};

export const DrawerManager: React.FC<DrawerManagerProps> = ({
    inventoryLines, statsLines, eqLines,
    executeCommand, handleButtonClick,
    loginName, setLoginName, loginPassword, setLoginPassword,
    bgImage, handleFileUpload,
    soundTriggers, newSoundPattern, setNewSoundPattern, newSoundRegex, setNewSoundRegex,
    handleSoundUpload, setSoundTriggers
}) => {
    const { 
        triggerHaptic, characterName, viewport, mapperRef, 
        pendingDrawerContainerRef, inlineCategories, entities, keywordOverrides 
    } = useGame() as any;
    const { ui, setUI, handleTabClick, toggleMap } = useUI();

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
    const { isMapFloating, setIsMapFloating } = useMapper();
    const isMapDrawerOpen = ui.mapExpanded && !viewport.isMobile;
    // Map Tray should not have a backdrop on mobile as it blocks the rest of the UI
    const showBackdrop = ui.drawer !== 'none';

    const handleUndock = () => {
        triggerHaptic(40);
        setIsMapFloating(true);
        setUI(prev => ({ ...prev, mapExpanded: false }));
    };


    return (
        <>
            {/* Vertical tabs removed — moved to map drawer bottom */}



            <div
                className={`drawer-backdrop ${showBackdrop && ui.drawer !== 'character' && ui.drawer !== 'players' ? 'open' : ''}`}
                style={{ background: 'rgba(0,0,0,0.2)' }}
                onClick={() => setUI(prev => ({ 
                    ...prev, 
                    drawer: 'none',
                    peekingSource: 'none'
                }))}
            />

            {/* Map Drawer (Side View - Desktop Only) */}
            {!viewport.isMobile && (
                <div
                    className={`map-drawer-desktop ${ui.mapExpanded ? 'open' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="drawer-content" style={{ flex: 1, padding: 0, position: 'relative', overflow: 'hidden' }}>
                        <MapperDockedGate
                            mapperRef={mapperRef}
                            characterName={characterName}
                            isMobile={viewport.isMobile}
                            onUndock={handleUndock}
                        />
                    </div>
                </div>
            )}

            {/* Persistent Desktop Tab Sidebar (Right Edge) */}
            {!viewport.isMobile && (
                <div className="desktop-side-tabs" style={{ 
                    position: 'fixed', 
                    right: 0, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    zIndex: 5000, 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'stats' ? 'active' : ''}`}
                        onClick={() => handleTabClick('stats')}
                    >
                        <BarChart2 className="tab-icon" />
                        <span className="tab-text">Stats</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'character' ? 'active' : ''}`}
                        onClick={() => handleTabClick('character')}
                    >
                        <User className="tab-icon" />
                        <span className="tab-text">Char</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'players' ? 'active' : ''}`}
                        onClick={() => handleTabClick('players')}
                    >
                        <Users className="tab-icon" />
                        <span className="tab-text">Players</span>
                    </div>
                    <div
                        className={`desktop-edge-tab right ${ui.drawer === 'inventory' ? 'active' : ''}`}
                        onClick={() => handleTabClick('inventory')}
                    >
                        <Shield className="tab-icon" />
                        <span className="tab-text">Gear</span>
                    </div>
                    <div
                        id="drawer-tab-map"
                        className={`desktop-edge-tab right ${ui.mapExpanded && ui.drawer === 'none' ? 'active' : ''}`}
                        onClick={() => toggleMap()}
                    >
                        <MapIcon className="tab-icon" />
                        <span className="tab-text">Map</span>
                    </div>
                </div>
            )}


            <StatsDrawer
                isOpen={ui.drawer === 'stats'}
                onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                statsLines={statsLines}
                executeCommand={executeCommand}
                isLandscape={viewport.isLandscape}
            />

            <CharacterDrawer
                isOpen={ui.drawer === 'character'}
                onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                executeCommand={executeCommand}
            />

            <PlayersDrawer
                isOpen={ui.drawer === 'players'}
                onClose={() => setUI(prev => ({ ...prev, drawer: 'none', peekingSource: 'none' }))}
                executeCommand={executeCommand}
            />


            <InventoryDrawer
                isOpen={ui.drawer === 'inventory'}
                isPeeking={ui.isDrawerPeeking && ui.peekingDrawer === 'inventory'}
                onClose={() => setUI(prev => ({ ...prev, drawer: 'none', peekingSource: 'none' }))}
                inventoryLines={inventoryLines}
                eqLines={eqLines}
                handleButtonClick={handleButtonClick}
                triggerHaptic={triggerHaptic}
                executeCommand={executeCommand}
                pendingDrawerContainerRef={pendingDrawerContainerRef}
                inlineCategories={inlineCategories}
                entities={entities}
                keywordOverrides={keywordOverrides}
            />
        </>
    );
};
