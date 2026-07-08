/**
 * @file LineCluster.tsx
 * @description Renders the persistent tactical action row.
 */

import React from 'react';
import { useGame } from '../../../context/GameContext';
import { useUIStore } from '../../../stores/useUIStore';
import { CustomButton } from '../../../types';
import './LineCluster.css';

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
import { ActionMenuButton } from '../../Controls/ActionMenuButton';

const TACTICAL_CLASS_LABELS: Record<string, string> = {
    'tactical-ranger': 'ranger',
    'tactical-cleric': 'cleric',
    'tactical-thief': 'thief',
    'tactical-warrior': 'warrior',
    'tactical-mage': 'mage',
    'tactical-doors': 'scout'
};

const getTacticalClassLabel = (button: CustomButton): string => (
    TACTICAL_CLASS_LABELS[button.id] || button.label.toLowerCase()
);

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

    // Pull the 6 tactical buttons by their setId
    const tacticalButtons = buttons.filter(b => b.setId === 'Tactical');

    // Sort them to ensure consistent layout if needed, but for now we'll just use the order they come in
    // or we can sort by ID if we want a specific order (e.g. tactical-ranger, tactical-cleric, etc.)
    const charmieButton = tacticalButtons.find(button => button.id === 'tactical-charmie');
    const sortedButtons = tacticalButtons.filter(button => button.id !== 'tactical-charmie').sort((a, b) => {
        const order = ['tactical-ranger', 'tactical-cleric', 'tactical-thief', 'tactical-warrior', 'tactical-mage', 'tactical-action', 'tactical-doors'];
        return order.indexOf(a.id) - order.indexOf(b.id);
    });

    // Check if we should be hidden (redundant with Layer but safe)
    if (isMobile && !isLandscape && viewport.isKeyboardOpen && !isEditMode) return null;

    const renderButton = (button: any, variant: 'default' | 'diamond', className: string) => (
        <GameButton
            key={button.id}
            button={button}
            className={className}
            variant={variant}
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

    return (
        <div className={`tactical-line-wrapper${selectedTarget ? ' is-targeting' : ''}`}>
            {charmieButton && (
                <div className="line-cluster-aux">
                    {renderButton(charmieButton, 'default', 'line-btn tactical-charmie auxiliary-charmie')}
                </div>
            )}
            <div 
                className="line-cluster-title clickable-toggle"
                onClick={() => {
                    setIsCheatSheetExpanded?.(!isCheatSheetExpanded);
                }}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', userSelect: 'none' }}
            >
                abilities {isCheatSheetExpanded ? '▴' : '▾'}
            </div>
            <div className="line-cluster">
                {sortedButtons.map((button, index) => (
                    <div
                        key={button.id}
                        className="line-cluster-step"
                        style={{ '--cascade-delay': `${index * 0.12}s` } as React.CSSProperties}
                    >
                        {renderButton(button, 'diamond', `line-btn ${button.id}`)}
                        <span className="line-cluster-caption">{getTacticalClassLabel(button)}</span>
                    </div>
                ))}
                <div
                    className="line-cluster-step"
                    style={{ '--cascade-delay': `${sortedButtons.length * 0.12}s` } as React.CSSProperties}
                >
                    <ActionMenuButton triggerHaptic={triggerHaptic} className="line-btn line-cluster-action-menu" />
                </div>
            </div>
        </div>
    );
};
