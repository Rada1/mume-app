/**
 * @file UnifiedDrawerContent.tsx
 * @description Shared content renderer for desktop drawers and the mobile gutter drawer.
 */

import React from 'react';
import { DrawerLine, GmcpOccupant } from '../../types';
import { DrawerType } from '../../context/GameContext/types';
import { useGame } from '../../context/GameContext';
import { UnifiedView } from './Views/UnifiedView';
import { StatusDrawer } from './StatusDrawer';
import { AccountDrawer } from './AccountDrawer';
import { DrawerHoldCommandButton } from './DrawerHoldCommandButton';
import { DrawerTabBar } from './DrawerTabBar';
import { buildPracticeDrawerLines } from '../../utils/practiceDrawerLines';
import { extractMumeKeyword } from '../../utils/gameUtils';
import { GearView } from './Views/GearView';

type GearTab = 'worn' | 'inv' | 'vicinity';
type CharacterTab = 'info' | 'quests' | 'skills' | 'achievements';

interface UnifiedDrawerContentProps {
    drawer: DrawerType;
    gearTab: GearTab;
    setGearTab: (tab: GearTab) => void;
    charTab: CharacterTab;
    setCharTab: (tab: CharacterTab) => void;
    displayInventoryLines: DrawerLine[];
    displayEqLines: DrawerLine[];
    roomItems: GmcpOccupant[];
    infoLines: DrawerLine[];
    questLines: DrawerLine[];
    achievementLines: DrawerLine[];
    practiceLines: DrawerLine[];
    triggerHaptic: (ms: number) => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean, fromDrawer?: boolean) => void;
}

export const UnifiedDrawerContent: React.FC<UnifiedDrawerContentProps> = ({
    drawer,
    gearTab,
    setGearTab,
    charTab,
    setCharTab,
    displayInventoryLines,
    displayEqLines,
    roomItems,
    infoLines,
    questLines,
    achievementLines,
    practiceLines,
    triggerHaptic,
    executeCommand
}) => {
    const { practice } = useGame();
    const practiceTargetLines = React.useMemo<DrawerLine[]>(
        () => buildPracticeDrawerLines(practice.practiceData, practiceLines),
        [practice.practiceData, practiceLines]
    );

    const selectGearTab = (tab: GearTab) => {
        triggerHaptic(10);
        if (tab === 'worn') executeCommand('eq', true, true, false, true);
        else if (tab === 'inv') executeCommand('inv', true, true, false, true);
        else executeCommand('look', true, true, false, true);
        setGearTab(tab);
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
        <div style={{ display: 'flex', gap: '8px', padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(13,16,23,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
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

    const categories = ['status', 'character', 'equipment'] as DrawerType[];
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
                    width: '300%',
                    height: '100%',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    transform: `translateX(-${activeCategoryIndex * (100 / 3)}%)`
                }}
            >
                {/* 1. Status View */}
                <div className="drawer-category-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <StatusDrawer />
                </div>

                {/* 2. Character View */}
                <div className="drawer-category-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
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

                {/* 3. Gear View */}
                <div className="drawer-category-slide" style={{ width: '33.333%', height: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                    <GearView
                        gearTab={gearTab}
                        selectGearTab={selectGearTab}
                        displayEqLines={displayEqLines}
                        displayInventoryLines={displayInventoryLines}
                        roomItems={roomItems}
                        triggerHaptic={triggerHaptic}
                        executeCommand={executeCommand}
                        renderHoldActions={renderHoldActions}
                    />
                </div>
            </div>
        </div>
    );
};
