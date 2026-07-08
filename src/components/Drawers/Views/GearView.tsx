/**
 * @file GearView.tsx
 * @description Renders the Gear tab content (Worn, Inventory, Vicinity) along with the active character avatar.
 */

import React, { useMemo } from 'react';
import { DrawerLine, GmcpOccupant } from '../../../types';
import { useVitalsStore } from '../../../stores/useVitalsStore';
import { useCharacterAvatar } from '../../../hooks/useCharacterAvatar';
import { DrawerTabBar } from '../DrawerTabBar';
import { UnifiedView } from './UnifiedView';
import { useGame } from '../../../context/GameContext';

type GearTab = 'worn' | 'inv' | 'vicinity';

interface GearViewProps {
    gearTab: GearTab;
    selectGearTab: (tab: GearTab) => void;
    displayEqLines: DrawerLine[];
    displayInventoryLines: DrawerLine[];
    roomItems: GmcpOccupant[];
    triggerHaptic: (ms: number) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    renderHoldActions: (actions: { id: string; label: string; command: string }[]) => React.ReactNode;
}

// --- Logic Section ---

export const GearView: React.FC<GearViewProps> = ({
    gearTab,
    selectGearTab,
    displayEqLines,
    displayInventoryLines,
    roomItems,
    triggerHaptic,
    executeCommand,
    renderHoldActions,
}) => {
    const characterInfo = useVitalsStore(state => state.characterInfo);
    const { viewport } = useGame();

    const { src: avatarSrc, isMounted } = useCharacterAvatar();

    // Build room object lines for Vicinity tab
    const roomObjectLines = useMemo<DrawerLine[]>(() => {
        const header: DrawerLine = {
            id: 'room-items-header',
            text: 'Items in the room:',
            html: 'Items in the room:',
            isHeader: true
        };
        const itemLines = roomItems.map((item, index) => {
            const label = item.name || item.short || item.shortdesc || item.keyword || item.desc || String(item.id || 'unknown object');
            const id = item.id ? String(item.id) : `roomitems:${label}:${index}`;
            return {
                id,
                stableId: id,
                entityId: id,
                text: label,
                html: label,
                context: label ? label.toLowerCase().trim() : '',
                isItem: true,
                cmd: 'cat-room-object'
            };
        });
        return [header, ...itemLines];
    }, [roomItems]);

    const tabs = ['worn', 'inv', 'vicinity'] as GearTab[];
    const activeIndex = tabs.indexOf(gearTab);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <DrawerTabBar
                tabs={[{ id: 'worn', label: 'Worn' }, { id: 'inv', label: 'Inventory' }, { id: 'vicinity', label: 'Vicinity' }]}
                active={gearTab}
                onChange={(id) => selectGearTab(id as GearTab)}
            />
            <div className="drawer-tab-viewport" style={{ overflow: 'hidden', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div 
                    className="drawer-tab-track" 
                    style={{ 
                        display: 'flex', 
                        flexDirection: 'row', 
                        width: '300%', 
                        height: '100%', 
                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                        transform: `translateX(-${activeIndex * (100 / 3)}%)` 
                    }}
                >
                    {/* 1. Worn Tab with Avatar */}
                    <div className="drawer-tab-slide gear-worn-tab" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <UnifiedView
                            lines={displayEqLines}
                            category="cat-worn-object"
                            emptyMessage="No equipment data. Tap refresh to update."
                            onRefresh={() => { triggerHaptic(15); executeCommand('eq', true, true, false, true); }}
                        />
                        {avatarSrc && !viewport?.isMobile && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '16px 10px',
                                background: 'rgba(13,16,23,0.9)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                            }}>
                                <div style={{
                                    position: 'relative',
                                    width: '140px',
                                    height: '180px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                                    background: 'rgba(0, 0, 0, 0.3)',
                                }}>
                                    {avatarSrc.endsWith('.mp4') ? (
                                        <video
                                            src={avatarSrc}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={avatarSrc}
                                            alt={characterInfo.race || 'Avatar'}
                                            draggable={false}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0) 100%)',
                                        pointerEvents: 'none',
                                        zIndex: 1
                                    }} />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '8px',
                                        left: '4px',
                                        right: '4px',
                                        zIndex: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '2px'
                                    }}>
                                        <div style={{
                                            fontSize: '0.75em',
                                            fontWeight: 700,
                                            color: '#ffffff',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            textAlign: 'center',
                                            textShadow: '0 1px 3px rgba(0,0,0,0.95)'
                                        }}>
                                            {[characterInfo.race, characterInfo.subrace].filter(Boolean).join(' - ')}
                                        </div>
                                        {isMounted && (
                                            <div style={{
                                                fontSize: '0.6em',
                                                fontWeight: 600,
                                                color: '#4ade80',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                background: 'rgba(74, 222, 128, 0.15)',
                                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                                padding: '1px 6px',
                                                borderRadius: '10px',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                            }}>
                                                Mounted
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {renderHoldActions([{ id: 'drawer-worn-remove', label: 'Remove', command: 'remove %n' }])}
                    </div>

                    {/* 2. Inventory Tab */}
                    <div className="drawer-tab-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <UnifiedView
                            lines={displayInventoryLines}
                            category="cat-inventory-object"
                            emptyMessage="No inventory data. Tap refresh to update."
                            onRefresh={() => { triggerHaptic(15); executeCommand('inv', true, true, false, true); }}
                        />
                        {renderHoldActions([
                            { id: 'drawer-inv-wear', label: 'Wear', command: 'wear %n' },
                            { id: 'drawer-inv-drop', label: 'Drop', command: 'drop %n' }
                        ])}
                    </div>

                    {/* 3. Vicinity Tab */}
                    <div className="drawer-tab-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                        <UnifiedView
                            lines={roomObjectLines}
                            category="cat-room-object"
                            emptyMessage="No room objects detected. Tap refresh to look around."
                            onRefresh={() => { triggerHaptic(15); executeCommand('look', true, true, false, true); }}
                        />
                        {renderHoldActions([{ id: 'drawer-vicinity-get', label: 'Get', command: 'get %n' }])}
                    </div>
                </div>
            </div>
        </div>
    );
};
