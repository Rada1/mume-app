import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Direction } from '../types';

export const useJoystick = (triggerHaptic: (ms: number) => void, availableExits: string[] = []) => {
    const [joystickActive, setJoystickActive] = useState(false);
    const [currentDir, setCurrentDir] = useState<Direction | null>(null);
    const [isJoystickConsumed, setIsJoystickConsumed] = useState(false);
    const [isTargetModifierActive, setIsTargetModifierActive] = useState(false);
    const [swipeRay, setSwipeRay] = useState<{ active: boolean, angle: number, dist: number, x?: number, y?: number }>({ active: false, angle: 0, dist: 0 });
    const [joystickGlow, setJoystickGlow] = useState(false);

    const joystickKnobRef = useRef<HTMLDivElement>(null);
    const joystickStartPos = useRef<{ x: number, y: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const lastHapticDirRef = useRef<Direction | null>(null);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const lockedDirRef = useRef<Direction | null>(null);

    // Command Execution Ref
    const executeCommandRef = useRef<((cmd: string) => void) | null>(null);

    const handleJoystickStart = useCallback((e: React.PointerEvent, executeCommand?: (cmd: string) => void) => {
        if (executeCommand) executeCommandRef.current = executeCommand;
        setJoystickActive(true);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        e.currentTarget.setPointerCapture(e.pointerId);

        // For trackpad, calculation start position is where the finger touched
        const startX = e.clientX;
        const startY = e.clientY;
        
        joystickStartPos.current = { x: startX, y: startY };
        touchStartPos.current = { x: startX, y: startY };

        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            setIsTargetModifierActive(true);
        }, 500);

        lockedDirRef.current = null;

        // Visuals (ray/wheel) should appear centered on the map/container
        // We'll set x/y to undefined or center values and let CSS/Component handle centering
        setSwipeRay({ 
            active: false, 
            angle: 0, 
            dist: 0,
            x: undefined, // Indicates center-aligned in Component
            y: undefined
        });
    }, []);

    const handleJoystickMove = useCallback((e: React.PointerEvent, executeCommand?: (cmd: string) => void, suppressMove?: boolean) => {
        if (executeCommand) executeCommandRef.current = executeCommand;
        if (!joystickActive || !joystickStartPos.current) return null;
        const dx = e.clientX - joystickStartPos.current.x;
        const dy = e.clientY - joystickStartPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const angleRad = Math.atan2(dy, dx);
        let angleDeg = angleRad * (180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        let calculatedDir: Direction | null = null;
        if (angleDeg >= 337.5 || angleDeg < 22.5) calculatedDir = 'e';
        else if (angleDeg >= 22.5 && angleDeg < 67.5) calculatedDir = 'se';
        else if (angleDeg >= 67.5 && angleDeg < 112.5) calculatedDir = 's';
        else if (angleDeg >= 112.5 && angleDeg < 157.5) calculatedDir = 'sw';
        else if (angleDeg >= 157.5 && angleDeg < 202.5) calculatedDir = 'w';
        else if (angleDeg >= 202.5 && angleDeg < 247.5) calculatedDir = 'nw';
        else if (angleDeg >= 247.5 && angleDeg < 292.5) calculatedDir = 'n';
        else if (angleDeg >= 292.5 && angleDeg < 337.5) calculatedDir = 'ne';

        // Adaptive Threshold Logic
        let threshold = 25;
        if (calculatedDir === 'nw' && !availableExits.includes('u')) threshold = 60;
        else if (calculatedDir === 'se' && !availableExits.includes('d')) threshold = 60;

        if (dist > threshold && longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // Update Swipe Ray
        if (dist > threshold) {
            const snappedAngle = Math.round(angleDeg / 45) * 45;
            setSwipeRay(prev => ({ ...prev, active: true, angle: snappedAngle + 90, dist: Math.min(dist, 100) }));
        } else {
            setSwipeRay(prev => prev.active ? { ...prev, active: false } : prev);
        }

        // Visual Enhancement (Minimal for centered trackpad)
        if (joystickKnobRef.current && dist > 5) {
            const maxDist = 75;
            const tiltX = -(dy / maxDist) * 10, tiltY = (dx / maxDist) * 10;
            joystickKnobRef.current.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }

        let dir: Direction | null = null;

        // Direction Logic
        if (dist < threshold) {
            setCurrentDir(null);
            lockedDirRef.current = null;
            if (lastHapticDirRef.current !== null) {
                // Removed center-return haptic
                lastHapticDirRef.current = null;
            }
        } else {
            // Direction Logic with Even 45° Wedges
            dir = calculatedDir;
            // ... (rest of hysteresis logic is fine)
            // Note: We'll simplify the calculated logic below to match original structure

            // Angular Stability & Hysteresis
            const HYSTERESIS = 10;
            if (dist <= 45) {
                // Directional Lock (15px to 45px)
                if (lockedDirRef.current) {
                    dir = lockedDirRef.current;
                } else {
                    dir = calculatedDir;
                    lockedDirRef.current = calculatedDir;
                }
            } else {
                // Free Rotation (dist > 45px) with Hysteresis
                if (lockedDirRef.current && calculatedDir !== lockedDirRef.current) {
                    const lastDir = lockedDirRef.current;
                    let shouldSwitch = false;
                    
                    const isOutside = (d: Direction, a: number) => {
                        const buffer = HYSTERESIS;
                        // 45° wedges: check if angle is +/- (22.5 + buffer) from center
                        if (d === 'e') return (a > 22.5 + buffer && a < 337.5 - buffer);
                        if (d === 'se') return (a < 22.5 - buffer || a > 67.5 + buffer);
                        if (d === 's') return (a < 67.5 - buffer || a > 112.5 + buffer);
                        if (d === 'sw') return (a < 112.5 - buffer || a > 157.5 + buffer);
                        if (d === 'w') return (a < 157.5 - buffer || a > 202.5 + buffer);
                        if (d === 'nw') return (a < 202.5 - buffer || a > 247.5 + buffer);
                        if (d === 'n') return (a < 247.5 - buffer || a > 292.5 + buffer);
                        if (d === 'ne') return (a < 292.5 - buffer || a > 337.5 + buffer);
                        return true;
                    };

                    if (isOutside(lastDir, angleDeg)) {
                        shouldSwitch = true;
                    }

                    if (shouldSwitch) {
                        dir = calculatedDir;
                        lockedDirRef.current = calculatedDir;
                    } else {
                        dir = lastDir;
                    }
                } else {
                    dir = calculatedDir;
                    lockedDirRef.current = calculatedDir;
                }
            }

            if (dir !== lastHapticDirRef.current) {
                if (dir !== null) triggerHaptic(5);
                lastHapticDirRef.current = dir;
            }
            setCurrentDir(dir);

            if (suppressMove && dir && !isJoystickConsumed) {
                setIsJoystickConsumed(true);
            }
        }
        return dir;
    }, [joystickActive, isJoystickConsumed, triggerHaptic]);

    const handleJoystickEnd = useCallback((e: React.PointerEvent, executeCommand: (cmd: string) => void, triggerHaptic: (duration?: number) => void, suppressDefault?: boolean) => {
        executeCommandRef.current = executeCommand;

        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (!joystickActive || !joystickStartPos.current) return false;

        const wasConsumed = isJoystickConsumed || isTargetModifierActive;
        const initialDir = currentDir;

        setJoystickActive(false);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        setCurrentDir(null);
        setSwipeRay({ active: false, angle: 0, dist: 0 });
        lastHapticDirRef.current = null;
        lockedDirRef.current = null;

        const dxOriginal = e.clientX - joystickStartPos.current.x, dyOriginal = e.clientY - joystickStartPos.current.y;
        const dist = Math.sqrt(dxOriginal * dxOriginal + dyOriginal * dyOriginal);

        joystickStartPos.current = null;
        const touchDX = touchStartPos.current ? (e.clientX - touchStartPos.current.x) : 0;
        const touchDY = touchStartPos.current ? (e.clientY - touchStartPos.current.y) : 0;
        const displacement = Math.sqrt(touchDX * touchDX + touchDY * touchDY);

        if (joystickKnobRef.current) {
            joystickKnobRef.current.classList.add('resetting');
            joystickKnobRef.current.style.transform = '';
            setTimeout(() => { if (joystickKnobRef.current) joystickKnobRef.current.classList.remove('resetting'); }, 500);
        }

        if (suppressDefault) {
             const isCenterTap = displacement < 20 && dist < 20;
             return { isCenterTap, dir: initialDir || null };
        }

        if (!wasConsumed) {
            // Tap to Look
            if (displacement < 20 && dist < 20) {
                executeCommand('look');
                // Removed release haptic for lookout/tap
                return true;
            }
            
            // Execute Move on Release
            let threshold = 25;
            if (initialDir === 'nw' && !availableExits.includes('u')) threshold = 60;
            else if (initialDir === 'se' && !availableExits.includes('d')) threshold = 60;

            if (dist >= threshold && initialDir) {
                const dirMap: Record<string, string> = {
                    n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down',
                    ne: 'northeast', nw: 'up', se: 'down', sw: 'southwest'
                };
                executeCommand(dirMap[initialDir] || initialDir);
                // Removed release haptic for move
                setJoystickGlow(true);
                setTimeout(() => setJoystickGlow(false), 300);
                return true;
            }
        }

        return false;
    }, [joystickActive, isJoystickConsumed, isTargetModifierActive, currentDir, triggerHaptic]);

    const handleNavStart = useCallback((dir: 'up' | 'down', e: React.PointerEvent) => {
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

    const handleJoystickCancel = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setJoystickActive(false);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        setCurrentDir(null);
        setSwipeRay({ active: false, angle: 0, dist: 0 });
        lastHapticDirRef.current = null;
        lockedDirRef.current = null;
        joystickStartPos.current = null;
        touchStartPos.current = null;
        if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform = '';
        }
    }, []);

    return {
        joystickActive,
        currentDir,
        setCurrentDir,
        isJoystickConsumed,
        setIsJoystickConsumed,
        isTargetModifierActive,
        setIsTargetModifierActive,
        swipeRay,
        joystickGlow,
        setJoystickGlow,
        joystickKnobRef,
        handleJoystickStart,
        handleJoystickMove,
        handleJoystickEnd,
        handleJoystickCancel,
        handleNavStart,
        handleNavEnd
    };
};
