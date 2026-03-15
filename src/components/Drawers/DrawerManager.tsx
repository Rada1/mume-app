import React from 'react';
import { InventoryDrawer } from './InventoryDrawer';
import { StatsDrawer } from './StatsDrawer';
import { CharacterDrawer } from './CharacterDrawer';
import { EquipmentDrawer } from './EquipmentDrawer';
import { Mapper } from '../Mapper/Mapper';
import { User, Shield, Package, Map as MapIcon } from 'lucide-react';


import { DrawerLine, CustomButton, SoundTrigger } from '../../types';

interface DrawerManagerProps {
    ui: {
        drawer: 'none' | 'stats' | 'items' | 'character';
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
    };
    setUI: React.Dispatch<React.SetStateAction<{
        drawer: 'none' | 'stats' | 'items' | 'character';
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
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

import { useGame } from '../../context/GameContext';
import { useMapper } from '../../context/MapperContext';

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
    ui, setUI,
    inventoryLines, statsLines, eqLines,
    executeCommand, handleButtonClick,
    loginName, setLoginName, loginPassword, setLoginPassword,
    bgImage, handleFileUpload,
    soundTriggers, newSoundPattern, setNewSoundPattern, newSoundRegex, setNewSoundRegex,
    handleSoundUpload, setSoundTriggers
}) => {
    const { triggerHaptic, characterName, viewport, mapperRef, pendingDrawerContainerRef, inlineCategories } = useGame();
    const { isMapFloating, setIsMapFloating } = useMapper();
    const isMapDrawerOpen = ui.mapExpanded && !viewport.isMobile;
    // Map Tray should not have a backdrop on mobile as it blocks the rest of the UI
    const showBackdrop = ui.drawer !== 'none';

    const handleUndock = () => {
        triggerHaptic(40);
        setIsMapFloating(true);
        setUI(prev => ({ ...prev, mapExpanded: false }));
    };

    const handleTabClick = (drawer: 'stats' | 'character' | 'items') => {
        triggerHaptic(30);
        if (ui.drawer === drawer) {
            setUI(prev => ({ ...prev, drawer: 'none' }));
        } else {
            setUI(prev => ({ ...prev, drawer }));
            // Fetch fresh data when opening
            if (drawer === 'stats') {
                executeCommand('stat', true, true, true, true);
            } else if (drawer === 'character') {
                executeCommand('score', true, true, true, true);
            } else if (drawer === 'items') {
                executeCommand('inv', true, true, true, true);
                setTimeout(() => executeCommand('eq', true, true, true, true), 150);
            }
        }
    };

    return (
        <>
            {/* Desktop Edge Tabs */}
            <div
                className={`desktop-edge-tab left ${ui.drawer === 'stats' ? 'active' : ''}`}
                style={{ top: '40%' }}
                onClick={() => handleTabClick('stats')}
                title="Combat Statistics"
            >
                <Shield className="tab-icon" />
                <span className="tab-text">Stats</span>
            </div>

            <div
                className={`desktop-edge-tab top ${ui.drawer === 'character' ? 'active' : ''}`}
                style={{ top: '0', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '28px', borderRadius: '0 0 10px 10px', flexDirection: 'row', gap: '8px' }}
                onClick={() => handleTabClick('character')}
                title="Character Sheet"
            >
                <User className="tab-icon" style={{ width: '14px', height: '14px' }} />
                <span className="tab-text" style={{ writingMode: 'horizontal-tb', fontSize: '0.7rem' }}>Character</span>
            </div>

            <div
                className={`desktop-edge-tab right ${ui.drawer === 'items' ? 'active' : ''}`}
                style={{ top: '35%' }}
                onClick={() => handleTabClick('items')}
                title="Items & Equipment"
            >
                <Package className="tab-icon" />
                <span className="tab-text">Items</span>
            </div>

            <div
                id="drawer-tab-map"
                className={`desktop-edge-tab left ${ui.mapExpanded ? 'active' : ''}`}
                style={{ top: '60%' }}
                onClick={() => setUI(prev => ({ ...prev, mapExpanded: !prev.mapExpanded }))}
                title="Map View"
            >
                <MapIcon className="tab-icon" />
                <span className="tab-text">Map</span>
            </div>

            <div
                className={`drawer-backdrop ${showBackdrop && ui.drawer !== 'character' ? 'open' : ''}`}
                onClick={() => setUI(prev => ({ 
                    ...prev, 
                    drawer: 'none'
                }))}
            />

            {/* Map Drawer (Side View - Desktop Only) */}
            {!viewport.isMobile && (
                <div
                    className={`map-drawer-desktop ${ui.mapExpanded ? 'open' : ''}`}
                >
                    <div className="drawer-header" style={{ height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>World Map</span>
                        <button onClick={() => { triggerHaptic(20); setUI(prev => ({ ...prev, mapExpanded: false })); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
                    </div>
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

            <EquipmentDrawer
                isOpen={ui.drawer === 'items'}
                isPeeking={ui.isDrawerPeeking}
                onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                eqLines={eqLines}
                inventoryLines={inventoryLines}
                handleButtonClick={handleButtonClick}
                triggerHaptic={triggerHaptic}
                isLandscape={viewport.isLandscape}
                executeCommand={executeCommand}
                pendingDrawerContainerRef={pendingDrawerContainerRef}
                inlineCategories={inlineCategories}
            />
        </>
    );
};


