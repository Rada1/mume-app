/**
 * @file MapFilterBar.tsx
 * @description Overlay controls for filtering highlighted map rooms by flag type.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

// --- Configuration ---

type CategoryId = 'mounts' | 'shops' | 'guilds' | 'travel' | 'resources' | 'services' | 'danger' | 'mobs' | 'quests';

interface SubFlag {
    id: string;
    label: string;
}

interface Category {
    id: CategoryId;
    label: string;
    symbol: string;
    subFlags: SubFlag[];
}

const CATEGORIES: Category[] = [
    {
        id: 'mounts', label: 'Mounts', symbol: '♘',
        subFlags: [
            { id: 'HORSE', label: 'Horse' },
            { id: 'MULE', label: 'Mule' },
            { id: 'PACK_HORSE', label: 'Pack Horse' },
            { id: 'WARG', label: 'Warg' },
            { id: 'STABLE', label: 'Stable' },
        ]
    },
    {
        id: 'shops', label: 'Shops', symbol: '$',
        subFlags: [
            { id: 'SHOP', label: 'General' },
            { id: 'WEAPON_SHOP', label: 'Weapon' },
            { id: 'ARMOUR_SHOP', label: 'Armour' },
            { id: 'FOOD_SHOP', label: 'Food' },
            { id: 'PET_SHOP', label: 'Pet' },
        ]
    },
    {
        id: 'guilds', label: 'Guilds', symbol: 'G',
        subFlags: [
            { id: 'GUILD', label: 'General' },
            { id: 'WARRIOR_GUILD', label: 'Warrior' },
            { id: 'CLERIC_GUILD', label: 'Cleric' },
            { id: 'RANGER_GUILD', label: 'Ranger' },
            { id: 'MAGE_GUILD', label: 'Mage' },
            { id: 'SCOUT_GUILD', label: 'Scout' },
        ]
    },
    {
        id: 'travel', label: 'Travel', symbol: 'T',
        subFlags: [
            { id: 'BOAT', label: 'Boat' },
            { id: 'FERRY', label: 'Ferry' },
            { id: 'COACH', label: 'Coach' },
        ]
    },
    {
        id: 'resources', label: 'Resources', symbol: '♣',
        subFlags: [
            { id: 'HERB', label: 'Herb' },
            { id: 'WATER', label: 'Water' },
            { id: 'FOOD', label: 'Food' },
        ]
    },
    {
        id: 'services', label: 'Services', symbol: 'R',
        subFlags: [
            { id: 'RENT', label: 'Inn' },
            { id: 'MAIL', label: 'Mail' },
        ]
    },
    {
        id: 'danger', label: 'Danger', symbol: '!',
        subFlags: [
            { id: 'DEATHTRAP', label: 'Deathtrap' },
        ]
    },
    {
        id: 'mobs', label: 'Enemies', symbol: 'X',
        subFlags: [
            { id: 'AGGRESSIVE_MOB', label: 'Aggressive' },
            { id: 'ELITE_MOB', label: 'Elite' },
            { id: 'SUPER_MOB', label: 'Supermob' },
        ]
    },
    {
        id: 'quests', label: 'Quests', symbol: '?',
        subFlags: [
            { id: 'QUEST_MOB', label: 'Quest Mobs' },
        ]
    },
];

const getCategoryForFilter = (filter: string | null): CategoryId | null => {
    if (!filter) return null;
    for (const cat of CATEGORIES) {
        if (cat.id === filter) return cat.id;
        if (cat.subFlags.some(sf => sf.id === filter)) return cat.id;
    }
    return null;
};

const getLabelForFilter = (filter: string | null): string | null => {
    if (!filter) return null;
    for (const cat of CATEGORIES) {
        if (cat.id === filter) return cat.label;
        const sf = cat.subFlags.find(f => f.id === filter);
        if (sf) return sf.label;
    }
    return null;
};

// --- Props ---

interface MapFilterBarProps {
    activeMapFilter: string | null;
    mapSearchQuery: string;
    setActiveMapFilter: React.Dispatch<React.SetStateAction<string | null>>;
    setMapSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    triggerHaptic?: (ms: number) => void;
}

// --- Component ---

export const MapFilterBar: React.FC<MapFilterBarProps> = ({
    activeMapFilter,
    mapSearchQuery,
    setActiveMapFilter,
    setMapSearchQuery,
    triggerHaptic
}) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [expandedCategory, setExpandedCategory] = useState<CategoryId | null>(null);
    const [activeButtonEl, setActiveButtonEl] = useState<HTMLElement | null>(null);
    const [dropupLeft, setDropupLeft] = useState<number | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    const activeCategory = getCategoryForFilter(activeMapFilter);
    const activeFilterLabel = getLabelForFilter(activeMapFilter);
    const hasActive = !!(activeMapFilter || mapSearchQuery.trim());

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

    // Close drop-up when tapping outside the bar
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

    const handleSelectCategory = (catId: CategoryId) => {
        triggerHaptic?.(15);
        if (activeMapFilter === catId) {
            setActiveMapFilter(null);
        } else {
            setActiveMapFilter(catId);
            setMapSearchQuery('');
        }
        setExpandedCategory(null);
        setActiveButtonEl(null);
        setDropupLeft(null);
    };

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

    const handleScroll = () => {
        updateDropupPosition();
    };

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (e.deltaY !== 0) {
            e.currentTarget.scrollLeft += e.deltaY;
            updateDropupPosition();
        }
    };

    return (
        <div
            ref={barRef}
            className={`map-filter-bar ${isCollapsed ? 'collapsed' : ''}`}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            {/* Collapse toggle */}
            <button
                type="button"
                className={`map-filter-parent ${hasActive ? 'has-active-filter' : ''}`}
                aria-expanded={!isCollapsed}
                title={isCollapsed ? 'Show map filters' : 'Hide map filters'}
                onClick={() => {
                    triggerHaptic?.(15);
                    setIsCollapsed(c => !c);
                    if (!isCollapsed) setExpandedCategory(null);
                }}
            >
                <Search size={14} strokeWidth={2.2} />
                <span>Find</span>
                {activeFilterLabel && <span className="map-filter-active-chip">{activeFilterLabel}</span>}
                <ChevronDown className="map-filter-chevron" size={14} strokeWidth={2.2} />
            </button>

            {!isCollapsed && (
                <>
                    {/* Active Drop-up panel rendered at the bar level to escape overflow-x clipping */}
                    {expandedCategory && dropupLeft !== null && (
                        <div
                            className="map-filter-dropup"
                            role="listbox"
                            aria-label={`${CATEGORIES.find(c => c.id === expandedCategory)?.label} sub-filters`}
                            style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 4px)',
                                left: `${dropupLeft}px`,
                                zIndex: 3100
                            }}
                        >
                            {CATEGORIES.find(c => c.id === expandedCategory)?.subFlags.map(sf => (
                                <button
                                    key={sf.id}
                                    type="button"
                                    className={`map-filter-subflag ${activeMapFilter === sf.id ? 'active' : ''}`}
                                    aria-pressed={activeMapFilter === sf.id}
                                    onClick={() => handleSubFlagTap(sf.id)}
                                >
                                    {sf.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search bar row */}
                    <div className="map-filter-search-row">
                        <input
                            className="map-filter-search"
                            value={mapSearchQuery}
                            onChange={e => setMapSearchQuery(e.target.value)}
                            placeholder="Search room notes..."
                            aria-label="Search room notes"
                        />
                        {hasActive && (
                            <button
                                type="button"
                                className="map-filter-clear"
                                onClick={handleClear}
                                title="Clear filter"
                                aria-label="Clear filter"
                            >
                                <X size={11} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {/* Category buttons */}
                    <div 
                        className="map-filter-buttons" 
                        role="toolbar" 
                        aria-label="Map filters"
                        onWheel={handleWheel}
                        onScroll={handleScroll}
                    >
                        {CATEGORIES.map(cat => {
                            const isCatActive = activeCategory === cat.id;
                            const isExpanded = expandedCategory === cat.id;
                            return (
                                <div key={cat.id} className="map-filter-category-wrap">
                                    <div className={`map-filter-button-chip ${isCatActive ? 'active' : ''} ${isExpanded ? 'expanded' : ''}`}>
                                        <button
                                            type="button"
                                            className="map-filter-button-main"
                                            title={`${cat.label} filter`}
                                            onClick={() => handleSelectCategory(cat.id)}
                                        >
                                            <span className="map-filter-symbol" aria-hidden="true">{cat.symbol}</span>
                                            <span className="map-filter-label">{cat.label}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="map-filter-button-chevron-target"
                                            title={`Toggle ${cat.label} sub-filters`}
                                            onClick={(e) => handleToggleDropdown(cat.id, e.currentTarget.parentElement!)}
                                        >
                                            <ChevronDown
                                                className={`map-filter-sub-chevron${isExpanded ? ' rotated' : ''}`}
                                                size={12}
                                                strokeWidth={2.2}
                                            />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};
