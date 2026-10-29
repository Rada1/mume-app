/**
 * @file Embers.tsx
 * @description Renders a dancing ember particle effect for atmospheric immersion.
 */

import React, { useMemo } from 'react';
import { useGame } from '../../context/GameContext';
import { getZoneEmberColor } from '../../utils/zoneAlignment';
import '../../styles/environment.css';

interface EmbersProps {
    count?: number;
    zone?: string | null;
}

// --- Embers Component ---
/**
 * Embers Component
 * Creates glowing, floating particles that drift in random directions.
 * Speed is dynamically linked to message activity in the game.
 */
export const Embers: React.FC<EmbersProps> = ({ count, zone }) => {
    const { messageActivity, isImmersionMode, env, viewport } = useGame() as any;
    const { lighting } = env;
    const isMobile = viewport?.isMobile;

    // Use prop count or determine from lighting and viewport.
    // Desktop gets slightly fewer, larger embers (4 / 8 for torch), mobile stays at the original counts (6 / 12 for torch).
    const defaultCount = isMobile
        ? (lighting === 'artificial' ? 12 : 6)
        : (lighting === 'artificial' ? 8 : 4);

    const emberCount = count === undefined
        ? defaultCount
        : Math.max(0, Math.min(Math.floor(count), isMobile ? 30 : 60));

    const activityMultiplier = 1 + (messageActivity * 2.2); // 1x to 3.2x speed
    const containerRef = React.useRef<HTMLDivElement>(null);
    const animationsRef = React.useRef<Animation[]>([]);
    const colorProfile = useMemo(() => getZoneEmberColor(zone), [zone]);

    const embers = useMemo(() => {
        if (!isImmersionMode) return [];
        return Array.from({ length: emberCount }).map((_, i) => ({
            id: i,
            startX: `${Math.random() * 100}%`,
            startY: `${Math.random() * 100}%`,
            size: 0.5 + Math.random() * (isMobile ? 1.2 : 2.6),
            duration: 6 + Math.random() * 8,
            delay: Math.random() * 10,
            opacity: 0.45 + Math.random() * 0.35,
            hue: colorProfile.hue + (Math.random() - 0.5) * 10,
            saturation: colorProfile.saturation,
            lightness: colorProfile.lightness + (Math.random() - 0.5) * 6,
            glowLightness: colorProfile.glowLightness,
            scale: 0.6 + Math.random() * (isMobile ? 1.4 : 2.2),
            destXNum: (Math.random() - 0.5) * 20,
            destYNum: (Math.random() - 0.5) * 30,
            swayXNum: (Math.random() - 0.5) * 40,
            swayYNum: (Math.random() - 0.5) * 40,
        }));
    }, [colorProfile, emberCount, isImmersionMode, isMobile]);

    React.useEffect(() => {
        if (!isImmersionMode || !containerRef.current || embers.length === 0) return;

        const particles = containerRef.current.querySelectorAll('.ember-particle');
        const animations: Animation[] = [];

        particles.forEach((el, index) => {
            const ember = embers[index];
            if (!ember) return;

            const baseOpacity = ember.opacity;
            const dx = ember.destXNum;
            const dy = ember.destYNum;
            const sx = ember.swayXNum;
            const sy = ember.swayYNum;
            const sc = ember.scale;
            const anim = el.animate([
                { transform: 'translate3d(0, 0, 0) rotate(0deg) scale(0.2)', opacity: 0, offset: 0 },
                { transform: `translate3d(${(dx * 0.15).toFixed(2)}vw, ${(dy * 0.15).toFixed(2)}vh, 0) rotate(45deg) scale(1)`, opacity: baseOpacity, offset: 0.15 },
                { transform: `translate3d(calc(${(dx * 0.5).toFixed(2)}vw + ${sx.toFixed(1)}px), calc(${(dy * 0.5).toFixed(2)}vh + ${sy.toFixed(1)}px), 0) rotate(180deg) scale(${sc.toFixed(2)})`, opacity: baseOpacity * 0.85, offset: 0.50 },
                { transform: `translate3d(calc(${(dx * 0.7).toFixed(2)}vw + ${sx.toFixed(1)}px), calc(${(dy * 0.7).toFixed(2)}vh + ${sy.toFixed(1)}px), 0) rotate(240deg) scale(${(sc * 0.9).toFixed(2)})`, opacity: baseOpacity * 0.80, offset: 0.70 },
                { transform: `translate3d(${dx.toFixed(2)}vw, ${dy.toFixed(2)}vh, 0) rotate(360deg) scale(0)`, opacity: 0, offset: 1 }
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
                        backgroundColor: `hsl(${ember.hue}, ${ember.saturation}%, ${ember.lightness}%)`,
                        boxShadow: `0 0 2px hsl(${ember.hue}, ${ember.saturation}%, ${ember.glowLightness}%)`,
                        opacity: ember.opacity,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};

export default Embers;
