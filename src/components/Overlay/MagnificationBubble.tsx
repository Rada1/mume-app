import React from 'react';
import './MagnificationBubble.css';

interface MagnificationBubbleProps {
    x: number;
    y: number;
    text: string;
    isActive: boolean;
}

export const MagnificationBubble: React.FC<MagnificationBubbleProps> = ({ x, y, text, isActive }) => {
    if (!isActive) return null;

    // Offset the bubble up so it's visible above the finger
    const bubbleX = x;
    const bubbleY = y - 80;

    return (
        <div 
            className="magnification-bubble"
            style={{
                left: `${bubbleX}px`,
                top: `${bubbleY}px`
            }}
        >
            <div className="magnification-content">
                {text}
            </div>
            <div className="magnification-pointer" />
        </div>
    );
};
