import React, { useCallback } from 'react';
import { useGame, useVitals } from '../../context/GameContext';
import { ExecuteCommand } from '../../types';

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
        executeCommand, triggerHaptic, joystick, btn, isTrackpadModifierActive, playClickSound
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
                const result = getButtonCommand(button, heldButton.dx || 0, heldButton.dy || 0, undefined, undefined, heldButton.modifiers, { currentDir: dir, isTargetModifierActive: !!joystick.isTargetModifierActive }, target, true, heldButton.commandPrefixes || []);
                if (result) {
                    executeCommand(result.cmd, false, false, false, false, { fromUi: true });
                    if (playClickSound) playClickSound();
                    setHeldButton((prev: any) => prev ? { ...prev, lastTargetFireAt: Date.now() } : null);
                    triggerHaptic(60);
                }
            }
        }
    }, [handleJoystickMove, executeCommand, heldButton, setHeldButton, btn.buttons, target, triggerHaptic, joystick.isTargetModifierActive]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (handleJoystickEnd) {
            handleJoystickEnd(e, (cmd: string) => executeCommand(cmd, false, false, false, false, { fromUi: true }), triggerHaptic);
        }
    }, [handleJoystickEnd, executeCommand, triggerHaptic]);

    return (
        <div 
            className="dpad-container-with-sidebar"
            style={{ pointerEvents: 'none' }}
        >
            <TrackpadSwipeWheel 
                active={joystick.joystickActive && !joystick.isSwipeWheelHidden} 
                currentDir={currentDir || null} 
                isModifierActive={isTrackpadModifierActive}
            />
        </div>
    );
};
