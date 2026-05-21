/**
 * @file MapFilterBar.tsx
 * @description Overlay controls for filtering highlighted map rooms by flag type.
 */

import React, { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

// --- Configuration Section ---

type MapFilterId = 'herb' | 'stable' | 'quest' | 'shop' | 'guild' | 'inn' | 'danger' | 'water';

interface MapFilterBarProps {
    activeMapFilter: string | null;
    mapSearchQuery: string;
    setActiveMapFilter: React.Dispatch<React.SetStateAction<string | null>>;
    setMapSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const FILTERS: { id: MapFilterId; label: string; symbol: string }[] = [
    { id: 'herb', label: 'Herb', symbol: '\u2663' },
    { id: 'stable', label: 'Stable', symbol: '\u2658' },
    { id: 'quest', label: 'Quest', symbol: '?' },
    { id: 'shop', label: 'Shop', symbol: '$' },
    { id: 'guild', label: 'Guild', symbol: 'G' },
    { id: 'inn', label: 'Inn', symbol: 'R' },
    { id: 'danger', label: 'Danger', symbol: '!' },
    { id: 'water', label: 'Water', symbol: '\u2248' }
];

// --- Render Section ---

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
    activeMapFilter,
    mapSearchQuery,
    setActiveMapFilter,
    setMapSearchQuery
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const activeFilter = FILTERS.find(filter => filter.id === activeMapFilter);

    const handleFilterClick = (filterId: MapFilterId) => {
        setActiveMapFilter(current => {
            const next = current === filterId ? null : filterId;
            if (next !== 'herb') setMapSearchQuery('');
            return next;
        });
    };

    return (
        <div
            className={`map-filter-bar ${isCollapsed ? 'collapsed' : ''}`}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => event.stopPropagation()}
        >
            <button
                type="button"
                className={`map-filter-parent ${activeMapFilter ? 'has-active-filter' : ''}`}
                aria-expanded={!isCollapsed}
                title={isCollapsed ? 'Show map filters' : 'Hide map filters'}
                onClick={() => setIsCollapsed(current => !current)}
            >
                <Search size={14} strokeWidth={2.2} />
                <span>Find</span>
                {activeFilter && <span className="map-filter-active-chip">{activeFilter.symbol}</span>}
                <ChevronDown className="map-filter-chevron" size={14} strokeWidth={2.2} />
            </button>

            {!isCollapsed && (
                <>
                    <div className="map-filter-buttons" role="toolbar" aria-label="Map filters">
                        {FILTERS.map(filter => {
                            const active = activeMapFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    type="button"
                                    className={`map-filter-button ${active ? 'active' : ''}`}
                                    aria-pressed={active}
                                    title={`${filter.label} filter`}
                                    onClick={() => handleFilterClick(filter.id)}
                                >
                                    <span className="map-filter-symbol" aria-hidden="true">{filter.symbol}</span>
                                    <span className="map-filter-label">{filter.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {activeMapFilter === 'herb' && (
                        <input
                            className="map-filter-search"
                            value={mapSearchQuery}
                            onChange={event => setMapSearchQuery(event.target.value)}
                            placeholder="Search herb..."
                            aria-label="Search herb rooms"
                        />
                    )}
                </>
            )}
        </div>
    );
};
