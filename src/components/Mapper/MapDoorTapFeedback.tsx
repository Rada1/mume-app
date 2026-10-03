/** @file MapDoorTapFeedback.tsx — Brief glow at a tapped map door. */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './MapDoorTapFeedback.css';

interface DoorTapFeedback {
    x: number;
    y: number;
    direction: string;
    id: number;
}

const getDoorAngle = (direction: string): number => {
    const normalized = direction.toLowerCase();
    if (['e', 'east', 'w', 'west'].includes(normalized)) return 90;
    if (['ne', 'northeast', 'sw', 'southwest'].includes(normalized)) return -45;
    if (['nw', 'northwest', 'se', 'southeast'].includes(normalized)) return 45;
    return 0;
};

export const MapDoorTapFeedback: React.FC = () => {
    const [feedback, setFeedback] = useState<DoorTapFeedback | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const nextIdRef = useRef(0);

    useEffect(() => {
        const handleFeedback = (event: Event) => {
            const detail = (event as CustomEvent<{ x?: number; y?: number; direction?: string }>).detail;
            if (typeof detail?.x !== 'number' || typeof detail.y !== 'number' || !detail.direction) return;
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);

            setFeedback({ x: detail.x, y: detail.y, direction: detail.direction, id: ++nextIdRef.current });
            timeoutRef.current = window.setTimeout(() => {
                setFeedback(null);
                timeoutRef.current = null;
            }, 1000);
        };

        window.addEventListener('map-door-tap-feedback', handleFeedback);
        return () => {
            window.removeEventListener('map-door-tap-feedback', handleFeedback);
            if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
        };
    }, []);

    if (typeof document === 'undefined' || !feedback) return null;
    const style = {
        left: feedback.x,
        top: feedback.y,
        '--door-angle': `${getDoorAngle(feedback.direction)}deg`
    } as React.CSSProperties;

    return createPortal(
        <span key={feedback.id} className="map-door-tap-feedback" style={style} aria-hidden="true" />,
        document.body
    );
};
