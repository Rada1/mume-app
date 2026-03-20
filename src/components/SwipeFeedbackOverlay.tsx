import React, { useState, useEffect, useCallback } from 'react';

export interface SwipeFeedbackData {
    id: number;
    x: number;
    y: number;
    angle: number;
    color: string;
}

interface ParticleData {
    id: number;
    delay: number;
    angle: number;
    dist: number;
    scale: number;
}

const ParticleShower: React.FC<{ angle: number; color: string }> = ({ angle, color }) => {
    const particles = React.useMemo(() => {
        return [...Array(8)].map((_, i) => ({
            id: i,
            delay: i * 0.04,
            angle: (Math.random() - 0.5) * 30, // spread
            dist: 60 + Math.random() * 80,
            scale: 0.5 + Math.random() * 0.8
        }));
    }, []);

    return (
        <div className="swipe-particles" style={{ '--angle': `${angle}deg`, '--accent': color } as any}>
            {particles.map(p => (
                <div 
                    key={p.id} 
                    className="swipe-particle" 
                    style={{ 
                        '--p-angle': `${p.angle}deg`, 
                        '--p-dist': `${p.dist}px`, 
                        '--p-delay': `${p.delay}s`,
                        '--p-scale': p.scale 
                    } as any} 
                />
            ))}
        </div>
    );
};

const SwipeFeedbackOverlay: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<SwipeFeedbackData[]>([]);

    useEffect(() => {
        const handleFeedback = (e: CustomEvent<Omit<SwipeFeedbackData, 'id'>>) => {
            const id = Date.now() + Math.random();
            const newFeedback = { ...e.detail, id };
            setFeedbacks(prev => [...prev.slice(-10), newFeedback]);

            setTimeout(() => {
                setFeedbacks(prev => prev.filter(f => f.id !== id));
            }, 800);
        };

        window.addEventListener('trigger-swipe-feedback' as any, handleFeedback as any);
        return () => window.removeEventListener('trigger-swipe-feedback' as any, handleFeedback as any);
    }, []);

    if (feedbacks.length === 0) return null;

    return (
        <div className="swipe-feedback-container">
            {feedbacks.map(f => (
                <div key={f.id} className="swipe-feedback" style={{ left: f.x, top: f.y, '--accent': f.color } as any}>
                    <div className="swipe-glow" />
                    <div className="swipe-trail" style={{ '--angle': `${f.angle}deg` } as any} />
                    <ParticleShower angle={f.angle} color={f.color} />
                </div>
            ))}
        </div>
    );
};

export const triggerSwipeFeedback = (x: number, y: number, angle: number, color: string) => {
    window.dispatchEvent(new CustomEvent('trigger-swipe-feedback', {
        detail: { x, y, angle, color }
    }));
};

export default SwipeFeedbackOverlay;
