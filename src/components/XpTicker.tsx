import React, { useEffect, useState, useRef } from 'react';
import { useVitals } from '../context/GameContext';

interface XpTickerProps {
    isLandscape?: boolean;
    align?: 'center' | 'right';
}

const XpTicker: React.FC<XpTickerProps> = ({ isLandscape, align = 'center' }) => {
    const { xpHistory, xpEvent } = useVitals();
    
    const [isVisible, setIsVisible] = useState(false);
    const [displayDelta, setDisplayDelta] = useState(0);
    const [isBumping, setIsBumping] = useState(false);
    
    const animFrameRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sessionActiveRef = useRef<boolean>(false);
    
    const totalAccumulatedRef = useRef<number>(0);
    const lastProcessedXpRef = useRef<number>(xpHistory.new);
    const currentDisplayRef = useRef<number>(0);

    // Initialize lastProcessedXpRef on mount or when it first becomes non-zero
    useEffect(() => {
        if (xpHistory.new > 0 && lastProcessedXpRef.current === 0) {
            lastProcessedXpRef.current = xpHistory.new;
        }
    }, [xpHistory.new]);

    useEffect(() => {
        // Calculate the jump in total XP since the last time we processed an update
        const jump = xpHistory.new - lastProcessedXpRef.current;

        // XP decreased (death penalty) — reset baseline so future kills register correctly
        if (jump < 0) {
            lastProcessedXpRef.current = xpHistory.new;
            return;
        }

        // If we have no jump and this isn't an explicit xpEvent, ignore
        // If we have no jump and no session is active, ignore (avoids showing +0 on idle)
        if (jump === 0 && (!xpEvent || !sessionActiveRef.current)) {
            return;
        }

        // Update tracking
        if (jump > 0) {
            lastProcessedXpRef.current = xpHistory.new;
        }

        // Reset hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Visual triggers
        setIsVisible(true);
        if (jump > 0) {
            setIsBumping(true);
            setTimeout(() => setIsBumping(false), 300);
        }

        // Update session total
        if (!sessionActiveRef.current) {
            sessionActiveRef.current = true;
            totalAccumulatedRef.current = Math.max(0, jump);
        } else {
            totalAccumulatedRef.current += Math.max(0, jump);
        }

        // Start/Update counting animation
        startAnimation(currentDisplayRef.current, totalAccumulatedRef.current);

    }, [xpHistory, xpEvent]);

    const startAnimation = (from: number, to: number) => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        
        const startTime = performance.now();
        const jumpSize = Math.abs(to - from);
        
        // Dynamic duration: snappy for small jumps, slightly longer for big ones
        const duration = Math.min(700, 200 + Math.pow(jumpSize, 0.45) * 15);

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth deceleration
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const current = Math.floor(from + (to - from) * easeProgress);
            currentDisplayRef.current = current;
            setDisplayDelta(current);

            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                currentDisplayRef.current = to;
                setDisplayDelta(to);
                resetHideTimeout();
            }
        };
        animFrameRef.current = requestAnimationFrame(animate);
    };

    const resetHideTimeout = () => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
            sessionActiveRef.current = false;
            // Wait for fade out animation before resetting numbers
            setTimeout(() => {
                totalAccumulatedRef.current = 0;
                currentDisplayRef.current = 0;
                setDisplayDelta(0);
            }, 500);
        }, 6000); // 6 seconds of idle time
    };

    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div style={{
            position: 'absolute',
            top: isLandscape ? '-42px' : '-48px',
            left: align === 'center' ? '50%' : 'auto',
            right: align === 'right' ? '10px' : 'auto',
            transform: `${align === 'center' ? 'translateX(-50%)' : 'none'} scale(${isBumping ? 1.15 : 1})`,
            transformOrigin: align === 'right' ? 'right center' : 'center center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: align === 'center' ? 'center' : 'flex-end',
            gap: '2px',
            zIndex: 50,
            pointerEvents: 'none',
            transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            animation: 'fadeInUp 0.3s ease-out'
        }}>
            <div style={{
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: isBumping ? '1px solid #22ff55' : '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '2px',
                padding: '2px 8px',
                color: '#22ff55', 
                fontWeight: '900',
                fontSize: isLandscape ? '0.8rem' : '0.9rem',
                fontVariantNumeric: 'tabular-nums',
                transform: 'skewX(-20deg)',
                boxShadow: isBumping 
                    ? '0 0 15px rgba(34, 255, 85, 0.4), 0 4px 12px rgba(0, 0, 0, 0.5)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(34, 255, 85, 0.1)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease'
            }}>
                <div style={{ transform: 'skewX(20deg)' }}>
                    +{displayDelta.toLocaleString()} XP
                </div>
            </div>
        </div>
    );
};

export default XpTicker;
