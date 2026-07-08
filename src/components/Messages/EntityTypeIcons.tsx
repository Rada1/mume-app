/**
 * @file EntityTypeIcons.tsx
 * @description Shared glyphs for inline and room-section entity type indicators.
 */

// --- Logic Section ---
import React from 'react';

interface EntityTypeIconProps {
    size?: number;
    strokeWidth?: number;
    className?: string;
}

export const NpcEntityIcon: React.FC<EntityTypeIconProps> = ({
    size = 12,
    strokeWidth = 2,
    className
}) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="8" r="5" />
        <path d="M18.5 19.5a7.2 7.2 0 0 0-13 0" />
        <path d="M5 19 19 5" strokeWidth={strokeWidth + 0.35} />
    </svg>
);
