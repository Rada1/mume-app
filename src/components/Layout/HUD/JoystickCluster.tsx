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
            id="cluster-joystick"
            className="joystick-cluster"
            style={{
                left: pos.x ?? (isLandscape ? '40px' : '20px'),
                right: 'auto',
                top: pos.y,
                bottom: isDefault ? (isLandscape ? '20px' : '50px') : (pos.y === undefined ? '50px' : 'auto'),
                width: '180px',
                height: '180px',
                transform: (isDefault) ? (pos.scale ? `scale(${pos.scale})` : '') : `${pos.y !== undefined ? '' : 'translateY(-50%)'} ${pos.scale ? `scale(${pos.scale})` : ''}`,
                transformOrigin: 'bottom left',
                zIndex: 1500,
                position: 'absolute',
                pointerEvents: 'auto',
                cursor: isEditMode ? 'default' : undefined,
                backgroundColor: isEditMode ? 'rgba(255,255,0,0.05)' : undefined,
                border: isEditMode ? '1px dashed rgba(255,255,0,0.15)' : undefined,
                borderRadius: '50%',
                opacity: 1
            }}
            onPointerDown={(e) => {
                if (!isEditMode && e.cancelable) e.preventDefault();
            }}
        >

            <Joystick
                joystickKnobRef={joystick.joystickKnobRef}
                joystickGlow={joystickGlow}
                btnGlow={btnGlow}
                onJoystickStart={joystick.handleJoystickStart}
                onJoystickMove={joystick.handleJoystickMove}
                onJoystickEnd={(e) => {
                    const resultData = joystick.handleJoystickEnd(e, executeCommand, triggerHaptic, setJoystickGlow, !!heldButton);
                    const isCenterTap = resultData === true || resultData?.isCenterTap;

                    if (heldButton?.dx !== undefined) {
                        const button = buttons.find(b => b.id === heldButton.id);
                        if (button) {
                            let comboDir = resultData?.dir;
                            if (isCenterTap) comboDir = null; // center tap means no direction, use default

                            const result = getButtonCommand(button, heldButton.dx, heldButton.dy, undefined, undefined, heldButton.modifiers, joystick, target, true);
                            if (result && (isCenterTap || comboDir)) {
                                if (result.actionType === 'nav' && !comboDir) setActiveSet(result.cmd);
                                else if (['assign', 'menu', 'select-assign'].includes(result.actionType || '') && !comboDir) {
                                    const isDial = button.menuDisplay === 'dial';
                                    const initialX = heldButton.initialX ?? window.innerWidth / 2;
                                    const initialY = heldButton.initialY ?? window.innerHeight * 0.8;
                                    const fingerX = (heldButton.initialX || 0) + (heldButton.dx || 0);
                                    const fingerY = (heldButton.initialY || 0) + (heldButton.dy || 0);

                                    setPopoverState({
                                        x: isDial ? window.innerWidth / 2 : fingerX,
                                        y: isDial ? window.innerHeight / 2 : fingerY,
                                        setId: result.cmd,
                                        context: result.modifiers || button.label,
                                        assignSourceId: (result.actionType === 'assign' || result.actionType === 'select-assign') ? button.id : undefined,
                                        executeAndAssign: result.actionType === 'select-assign',
                                        menuDisplay: button.menuDisplay,
                                        initialPointerX: isDial ? initialX : undefined,
                                        initialPointerY: isDial ? initialY : undefined
                                    });
                                } else {
                                    const dirMap: Record<string, string> = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down' };
                                    const finalCmd = comboDir ? `${result.cmd} ${dirMap[comboDir] || comboDir}` : result.cmd;
                                    executeCommand(finalCmd);
                                }
                                setHeldButton(prev => prev ? { ...prev, didFire: true } : null);
                                setCommandPreview(null);
                                triggerHaptic(60);
                            }
                        }
                    }
                }}
                onNavStart={joystick.handleNavStart}
                onNavEnd={(dir) => joystick.handleNavEnd(dir, executeCommand, triggerHaptic, setBtnGlow)}
                onDiagonalTap={(dir) => {
                    executeCommand(dir);
                    triggerHaptic(40);
                }}
                isTargetModifierActive={joystick.isTargetModifierActive}
            />
        </div>
    );
};
