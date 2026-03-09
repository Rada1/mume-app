import React from 'react';
import { GameButton } from '../../Controls/GameButton/GameButton';

interface XboxClusterProps {
    uiPositions: any;
    isEditMode: boolean;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
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
    isLandscape?: boolean;
    stats?: {
        hp: number; maxHp: number;
        mana: number; maxMana: number;
        move: number; maxMove: number;
    };
}

export const XboxCluster: React.FC<XboxClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, buttons, selectedButtonIds, dragState,
    handleButtonClick, wasDraggingRef, triggerHaptic, setPopoverState,
    setEditingButtonId, setSelectedIds, activePrompt, executeCommand,
    setCommandPreview, heldButton, setHeldButton, joystick, target,
    isGridEnabled, gridSize, setActiveSet, setButtons, isMobile, isLandscape,
    stats
}) => {
    const pos = uiPositions.xbox || {};

    // Default positioning logic
    const isDefault = pos.x === undefined && pos.y === undefined;

    let style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 2000,
        width: '220px',
        height: '220px',
        pointerEvents: 'auto',
        cursor: isEditMode ? 'default' : undefined,
        border: isEditMode ? '1px dashed rgba(255,255,0,0.15)' : undefined,
        borderRadius: '50%',
        backgroundColor: isEditMode ? 'rgba(255,255,0,0.05)' : undefined,
        transformOrigin: 'bottom right',
        left: 'auto',
        opacity: 1
    };
    
    if (isDefault) {

        if (isMobile && !isLandscape) {
            // Portrait Mobile: Position solidly within the lower map area
            style.right = '15px';
            style.bottom = '20px'; // Shifted down from 50px to stay clear of input bar
            style.top = 'auto';
            style.transform = pos.scale ? `scale(${pos.scale})` : '';
            style.transformOrigin = 'bottom right';
        } else {
            // Landscape or Desktop Default
            style.right = isLandscape ? '40px' : '15px';
            style.bottom = isLandscape ? '20px' : '30px';
            style.top = 'auto';
            style.transform = pos.scale ? `scale(${pos.scale})` : '';
        }
    } else {
        style.right = pos.x ?? '0';
        style.top = pos.y ?? 'auto';
        style.bottom = pos.y !== undefined ? 'auto' : (pos.bottom ?? (isMobile && !isLandscape ? '50px' : '20px'));
        style.transform = `${pos.y !== undefined ? '' : 'translateY(-50%)'} ${pos.scale ? `scale(${pos.scale})` : ''}`;
    }

    return (
        <div
            id="cluster-xbox"
            className="xbox-cluster"
            style={style}
            onPointerDown={(e) => {
                if (!isEditMode && e.cancelable) e.preventDefault();
            }}
        >
            {['xbox-y', 'xbox-b', 'xbox-a', 'xbox-x', 'xbox-z', 'xbox-door'].map(id => {
                const button = buttons.find(b => b.id === id);
                if (!button) return null;
                const posClass = id === 'xbox-y' ? 'top' : id === 'xbox-x' ? 'right' : id === 'xbox-b' ? 'left' : id === 'xbox-a' ? 'bottom' : id === 'xbox-z' ? 'center' : 'outside';

                // Warrior (z) gets HP, Ranger (y) gets Moves, Mage (b) & Cleric (x) get Mana (per user request)
                const hpRatio = id === 'xbox-z' ? (stats ? stats.hp / Math.max(1, stats.maxHp) : undefined) : undefined;
                const moveRatio = id === 'xbox-y' ? (stats ? stats.move / Math.max(1, stats.maxMove) : undefined) : undefined;
                const manaRatio = (id === 'xbox-b' || id === 'xbox-x') ? (stats ? stats.mana / Math.max(1, stats.maxMana) : undefined) : undefined;

                return (
                    <GameButton
                        key={id}
                        button={button}
                        className={`xbox-btn ${posClass}`}
                        useDefaultPositioning={false}
                        isEditMode={isEditMode}
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
                        isGridEnabled={isGridEnabled}
                        gridSize={gridSize}
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
