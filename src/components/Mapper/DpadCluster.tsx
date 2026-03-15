import React, { useCallback } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import './DpadCluster.css';
import { TrackpadSwipeWheel } from './TrackpadSwipeWheel';
import { getButtonCommand } from '../../utils/buttonUtils';

interface DpadClusterProps {
    heldButton?: any;
    setHeldButton?: (val: any) => void;
}

export const DpadCluster: React.FC<DpadClusterProps> = ({
    heldButton, setHeldButton
}) => {
    const {
        executeCommand, triggerHaptic, joystick, btn
    } = useGame();
    const { target } = useVitals();
    
    const {
        handleJoystickStart,
        handleJoystickMove,
        handleJoystickEnd,
        currentDir
    } = joystick || {};

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        if (handleJoystickStart) handleJoystickStart(e, executeCommand);
    }, [handleJoystickStart, executeCommand]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        if (!handleJoystickMove) return;
        const dir = handleJoystickMove(e, executeCommand, !!heldButton);

        if (dir && heldButton && !heldButton.didFire && setHeldButton) {
            const button = btn.buttons.find((b: any) => b.id === heldButton.id);
            if (button) {
                const result = getButtonCommand(button, heldButton.dx || 0, heldButton.dy || 0, undefined, undefined, heldButton.modifiers, { currentDir: dir, isTargetModifierActive: !!joystick.isTargetModifierActive }, target, true);
                if (result) {
                    executeCommand(result.cmd);
                    setHeldButton((prev: any) => prev ? { ...prev, didFire: true } : null);
                    triggerHaptic(60);
                }
            }
        }
    }, [handleJoystickMove, executeCommand, heldButton, setHeldButton, btn.buttons, target, triggerHaptic, joystick.isTargetModifierActive]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        e.stopPropagation();
        if (handleJoystickEnd) {
            handleJoystickEnd(e, executeCommand, triggerHaptic);
        }
    }, [handleJoystickEnd, executeCommand, triggerHaptic]);

    return (
        <div 
            className="dpad-container-with-sidebar"
            style={{ pointerEvents: 'auto' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={joystick.handleJoystickCancel}
        >
            <TrackpadSwipeWheel 
                active={joystick.joystickActive} 
                currentDir={currentDir || null} 
            />
        </div>
    );
};
