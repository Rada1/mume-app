/**
 * @file MapFilterSubflagsDropup.tsx
 * @description Subflags popup menu for a selected map filter category.
 */

import React from 'react';
import { Category } from './MapFilterCategories';

interface MapFilterSubflagsDropupProps {
    category: Category;
    activeMapFilter: string | null;
    dropupLeft: number | null;
    onSelectSubFlag: (flagId: string) => void;
    inline?: boolean;
}

export const MapFilterSubflagsDropup: React.FC<MapFilterSubflagsDropupProps> = ({
    category,
    activeMapFilter,
    dropupLeft,
    onSelectSubFlag,
    inline = false
}) => {
    return (
        <div
            className={`map-filter-dropup${inline ? ' map-filter-dropup-inline' : ''}`}
            role="listbox"
            aria-label={`${category.label} sub-filters`}
            style={inline ? undefined : {
                position: 'absolute',
                bottom: 'calc(100% + 4px)',
                left: dropupLeft !== null ? `${dropupLeft}px` : '0px',
                zIndex: 3100
            }}
        >
            {!inline && (
                <div className="map-filter-dropup-header">
                    <span>{category.label.toUpperCase()}</span>
                </div>
            )}
            <div className="map-filter-dropup-list">
                {category.subFlags.map(sf => {
                    const isActive = activeMapFilter === sf.id;
                    return (
                        <button
                            key={sf.id}
                            type="button"
                            className={`map-filter-subflag ${isActive ? 'active' : ''}`}
                            aria-pressed={isActive}
                            onClick={() => onSelectSubFlag(sf.id)}
                        >
                            <span className="subflag-indicator">{isActive ? '●' : '○'}</span>
                            <span className="subflag-label">{sf.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
