import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface JoystickProps {
    joystickKnobRef: React.RefObject<HTMLDivElement | null>;
    joystickGlow: boolean;
    btnGlow: { up: boolean; down: boolean };
    onJoystickStart: (e: React.PointerEvent) => void;
    onJoystickMove: (e: React.PointerEvent) => void;
    onJoystickEnd: (e: React.PointerEvent) => void;
    onNavStart: (dir: 'up' | 'down', e: React.PointerEvent) => void;
    onNavEnd: (dir: 'up' | 'down') => void;
    isTargetModifierActive?: boolean;
}

const Joystick: React.FC<JoystickProps> = ({
    joystickKnobRef,
    joystickGlow,
    btnGlow,
    onJoystickStart,
    onJoystickMove,
    onJoystickEnd,
    onNavStart,
    onNavEnd,
    isTargetModifierActive
}) => {
    return (
        <div className="cluster-row" onPointerDown={(e) => e.preventDefault()}>
            <div className="nav-buttons-col">
                <div
                    className={`nav-btn ${btnGlow.up ? 'glow-active' : ''}`}
                    onPointerDown={(e) => {
                        if (e.cancelable) e.preventDefault();
                        onNavStart('up', e);
                    }}
                    onPointerUp={() => onNavEnd('up')}
                    onPointerCancel={() => onNavEnd('up')}
                >
                    <ArrowUp size={24} />
                </div>
                <div
                    className={`nav-btn ${btnGlow.down ? 'glow-active' : ''}`}
                    onPointerDown={(e) => {
                        if (e.cancelable) e.preventDefault();
                        onNavStart('down', e);
                    }}
                    onPointerUp={() => onNavEnd('down')}
                    onPointerCancel={() => onNavEnd('down')}
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
                    <div className="joystick-base-highlight" />
                    <div
                        ref={joystickKnobRef}
                        className={`joystick-knob ${joystickGlow ? 'active-glow' : ''} ${isTargetModifierActive ? 'target-active' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default React.memo(Joystick);
