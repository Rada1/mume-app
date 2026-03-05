import React from 'react';
import Joystick from '../../Joystick';
import { getButtonCommand } from '../../../utils/buttonUtils';
import { useGame } from '../../../context/GameContext';

interface JoystickClusterProps {
    uiPositions: any;
    isEditMode: boolean;
    dragState: any;
    handleDragStart: (e: React.PointerEvent, id: string, type: string) => void;
    joystick: any;
    joystickGlow: boolean;
    btnGlow: any;
    setJoystickGlow: (val: boolean) => void;
    setBtnGlow: (val: any) => void;
    executeCommand: (cmd: string) => void;
    triggerHaptic: (ms: number) => void;
    heldButton: any;
    setHeldButton: (val: any) => void;
    buttons: any[];
    target: string | null;
    setActiveSet: (setId: string) => void;
    setPopoverState: (val: any) => void;
    setCommandPreview: (val: string | null) => void;
}

export const JoystickCluster: React.FC<JoystickClusterProps> = ({
    uiPositions, isEditMode, dragState, handleDragStart, joystick, joystickGlow, btnGlow,
    setJoystickGlow, setBtnGlow, executeCommand, triggerHaptic, heldButton, setHeldButton,
    buttons, target, setActiveSet, setPopoverState, setCommandPreview
}) => {
    const { viewport } = useGame();
    const { isMobile, isLandscape } = viewport;
    const pos = uiPositions.joystick || {};
    const isDefault = pos.x === undefined && pos.y === undefined;

    return (
        <div
            className="joystick-cluster"
            style={{
                left: pos.x ?? '20px',
                top: pos.y,
                bottom: isDefault ? '20px' : (pos.y === undefined ? '20px' : 'auto'),
                width: '180px',
                height: '180px',
                transform: (isDefault) ? (pos.scale ? `scale(${pos.scale})` : '') : `${pos.y !== undefined ? '' : 'translateY(-50%)'} ${pos.scale ? `scale(${pos.scale})` : ''}`,
                transformOrigin: 'bottom left',
                zIndex: 1500,
                position: 'absolute',
                pointerEvents: 'auto',
                cursor: isEditMode ? 'move' : undefined,
                backgroundColor: isEditMode ? 'rgba(255,255,0,0.1)' : undefined,
                border: (isEditMode && dragState?.id === 'joystick') ? '2px dashed #ffff00' : (isEditMode ? '1px dashed rgba(255,255,0,0.3)' : undefined),
                borderRadius: '50%',
                boxShadow: (isEditMode && dragState?.id === 'joystick') ? '0 0 30px rgba(255,255,0,0.4)' : undefined
            }}
            onPointerDown={(e) => {
                if (isEditMode) handleDragStart(e, 'joystick', 'cluster');
                else if (e.cancelable) e.preventDefault();
            }}
        >

            <Joystick
                joystickKnobRef={joystick.joystickKnobRef}
                joystickGlow={joystickGlow}
                btnGlow={btnGlow}
                onJoystickStart={joystick.handleJoystickStart}
                onJoystickMove={joystick.handleJoystickMove}
                onJoystickEnd={(e) => {
                    const isCenterTap = joystick.handleJoystickEnd(e, executeCommand, triggerHaptic, setJoystickGlow, !!heldButton);
                    if (isCenterTap && heldButton?.dx !== undefined) {
                        const button = buttons.find(b => b.id === heldButton.id);
                        if (button) {
                            const result = getButtonCommand(button, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, target, true);
                            if (result) {
                                if (result.actionType === 'nav') setActiveSet(result.cmd);
                                else if (['assign', 'menu', 'select-assign'].includes(result.actionType || '')) {
                                    setPopoverState({ x: window.innerWidth / 2, y: window.innerHeight / 2, setId: result.cmd, context: result.modifiers || button.label, assignSourceId: button.id, executeAndAssign: result.actionType === 'select-assign' });
                                } else executeCommand(result.cmd);
                                setHeldButton(null); setCommandPreview(null); triggerHaptic(50);
                            }
                        }
                    }
                }}
                onNavStart={joystick.handleNavStart}
                onNavEnd={(dir) => joystick.handleNavEnd(dir, executeCommand, triggerHaptic, setBtnGlow)}
                isTargetModifierActive={joystick.isTargetModifierActive}
            />
        </div>
    );
};
