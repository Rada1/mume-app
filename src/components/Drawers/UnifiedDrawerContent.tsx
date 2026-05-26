/**
 * @file UnifiedDrawerContent.tsx
 * @description Shared content renderer for desktop drawers and the mobile gutter drawer.
 */

import React from 'react';
import { DrawerLine, GmcpOccupant, GroupMember } from '../../types';
import { DrawerType } from '../../context/GameContext/types';
import { useGame } from '../../context/GameContext';
import { GroupTableView } from './GroupTableView';
import { NearbyWhereView } from './NearbyWhereView';
import { UnifiedView } from './Views/UnifiedView';
import { StatusDrawer } from './StatusDrawer';
import { DrawerHoldCommandButton } from './DrawerHoldCommandButton';
import { DrawerTabBar } from './DrawerTabBar';
import { buildPracticeDrawerLines } from '../../utils/practiceDrawerLines';
import { extractMumeKeyword } from '../../utils/gameUtils';

type GearTab = 'worn' | 'inv' | 'vicinity';
type PlayersTab = 'online' | 'nearby' | 'group';
type CharacterTab = 'info' | 'quests' | 'skills' | 'achievements';

interface UnifiedDrawerContentProps {
    drawer: DrawerType;
    gearTab: GearTab;
    setGearTab: (tab: GearTab) => void;
    playersTab: PlayersTab;
    setPlayersTab: (tab: PlayersTab) => void;
    charTab: CharacterTab;
    setCharTab: (tab: CharacterTab) => void;
    displayInventoryLines: DrawerLine[];
    displayEqLines: DrawerLine[];
    roomItems: GmcpOccupant[];
    whoLines: DrawerLine[];
    whereLines: DrawerLine[];
    infoLines: DrawerLine[];
    questLines: DrawerLine[];
    achievementLines: DrawerLine[];
    practiceLines: DrawerLine[];
    groupMembers: GroupMember[];
    triggerHaptic: (ms: number) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
    setWhoLines?: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
    setWhereLines?: React.Dispatch<React.SetStateAction<DrawerLine[]>>;
}

export const UnifiedDrawerContent: React.FC<UnifiedDrawerContentProps> = ({
    drawer,
    gearTab,
    setGearTab,
    playersTab,
    setPlayersTab,
    charTab,
    setCharTab,
    displayInventoryLines,
    displayEqLines,
    roomItems,
    whoLines,
    whereLines,
    infoLines,
    questLines,
    achievementLines,
    practiceLines,
    groupMembers,
    triggerHaptic,
    executeCommand,
    setWhoLines,
    setWhereLines
}) => {
    const lastNearbyRefreshRef = React.useRef(0);
    const { practice } = useGame();
    const practiceTargetLines = React.useMemo<DrawerLine[]>(
        () => buildPracticeDrawerLines(practice.practiceData, practiceLines),
        [practice.practiceData, practiceLines]
    );
    const roomObjectLines = React.useMemo<DrawerLine[]>(() => {
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
                context: extractMumeKeyword(label),
                isItem: true,
                cmd: 'cat-room-object'
            };
        });
        return [header, ...itemLines];
    }, [roomItems]);

    const refreshNearby = () => {
        const now = Date.now();
        if (now - lastNearbyRefreshRef.current < 1000) return;
        lastNearbyRefreshRef.current = now;
        setWhereLines?.([]);
        executeCommand('where', true, true, false, true);
    };

    const selectGearTab = (tab: GearTab) => {
        triggerHaptic(10);
        if (tab === 'worn') executeCommand('eq', true, true, false, true);
        else if (tab === 'inv') executeCommand('inv', true, true, false, true);
        else executeCommand('look', true, true, false, true);
        setGearTab(tab);
    };

    const selectPlayersTab = (tab: PlayersTab) => {
        triggerHaptic(10);
        if (tab === 'online') {
            setWhoLines?.([]);
            executeCommand('who', true, true, false, true);
        } else if (tab === 'nearby') {
            refreshNearby();
        }
        setPlayersTab(tab);
    };

    const selectCharTab = (tab: CharacterTab) => {
        triggerHaptic(10);
        if (tab === 'info') executeCommand('info', true, true, false, true);
        else if (tab === 'quests') executeCommand('quest', true, true, false, true);
        else if (tab === 'skills') executeCommand('practice', true, true, false, true);
        else if (tab === 'achievements') executeCommand('achievement', true, true, false, true);
        setCharTab(tab);
    };

    const renderHoldActions = (actions: { id: string; label: string; command: string }[]) => (
        <div style={{ display: 'flex', gap: '8px', padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}>
            {actions.map(action => (
                <DrawerHoldCommandButton
                    key={action.id}
                    label={action.label}
                    command={action.command}
                />
            ))}
        </div>
    );

    if (drawer === 'account') {
        return <AccountDrawer />;
    }

    const categories = ['status', 'character', 'players', 'equipment'] as DrawerType[];
    const activeCategoryIndex = categories.indexOf(drawer);

    if (activeCategoryIndex === -1) {
        return null;
    }

    return (
        <div className="drawer-category-viewport" style={{ overflow: 'hidden', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div 
                className="drawer-category-track" 
                style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    width: '400%', 
                    height: '100%', 
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                    transform: `translateX(-${activeCategoryIndex * 25}%)` 
                }}
            >
                {/* 1. Status View */}
                <div className="drawer-category-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <StatusDrawer />
                </div>

                {/* 2. Character View */}
                <div className="drawer-category-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                        const tabs = ['info', 'quests', 'skills', 'achievements'] as CharacterTab[];
                        const activeIndex = tabs.indexOf(charTab);
                        return (
                            <>
                                <DrawerTabBar
                                    tabs={[{ id: 'info', label: 'Info' }, { id: 'quests', label: 'Quests' }, { id: 'skills', label: 'Skills' }, { id: 'achievements', label: 'Achievements' }]}
                                    active={charTab}
                                    onChange={(id) => selectCharTab(id as CharacterTab)}
                                />
                                <div className="drawer-tab-viewport" style={{ overflow: 'hidden', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div 
                                        className="drawer-tab-track" 
                                        style={{ 
                                            display: 'flex', 
                                            flexDirection: 'row', 
                                            width: '400%', 
                                            height: '100%', 
                                            transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                                            transform: `translateX(-${activeIndex * 25}%)` 
                                        }}
                                    >
                                        <div className="drawer-tab-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <UnifiedView
                                                lines={infoLines}
                                                emptyMessage="No info data. Tap refresh to update."
                                                onRefresh={() => { triggerHaptic(15); executeCommand('info', true, true, false, true); }}
                                            />
                                        </div>
                                        <div className="drawer-tab-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <UnifiedView
                                                lines={questLines}
                                                emptyMessage="No quest data. Tap refresh to update."
                                                onRefresh={() => { triggerHaptic(15); executeCommand('quest', true, true, false, true); }}
                                            />
                                        </div>
                                        <div className="drawer-tab-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <UnifiedView
                                                lines={practiceTargetLines}
                                                emptyMessage="No skills data. Tap refresh to update."
                                                onRefresh={() => { triggerHaptic(15); executeCommand('practice', true, true, false, true); }}
                                            />
                                            {renderHoldActions([{ id: 'drawer-skills-practice', label: 'Practice', command: 'practice %n' }])}
                                        </div>
                                        <div className="drawer-tab-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <UnifiedView lines={achievementLines} emptyMessage="No achievement data. Tap refresh to update." onRefresh={() => { triggerHaptic(15); executeCommand('achievement', true, true, false, true); }} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* 3. Players View */}
                <div className="drawer-category-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                        const tabs = ['online', 'nearby', 'group'] as PlayersTab[];
                        const activeIndex = tabs.indexOf(playersTab);
                        return (
                            <>
                                <DrawerTabBar
                                    tabs={[{ id: 'online', label: 'Online' }, { id: 'nearby', label: 'Nearby' }, { id: 'group', label: 'Group' }]}
                                    active={playersTab}
                                    onChange={(id) => selectPlayersTab(id as PlayersTab)}
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
                                        <div className="drawer-tab-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <UnifiedView
                                                lines={whoLines}
                                                category="inline-player"
                                                emptyMessage="No player data. Tap refresh to update."
                                                onRefresh={() => { triggerHaptic(15); setWhoLines?.([]); executeCommand('who', true, true, false, true); }}
                                            />
                                            {renderHoldActions([
                                                { id: 'drawer-online-whois', label: 'Whois', command: 'whois %n' },
                                                { id: 'drawer-online-chat', label: 'Chat', command: '__parley__' }
                                            ])}
                                        </div>
                                        <div className="drawer-tab-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <NearbyWhereView
                                                lines={whereLines}
                                                onRefresh={() => {
                                                    triggerHaptic(15);
                                                    refreshNearby();
                                                }}
                                            />
                                            {renderHoldActions([
                                                { id: 'drawer-nearby-whois', label: 'Whois', command: 'whois %n' },
                                                { id: 'drawer-nearby-chat', label: 'Chat', command: '__parley__' }
                                            ])}
                                        </div>
                                        <div className="drawer-tab-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <GroupTableView members={groupMembers} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* 4. Gear View */}
                <div className="drawer-category-slide" style={{ width: '25%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    {(() => {
                        const tabs = ['worn', 'inv', 'vicinity'] as GearTab[];
                        const activeIndex = tabs.indexOf(gearTab);
                        return (
                            <>
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
                                        <div className="drawer-tab-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                                            <UnifiedView
                                                lines={displayEqLines}
                                                category="cat-worn-object"
                                                emptyMessage="No equipment data. Tap refresh to update."
                                                onRefresh={() => { triggerHaptic(15); executeCommand('eq', true, true, false, true); }}
                                            />
                                            {renderHoldActions([{ id: 'drawer-worn-remove', label: 'Remove', command: 'remove %n' }])}
                                        </div>
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
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
