/** @file MapSwipeWheelOverlay.tsx — Map-wide version of the tactical 3×3 swipe grid. */

import React from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
    ChevronsUp, ChevronsDown, DoorOpen, MapPin, Eye
} from 'lucide-react';
import { getMapSwipeWheelCell } from './mapSwipeWheelUtils';
import '../Controls/GameButton/TacticalSwipeWheel.css';
import './MapSwipeWheelOverlay.css';

interface Props {
    pointerPosition: { x: number; y: number };
    bounds: { left: number; top: number; width: number; height: number };
}

const COMMANDS: Array<{
    label: string;
    direction: string;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}> = [
    { label: 'Up', direction: 'nw', icon: ChevronsUp },
    { label: 'North', direction: 'up', icon: ArrowUp },
    { label: 'Where', direction: 'ne', icon: MapPin },
    { label: 'West', direction: 'left', icon: ArrowLeft },
    { label: 'East', direction: 'right', icon: ArrowRight },
    { label: 'Exits', direction: 'sw', icon: DoorOpen },
    { label: 'South', direction: 'down', icon: ArrowDown },
    { label: 'Down', direction: 'se', icon: ChevronsDown },
];

export const MapSwipeWheelOverlay: React.FC<Props> = ({ pointerPosition, bounds }) => {
    if (typeof document === 'undefined') return null;
    const activeGridDirection = getMapSwipeWheelCell(pointerPosition, {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
    });

    return createPortal(<div className="map-swipe-wheel-backdrop" aria-label="Map swipe commands" style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height
    }}>
        <div className="map-swipe-wheel-grid unified-tactical-wheel">
            <div className="swipe-wheel-container">
                {COMMANDS.map(({ label, direction, icon: Icon }) => {
                    const selected = direction === activeGridDirection;
                    return <span
                        key={direction}
                        className={`swipe-sq-label${selected ? ' active' : ''}`}
                        data-dir={direction}
                    >
                        <span className="swipe-action-card">
                            <Icon className="map-swipe-wheel-icon" size={22} strokeWidth={2.1} />
                            <span className="swipe-action-text">{label}</span>
                        </span>
                    </span>;
                })}
                <div className={`swipe-center${activeGridDirection === 'center' ? ' active' : ''}`}>
                    <Eye className="map-swipe-wheel-icon" size={22} strokeWidth={2.1} />
                    <span className="swipe-center-label">Look</span>
                </div>
            </div>
        </div>
    </div>, document.body);
};
