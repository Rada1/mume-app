import React, { useState, useRef, useCallback } from 'react';
import { Direction } from '../types';

interface JoystickProps {
    executeCommand: (cmd: string) => void;
    triggerHaptic: (duration: number) => void;
    setJoystickGlow: (glow: boolean) => void;
}

export const useJoystick = (triggerHaptic: (ms: number) => void) => {
    const [joystickActive, setJoystickActive] = useState(false);
    const [currentDir, setCurrentDir] = useState<Direction | null>(null);
    const [isJoystickConsumed, setIsJoystickConsumed] = useState(false);
    const [isTargetModifierActive, setIsTargetModifierActive] = useState(false);
    const joystickKnobRef = useRef<HTMLDivElement>(null);
    const joystickStartPos = useRef<{ x: number, y: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const lastHapticDirRef = useRef<Direction | null>(null);

    const handleJoystickStart = useCallback((e: React.PointerEvent) => {
        if (e.cancelable) e.preventDefault();
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

        // Snap visual knob to 8 directions
        const angleRad = Math.atan2(dy, dx);
        const snappedAngle = Math.round(angleRad / (Math.PI / 4)) * (Math.PI / 4);

        // Only snap if we are far enough from center to care about direction
        if (dist > 10) {
            dx = Math.cos(snappedAngle) * dist;
            dy = Math.sin(snappedAngle) * dist;
        }

        const maxDist = 60;
        const tiltX = -(dy / maxDist) * 20, tiltY = (dx / maxDist) * 20, transX = (dx / maxDist) * 20, transY = (dy / maxDist) * 20;
        joystickKnobRef.current.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translate3d(${transX}px, ${transY}px, 0)`;

        // Update CSS variables for perimeter highlighting
        const container = joystickKnobRef.current.closest('.joystick-container') as HTMLElement;
        if (container) {
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);
            container.style.setProperty('--joy-angle', `${angle}deg`);
            container.style.setProperty('--joy-dist', `${Math.min(1, dist / maxDist)}`);
        }

        // Update current direction state (8-way mapping)
        if (dist < 30) {
            setCurrentDir(null);
            if (lastHapticDirRef.current !== null) {
                triggerHaptic(2);
                lastHapticDirRef.current = null;
            }
        } else {
            let angle = Math.atan2(dy, dx) * (180 / Math.PI); if (angle < 0) angle += 360;

            let dir: any = null;
            if (angle >= 337.5 || angle < 22.5) dir = 'e';
            else if (angle >= 22.5 && angle < 67.5) dir = 'down'; // SE -> down
            else if (angle >= 67.5 && angle < 112.5) dir = 's';
            else if (angle >= 112.5 && angle < 157.5) dir = null; // SW -> unmapped
            else if (angle >= 157.5 && angle < 202.5) dir = 'w';
            else if (angle >= 202.5 && angle < 247.5) dir = 'up'; // NW -> up
            else if (angle >= 247.5 && angle < 292.5) dir = 'n';
            else if (angle >= 292.5 && angle < 337.5) dir = null; // NE -> unmapped

            if (dir !== lastHapticDirRef.current) {
                if (dir !== null) triggerHaptic(5); // Tick when entering a valid direction
                lastHapticDirRef.current = dir;
            }

            setCurrentDir(dir);
        }
    }, [joystickActive, isTargetModifierActive, triggerHaptic]);

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
        lastHapticDirRef.current = null;

        const dxOriginal = e.clientX - joystickStartPos.current.x, dyOriginal = e.clientY - joystickStartPos.current.y;
        const dist = Math.sqrt(dxOriginal * dxOriginal + dyOriginal * dyOriginal);

        if (joystickKnobRef.current) {
            joystickKnobRef.current.classList.add('resetting');
            joystickKnobRef.current.style.transform = '';

            const container = joystickKnobRef.current.closest('.joystick-container') as HTMLElement;
            if (container) {
                container.style.setProperty('--joy-dist', '0');
            }

            setTimeout(() => { if (joystickKnobRef.current) joystickKnobRef.current.classList.remove('resetting'); }, 500);
        }

        // Only execute command if NOT consumed by another button
        if (!wasConsumed) {
            // Hard blur any active inputs to prevent accidental keyboard activation on mobile
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                (document.activeElement as HTMLElement)?.blur();
            }

            if (dist < 30) {
                if (e.cancelable) e.preventDefault();
                if (!suppressDefault) executeCommand('look');
                triggerHaptic(10);
                joystickStartPos.current = null;
                return true; // Center tap
            } else {
                let angle = Math.atan2(dyOriginal, dxOriginal) * (180 / Math.PI); if (angle < 0) angle += 360;

                let cmd: string | null = null;
                if (angle >= 337.5 || angle < 22.5) cmd = 'east';
                else if (angle >= 22.5 && angle < 67.5) cmd = 'down'; // SE -> down
                else if (angle >= 67.5 && angle < 112.5) cmd = 'south';
                else if (angle >= 112.5 && angle < 157.5) cmd = null; // SW -> unmapped
                else if (angle >= 157.5 && angle < 202.5) cmd = 'west';
                else if (angle >= 202.5 && angle < 247.5) cmd = 'up'; // NW -> up
                else if (angle >= 247.5 && angle < 292.5) cmd = 'north';
                else if (angle >= 292.5 && angle < 337.5) cmd = null; // NE -> unmapped

                if (cmd) {
                    executeCommand(cmd);
                    // triggerHaptic(40); // Removed as per user request
                    setJoystickGlow(true);
                    setTimeout(() => setJoystickGlow(false), 300);
                }
            }
        }

        joystickStartPos.current = null;
        return false;
    }, [joystickActive, isJoystickConsumed, isTargetModifierActive]);

    const handleNavStart = useCallback((dir: 'up' | 'down', e: React.PointerEvent) => {
        if (e.cancelable) e.preventDefault();
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        setCurrentDir(dir === 'up' ? 'u' : 'd');
    }, []);

    const handleNavEnd = useCallback((dir: 'up' | 'down', executeCommand: (cmd: string) => void, triggerHaptic: (duration?: number) => void, setBtnGlow: React.Dispatch<React.SetStateAction<{ up: boolean, down: boolean }>>) => {
        const wasConsumed = isJoystickConsumed;
        setCurrentDir(null);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);

        // Prevent focuses
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            (document.activeElement as HTMLElement)?.blur();
        }

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
