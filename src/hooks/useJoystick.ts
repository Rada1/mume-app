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
    const repeatMoveTimer = useRef<NodeJS.Timeout | null>(null);
    const lastRepeatDirRef = useRef<string | null>(null);
    const lastSentDirRef = useRef<Direction | null>(null);

    // Command Execution Ref
    const executeCommandRef = useRef<((cmd: string) => void) | null>(null);

    const dirMap: Record<string, string> = {
        n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down',
        ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest'
    };

    const REDIRECTION_MATRIX: Record<string, string[]> = {
        n: ['nw', 'ne'],
        s: ['sw', 'se'],
        e: ['ne', 'se'],
        w: ['nw', 'sw'],
        ne: ['n', 'e'],
        nw: ['w', 'n'],
        se: ['e', 's'],
        sw: ['s', 'w']
    };

    const stopRepeatTimer = useCallback(() => {
        if (repeatMoveTimer.current) {
            clearInterval(repeatMoveTimer.current);
            repeatMoveTimer.current = null;
        }
    }, []);

    const startRepeatTimer = useCallback((initialDir?: Direction) => {
        if (repeatMoveTimer.current) return;
        
        const firePulse = () => {
            const currentLockedDir = lockedDirRef.current;
            if (executeCommandRef.current && currentLockedDir) {
                const cmd = dirMap[currentLockedDir] || currentLockedDir;
                executeCommandRef.current(cmd);
                lastSentDirRef.current = currentLockedDir;
                setIsJoystickConsumed(true);
                triggerHaptic(10);
                
                // Dispatch both events to ensure map follows and knows joystick is active
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-center-on-player'));
                    window.dispatchEvent(new CustomEvent('mume-mapper-push-move', { detail: currentLockedDir }));
                }
            }
        };

        // Fire first pulse at the 0.5s mark
        firePulse();
        
        // Maintain strict 0.75s heartbeat
        repeatMoveTimer.current = setInterval(firePulse, 750);
    }, [triggerHaptic]);

    const handleJoystickStart = useCallback((e: React.PointerEvent, executeCommand?: (cmd: string) => void) => {
        if (executeCommand) executeCommandRef.current = executeCommand;
        setJoystickActive(true);
        setIsJoystickConsumed(false);
        setIsTargetModifierActive(false);
        e.currentTarget.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startY = e.clientY;
        
        joystickStartPos.current = { x: startX, y: startY };
        touchStartPos.current = { x: startX, y: startY };

        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            setIsTargetModifierActive(true);
            // Start pulsing if we have a direction. If not yet moved, 
            // the heartbeat will start as soon as handleJoystickMove locks a direction.
            if (lockedDirRef.current) startRepeatTimer();
        }, 500);

        lockedDirRef.current = null;
        setSwipeRay({ active: false, angle: 0, dist: 0, x: undefined, y: undefined });
    }, [startRepeatTimer]);

    const handleJoystickMove = useCallback((e: React.PointerEvent, executeCommand?: (cmd: string) => void, suppressMove?: boolean) => {
        if (executeCommand) executeCommandRef.current = executeCommand;
        if (!joystickActive || !joystickStartPos.current) return null;
        const dx = e.clientX - joystickStartPos.current.x;
        const dy = e.clientY - joystickStartPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const angleRad = Math.atan2(dy, dx);
        let angleDeg = angleRad * (180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        const lastDir = lockedDirRef.current;
        let dir: Direction | null = null;

        // 8 wedges of 45 degrees each
        if (angleDeg >= 337.5 || angleDeg < 22.5) dir = 'e';
        else if (angleDeg >= 22.5 && angleDeg < 67.5) dir = 'se';
        else if (angleDeg >= 67.5 && angleDeg < 112.5) dir = 's';
        else if (angleDeg >= 112.5 && angleDeg < 157.5) dir = 'sw';
        else if (angleDeg >= 157.5 && angleDeg < 202.5) dir = 'w';
        else if (angleDeg >= 202.5 && angleDeg < 247.5) dir = 'nw';
        else if (angleDeg >= 247.5 && angleDeg < 292.5) dir = 'n';
        else if (angleDeg >= 292.5 && angleDeg < 337.5) dir = 'ne';

        // --- Magnetic Steering Logic ---
        const mapToGameExit = (d: string) => {
            if (d === 'nw' && availableExits.includes('u')) return 'u';
            if (d === 'se' && availableExits.includes('d')) return 'd';
            return d;
        };

        const getMagneticDir = (intended: string): Direction | null => {
            const mapped = mapToGameExit(intended);
            const isMutedDiag = ['ne', 'sw'].includes(intended);
            
            // 1. Muted Zones (NE/SW) always try neighbors first to act as cardinal bridges.
            if (isMutedDiag) {
                const neighbors = REDIRECTION_MATRIX[intended] || [];
                const availableNeighbors = neighbors.filter(n => availableExits.includes(n));
                
                if (availableNeighbors.length > 0) {
                    if (availableNeighbors.length === 1) return availableNeighbors[0] as Direction;
                    if (lastSentDirRef.current) {
                        const change = availableNeighbors.find(n => n !== lastSentDirRef.current);
                        if (change) return change as Direction;
                    }
                    return availableNeighbors[0] as Direction;
                }
            }

            // 2. Exact match (Cardinals and unmuted NW/SE).
            if (availableExits.includes(mapped)) {
                // If it's a corner swipe, check if we should "Favor Change" to a cardinal neighbor.
                const isAnyDiag = ['ne', 'nw', 'se', 'sw'].includes(intended);
                if (isAnyDiag) {
                     const neighbors = REDIRECTION_MATRIX[intended] || [];
                     const availableNeighbors = neighbors.filter(n => availableExits.includes(n));
                     if (availableNeighbors.length >= 2 && lastSentDirRef.current) {
                         const change = availableNeighbors.find(n => n !== lastSentDirRef.current);
                         if (change) return change as Direction;
                     }
                }
                return mapped as Direction;
            }

            // 3. Magnetic Redirection (Dead-Zone Protection).
            const neighbors = REDIRECTION_MATRIX[intended] || [];
            const candidates = neighbors.map(mapToGameExit).filter(n => availableExits.includes(n));

            if (candidates.length === 0) {
                // Fallback: If neighbors are blocked, but the diagonal itself exists and isn't muted.
                if (!isMutedDiag && availableExits.includes(mapped)) return mapped as Direction;
                return null;
            }
            if (candidates.length === 1) return candidates[0] as Direction;

            // 4. Favor Change (Intelligent Redirection).
            if (lastSentDirRef.current) {
                const change = candidates.find(c => c !== lastSentDirRef.current);
                if (change) return change as Direction;
            }

            return candidates[0] as Direction;
        };

        const steeredDir = dir ? getMagneticDir(dir) : null;
        dir = steeredDir;

        let threshold = 25;
        if (dir === 'nw' && !availableExits.includes('u')) threshold = 60;
        else if (dir === 'se' && !availableExits.includes('d')) threshold = 60;

        if (dist > threshold && longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (dist > threshold) {
            const snappedAngle = Math.round(angleDeg / 45) * 45;
            setSwipeRay(prev => ({ ...prev, active: true, angle: snappedAngle + 90, dist: Math.min(dist, 100) }));
        } else {
            setSwipeRay(prev => prev.active ? { ...prev, active: false } : prev);
        }

        if (joystickKnobRef.current && dist > 5) {
            const maxDist = 75;
            const tiltX = -(dy / maxDist) * 10, tiltY = (dx / maxDist) * 10;
            joystickKnobRef.current.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        }

        if (dist < threshold) {
            setCurrentDir(null);
            lockedDirRef.current = null;
            stopRepeatTimer();
            if (lastHapticDirRef.current !== null) {
                lastHapticDirRef.current = null;
            }
        } else {
            if (dir !== lastHapticDirRef.current) {
                if (dir !== null) triggerHaptic(5);
                lastHapticDirRef.current = dir;
            }
            
            setCurrentDir(dir);
            lockedDirRef.current = dir;
            
            // Critical Fix: Use a ref-based check for the hold timer to avoid re-render delays
            // If we have swiped far enough AND the long-press threshold was met, start pulsing.
            const holdThresholdMet = !longPressTimer.current && joystickActive;
            if (dir && holdThresholdMet) startRepeatTimer();

            if (suppressMove && dir && !isJoystickConsumed) {
                setIsJoystickConsumed(true);
            }
        }
        return dir;
    }, [joystickActive, isJoystickConsumed, triggerHaptic, startRepeatTimer, stopRepeatTimer, availableExits]);

    const handleJoystickEnd = useCallback((e: React.PointerEvent, executeCommand: (cmd: string) => void, triggerHaptic: (duration?: number) => void, suppressDefault?: boolean) => {
        executeCommandRef.current = executeCommand;
        stopRepeatTimer();

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
                executeCommand(dirMap[initialDir] || initialDir);
                lastSentDirRef.current = initialDir;
                // Removed release haptic for move
                setJoystickGlow(true);
                setTimeout(() => setJoystickGlow(false), 300);
                return true;
            }
        }

        joystickStartPos.current = null;
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
        stopRepeatTimer();
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
