import React from 'react';
import { useGame } from '../../../context/GameContext';
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
    stats?: {
        hp: number; maxHp: number;
        mana: number; maxMana: number;
        move: number; maxMove: number;
    };
}

import { GameButton } from '../../Controls/GameButton/GameButton';

export const LineCluster: React.FC<LineClusterProps> = ({
    isEditMode, handleDragStart, buttons, selectedButtonIds, dragState,
    handleButtonClick, wasDraggingRef, triggerHaptic, setPopoverState,
    setEditingButtonId, setSelectedIds, activePrompt, executeCommand,
    setCommandPreview, heldButton, setHeldButton, joystick, target,
    isGridEnabled, gridSize, setActiveSet, setButtons, isMobile,
    stats
}) => {
    const { viewport } = useGame();
    const { isLandscape } = viewport;

    const xboxIds = ['xbox-b', 'xbox-x', 'xbox-z', 'xbox-door', 'xbox-a', 'xbox-y'];

    // Check if we should be hidden (redundant with Layer but safe)
    if (isMobile && !isLandscape && viewport.isKeyboardOpen) return null;

    return (
        <div className="line-cluster">
            {xboxIds.map(id => {
                const button = buttons.find(b => b.id === id);
                if (!button) return null;

                // HP/Mana/Move ratios — warrior (z), ranger (y), mage/cleric (b, x)
                const hpRatio = id === 'xbox-z' ? (stats ? stats.hp / Math.max(1, stats.maxHp) : undefined) : undefined;
                const moveRatio = id === 'xbox-y' ? (stats ? stats.move / Math.max(1, stats.maxMove) : undefined) : undefined;
                const manaRatio = (id === 'xbox-b' || id === 'xbox-x') ? (stats ? stats.mana / Math.max(1, stats.maxMana) : undefined) : undefined;

                return (
                    <GameButton
                        key={id}
                        button={button}
                        className={`line-btn ${id}`}
                        variant="diamond"
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
                        hpRatio={hpRatio}
                        manaRatio={manaRatio}
                        moveRatio={moveRatio}
                    />
                );
            })}
        </div>
    );
};
