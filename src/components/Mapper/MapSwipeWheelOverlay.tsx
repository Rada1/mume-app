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
    if (typeof document === 'undefined') return null;

    return createPortal(<div className={`map-swipe-wheel-backdrop${isActive ? ' is-active' : ' is-idle'}`} aria-label="Map swipe commands" style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height
    }}>
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
