import React, { useEffect, useState, useRef } from 'react';
import { useVitals } from '../../context/GameContext';

interface XpTickerProps {
    isLandscape?: boolean;
    align?: 'center' | 'right' | 'left';
    variant?: 'floating' | 'header';
}

const XpTicker: React.FC<XpTickerProps> = ({ isLandscape, align = 'center', variant = 'floating' }) => {
    const { xpHistory, xpEvent } = useVitals();
    

    const [isVisible, setIsVisible] = useState(false);
    const [displayDelta, setDisplayDelta] = useState(0);
    const [isBumping, setIsBumping] = useState(false);
    
    const animFrameRef = useRef<number | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sessionActiveRef = useRef<boolean>(false);
    
    const totalAccumulatedRef = useRef<number>(0);
    const lastTotalXpRef = useRef<number>(xpHistory.new);
    const currentDisplayRef = useRef<number>(0);

    // Track the absolute total to detect jumps
    useEffect(() => {
        // Initialization: if we were at 0 and now have a real value, 
        // just set the baseline without showing a jump.
        if (lastTotalXpRef.current === 0 && xpHistory.new > 0) {
            lastTotalXpRef.current = xpHistory.new;
            return;
        }

        const jump = xpHistory.new - lastTotalXpRef.current;
        lastTotalXpRef.current = xpHistory.new;


        // If no positive change in total XP, do nothing
        if (jump <= 0) {
            return;
        }


        // Show the ticker
        setIsVisible(true);
        
        if (jump > 0) {
            setIsBumping(true);
            setTimeout(() => setIsBumping(false), 300);
            
            // Accumulate for this "session" of kills
            if (!sessionActiveRef.current) {
                sessionActiveRef.current = true;
                totalAccumulatedRef.current = jump;
            } else {
                totalAccumulatedRef.current += jump;
            }
        }

        // Reset hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
        }

        // Start/Update counting animation
        startAnimation(currentDisplayRef.current, totalAccumulatedRef.current);

    }, [xpHistory.new, xpEvent]);

    const startAnimation = (from: number, to: number) => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        
        const startTime = performance.now();
        const jumpSize = Math.abs(to - from);
        const duration = Math.min(700, 200 + Math.pow(jumpSize, 0.45) * 15);

        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
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
            // Clear refs after fade out
            setTimeout(() => {
                totalAccumulatedRef.current = 0;
                currentDisplayRef.current = 0;
                setDisplayDelta(0);
            }, 500);
        }, 6000);
    };


    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, []);

    if (!isVisible) return null;

    const isHeader = variant === 'header';

    const containerStyle: React.CSSProperties = isHeader ? {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        animation: 'fadeInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: `scale(${isBumping ? 1.05 : 1})`,
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        pointerEvents: 'none'
    } : {
        position: 'absolute',
        top: isLandscape ? '-42px' : '-48px',
        left: align === 'center' ? '50%' : align === 'left' ? '10px' : 'auto',
        right: align === 'right' ? '10px' : 'auto',
        transform: `${align === 'center' ? 'translateX(-50%)' : 'none'} scale(${isBumping ? 1.15 : 1})`,
        transformOrigin: align === 'right' ? 'right center' : align === 'left' ? 'left center' : 'center center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : align === 'left' ? 'flex-start' : 'flex-end',
        gap: '2px',
        zIndex: 50,
        pointerEvents: 'none',
        transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        animation: 'fadeInUp 0.3s ease-out'
    };

    const cardStyle: React.CSSProperties = isHeader ? {
        backgroundColor: isLandscape ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: isLandscape ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '6px',
        padding: isLandscape ? '4px 10px' : '4px 8px',
        color: '#4ade80',
        fontWeight: '800',
        fontSize: isLandscape ? '0.75rem' : '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        boxShadow: isBumping 
            ? '0 0 15px rgba(74, 222, 128, 0.2), 0 4px 12px rgba(0, 0, 0, 0.2)' 
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: isLandscape ? '4px' : '4px',
        letterSpacing: '0.5px'
    } : {
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
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={isHeader ? {} : { transform: 'skewX(20deg)' }}>
                    {isHeader && isLandscape && <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>GAIN</span>}
                    +{displayDelta.toLocaleString()} XP
                </div>
            </div>
        </div>
    );
};

export default XpTicker;
