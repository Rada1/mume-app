/** @file MapSwipeWheelOverlay.tsx — Map-wide version of the tactical 3×3 swipe grid. */

import React from 'react';
import { createPortal } from 'react-dom';
import '../Controls/GameButton/TacticalSwipeWheel.css';
import './MapSwipeWheelOverlay.css';

interface Props {
    bounds: { left: number; top: number; width: number; height: number };
    isActive: boolean;
}

const DIRECTIONS = ['nw', 'up', 'left', 'right', 'down', 'se'];

export const MapSwipeWheelOverlay: React.FC<Props> = ({ bounds, isActive }) => {
    const [feedbackDirection, setFeedbackDirection] = React.useState<string | null>(null);
    const feedbackTimerRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        const handleFeedback = (event: Event) => {
            const direction = (event as CustomEvent<{ direction?: string }>).detail?.direction;
            if (!direction) return;
            if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
            setFeedbackDirection(null);
            window.requestAnimationFrame(() => setFeedbackDirection(direction));
            feedbackTimerRef.current = window.setTimeout(() => {
                setFeedbackDirection(null);
                feedbackTimerRef.current = null;
            }, 1000);
        };

        window.addEventListener('map-swipe-edge-feedback', handleFeedback);
        return () => {
            window.removeEventListener('map-swipe-edge-feedback', handleFeedback);
            if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
        };
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(<div className={`map-swipe-wheel-backdrop${isActive ? ' is-active' : ' is-idle'}${feedbackDirection ? ' has-edge-feedback' : ''}`} aria-label="Map swipe commands" style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height
    }}>
        <div className="map-swipe-edge-indicator" data-direction={feedbackDirection || undefined} aria-hidden="true" />
        <div className="map-swipe-wheel-grid unified-tactical-wheel">
            <div className="swipe-wheel-container">
                {isActive && DIRECTIONS.map(direction => {
                    return <span
                        key={direction}
                        className="swipe-sq-label"
                        data-dir={direction}
                        aria-hidden="true"
                    >
                        <span className="swipe-action-card" />
                    </span>;
                })}
                {isActive && <div className="swipe-center" aria-label="Look" />}
            </div>
        </div>
    </div>, document.body);
};
