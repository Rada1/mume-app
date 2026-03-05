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
                onPointerDown={(e) => {
                    if (e.cancelable) e.preventDefault();
                    onJoystickStart(e);
                }}
                onPointerMove={onJoystickMove}
                onPointerUp={(e) => {
                    if (e.cancelable) e.preventDefault();
                    onJoystickEnd(e);
                }}
                onPointerCancel={onJoystickEnd}
            >
                <div className="joystick-base">
                    <div className="joystick-base-highlight" />

                    {/* Compass Rose Indicator */}
                    <svg className="joystick-compass" viewBox="0 0 100 100">
                        <text x="50" y="16" textAnchor="middle" className="joy-label cardinal">N</text>
                        <text x="50" y="88" textAnchor="middle" className="joy-label cardinal">S</text>
                        <text x="88" y="54" textAnchor="middle" className="joy-label cardinal">E</text>
                        <text x="12" y="54" textAnchor="middle" className="joy-label cardinal">W</text>

                        {/* Vertical Indicators */}
                        <g className="joy-label vertical" style={{ fontWeight: 900 }}>
                            {/* NW -> Up */}
                            <text x="24" y="34" textAnchor="middle">U</text>
                            <path d="M 17,24 L 24,17 L 31,24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />

                            {/* SE -> Down */}
                            <text x="76" y="66" textAnchor="middle">D</text>
                            <path d="M 69,76 L 76,83 L 83,76" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                        </g>
                    </svg>

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
