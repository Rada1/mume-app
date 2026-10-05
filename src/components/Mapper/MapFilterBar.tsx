/**
 * @file MapFilterBar.tsx
 * @description Docked bottom console bar for Map room search, category filtering, and Z-elevation telemetry.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { useMapper } from '../../context/useMapper';
import {
    CATEGORIES,
    CategoryId,
    getCategoryForFilter,
    getLabelForFilter
} from './MapFilterCategories';
import { MapFilterSubflagsDropup } from './MapFilterSubflagsDropup';
import './MapFilterBar.css';

// --- Props ---

export interface MapFilterBarProps {
    activeMapFilter?: string | null;
    mapSearchQuery?: string;
    setActiveMapFilter?: React.Dispatch<React.SetStateAction<string | null>>;
    setMapSearchQuery?: React.Dispatch<React.SetStateAction<string>>;
    triggerHaptic?: (ms: number) => void;
    showZIndicator?: boolean;
    viewZ?: number | null;
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    onClose?: () => void;
    floatingPanel?: boolean;
    floatingPosition?: { x: number; y: number } | null;
}

// --- Component ---

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
    activeMapFilter: propActiveMapFilter,
    mapSearchQuery: propMapSearchQuery,
    setActiveMapFilter: propSetActiveMapFilter,
    setMapSearchQuery: propSetMapSearchQuery,
    triggerHaptic,
    showZIndicator = true,
    viewZ: propViewZ,
    expanded,
    onExpandedChange,
    onClose,
    floatingPanel = false,
    floatingPosition = null
}) => {
    const mapperContext = useMapper();

    const activeMapFilter = propActiveMapFilter !== undefined
        ? propActiveMapFilter
        : mapperContext.activeMapFilter;

    const setActiveMapFilter = propSetActiveMapFilter || mapperContext.setActiveMapFilter;

    const mapSearchQuery = propMapSearchQuery !== undefined
        ? propMapSearchQuery
        : mapperContext.mapSearchQuery;

    const setMapSearchQuery = propSetMapSearchQuery || mapperContext.setMapSearchQuery;

    const effectiveViewZ = propViewZ !== undefined ? propViewZ : mapperContext.viewZ;
    const currentRoom = mapperContext.currentRoomId ? mapperContext.rooms[mapperContext.currentRoomId] : null;
    const zDisplay = effectiveViewZ !== null && effectiveViewZ !== undefined
        ? Number(effectiveViewZ).toFixed(1)
        : (currentRoom?.z !== undefined ? Number(currentRoom.z).toFixed(1) : '0.0');

    const [localIsCollapsed, setLocalIsCollapsed] = useState(true);
    const isCollapsed = expanded === undefined ? localIsCollapsed : !expanded;
    const [expandedCategory, setExpandedCategory] = useState<CategoryId | null>(null);
    const [activeButtonEl, setActiveButtonEl] = useState<HTMLElement | null>(null);
    const [dropupLeft, setDropupLeft] = useState<number | null>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const activeCategory = getCategoryForFilter(activeMapFilter);
    const activeFilterLabel = getLabelForFilter(activeMapFilter);
    const hasActive = !!(activeMapFilter || (mapSearchQuery && mapSearchQuery.trim()));

    // Update dropup left offset dynamically relative to the bar
    const updateDropupPosition = useCallback(() => {
        if (expandedCategory && activeButtonEl && barRef.current) {
            const buttonRect = activeButtonEl.getBoundingClientRect();
            const barRect = barRef.current.getBoundingClientRect();
            setDropupLeft(buttonRect.left - barRect.left);
        } else {
            setDropupLeft(null);
        }
    }, [expandedCategory, activeButtonEl]);

    useEffect(() => {
        updateDropupPosition();
        window.addEventListener('resize', updateDropupPosition);
        return () => window.removeEventListener('resize', updateDropupPosition);
    }, [updateDropupPosition]);

    useEffect(() => {
        if (!floatingPanel || !expandedCategory || !activeButtonEl) return;
        const subcategories = activeButtonEl.parentElement?.querySelector('.map-filter-dropup-inline');
        subcategories?.scrollIntoView({ block: 'nearest' });
    }, [floatingPanel, expandedCategory, activeButtonEl]);

    // Close drop-up when clicking outside
    useEffect(() => {
        if (!expandedCategory) return;
        const handlePointerDown = (e: PointerEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) {
                setExpandedCategory(null);
                setActiveButtonEl(null);
                setDropupLeft(null);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown, true);
        return () => document.removeEventListener('pointerdown', handlePointerDown, true);
    }, [expandedCategory]);

    const handleToggleDropdown = (catId: CategoryId, chipEl: HTMLElement) => {
        triggerHaptic?.(15);
        if (expandedCategory === catId) {
            setExpandedCategory(null);
            setActiveButtonEl(null);
            setDropupLeft(null);
        } else {
            setExpandedCategory(catId);
            setActiveButtonEl(chipEl);
        }
    };

    const handleSubFlagTap = (flagId: string) => {
        triggerHaptic?.(15);
        setActiveMapFilter(flagId);
        setMapSearchQuery('');
        setExpandedCategory(null);
        setActiveButtonEl(null);
        setDropupLeft(null);
    };

    const handleClear = () => {
        triggerHaptic?.(10);
        setActiveMapFilter(null);
        setMapSearchQuery('');
        setExpandedCategory(null);
        setActiveButtonEl(null);
        setDropupLeft(null);
    };

    const handleStartSearch = () => {
        triggerHaptic?.(10);
        searchInputRef.current?.focus();
    };

    const activeCatObj = expandedCategory ? CATEGORIES.find(c => c.id === expandedCategory) : null;

    return (
        <div
            ref={barRef}
            className={`map-filter-bar ${isCollapsed ? 'collapsed' : ''} ${floatingPanel ? 'floating-find-panel' : ''}`}
            style={floatingPanel ? {
                top: floatingPosition
                    ? `clamp(8px, ${floatingPosition.y}px, max(8px, calc(100% - 420px)))`
                    : '12px',
                left: floatingPosition
                    ? `clamp(8px, ${floatingPosition.x}px, max(8px, calc(100% - 296px)))`
                    : '12px',
                transform: 'none',
                maxHeight: 'calc(100% - 16px)'
            } : undefined}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            role="search"
            aria-label="Map Search and Filters"
        >
            {/* Subflags Dropup Panel */}
            {activeCatObj && !floatingPanel && (
                <MapFilterSubflagsDropup
                    category={activeCatObj}
                    activeMapFilter={activeMapFilter}
                    dropupLeft={dropupLeft}
                    onSelectSubFlag={handleSubFlagTap}
                />
            )}

            {/* Top Row: Z-Readout, Search Button, Active Pill, Clear, Collapse Toggle */}
            <div className="map-filter-top-row">
                {showZIndicator && (
                    <>
                        <div className="map-filter-z-readout" title={`Elevation Z: ${zDisplay}`}>
                            <span className="z-label">Z:</span>
                            <strong className={`z-val ${zDisplay !== '0.0' ? 'non-zero' : ''}`}>{zDisplay}</strong>
                        </div>
                        <span className="map-filter-divider" aria-hidden="true">·</span>
                    </>
                )}

                <button
                    type="button"
                    className="map-filter-search-btn"
                    onClick={handleStartSearch}
                    title="Focus map search"
                    aria-label="Focus map search"
                >
                    <span className="map-filter-prompt" aria-hidden="true">&gt;</span>
                    <Search size={11} aria-hidden="true" />
                    <span className="map-filter-prompt-label">FIND</span>
                </button>

                <input
                    ref={searchInputRef}
                    type="search"
                    className="map-filter-search-input"
                    value={mapSearchQuery}
                    onChange={event => setMapSearchQuery(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Escape') setMapSearchQuery('');
                    }}
                    placeholder="Type what you're looking for…"
                    aria-label="Find rooms on the map"
                />

                {activeFilterLabel && (
                    <div className="map-filter-active-pill" title={`Active filter: ${activeFilterLabel}`}>
                        <span>[{activeFilterLabel}]</span>
                    </div>
                )}

                {hasActive && (
                    <button
                        type="button"
                        className="map-filter-clear-btn"
                        onClick={handleClear}
                        title="Clear filter and search"
                        aria-label="Clear filter and search"
                    >
                        [clear]
                    </button>
                )}

                {onClose ? (
                    <button type="button" className="map-filter-close-btn" onClick={onClose} aria-label="Close map finder" title="Close map finder">
                        <X size={17} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="map-filter-toggle-btn"
                        onClick={() => {
                            triggerHaptic?.(10);
                            const nextExpanded = isCollapsed;
                            if (onExpandedChange) onExpandedChange(nextExpanded);
                            else setLocalIsCollapsed(!nextExpanded);
                            if (!nextExpanded) setExpandedCategory(null);
                        }}
                        title={isCollapsed ? 'Show filter categories' : 'Hide filter categories'}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand filter categories' : 'Collapse filter categories'}
                    >
                        {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                )}
            </div>

            {/* Category Controls */}
            {!isCollapsed && (
                <div
                    className="map-filter-chips-row"
                    role="toolbar"
                    aria-label="Map Filter Categories"
                    onWheel={e => {
                        if (e.deltaY !== 0) {
                            e.currentTarget.scrollLeft += e.deltaY;
                            updateDropupPosition();
                        }
                    }}
                    onScroll={updateDropupPosition}
                >
                    {CATEGORIES.map(cat => {
                        const isCatActive = activeCategory === cat.id;
                        const isExpanded = expandedCategory === cat.id;
                        const categoryChip = (
                            <div className={`map-filter-chip ${isCatActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}>
                                <span className="chip-bracket">[</span>
                                <button
                                    type="button"
                                    className="map-filter-chip-main"
                                    title={`Choose a ${cat.label} subcategory`}
                                    aria-haspopup="listbox"
                                    aria-expanded={isExpanded}
                                    onClick={(e) => handleToggleDropdown(cat.id, e.currentTarget.parentElement!)}
                                >
                                    <span className="map-filter-chip-symbol" aria-hidden="true">{cat.symbol}</span>
                                    <span className="map-filter-chip-label">{cat.label}</span>
                                </button>
                                <button
                                    type="button"
                                    className="map-filter-chip-chevron"
                                    title={`Toggle ${cat.label} sub-filters`}
                                    aria-haspopup="listbox"
                                    aria-expanded={isExpanded}
                                    onClick={(e) => handleToggleDropdown(cat.id, e.currentTarget.parentElement!)}
                                >
                                    ▾
                                </button>
                                <span className="chip-bracket">]</span>
                            </div>
                        );
                        if (!floatingPanel) return React.cloneElement(categoryChip, { key: cat.id });
                        return (
                            <div key={cat.id} className="map-filter-category-group">
                                {categoryChip}
                                {isExpanded && (
                                    <MapFilterSubflagsDropup
                                        category={cat}
                                        activeMapFilter={activeMapFilter}
                                        dropupLeft={null}
                                        onSelectSubFlag={handleSubFlagTap}
                                        inline
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
