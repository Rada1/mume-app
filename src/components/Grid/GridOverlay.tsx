import React from 'react';

interface GridOverlayProps {
    isEditMode: boolean;
    isGridEnabled: boolean;
    gridSize: number; // Percent
}

export const GridOverlay: React.FC<GridOverlayProps> = ({ isEditMode, isGridEnabled, gridSize }) => {
    if (!isEditMode || !isGridEnabled) return null;

    // gridSize is a percentage of the container. 
    // We want a background with repeating lines.
    const style: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 400, // Just below buttons and clusters
        backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}% ${gridSize}%`,
        opacity: 0.8,
        transition: 'opacity 0.3s ease-in-out'
    };

    return <div className="grid-overlay" style={style} />;
};
