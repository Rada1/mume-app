import React, { useRef, useEffect } from 'react';
import { CustomButton, PopoverState } from '../../../types';
import { getButtonCommand } from '../../../utils/buttonUtils';
import { useButtonGestures } from './useButtonGestures';
import { ButtonLabel } from './ButtonLabel';
import { ButtonSwipeOverlay } from './ButtonSwipeOverlay';

interface GameButtonProps {
    button: CustomButton;
    isEditMode: boolean;
    isGridEnabled: boolean;
    gridSize: number;
    isSelected: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: 'move' | 'resize' | 'cluster' | 'cluster-resize') => void;
    handleButtonClick: (button: CustomButton, e: React.MouseEvent | React.PointerEvent) => void;
    wasDraggingRef: React.RefObject<boolean>;
    triggerHaptic: (ms: number) => void;
    setPopoverState: React.Dispatch<React.SetStateAction<PopoverState | null>>;
    setEditButton: (button: CustomButton) => void;
    activePrompt: string | null;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean, isHistorical?: boolean) => void;
    setCommandPreview: (cmd: string | null) => void;
    setHeldButton: React.Dispatch<React.SetStateAction<{ id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null>>;
    heldButton: { id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null;
    joystick: { isActive: boolean, currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void };
    target: string | null;
    setActiveSet: (setId: string) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    className?: string;
    useDefaultPositioning?: boolean;
}

export const GameButton: React.FC<GameButtonProps> = ({
    button,
    isEditMode,
    isGridEnabled,
    gridSize,
    isSelected,
    dragState,
    handleDragStart,
    handleButtonClick,
    wasDraggingRef,
    triggerHaptic,
    setPopoverState,
    setEditButton,
    executeCommand,
    setCommandPreview,
    setHeldButton,
    heldButton,
    joystick,
    target,
    setActiveSet,
    setButtons,
    className = '',
    useDefaultPositioning = true
}) => {
    const [activeDir, setActiveDir] = React.useState<any>(null);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [wheelPos, setWheelPos] = React.useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLDivElement>(null);

    const gestures = useButtonGestures({
        button, isEditMode, handleDragStart, wasDraggingRef, triggerHaptic, setHeldButton, heldButton,
        joystick, target, setCommandPreview, setActiveDir, activeDir, setIsCancelling, isCancelling,
        setPopoverState, executeCommand, setActiveSet, handleButtonClick, setButtons, setEditButton,
        setWheelPos
    });

    if (button.display === 'inline') return null;

    useEffect(() => {
        if (heldButton?.id === button.id && heldButton.dx !== undefined && heldButton.dy !== undefined) {
            const preview = getButtonCommand(button, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, target, joystick.isActive);
            setCommandPreview(preview?.cmd || null);
        }
    }, [joystick.isActive, heldButton?.id, button.id, joystick.currentDir, joystick.isTargetModifierActive, target, setCommandPreview]);

    if (!button.isVisible && !isEditMode && button.setId !== 'Xbox') return null;

    const isFloating = button.display === 'floating';

    const getGlowColor = () => {
        if (button.trigger?.enabled && button.isVisible) {
            return button.style.borderColor || button.style.backgroundColor || 'var(--accent)';
        }
        return 'transparent';
    };

    const getRgb = (colorVal: string | undefined, defaultVal: string) => {
        if (!colorVal) return defaultVal;
        const hex = colorVal.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return !isNaN(r) ? `${r}, ${g}, ${b}` : defaultVal;
    };

    return (
        <div
            ref={buttonRef}
            className={`custom-btn ${isFloating ? 'floating' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''} ${button.trigger?.enabled && button.isVisible ? 'triggered' : ''} ${activeDir ? 'is-swiping' : ''} ${className}`}
            data-id={button.id}
            style={{
                left: useDefaultPositioning ? `${button.style.x}%` : undefined,
                top: useDefaultPositioning ? `${button.style.y}%` : undefined,
                width: useDefaultPositioning ? `${button.style.w}px` : undefined,
                height: useDefaultPositioning ? `${button.style.h}px` : undefined,
                backgroundColor: button.style.backgroundColor || 'rgba(255,255,255,0.05)',
                borderColor: button.style.borderColor || 'rgba(255,255,255,0.2)',
                borderWidth: `${button.style.borderWidth !== undefined ? button.style.borderWidth : 1}px`,
                borderStyle: 'solid',
                '--btn-theme-rgb': getRgb(button.style.borderColor, '255, 255, 255'),
                color: button.style.color || '#fff',
                fontSize: `${button.style.fontSize || 0.8}rem`,
                borderRadius: `${button.style.borderRadius || 8}px`,
                '--set-accent': button.style.borderColor || 'var(--accent)',
                '--set-accent-rgb': getRgb(button.style.borderColor, '255, 255, 255'),
                opacity: (button.isVisible || isEditMode || button.setId === 'Xbox') ? (button.isDimmed ? 0.35 : ((dragState?.id === button.id || (dragState?.initialPositions && dragState.initialPositions[button.id])) ? 0.6 : 1)) : 0,
                pointerEvents: (button.isVisible || isEditMode || button.setId === 'Xbox') ? (button.isDimmed && !isEditMode ? 'none' : 'auto') : 'none',
                boxShadow: (button.trigger?.enabled && button.isVisible) ? `0 0 20px ${getGlowColor()}` : 'none',
                zIndex: activeDir ? 20000 : (isSelected ? 1001 : (isFloating ? 1000 : 100))
            } as any}
            {...gestures}
        >
            <ButtonSwipeOverlay button={button} activeDir={activeDir} isCancelling={isCancelling} />
            <div className="swipe-ray" />
            <ButtonLabel button={button} />

            {isEditMode && (
                <div
                    className="resize-handle"
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        handleDragStart(e, button.id, 'resize');
                    }}
                />
            )}

            {isEditMode && isGridEnabled && (
                <div className="grid-info" style={{ position: 'absolute', bottom: '-15px', left: 0, fontSize: '10px', opacity: 0.5, whiteSpace: 'nowrap' }}>
                    {Math.round(button.style.x)}%, {Math.round(button.style.y)}%
                </div>
            )}
        </div>
    );
};
