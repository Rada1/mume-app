import React from 'react';
import { InventoryDrawer } from './InventoryDrawer';
import { CharacterDrawer } from './CharacterDrawer';
import { EquipmentDrawer } from './EquipmentDrawer';
import { Mapper } from '../Mapper/Mapper';
import { User, Shield, Package, Map as MapIcon } from 'lucide-react';


import { DrawerLine, CustomButton, SoundTrigger } from '../../types';

interface DrawerManagerProps {
    ui: {
        drawer: 'none' | 'character' | 'items';
        isDrawerPeeking: boolean;
        setManagerOpen: boolean;
        mapExpanded: boolean;
    };
    setUI: React.Dispatch<React.SetStateAction<{
        drawer: 'none' | 'character' | 'items';
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

export const DrawerManager: React.FC<DrawerManagerProps> = ({
    ui, setUI,
    inventoryLines, statsLines, eqLines,
    executeCommand, handleButtonClick,
    loginName, setLoginName, loginPassword, setLoginPassword,
    bgImage, handleFileUpload,
    soundTriggers, newSoundPattern, setNewSoundPattern, newSoundRegex, setNewSoundRegex,
    handleSoundUpload, setSoundTriggers
}) => {
    const { triggerHaptic, characterName, viewport, mapperRef } = useGame();
    const isMapDrawerOpen = ui.mapExpanded && !viewport.isMobile;
    const anyOpen = ui.drawer !== 'none' || isMapDrawerOpen;

    const handleTabClick = (drawer: 'character' | 'items') => {
        triggerHaptic(30);
        if (ui.drawer === drawer) {
            setUI(prev => ({ ...prev, drawer: 'none' }));
        } else {
            setUI(prev => ({ ...prev, drawer }));
            // Refresh data when opening
            if (drawer === 'character') {
                executeCommand('stat', false, true, true);
            } else if (drawer === 'items') {
                executeCommand('inv', false, true, true, true);
                setTimeout(() => executeCommand('eq', false, true, true, true), 200);
            }
        }
    };

    return (
        <>
            {/* Desktop Edge Tabs */}
            <div
                className={`desktop-edge-tab left ${ui.drawer === 'character' ? 'active' : ''}`}
                style={{ top: '40%' }}
                onClick={() => handleTabClick('character')}
                title="Character Stats"
            >
                <User className="tab-icon" />
                <span className="tab-text">Stats</span>
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
                className={`desktop-edge-tab left ${ui.mapExpanded ? 'active' : ''}`}
                style={{ top: '60%' }}
                onClick={() => setUI(prev => ({ ...prev, mapExpanded: !prev.mapExpanded }))}
                title="Map View"
            >
                <MapIcon className="tab-icon" />
                <span className="tab-text">Map</span>
            </div>

            <div
                className={`drawer-backdrop ${anyOpen ? 'open' : ''}`}
                onClick={() => setUI(prev => ({ ...prev, drawer: 'none', mapExpanded: false }))}
            />

            {/* Map Drawer (Bottom Expanded View - Desktop Only) */}
            {!viewport.isMobile && (
                <div
                    className={`inventory-drawer ${ui.mapExpanded ? 'open' : ''}`}
                    style={{ height: '80vh', zIndex: 3002, borderRadius: '30px 30px 0 0' }}
                >
                    <div className="drawer-header" style={{ height: '60px', padding: '0 20px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="swipe-indicator" style={{ position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)', width: '60px', height: '6px', background: 'rgba(255,255,255,0.3)', borderRadius: '3px' }} />
                        <span style={{ fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px' }}>World Map</span>
                        <button onClick={() => { triggerHaptic(20); setUI(prev => ({ ...prev, mapExpanded: false })); }} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
                    </div>
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


            <CharacterDrawer
                isOpen={ui.drawer === 'character'}
                onClose={() => setUI(prev => ({ ...prev, drawer: 'none' }))}
                statsLines={statsLines}
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
            />
        </>
    );
};


