/**
 * @file Embers.tsx
 * @description Renders a dancing ember particle effect for atmospheric immersion.
 */

import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import '../../styles/environment.css';

interface EmbersProps {
    count?: number;
}

/**
 * Embers Component
 * Creates glowing, floating particles that drift in random directions.
 * Speed is dynamically linked to message activity in the game.
 */
export const Embers: React.FC<EmbersProps> = ({ count }) => {
    const { messageActivity, isImmersionMode, env, viewport } = useGame() as any;
    const { lighting } = env;
    const isMobile = viewport?.isMobile;
    
    // Use prop count or determine from lighting and viewport.
    // Desktop gets slightly fewer, larger embers (4 / 8 for torch), mobile stays at the original counts (6 / 12 for torch).
    const defaultCount = isMobile 
        ? (lighting === 'artificial' ? 12 : 6)
        : (lighting === 'artificial' ? 8 : 4);
        
    const emberCount = count ? Math.min(count, isMobile ? 30 : 60) : defaultCount;
    
    const activityMultiplier = 1 + (messageActivity * 2.2); // 1x to 3.2x speed
    const containerRef = React.useRef<HTMLDivElement>(null);
    const animationsRef = React.useRef<Animation[]>([]);

    const embers = useMemo(() => {
        if (!isImmersionMode) return [];
        return Array.from({ length: emberCount }).map((_, i) => ({
            id: i,
            startX: `${Math.random() * 100}%`,
            startY: `${Math.random() * 100}%`,
            size: 0.5 + Math.random() * (isMobile ? 1.2 : 2.6), // Vary size wider on desktop
            duration: 6 + Math.random() * 8, // Base duration
            delay: Math.random() * 10,
            opacity: 0.7 + Math.random() * 0.3,
            hue: 30 + Math.random() * 18, // Warm amber/gold (30-48 range)
            scale: 0.6 + Math.random() * (isMobile ? 1.4 : 2.2), // Vary scale wider on desktop
            destX: `${(Math.random() - 0.5) * 20}vw`,
            destY: `${(Math.random() - 0.5) * 30}vh`,
            swayX: `${(Math.random() - 0.5) * 40}px`,
            swayY: `${(Math.random() - 0.5) * 40}px`,
        }));
    }, [emberCount, isImmersionMode]);

    React.useEffect(() => {
        if (!isImmersionMode || !containerRef.current || embers.length === 0) return;
        
        const particles = containerRef.current.querySelectorAll('.ember-particle');
        const animations: Animation[] = [];

        particles.forEach((el, index) => {
            const ember = embers[index];
            if (!ember) return;

            const anim = el.animate([
                { transform: 'translate(0, 0) rotate(0deg) scale(0.2)', opacity: 0, offset: 0 },
                { transform: 'translate(calc(var(--dest-x) * 0.15), calc(var(--dest-y) * 0.15)) rotate(45deg) scale(1)', opacity: 1, offset: 0.15 },
                { transform: 'translate(calc(var(--dest-x) * 0.5 + var(--sway-x)), calc(var(--dest-y) * 0.5 + var(--sway-y))) rotate(180deg) scale(var(--scale))', opacity: 0.85, offset: 0.50 },
                { transform: 'translate(calc(var(--dest-x) * 0.7 + var(--sway-x)), calc(var(--dest-y) * 0.7 + var(--sway-y))) rotate(240deg) scale(calc(var(--scale) * 0.9))', opacity: 0.80, offset: 0.70 },
                { transform: 'translate(var(--dest-x), var(--dest-y)) rotate(360deg) scale(0)', opacity: 0, offset: 1 }
            ], {
                duration: ember.duration * 1000,
                delay: -ember.delay * 1000,
                iterations: Infinity,
                easing: 'linear'
            });

            anim.playbackRate = activityMultiplier;
            animations.push(anim);
        });

        animationsRef.current = animations;

        return () => {
            animations.forEach(a => a.cancel());
            animationsRef.current = [];
        };
    }, [embers]);

    React.useEffect(() => {
        animationsRef.current.forEach((anim) => {
            anim.playbackRate = activityMultiplier;
        });
    }, [activityMultiplier]);

    if (!isImmersionMode) return null;

    return (
        <div className="embers-container" ref={containerRef}>
            {embers.map((ember) => (
                <div
                    key={ember.id}
                    className="ember-particle"
                    style={{
                        '--start-x': ember.startX,
                        '--start-y': ember.startY,
                        width: `${ember.size}px`,
                        height: `${ember.size}px`,
                        backgroundColor: `hsl(${ember.hue}, 100%, 70%)`,
                        boxShadow: `0 0 2px hsl(${ember.hue}, 100%, 50%)`,
                        opacity: ember.opacity,
                        '--scale': ember.scale,
                        '--dest-x': ember.destX,
                        '--dest-y': ember.destY,
                        '--sway-x': ember.swayX,
                        '--sway-y': ember.swayY,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

export default Embers;
