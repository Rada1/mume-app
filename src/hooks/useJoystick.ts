import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Direction, ExecuteCommand } from '../types';


export const useJoystick = (triggerHaptic: (ms: number) => void, availableExits: string[] = []) => {
    const [joystickActive, setJoystickActive] = useState(false);
    const [currentDir, setCurrentDir] = useState<Direction | null>(null);
    const [isJoystickConsumed, setIsJoystickConsumed] = useState(false);
    const [isTargetModifierActive, setIsTargetModifierActive] = useState(false);
    const [swipeRay, setSwipeRay] = useState<{ active: boolean, angle: number, dist: number, x?: number, y?: number }>({ active: false, angle: 0, dist: 0 });
    const [joystickGlow, setJoystickGlow] = useState(false);
    const [isSwipeWheelHidden, setIsSwipeWheelHidden] = useState(false);
    

    const joystickKnobRef = useRef<HTMLDivElement>(null);
    const joystickStartPos = useRef<{ x: number, y: number } | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const lastHapticDirRef = useRef<Direction | null>(null);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const lockedDirRef = useRef<Direction | null>(null);
    const repeatMoveTimer = useRef<NodeJS.Timeout | null>(null);
    const lastRepeatDirRef = useRef<string | null>(null);
    const lastSentDirRef = useRef<Direction | null>(null);
    // Track which specific pointerId "owns" this joystick session.
    // Replaces isPrimary checks so non-primary pointers (e.g. second finger on trackpad
    // while an action button is held) work correctly for the button+trackpad combo.
    const activeJoystickPointerRef = useRef<number | null>(null);
    const lastPointerPosRef = useRef<{ x: number, y: number } | null>(null);

    // Command Execution Ref
    const executeCommandRef = useRef<ExecuteCommand | null>(null);
    const activePointersRef = useRef<Set<number>>(new Set());

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
            // Read the direction at the END of each 750ms window so the user's
            // last held direction is what actually fires — not a stale snapshot.
            const currentLockedDir = lockedDirRef.current;
            if (executeCommandRef.current && currentLockedDir) {
                const cmd = dirMap[currentLockedDir] || currentLockedDir;
                executeCommandRef.current(cmd);
                lastSentDirRef.current = currentLockedDir;
                setIsJoystickConsumed(true);
                triggerHaptic(10);



                // Dispatch center event to ensure map follows joystick
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('mume-mapper-center-on-player'));
                }
            }

        };

        // Only use the interval — the first command fires after a full 0.75s window.
        // This ensures the direction read is whatever the user is holding at the END
        // of that window, not the direction at the instant the timer started.
        repeatMoveTimer.current = setInterval(firePulse, 750);
    }, [triggerHaptic]);

    const handleJoystickStart = useCallback((e: React.PointerEvent, executeCommand?: ExecuteCommand) => {
        activePointersRef.current.add(e.pointerId);
        if (activeJoystickPointerRef.current !== null && activeJoystickPointerRef.current !== e.pointerId) {
            return;
        }

        if (activePointersRef.current.size > 1) {
            handleJoystickCancel();
            return;
        }

        // Use pointerId tracking instead of isPrimary so that a non-primary pointer
        // (e.g. second finger tapping the trackpad while holding an action button) works.
        activeJoystickPointerRef.current = e.pointerId;
        console.log(`[useJoystick] handleJoystickStart: pointerId=${e.pointerId}, size=${activePointersRef.current.size}`);
        if (executeCommand) executeCommandRef.current = executeCommand;
        setJoystickActive(true);
        setIsJoystickConsumed(false);
        setIsSwipeWheelHidden(false);
        setIsTargetModifierActive(false);

        try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err) {}

        const startX = e.clientX;
        const startY = e.clientY;
        console.log(`[Joystick] Start: x=${startX} y=${startY} (Pointer: ${e.pointerId})`);
        
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

    const handleJoystickMove = useCallback((e: React.PointerEvent, executeCommand?: ExecuteCommand, suppressMove?: boolean) => {
        if (activePointersRef.current.size > 1) return null;
        if (e.pointerId !== activeJoystickPointerRef.current) return null;
        if (executeCommand) executeCommandRef.current = executeCommand;
        if (!joystickActive || !joystickStartPos.current) return null;
        const dx = e.clientX - joystickStartPos.current.x;
        const dy = e.clientY - joystickStartPos.current.y;
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
        const dist = Math.sqrt(dx * dx + dy * dy);

        const angleRad = Math.atan2(dy, dx);
        let angleDeg = angleRad * (180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        if (dist > 5) {
            console.log(`[Joystick] Move: dx=${dx.toFixed(1)} dy=${dy.toFixed(1)} dist=${dist.toFixed(1)} angle=${angleDeg.toFixed(1)}`);
        }

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
            
            // 1. Exact match (Cardinals and unmuted NW/SE).
            if (availableExits.includes(mapped)) {
                return mapped as Direction;
            }

            // 2. Magnetic Redirection (Dead-Zone Protection).
            // If the intended direction is blocked, try redirecting to available neighbors.
            const neighbors = REDIRECTION_MATRIX[intended] || [];
            const candidates = neighbors.map(mapToGameExit).filter(n => availableExits.includes(n));

            if (candidates.length === 0) {
                return null;
            }
            
            // Just take the first available neighbor. No more "Favor Change" bias.
            return candidates[0] as Direction;
        };

        // --- Console Debugging ---
        if (typeof window !== 'undefined') {
            (window as any).__JOYSTICK_DEBUG__ = {
                testSteering: (intended: string, exits: string[]) => {
                    const mapped = mapToGameExit(intended);
                    const isAvailable = exits.includes(mapped);
                    const neighbors = REDIRECTION_MATRIX[intended] || [];
                    const candidates = neighbors.map(mapToGameExit).filter(n => exits.includes(n));
                    const steered = isAvailable ? mapped : (candidates[0] || null);
                    
                    console.table({
                        intended,
                        mapped,
                        isAvailable,
                        neighbors: neighbors.join(','),
                        candidates: candidates.join(','),
                        steered
                    });
                    return steered;
                }
            };
        }

        const steeredDir = dir ? getMagneticDir(dir) : null;
        if (dir && steeredDir !== dir) {
            console.log(`[Joystick] Magnetic Steering: ${dir} -> ${steeredDir} (Available: ${availableExits.join(',')})`);
        }
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
    }, [joystickActive, isJoystickConsumed, triggerHaptic, startRepeatTimer, availableExits]);

    const handleJoystickEnd = useCallback((e: React.PointerEvent, executeCommand: ExecuteCommand, triggerHaptic: (duration?: number) => void, suppressDefault?: boolean) => {
        activePointersRef.current.delete(e.pointerId);
        if (e.pointerId !== activeJoystickPointerRef.current) return false;
        console.log(`[Joystick] End: x=${e.clientX} y=${e.clientY} (Consumed: ${isJoystickConsumed || isTargetModifierActive})`);
        executeCommandRef.current = executeCommand;
        stopRepeatTimer();

        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (!joystickActive || !joystickStartPos.current) return false;

        const wasConsumed = isJoystickConsumed || isTargetModifierActive;
        const initialDir = currentDir || lockedDirRef.current;

        setJoystickActive(false);
        setIsJoystickConsumed(false);
        setIsSwipeWheelHidden(false);
        setIsTargetModifierActive(false);
        setCurrentDir(null);
        setSwipeRay({ active: false, angle: 0, dist: 0 });
        lastHapticDirRef.current = null;
        lockedDirRef.current = null;
        activeJoystickPointerRef.current = null;

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
                executeCommand('look', false, false, false, false, { fromUi: true });
                // Removed release haptic for lookout/tap
                return true;
            }
            
            // Directional execution
            let threshold = 25;
            if (initialDir === 'nw' && !availableExits.includes('u')) threshold = 60;
            else if (initialDir === 'se' && !availableExits.includes('d')) threshold = 60;

            if (dist >= threshold && initialDir) {
                executeCommand(dirMap[initialDir] || initialDir, false, false, false, false, { fromUi: true });
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

    const handleNavEnd = useCallback((dir: 'up' | 'down', executeCommand: ExecuteCommand, triggerHaptic: (duration?: number) => void, setBtnGlow: React.Dispatch<React.SetStateAction<{ up: boolean, down: boolean }>>) => {
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

    const handleJoystickCancel = useCallback((e?: React.PointerEvent) => {
        if (e) activePointersRef.current.delete(e.pointerId);
        else activePointersRef.current.clear();

        activeJoystickPointerRef.current = null;
        stopRepeatTimer();
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setJoystickActive(false);
        setIsJoystickConsumed(false);
        setIsSwipeWheelHidden(false);
        setIsTargetModifierActive(false);
        console.log(`[useJoystick] handleJoystickCancel: pointerId=${e?.pointerId || 'all'}, size=${activePointersRef.current.size}`);
        setCurrentDir(null);
        setSwipeRay({ active: false, angle: 0, dist: 0 });
        lastHapticDirRef.current = null;
        lockedDirRef.current = null;
        joystickStartPos.current = null;
        touchStartPos.current = null;
        if (joystickKnobRef.current) {
            joystickKnobRef.current.style.transform = '';
        }
    }, [stopRepeatTimer]);

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
        isSwipeWheelHidden,
        setIsSwipeWheelHidden,
        joystickKnobRef,
        handleJoystickStart,
        handleJoystickMove,
        handleJoystickEnd,
        handleJoystickCancel,
        handleNavStart,
        handleNavEnd,
        stopRepeatTimer
    };
};
