import React from 'react';
import { GameButton } from '../../GameButton';

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
}

export const XboxCluster: React.FC<XboxClusterProps> = ({
    uiPositions, isEditMode, handleDragStart, buttons, selectedButtonIds, dragState,
    handleButtonClick, wasDraggingRef, triggerHaptic, setPopoverState,
    setEditingButtonId, setSelectedIds, activePrompt, executeCommand,
    setCommandPreview, heldButton, setHeldButton, joystick, target,
    isGridEnabled, gridSize, setActiveSet, setButtons, isMobile, isLandscape
}) => {
    const pos = uiPositions.xbox || {};

    // Default positioning logic
    const isDefault = pos.x === undefined && pos.y === undefined;

    let style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 1500,
        width: '170px',
        height: '170px',
        pointerEvents: 'auto',
        cursor: isEditMode ? 'move' : undefined,
        border: (isEditMode && dragState?.id === 'xbox') ? '2px dashed #ffff00' : (isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
        borderRadius: '50%',
        backgroundColor: isEditMode ? 'rgba(255,255,0,0.1)' : undefined,
        boxShadow: (isEditMode && dragState?.id === 'xbox') ? '0 0 30px rgba(255,255,0,0.4)' : undefined,
        transformOrigin: 'bottom right'
    };

    if (isDefault) {
        style.right = '20px';
        style.bottom = '20px';
        style.top = 'auto';
        style.transform = pos.scale ? `scale(${pos.scale})` : '';
    } else {
        style.right = pos.x ?? '0';
        style.top = pos.y ?? 'auto';
        style.bottom = pos.y !== undefined ? 'auto' : (pos.bottom ?? '20px');
        style.transform = `${pos.y !== undefined ? '' : 'translateY(-50%)'} ${pos.scale ? `scale(${pos.scale})` : ''}`;
    }

    return (
        <div
            className="xbox-cluster"
            style={style}
            onPointerDown={(e) => {
                if (isEditMode) {
                    handleDragStart(e, 'xbox', 'cluster');
                }
                else if (e.cancelable) e.preventDefault();
            }}
        >
            {isEditMode && (
                <div
                    className="resize-handle"
                    style={{ top: '-10px', right: '-10px', zIndex: 1600 }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, 'xbox', 'cluster-resize');
                    }}
                />
            )}

            {['xbox-y', 'xbox-b', 'xbox-a', 'xbox-x', 'xbox-z', 'xbox-door'].map(id => {
                const button = buttons.find(b => b.id === id);
                if (!button || (button.isVisible === false && !isEditMode)) return null;
                const posClass = id === 'xbox-y' ? 'top' : id === 'xbox-b' ? 'right' : id === 'xbox-a' ? 'bottom' : id === 'xbox-x' ? 'left' : id === 'xbox-z' ? 'center' : 'outside';
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
                    />
                );
            })}
        </div>
    );
};
