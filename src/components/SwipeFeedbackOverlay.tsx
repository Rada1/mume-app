import React, { useState, useEffect, useCallback } from 'react';

export interface SwipeFeedbackData {
    id: number;
    x: number;
    y: number;
    angle: number;
    color: string;
}

const SwipeFeedbackOverlay: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<SwipeFeedbackData[]>([]);

    useEffect(() => {
        const handleFeedback = (e: CustomEvent<Omit<SwipeFeedbackData, 'id'>>) => {
            const id = Date.now() + Math.random();
            const newFeedback = { ...e.detail, id };
            setFeedbacks(prev => [...prev.slice(-10), newFeedback]);

            setTimeout(() => {
                setFeedbacks(prev => prev.filter(f => f.id !== id));
            }, 600);
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
