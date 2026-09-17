/**
 * @file AnimatedPromptVital.tsx
 * @description Keeps one stable vital text node while replaying its change emphasis.
 */

// --- Logic Section ---
import React, { useEffect, useRef } from 'react';

interface AnimatedPromptVitalProps {
    value: string;
    animation?: { direction: 'up' | 'down'; key: number };
}

// --- Render Section ---
export const AnimatedPromptVital: React.FC<AnimatedPromptVitalProps> = ({ value, animation }) => {
    const elementRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element || !animation || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        element.getAnimations().forEach(activeAnimation => activeAnimation.cancel());
        const baseColor = getComputedStyle(element).getPropertyValue('--vital-stat-base-color').trim() || '#22c55e';
        const changeColor = animation.direction === 'up' ? '#86efac' : '#fca5a5';
        const activeAnimation = element.animate([
            { transform: 'scale(1)', color: baseColor, textShadow: 'none' },
            { transform: 'scale(1.45)', color: changeColor, textShadow: '0 0 10px currentColor', offset: 0.3 },
            { transform: 'scale(1)', color: baseColor, textShadow: 'none' },
        ], { duration: 900, easing: 'cubic-bezier(0.2, 0.85, 0.3, 1)' });
        return () => activeAnimation.cancel();
    }, [animation?.key]);

    return <span ref={elementRef} className="prompt-stat-value">{value}</span>;
};

export default React.memo(AnimatedPromptVital);
