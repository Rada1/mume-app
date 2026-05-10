import React, { useRef, useEffect, useCallback } from 'react';
import { CustomButton, PopoverState, ExecuteCommand } from '../../../types';

import { getButtonCommand } from '../../../utils/buttonUtils';
import { useGame } from '../../../context/GameContext';
import { useButtonGestures } from './useButtonGestures';
import { ButtonLabel } from './ButtonLabel';
import { ButtonSwipeOverlay } from './ButtonSwipeOverlay';
import { CircularVitals } from './CircularVitals';

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
    executeCommand: ExecuteCommand;
    setCommandPreview: (cmd: string | null) => void;
    setHeldButton: React.Dispatch<React.SetStateAction<{ id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null>>;
    heldButton: { id: string, baseCommand: string, modifiers: string[], dx?: number, dy?: number, didFire?: boolean, initialX?: number, initialY?: number } | null;
    joystick: { isActive: boolean, currentDir: string | null, isTargetModifierActive: boolean, setIsJoystickConsumed: (val: boolean) => void };
    target: string | null;
    setActiveSet: (setId: string) => void;
    setButtons: React.Dispatch<React.SetStateAction<CustomButton[]>>;
    className?: string;
    useDefaultPositioning?: boolean;
    isMobile?: boolean;
    hpRatio?: number;
    manaRatio?: number;
    moveRatio?: number;
    variant?: 'default' | 'diamond';
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
    useDefaultPositioning = true,
    isMobile = false,
    hpRatio,
    manaRatio,
    moveRatio,
    variant = 'default'
}) => {
    const [activeDir, setActiveDir] = React.useState<any>(null);
    const [isCancelling, setIsCancelling] = React.useState(false);
    const [wheelPos, setWheelPos] = React.useState({ x: 0, y: 0 });
    const [rayParams, setRayParams] = React.useState<{ angle: number, length: number, opacity: number, color?: string }>({ angle: 0, length: 0, opacity: 0, color: 'var(--accent)' });
    const buttonRef = useRef<HTMLDivElement>(null);
    const { playClickSound, isSoundEnabled, initAudio } = useGame();

    const [renderParams, setRenderParams] = React.useState({
        w: button.style.w,
        h: button.style.h,
        radius: button.style.borderRadius || 8
    });

    const gestures = useButtonGestures({
        button, isEditMode, handleDragStart, wasDraggingRef, triggerHaptic, setHeldButton, heldButton,
        joystick, target, setCommandPreview, setActiveDir, activeDir, setIsCancelling, isCancelling,
        setPopoverState, executeCommand, setActiveSet, handleButtonClick, setButtons, setEditButton,
        setWheelPos, playClickSound, isSoundEnabled, initAudio, setRayParams, isMobile
    });

    if (button.display === 'inline') return null;

    const needsCircularVitals = (hpRatio !== undefined || manaRatio !== undefined || moveRatio !== undefined) && variant === 'default';
    const needsDiamondVitals = (hpRatio !== undefined || manaRatio !== undefined || moveRatio !== undefined) && variant === 'diamond';

    useEffect(() => {
        if (heldButton?.id === button.id && heldButton.dx !== undefined && heldButton.dy !== undefined) {
            const preview = getButtonCommand(button, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, target, joystick.isActive);
            setCommandPreview(preview?.cmd || null);
        }
    }, [joystick.isActive, heldButton?.id, button.id, joystick.currentDir, joystick.isTargetModifierActive, target, setCommandPreview]);

    const handleSwap = React.useCallback(() => {
        if (!activeDir || (activeDir as any) === 'center') return;
        const dirVectors: Record<string, [number, number]> = {
            right: [30, 0], se: [21, 21], down: [0, 30], sw: [-21, 21],
            left: [-30, 0], nw: [-21, -21], up: [0, -30], ne: [21, -21]
        };
        const [dx, dy] = dirVectors[activeDir as string] || [0, 0];
        const result = getButtonCommand(button, dx, dy, undefined, 100,
            heldButton?.id === button.id ? (heldButton?.modifiers || []) : [],
            joystick, target, true);
        if (!result?.cmd?.trim()) return;

        triggerHaptic(40);
        setHeldButton(prev => prev ? { ...prev, didFire: true } : prev);
        setActiveDir(null);

        if (result.actionType === 'nav') {
            setActiveSet(result.cmd);
        } else if (['assign', 'menu', 'select-assign', 'select-recipient'].includes(result.actionType || '')) {
            const rect = buttonRef.current?.getBoundingClientRect();
            const isDial = button.menuDisplay === 'dial';
            setPopoverState({
                x: isDial ? window.innerWidth / 2 : (rect ? rect.right + 10 : window.innerWidth / 2),
                y: isDial ? window.innerHeight / 2 : (rect ? rect.top : window.innerHeight / 2),
                sourceHeight: rect?.height || 0,
                setId: result.cmd,
                context: result.actionType === 'select-assign' ? result.modifiers : button.label,
                assignSourceId: (result.actionType === 'assign' || result.actionType === 'select-assign') ? button.id : undefined,
                assignSwipeDir: result.dir,
                executeAndAssign: result.actionType === 'select-assign' || result.actionType === 'assign',
                menuDisplay: button.menuDisplay,
                accentColor: button.style.borderColor || button.style.backgroundColor,
                type: result.actionType === 'select-recipient' ? 'give-recipient-select' : undefined,
            });
        } else if (result.actionType === 'preload' || result.cmd.startsWith('input:')) {
            const prefill = result.cmd.startsWith('input:') ? result.cmd.slice(6) : (result.cmd + (result.cmd.endsWith(' ') ? '' : ' '));
            handleButtonClick({ ...button, command: prefill, actionType: 'preload', _skipJoystick: true } as any, {} as any);
        } else if (result.cmd === '__clear_target__') {
            handleButtonClick({ ...button, command: '__clear_target__', actionType: 'command', _skipJoystick: true } as any, {} as any);
        } else {
            executeCommand(result.cmd, false, false);
        }
    }, [activeDir, button, heldButton, joystick, target, executeCommand, triggerHaptic,
        setHeldButton, setActiveDir, setActiveSet, setPopoverState, handleButtonClick, buttonRef]);

    React.useLayoutEffect(() => {
        if (buttonRef.current && needsCircularVitals) {
            const el = buttonRef.current;
            const update = () => {
                const styles = window.getComputedStyle(el);
                setRenderParams({
                    w: el.offsetWidth,
                    h: el.offsetHeight,
                    radius: parseFloat(styles.borderRadius) || 0
                });
            };
            update();
            const observer = new ResizeObserver(update);
            observer.observe(el);
            return () => observer.disconnect();
        }
    }, [needsCircularVitals, button.isVisible]);

    if (!button.isVisible && !isEditMode && button.setId !== 'Tactical') return null;

    const isFloating = button.display === 'floating';

    const getGlowColorInternal = () => {
        if (button.trigger?.enabled && button.isVisible) {
            return button.style.borderColor || button.style.backgroundColor || 'var(--accent)';
        }
        return 'transparent';
    };

    const getRgb = (colorVal: string | undefined, defaultVal: string) => {
        if (!colorVal) return defaultVal;
        const hex = colorVal.replace('#', '');
        if (hex.length < 6) return defaultVal;
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return !isNaN(r) ? `${r}, ${g}, ${b}` : defaultVal;
    };

    return (
        <div
            ref={buttonRef}
            className={`custom-btn ${isFloating ? 'floating' : ''} ${isEditMode ? 'edit-mode' : ''} ${isSelected ? 'selected' : ''} ${button.trigger?.enabled && button.isVisible ? 'triggered' : ''} ${activeDir ? 'is-swiping' : ''} ${variant === 'diamond' ? 'is-diamond' : ''} ${className}`}
            data-id={button.id}
            data-variant={variant}
            style={{
                left: useDefaultPositioning ? `${button.style.x}%` : undefined,
                top: useDefaultPositioning ? `${button.style.y}%` : undefined,
                width: useDefaultPositioning ? `${button.style.w}px` : undefined,
                height: useDefaultPositioning ? `${button.style.h}px` : undefined,
                backgroundColor: button.style.transparent ? 'transparent' : (button.style.backgroundColor || 'rgba(255,255,255,0.05)'),
                borderColor: button.style.borderColor || 'rgba(255,255,255,0.2)',
                borderWidth: `${button.style.borderWidth !== undefined ? button.style.borderWidth : 1}px`,
                borderStyle: 'solid',
                '--btn-theme-rgb': getRgb(button.style.borderColor, '255, 255, 255'),
                color: button.style.color || '#fff',
                fontSize: `${button.style.fontSize || 0.8}rem`,
                borderRadius: variant === 'diamond' ? '0' : `${button.style.borderRadius || 8}px`,
                '--set-accent': button.style.borderColor || 'var(--accent)',
                '--set-accent-rgb': getRgb(button.style.borderColor, '255, 255, 255'),
                '--ray-angle': `${rayParams.angle}deg`,
                '--ray-length': `${rayParams.length}px`,
                '--ray-opacity': rayParams.opacity,
                '--ray-color': rayParams.color,
                opacity: (button.isVisible || isEditMode || button.setId === 'Tactical') ? (button.isDimmed ? 0.35 : 1) : 0,
                pointerEvents: (button.isVisible || isEditMode || button.setId === 'Tactical') ? (button.isDimmed && !isEditMode ? 'none' : 'auto') : 'none',
                boxShadow: button.style.transparent ? 'none' : ((button.trigger?.enabled && button.isVisible) ? `0 0 20px ${getGlowColorInternal()}` : 'none'),
                backdropFilter: button.style.transparent ? 'none' : undefined,
                WebkitBackdropFilter: button.style.transparent ? 'none' : undefined,
                zIndex: activeDir ? 60000 : (isSelected ? 1001 : (isFloating ? 1000 : 100)),
                overflow: 'visible'
            } as any}
            {...gestures}
        >
            {needsDiamondVitals && (
                <div className="diamond-vitals">
                    {hpRatio !== undefined && <div className="vitals-bar hp" style={{ height: `${hpRatio * 100}%` }} />}
                    {manaRatio !== undefined && <div className="vitals-bar mana" style={{ height: `${manaRatio * 100}%` }} />}
                    {moveRatio !== undefined && <div className="vitals-bar move" style={{ height: `${moveRatio * 100}%` }} />}
                </div>
            )}
            {needsCircularVitals && (
                <CircularVitals
                    hpRatio={hpRatio}
                    manaRatio={manaRatio}
                    moveRatio={moveRatio}
                    w={renderParams.w}
                    h={renderParams.h}
                    borderRadius={renderParams.radius}
                    isOuter={true}
                />
            )}
            <ButtonSwipeOverlay
                button={button}
                activeDir={activeDir}
                isCancelling={isCancelling}
                buttonRect={buttonRef.current?.getBoundingClientRect()}
                rayParams={rayParams}
                onSwap={handleSwap}
            />
            <ButtonLabel button={button} />

            {isEditMode && button.setId !== 'Tactical' && (
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
