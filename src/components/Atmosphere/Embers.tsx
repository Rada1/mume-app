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
    const { messageActivity, isImmersionMode, env } = useGame();
    const { lighting } = env;
    
    // Use prop count or determine from lighting
    const emberCount = count ?? (lighting === 'artificial' ? 25 : 12);
    
    const activityMultiplier = 1 + (messageActivity * 4); // 1x to 5x speed
    const containerRef = React.useRef<HTMLDivElement>(null);

    if (!isImmersionMode) return null;

    React.useEffect(() => {
        if (!containerRef.current) return;
        const particles = containerRef.current.querySelectorAll('.ember-particle');
        particles.forEach((el) => {
            el.getAnimations().forEach((anim) => {
                anim.playbackRate = activityMultiplier;
            });
        });
    }, [activityMultiplier]);

    const embers = useMemo(() => {
        return Array.from({ length: emberCount }).map((_, i) => ({
            id: i,
            startX: `${Math.random() * 100}%`,
            startY: `${Math.random() * 100}%`,
            size: 0.5 + Math.random() * 1.2, // Slightly smaller as requested
            duration: 6 + Math.random() * 8, // Base duration
            delay: Math.random() * 10,
            opacity: 0.7 + Math.random() * 0.3,
            hue: 20 + Math.random() * 20, // Warm orange (20-40 range)
            scale: 0.7 + Math.random() * 1.3,
            destX: `${(Math.random() - 0.5) * 20}vw`,
            destY: `${(Math.random() - 0.5) * 30}vh`,
            swayX: `${(Math.random() - 0.5) * 40}px`,
            swayY: `${(Math.random() - 0.5) * 40}px`,
        }));
    }, [count]);

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
                        boxShadow: `0 0 ${ember.size * 2}px hsl(${ember.hue}, 100%, 50%), 
                                    0 0 ${ember.size * 4}px hsl(${ember.hue}, 100%, 30%)`,
                        animationDuration: `${ember.duration}s`,
                        animationDelay: `-${ember.delay}s`,
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
