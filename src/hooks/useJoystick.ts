import React, { useState, useRef, useCallback } from 'react';
import { Direction } from '../types';

interface JoystickProps {
    executeCommand: (cmd: string) => void;
    triggerHaptic: (duration: number) => void;
    setJoystickGlow: (glow: boolean) => void;
}

export const useJoystick = () => {
    const [joystickActive, setJoystickActive] = useState(false);
    const joystickKnobRef = useRef<HTMLDivElement>(null);
    const joystickStartPos = useRef<{ x: number, y: number } | null>(null);

    const handleJoystickStart = useCallback((e: React.PointerEvent) => {
        setJoystickActive(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        joystickStartPos.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }, []);

    const handleJoystickMove = useCallback((e: React.PointerEvent) => {
        if (!joystickActive || !joystickStartPos.current || !joystickKnobRef.current) return;
        const dx = e.clientX - joystickStartPos.current.x, dy = e.clientY - joystickStartPos.current.y, maxDist = 50;
        const tiltX = -(dy / maxDist) * 25, tiltY = (dx / maxDist) * 25, transX = (dx / maxDist) * 15, transY = (dy / maxDist) * 15;
        joystickKnobRef.current.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${transX}px, ${transY}px, 0)`;
    }, [joystickActive]);

    const handleJoystickEnd = useCallback((e: React.PointerEvent, executeCommand: (cmd: string) => void, triggerHaptic: (duration?: number) => void, setJoystickGlow: (g: boolean) => void) => {
        if (!joystickActive || !joystickStartPos.current) return;
        setJoystickActive(false);
        const dx = e.clientX - joystickStartPos.current.x, dy = e.clientY - joystickStartPos.current.y, dist = Math.sqrt(dx * dx + dy * dy);

        if (joystickKnobRef.current) {
            joystickKnobRef.current.classList.add('resetting');
            joystickKnobRef.current.style.transform = '';
            setTimeout(() => { if (joystickKnobRef.current) joystickKnobRef.current.classList.remove('resetting'); }, 500);
        }

        if (dist < 10) {
            executeCommand('look');
            triggerHaptic(10);
        } else {
            let angle = Math.atan2(dy, dx) * (180 / Math.PI); if (angle < 0) angle += 360;
            let dir: Direction = 'n';
            if (angle >= 337.5 || angle < 22.5) dir = 'e'; else if (angle >= 22.5 && angle < 67.5) dir = 'se';
            else if (angle >= 67.5 && angle < 112.5) dir = 's'; else if (angle >= 112.5 && angle < 157.5) dir = 'sw';
            else if (angle >= 157.5 && angle < 202.5) dir = 'w'; else if (angle >= 202.5 && angle < 247.5) dir = 'nw';
            else if (angle >= 247.5 && angle < 292.5) dir = 'n'; else if (angle >= 292.5 && angle < 337.5) dir = 'ne';

            executeCommand(dir);
            triggerHaptic(40);
            setJoystickGlow(true);
            setTimeout(() => setJoystickGlow(false), 300);
        }
        joystickStartPos.current = null;
    }, [joystickActive]);

    return {
        joystickActive,
        joystickKnobRef,
        handleJoystickStart,
        handleJoystickMove,
        handleJoystickEnd
    };
};
