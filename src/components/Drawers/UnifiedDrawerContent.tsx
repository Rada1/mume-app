/**
 * @file UnifiedDrawerContent.tsx
 * @description Shared content renderer for desktop drawers and the mobile gutter drawer.
 */

import React from 'react';
import { DrawerLine, GroupMember } from '../../types';
import { DrawerType } from '../../context/GameContext/types';
import { MemberRow } from './MemberRow';
import { UnifiedView } from './Views/UnifiedView';

type GearTab = 'worn' | 'inv';
type PlayersTab = 'online' | 'nearby' | 'group';
type CharacterTab = 'info' | 'quests' | 'skills';

interface DrawerTab {
    id: string;
    label: string;
}

export const DrawerTabBar: React.FC<{
    tabs: DrawerTab[];
    active: string;
    onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
    <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
        padding: '0 8px',
        flexShrink: 0
    }}>
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${active === tab.id ? 'var(--accent)' : 'transparent'}`,
                    color: active === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: '-1px'
                }}
            >
                {tab.label}
            </button>
        ))}
    </div>
);

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
    whoLines: DrawerLine[];
    whereLines: DrawerLine[];
    infoLines: DrawerLine[];
    questLines: DrawerLine[];
    practiceLines: DrawerLine[];
    groupMembers: GroupMember[];
    triggerHaptic: (ms: number) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean) => void;
}

const EmptyGroup = () => (
    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', fontSize: '0.9rem' }}>
        No group members.
    </div>
);

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
    whoLines,
    whereLines,
    infoLines,
    questLines,
    practiceLines,
    groupMembers,
    triggerHaptic,
    executeCommand
}) => {
    const selectGearTab = (tab: GearTab) => {
        triggerHaptic(10);
        setGearTab(tab);
        executeCommand(tab === 'worn' ? 'eq' : 'inv', true, true);
    };

    const selectPlayersTab = (tab: PlayersTab) => {
        triggerHaptic(10);
        setPlayersTab(tab);
        if (tab === 'online') executeCommand('who', true, true);
        else if (tab === 'nearby') executeCommand('where', true, true);
    };

    const selectCharTab = (tab: CharacterTab) => {
        triggerHaptic(10);
        setCharTab(tab);
        if (tab === 'info') executeCommand('info', true, true);
        else if (tab === 'quests') executeCommand('quest', true, true);
        else if (tab === 'skills') executeCommand('practice', true, true);
    };

    // --- Gear Section ---
    if (drawer === 'equipment') {
        return (
            <>
                <DrawerTabBar
                    tabs={[{ id: 'worn', label: 'Worn' }, { id: 'inv', label: 'Inventory' }]}
                    active={gearTab}
                    onChange={(id) => selectGearTab(id as GearTab)}
                />
                {gearTab === 'worn' ? (
                    <UnifiedView
                        lines={displayEqLines}
                        location="worn"
                        category="inline-obj-worn"
                        emptyMessage="No equipment data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('eq', true, true); }}
                    />
                ) : (
                    <UnifiedView
                        lines={displayInventoryLines}
                        location="inv"
                        category="inline-obj-char"
                        emptyMessage="No inventory data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('inv', true, true); }}
                    />
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
                    <UnifiedView
                        lines={whoLines}
                        category="inline-player"
                        emptyMessage="No player data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('who', true, true); }}
                    />
                )}
                {playersTab === 'nearby' && (
                    <UnifiedView
                        lines={whereLines}
                        category="inline-player"
                        emptyMessage="No nearby player data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('where', true, true); }}
                    />
                )}
                {playersTab === 'group' && (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
                        {groupMembers.length > 0
                            ? groupMembers.map((member, idx) => (
                                <MemberRow key={member.name || String(idx)} member={member} index={idx} />
                            ))
                            : <EmptyGroup />}
                    </div>
                )}
            </>
        );
    }

    // --- Character Section ---
    if (drawer === 'character') {
        return (
            <>
                <DrawerTabBar
                    tabs={[{ id: 'info', label: 'Info' }, { id: 'quests', label: 'Quests' }, { id: 'skills', label: 'Skills' }]}
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
                    <UnifiedView
                        lines={practiceLines}
                        emptyMessage="No skills data. Tap refresh to update."
                        onRefresh={() => { triggerHaptic(15); executeCommand('practice', true, true); }}
                    />
                )}
            </>
        );
    }

    return null;
};
