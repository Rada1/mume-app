import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface JoystickProps {
    joystickKnobRef: React.RefObject<HTMLDivElement | null>;
    joystickGlow: boolean;
    btnGlow: { up: boolean; down: boolean };
    onJoystickStart: (e: React.PointerEvent) => void;
    onJoystickMove: (e: React.PointerEvent) => void;
    onJoystickEnd: (e: React.PointerEvent) => void;
    onNavClick: (dir: 'up' | 'down') => void;
}

const Joystick: React.FC<JoystickProps> = ({
    joystickKnobRef,
    joystickGlow,
    btnGlow,
    onJoystickStart,
    onJoystickMove,
    onJoystickEnd,
    onNavClick
}) => {
    return (
        <div className="cluster-row">
            <div className="nav-buttons-col">
                <div
                    className={`nav-btn ${btnGlow.up ? 'glow-active' : ''}`}
                    onClick={() => onNavClick('up')}
                >
                    <ArrowUp size={24} />
                </div>
                <div
                    className={`nav-btn ${btnGlow.down ? 'glow-active' : ''}`}
                    onClick={() => onNavClick('down')}
                >
                    <ArrowDown size={24} />
                </div>
            </div>

            <div
                className="joystick-container"
                onPointerDown={onJoystickStart}
                onPointerMove={onJoystickMove}
                onPointerUp={onJoystickEnd}
                onPointerCancel={onJoystickEnd}
            >
                <div className="joystick-base">
                    <div
                        ref={joystickKnobRef}
                        className={`joystick-knob ${joystickGlow ? 'active-glow' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default Joystick;
