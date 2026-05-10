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
    const { heldButton, setHeldButton, setCommandPreview, practice } = useGame();
    const isHeld = (id: string) => heldButton?.id === id && !heldButton.didFire;
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
                context: item.keyword,
                isItem: true,
                cmd: 'inline-in-room-obj'
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
        setGearTab(tab);
        if (tab === 'worn') executeCommand('eq', true, true);
        else if (tab === 'inv') executeCommand('inv', true, true);
        else executeCommand('look', true, true);
    };

    const selectPlayersTab = (tab: PlayersTab) => {
        triggerHaptic(10);
        setPlayersTab(tab);
        if (tab === 'online') {
            setWhoLines?.([]);
            executeCommand('who', true, true, false, true);
        } else if (tab === 'nearby') {
            refreshNearby();
        }
    };

    const selectCharTab = (tab: CharacterTab) => {
        triggerHaptic(10);
        setCharTab(tab);
        if (tab === 'info') executeCommand('info', true, true);
        else if (tab === 'quests') executeCommand('quest', true, true);
        else if (tab === 'skills') executeCommand('practice', true, true);
        else if (tab === 'achievements') executeCommand('achievement', true, true);
    };

    const renderHoldActions = (actions: { id: string; label: string; command: string }[]) => (
        <div style={{ display: 'flex', gap: '8px', padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)' }}>
            {actions.map(action => (
                <DrawerHoldCommandButton
                    key={action.id}
                    id={action.id}
                    label={action.label}
                    command={action.command}
                    isHeld={isHeld(action.id)}
                    triggerHaptic={triggerHaptic}
                    setHeldButton={setHeldButton}
                    setCommandPreview={setCommandPreview}
                />
            ))}
        </div>
    );

    // --- Status Section ---
    if (drawer === 'status') {
        return <StatusDrawer />;
    }

    // --- Gear Section ---
    if (drawer === 'equipment') {
        return (
            <>
                <DrawerTabBar
                    tabs={[{ id: 'worn', label: 'Worn' }, { id: 'inv', label: 'Inventory' }, { id: 'vicinity', label: 'Vicinity' }]}
                    active={gearTab}
                    onChange={(id) => selectGearTab(id as GearTab)}
                />
                {gearTab === 'worn' && (
                    <>
                        <UnifiedView
                            lines={displayEqLines}
                            location="worn"
                            category="inline-worn"
                            emptyMessage="No equipment data. Tap refresh to update."
                            onRefresh={() => { triggerHaptic(15); executeCommand('eq', true, true); }}
                        />
                        {renderHoldActions([{ id: 'drawer-worn-remove', label: 'Remove', command: 'remove %n' }])}
                    </>
                )}
                {gearTab === 'inv' && (
                    <>
                        <UnifiedView
                            lines={displayInventoryLines}
                            location="carried"
                            category="inline-inventory"
                            emptyMessage="No inventory data. Tap refresh to update."
                            onRefresh={() => { triggerHaptic(15); executeCommand('inv', true, true); }}
                        />
                        {renderHoldActions([
                            { id: 'drawer-inv-wear', label: 'Wear', command: 'wear %n' },
                            { id: 'drawer-inv-drop', label: 'Drop', command: 'drop %n' }
                        ])}
                    </>
                )}
                {gearTab === 'vicinity' && (
                    <>
                        <UnifiedView
                            lines={roomObjectLines}
                            location="room"
                            category="inline-in-room-obj"
                            emptyMessage="No room objects detected. Tap refresh to look around."
                            onRefresh={() => { triggerHaptic(15); executeCommand('look', true, true); }}
                        />
                        {renderHoldActions([{ id: 'drawer-vicinity-get', label: 'Get', command: 'get %n' }])}
                    </>
                )}
            </>
        );
    }

    // --- Players Section ---
    if (drawer === 'players') {
        return (
            <>
                <DrawerTabBar
                    tabs={[{ id: 'online', label: 'Online' }, { id: 'nearby', label: 'Nearby' }, { id: 'group', label: 'Group' }]}
                    active={playersTab}
                    onChange={(id) => selectPlayersTab(id as PlayersTab)}
                />
                {playersTab === 'online' && (
                    <>
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
                    </>
                )}
                {playersTab === 'nearby' && (
                    <>
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
                    </>
                )}
                {playersTab === 'group' && (
                    <GroupTableView members={groupMembers} />
                )}
            </>
        );
    }

    // --- Character Section ---
    if (drawer === 'character') {
        return (
            <>
                <DrawerTabBar
                    tabs={[{ id: 'info', label: 'Info' }, { id: 'quests', label: 'Quests' }, { id: 'skills', label: 'Skills' }, { id: 'achievements', label: 'Achievements' }]}
                    active={charTab}
                    onChange={(id) => selectCharTab(id as CharacterTab)}
                />
                {charTab === 'info' && (
                    <UnifiedView
                        lines={infoLines}
                        emptyMessage="No info data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('info', true, true); }}
                    />
                )}
                {charTab === 'quests' && (
                    <UnifiedView
                        lines={questLines}
                        emptyMessage="No quest data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('quest', true, true); }}
                    />
                )}
                {charTab === 'skills' && (
                    <>
                        <UnifiedView
                            lines={practiceTargetLines}
                            emptyMessage="No skills data. Tap refresh to update."
                            onRefresh={() => { triggerHaptic(15); executeCommand('practice', true, true); }}
                        />
                        {renderHoldActions([{ id: 'drawer-skills-practice', label: 'Practice', command: 'practice %n' }])}
                    </>
                )}
                {charTab === 'achievements' && (
                    <UnifiedView lines={achievementLines} emptyMessage="No achievement data. Tap refresh to update." onRefresh={() => { triggerHaptic(15); executeCommand('achievement', true, true); }} />
                )}
            </>
        );
    }

    return null;
};
