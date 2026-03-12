import React from 'react';
import { Direction } from '../../types';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import './TrackpadSwipeWheel.css';

const StairsUp = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 19h-5v-5h-5v-5h-5" />
        <path d="M4 9V4h5" />
    </svg>
);

const StairsDown = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 5h5v5h5v5h5" />
        <path d="M20 15v5h-5" />
    </svg>
);

interface TrackpadSwipeWheelProps {
    active: boolean;
    currentDir: Direction | null;
}

const DIRECTIONS: { dir: Direction, icon: React.ReactNode }[] = [
    { dir: 'n',  icon: <ChevronUp size={32} strokeWidth={3} /> },
    { dir: 'ne', icon: null },
    { dir: 'e',  icon: <ChevronRight size={32} strokeWidth={3} /> },
    { dir: 'se', icon: <StairsDown size={32} /> },
    { dir: 's',  icon: <ChevronDown size={32} strokeWidth={3} /> },
    { dir: 'sw', icon: null },
    { dir: 'w',  icon: <ChevronLeft size={32} strokeWidth={3} /> },
    { dir: 'nw', icon: <StairsUp size={32} /> },
];

export const TrackpadSwipeWheel: React.FC<TrackpadSwipeWheelProps> = ({ active, currentDir }) => {
    if (!active) return null;

    return (
        <div className="trackpad-swipe-wheel">
            <div className="wheel-inner">
                {DIRECTIONS.map(({ dir, icon }) => (
                    <div 
                        key={dir} 
                        className={`wheel-slice ${dir} ${currentDir === dir ? 'selected' : ''}`}
                        style={{ display: icon ? 'flex' : 'none' }}
                    >
                        <div className="direction-icon">{icon}</div>
                    </div>
                ))}
            </div>
            <div className="wheel-center-dot" />
        </div>
    );
};
