import React from 'react';
import { useGame } from '../../context/GameContext';

import './DpadCluster.css';
import { TrackpadSwipeWheel } from './TrackpadSwipeWheel';

interface DpadClusterProps {
    heldButton?: any;
    setHeldButton?: (val: any) => void;
}

export const DpadCluster: React.FC<DpadClusterProps> = () => {
    const { joystick, isTrackpadModifierActive } = useGame();

    // While a directional swipe gesture is active, let the atmosphere overlays step aside
    // (see environment.css) so the swipe wheel and map stay responsive in immersion mode.
    React.useEffect(() => {
        document.body.classList.toggle('ui-gesturing', !!joystick?.joystickActive);
        return () => { document.body.classList.remove('ui-gesturing'); };
    }, [joystick?.joystickActive]);

    return (
        <div 
            className="dpad-container-with-sidebar"
            style={{ pointerEvents: 'none' }}
        >
            <TrackpadSwipeWheel
                active={joystick.joystickActive && !joystick.isSwipeWheelHidden && !joystick.isTargetModifierActive}
                currentDir={joystick.currentDir || null}
                isModifierActive={isTrackpadModifierActive}
            />
        </div>
    );
};
