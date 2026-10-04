/**
 * @file LineCluster.tsx
 * @description Renders the persistent tactical action row.
 */

import React from 'react';
import { Trees, Sparkles, VenetianMask, Swords, Wand, DoorOpen, Eye } from 'lucide-react';
import { useGame } from '../../../context/GameContext';
import { useCurrentRoomHasDoor } from '../../../hooks/useCurrentRoomHasDoor';
import { useUIStore } from '../../../stores/useUIStore';
import { getSwipeCommandTextColor } from '../../../utils/swipeCommandColors';
import './LineCluster.css';

// Neutral lucide icons per tactical button, matching the category controls.
const TACTICAL_ICONS: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>> = {
    'tactical-ranger': Trees,
    'tactical-cleric': Sparkles,
    'tactical-thief': VenetianMask,
    'tactical-warrior': Swords,
    'tactical-mage': Wand,
    'tactical-doors': DoorOpen,
    'tactical-eye': Eye
};

interface LineClusterProps {
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
    buttons: any[];
    selectedButtonIds: Set<string>;
    dragState: any;
    handleButtonClick: (b: any, e: any) => void;
    wasDraggingRef: React.RefObject<boolean>;
    triggerHaptic: (ms: number) => void;
    setPopoverState: (val: any) => void;
    setEditingButtonId: (id: string | null) => void;
    setSelectedIds: (ids: Set<string>) => void;
    activePrompt: any;
    executeCommand: (cmd: string) => void;
    setCommandPreview: (val: string | null) => void;
    heldButton: any;
    setHeldButton: (val: any) => void;
    joystick: any;
    target: string | null;
    isGridEnabled: boolean;
    gridSize: number;
    setActiveSet: (setId: string) => void;
    setButtons: (val: any) => void;
    isMobile?: boolean;
    isCheatSheetExpanded?: boolean;
    setIsCheatSheetExpanded?: (expanded: boolean) => void;
}

import { GameButton } from '../../Controls/GameButton/GameButton';

export const LineCluster: React.FC<LineClusterProps> = ({
    isEditMode, handleDragStart, buttons, selectedButtonIds, dragState,
    handleButtonClick, wasDraggingRef, triggerHaptic, setPopoverState,
    setEditingButtonId, setSelectedIds, activePrompt, executeCommand,
    setCommandPreview, heldButton, setHeldButton, joystick, target,
    isGridEnabled, gridSize, setActiveSet, setButtons, isMobile,
    isCheatSheetExpanded = false, setIsCheatSheetExpanded
}) => {
    const { viewport } = useGame();
    const selectedTarget = useUIStore(state => state.selectedTarget);
    const { isLandscape } = viewport;
    const hasRoomDoor = useCurrentRoomHasDoor();

    // Pull the 6 tactical buttons by their setId
    const tacticalButtons = buttons.filter(b => b.setId === 'Tactical');

    const charmieButton = tacticalButtons.find(button => button.id === 'tactical-charmie');
    const sortedButtons = tacticalButtons.filter(button => button.id !== 'tactical-charmie').sort((a, b) => {
        const order = ['tactical-mage', 'tactical-cleric', 'tactical-ranger', 'tactical-warrior', 'tactical-thief', 'tactical-doors', 'tactical-eye'];
        return order.indexOf(a.id) - order.indexOf(b.id);
    });
    const buttonSteps = sortedButtons.map((button, index) => ({ button, index }));
    const mageClericSteps = buttonSteps.filter(({ button }) => button.id === 'tactical-mage' || button.id === 'tactical-cleric');
    const rangerSteps = buttonSteps.filter(({ button }) => button.id === 'tactical-ranger');
    const warriorThiefSteps = buttonSteps.filter(({ button }) => button.id === 'tactical-warrior' || button.id === 'tactical-thief');
    const groupedButtonIds = new Set(['tactical-mage', 'tactical-cleric', 'tactical-warrior', 'tactical-thief']);
    const remainingSteps = buttonSteps.filter(({ button }) => !groupedButtonIds.has(button.id) && button.id !== 'tactical-ranger');

    // Check if we should be hidden (redundant with Layer but safe)
    if (isMobile && !isLandscape && viewport.isKeyboardOpen && !isEditMode) return null;

    const renderButton = (button: any, variant: 'default' | 'diamond', className: string) => {
        const IconCmp = TACTICAL_ICONS[button.id];
        const buttonClassName = button.id === 'tactical-doors' && hasRoomDoor
            ? `${className} has-room-door`
            : className;
        return (
        <GameButton
            key={button.id}
            button={button}
            className={buttonClassName}
            variant={variant}
            iconNode={IconCmp ? <IconCmp size={17} strokeWidth={2} color={getSwipeCommandTextColor(button.command)} /> : undefined}
            useDefaultPositioning={false}
            isEditMode={isEditMode}
            isGridEnabled={isGridEnabled}
            gridSize={gridSize}
            isSelected={selectedButtonIds.has(button.id)}
            dragState={dragState}
            handleDragStart={handleDragStart}
            handleButtonClick={handleButtonClick}
            wasDraggingRef={wasDraggingRef}
            triggerHaptic={triggerHaptic}
            setPopoverState={setPopoverState}
            setEditButton={(b) => { setEditingButtonId(b.id); if (!selectedButtonIds.has(b.id)) setSelectedIds(new Set([b.id])); }}
            activePrompt={activePrompt}
            executeCommand={executeCommand}
            setCommandPreview={setCommandPreview}
            setHeldButton={setHeldButton}
            heldButton={heldButton}
            joystick={joystick}
            target={target}
            setActiveSet={setActiveSet}
            setButtons={setButtons}
            isMobile={isMobile}
        />
        );
    };

    const renderStep = ({ button, index }: typeof buttonSteps[number]) => (
        <div
            key={button.id}
            className="line-cluster-step"
            style={{ '--cascade-delay': `${index * 0.12}s` } as React.CSSProperties}
        >
            {renderButton(button, 'default', `line-btn ${button.id}`)}
        </div>
    );

    return (
        <div className={`tactical-line-wrapper${selectedTarget ? ' is-targeting' : ''}`}>
            {charmieButton && (
                <div className="line-cluster-aux">
                    {renderButton(charmieButton, 'default', 'line-btn tactical-charmie auxiliary-charmie')}
                </div>
            )}
            <div className="line-cluster">
                <div className="mobile-tactical-class-group mobile-tactical-class-group-mage-cleric">
                    {mageClericSteps.map(renderStep)}
                </div>
                {rangerSteps.map(renderStep)}
                <div className="mobile-tactical-class-group mobile-tactical-class-group-warrior-thief">
                    {warriorThiefSteps.map(renderStep)}
                </div>
                {remainingSteps.map(renderStep)}
            </div>
        </div>
    );
};
