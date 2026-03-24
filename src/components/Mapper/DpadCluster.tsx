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
        executeCommand, triggerHaptic, joystick, btn, isTrackpadModifierActive
    } = useGame();
    const { target } = useVitals();
    
    const {
        handleJoystickStart,
        handleJoystickMove,
        handleJoystickEnd,
        currentDir
    } = joystick || {};

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (handleJoystickStart) handleJoystickStart(e, executeCommand);
    }, [handleJoystickStart, executeCommand]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
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
        if (handleJoystickEnd) {
            handleJoystickEnd(e, executeCommand, triggerHaptic);
        }
    }, [handleJoystickEnd, executeCommand, triggerHaptic]);

    return (
        <div 
            className="dpad-container-with-sidebar"
            style={{ pointerEvents: 'none' }}
        >
            {/* We attach the gesture events specifically to a transparent interaction overlay
                that only consumes the first touch. However, the true fix here for a full
                screen joystick vs map is that DpadCluster shouldn't catch pointer events
                AT ALL initially. Instead, MapCanvas should receive the events, and if it's
                a single touch swipe, it can trigger the joystick logic.
                Wait, the DpadCluster is meant to be a full screen joystick. To let MapCanvas
                receive multi-touch, we can just remove pointer events from this container entirely
                and let useMapperInteractions handle joystick passing! */}
            <TrackpadSwipeWheel 
                active={joystick.joystickActive && !joystick.isSwipeWheelHidden} 
                currentDir={currentDir || null} 
                isModifierActive={isTrackpadModifierActive}
            />
        </div>
    );
};
