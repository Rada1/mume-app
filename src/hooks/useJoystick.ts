import React, { useState, useRef, useCallback } from 'react';
import { Direction } from '../types';

interface JoystickProps {
    executeCommand: (cmd: string) => void;
    triggerHaptic: (duration: number) => void;
    setJoystickGlow: (glow: boolean) => void;
}

export const useJoystick = () => {
    const [joystickActive, setJoystickActive] = useState(false);
    const [currentDir, setCurrentDir] = useState<Direction | null>(null);
    const [isJoystickConsumed, setIsJoystickConsumed] = useState(false);
    const [isTargetModifierActive, setIsTargetModifierActive] = useState(false);
    const joystickKnobRef = useRef<HTMLDivElement>(null);
    const joystickStartPos = useRef<{ x: number, y: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleJoystickStart = useCallback((e: React.PointerEvent) => {
        setJoystickActive(true);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        joystickStartPos.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

        // Start long press timer for target modifier
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            setIsTargetModifierActive(true);
            // Visual feedback could be added here
        }, 500);
    }, []);

    const handleJoystickMove = useCallback((e: React.PointerEvent) => {
        if (!joystickActive || !joystickStartPos.current || !joystickKnobRef.current) return;
        let dx = e.clientX - joystickStartPos.current.x;
        let dy = e.clientY - joystickStartPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If moved significantly, cancel target modifier long press
        if (dist > 15 && longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
            if (isTargetModifierActive) setIsTargetModifierActive(false);
        }

        // Snap visual knob to 4 directions
        if (Math.abs(dx) > Math.abs(dy)) {
            dy = 0;
        } else {
            dx = 0;
        }

        const maxDist = 50;
        const tiltX = -(dy / maxDist) * 25, tiltY = (dx / maxDist) * 25, transX = (dx / maxDist) * 15, transY = (dy / maxDist) * 15;
        joystickKnobRef.current.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${transX}px, ${transY}px, 0)`;

        // Update current direction state
        if (dist < 20) {
            setCurrentDir(null);
        } else {
            let angle = Math.atan2(dy, dx) * (180 / Math.PI); if (angle < 0) angle += 360;
            let dir: Direction = 'n';
            if (angle >= 315 || angle < 45) dir = 'e';
            else if (angle >= 45 && angle < 135) dir = 's';
            else if (angle >= 135 && angle < 225) dir = 'w';
            else dir = 'n';
            setCurrentDir(dir);
        }
    }, [joystickActive, isTargetModifierActive]);

    const handleJoystickEnd = useCallback((e: React.PointerEvent, executeCommand: (cmd: string) => void, triggerHaptic: (duration?: number) => void, setJoystickGlow: (g: boolean) => void, suppressDefault?: boolean) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (!joystickActive || !joystickStartPos.current) return;

        const wasConsumed = isJoystickConsumed || isTargetModifierActive;
        const wasTargetActive = isTargetModifierActive;

        setJoystickActive(false);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        setCurrentDir(null);

        const dx = e.clientX - joystickStartPos.current.x, dy = e.clientY - joystickStartPos.current.y, dist = Math.sqrt(dx * dx + dy * dy);

        if (joystickKnobRef.current) {
            joystickKnobRef.current.classList.add('resetting');
            joystickKnobRef.current.style.transform = '';
            setTimeout(() => { if (joystickKnobRef.current) joystickKnobRef.current.classList.remove('resetting'); }, 500);
        }

        // Only execute command if NOT consumed by another button
        if (!wasConsumed) {
            if (dist < 20) {
                if (!suppressDefault) executeCommand('look');
                triggerHaptic(10);
                joystickStartPos.current = null;
                return true; // Center tap
            } else {
                let angle = Math.atan2(dy, dx) * (180 / Math.PI); if (angle < 0) angle += 360;
                let dir: Direction = 'n';
                if (angle >= 315 || angle < 45) dir = 'e';
                else if (angle >= 45 && angle < 135) dir = 's';
                else if (angle >= 135 && angle < 225) dir = 'w';
                else dir = 'n';

                executeCommand(dir);
                triggerHaptic(40);
                setJoystickGlow(true);
                setTimeout(() => setJoystickGlow(false), 300);
            }
        }

        joystickStartPos.current = null;
        return false;
    }, [joystickActive, isJoystickConsumed, isTargetModifierActive]);

    const handleNavStart = useCallback((dir: 'up' | 'down') => {
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        setCurrentDir(dir === 'up' ? 'u' : 'd');
    }, []);

    const handleNavEnd = useCallback((dir: 'up' | 'down', executeCommand: (cmd: string) => void, triggerHaptic: (duration?: number) => void, setBtnGlow: React.Dispatch<React.SetStateAction<{ up: boolean, down: boolean }>>) => {
        const wasConsumed = isJoystickConsumed;
        setCurrentDir(null);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);

        if (!wasConsumed) {
            const cmd = dir === 'up' ? 'up' : 'down';
            executeCommand(cmd);
            triggerHaptic(20);
            setBtnGlow(prev => ({ ...prev, [dir]: true }));
            setTimeout(() => setBtnGlow(prev => ({ ...prev, [dir]: false })), 300);
        }
    }, [isJoystickConsumed]);

    return {
        joystickActive,
        currentDir,
        isJoystickConsumed,
        setIsJoystickConsumed,
        isTargetModifierActive,
        setIsTargetModifierActive,
        joystickKnobRef,
        handleJoystickStart,
        handleJoystickMove,
        handleJoystickEnd,
        handleNavStart,
        handleNavEnd
    };
};
