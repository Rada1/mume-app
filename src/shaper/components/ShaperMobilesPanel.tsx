/**
 * @file ShaperMobilesPanel.tsx
 * @description Searchable and filterable database for MUME mobiles with live stats.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Search, Copy, Check, Plus } from 'lucide-react';
import { setEntityDragData } from './shaperEntityDrag';
import { useShaperEntityStore, MobileEntity } from '../model/useShaperEntityStore';
import { useVitalsStore } from '../../stores/useVitalsStore';

interface ShaperMobilesPanelProps {
    onAddToRoom?: (vnum: string, name: string) => void;
    roomLabel?: string;
}

// --- Component Section ---
export const ShaperMobilesPanel: React.FC<ShaperMobilesPanelProps> = ({ onAddToRoom, roomLabel }) => {
    const characterInfo = useVitalsStore(s => s.characterInfo);
    const isGod = useMemo(() => {
        const name = characterInfo?.name?.toLowerCase();
        return name === 'ellessar' || !!(characterInfo?.level && characterInfo.level >= 100);
    }, [characterInfo]);

    const mobiles = useShaperEntityStore(s => s.mobiles);
    const loadingMobiles = useShaperEntityStore(s => s.loadingMobiles);
    const searchMobiles = useShaperEntityStore(s => s.searchMobiles);
    const loadMobileStats = useShaperEntityStore(s => s.loadMobileStats);
    const loadingStats = useShaperEntityStore(s => s.loadingStats);
    const mobileStats = useShaperEntityStore(s => s.mobileStats);
    const mobilesQuery = useShaperEntityStore(s => s.mobilesQuery);
    const mobilesError = useShaperEntityStore(s => s.mobilesError);

    const [localSearch, setLocalSearch] = useState(mobilesQuery);
    const [minLevel, setMinLevel] = useState<string>('');
    const [maxLevel, setMaxLevel] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [expandedVnum, setExpandedVnum] = useState<number | null>(null);
    const [copiedVnum, setCopiedVnum] = useState<number | null>(null);
    const [displayLimit, setDisplayLimit] = useState(100);

    // Debounce search query
    useEffect(() => {
        if (!isGod) return;
        const handler = setTimeout(() => {
            searchMobiles(localSearch);
        }, 400);
        return () => clearTimeout(handler);
    }, [localSearch, searchMobiles, isGod]);

    // Reset display limit on query or filter changes
    useEffect(() => {
        setDisplayLimit(100);
    }, [localSearch, minLevel, maxLevel, selectedClass]);

    // Query stats when expanding a card
    useEffect(() => {
        if (expandedVnum !== null && isGod) {
            loadMobileStats(expandedVnum);
        }
    }, [expandedVnum, loadMobileStats, isGod]);

    const classes = useMemo(() => {
        const set = new Set<string>();
        mobiles.forEach(m => {
            if (m.class) set.add(m.class.toUpperCase());
        });
        return ['ALL', ...Array.from(set).sort()];
    }, [mobiles]);

    const filteredMobiles = useMemo(() => {
        return mobiles.filter(mob => {
            const matchesMinLevel = minLevel === '' || mob.level >= parseInt(minLevel, 10);
            const matchesMaxLevel = maxLevel === '' || mob.level <= parseInt(maxLevel, 10);
            const matchesClass = selectedClass === 'ALL' || mob.class.toUpperCase() === selectedClass;

            return matchesMinLevel && matchesMaxLevel && matchesClass;
        });
    }, [mobiles, minLevel, maxLevel, selectedClass]);

    const copyToClipboard = (vnum: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vnum.toString());
        setCopiedVnum(vnum);
        setTimeout(() => setCopiedVnum(null), 2000);
    };

    return (
        <div className="shaper-db-panel">
            <div className="shaper-db-header">
                <h2>Mobiles Database</h2>
                <p>Real-time MUD lookup (requires an Ainu with appropriate access)</p>
            </div>

            {!isGod && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#fca5a5',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    marginBottom: '15px',
                    lineHeight: '1.4'
                }}>
                    <strong>Notice:</strong> Mobile search and stats lookup require an Ainu with appropriate access to be logged in. Live query features are currently disabled.
                </div>
            )}

            <div className="shaper-db-filters">
                <div className="shaper-search-wrapper">
                    <Search size={16} className="shaper-search-icon" />
                    <input
                        type="text"
                        placeholder={isGod ? "Search by name or Vnum..." : "Search disabled (requires Ainu access)..."}
                        value={localSearch}
                        onChange={e => setLocalSearch(e.target.value)}
                        disabled={!isGod}
                    />
                </div>

                <div className="shaper-filter-group">
                    <label>
                        <span>Min Lvl</span>
                        <input
                            type="number"
                            value={minLevel}
                            onChange={e => setMinLevel(e.target.value)}
                            min={0}
                            disabled={!isGod}
                        />
                    </label>

                    <label>
                        <span>Max Lvl</span>
                        <input
                            type="number"
                            value={maxLevel}
                            onChange={e => setMaxLevel(e.target.value)}
                            min={0}
                            disabled={!isGod}
                        />
                    </label>

                    <label>
                        <span>Class</span>
                        <select 
                            value={selectedClass} 
                            onChange={e => setSelectedClass(e.target.value)}
                            disabled={!isGod}
                        >
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="shaper-db-list">
                {loadingMobiles ? (
                    <div className="shaper-db-loading">Searching live MUD database...</div>
                ) : mobilesError ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.7, fontSize: '0.85rem' }}>
                        {mobilesError}
                    </div>
                ) : !localSearch.trim() ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                        Type a keyword (e.g., 'orc', 'troll') to search live MUD mobiles.
                    </div>
                ) : localSearch.trim().length < 3 ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                        Type at least 3 characters to search live MUD mobiles (e.g. 'orc').
                    </div>
                ) : filteredMobiles.length === 0 ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                        No mobiles found matching "{localSearch}".
                    </div>
                ) : (
                    filteredMobiles.slice(0, displayLimit).map(mob => {
                        const isExpanded = expandedVnum === mob.vnum;
                        const isStatsLoading = loadingStats[mob.vnum];
                        const stats = mobileStats[mob.vnum] || mob;

                        return (
                            <div
                                key={mob.vnum}
                                className={`shaper-db-card ${isExpanded ? 'expanded' : ''}`}
                                draggable
                                onDragStart={e => setEntityDragData(e, { kind: 'mob', vnum: String(mob.vnum), name: mob.name })}
                                onClick={() => setExpandedVnum(isExpanded ? null : mob.vnum)}
                            >
                                <div className="shaper-db-card-summary">
                                    <span className="shaper-entity-vnum">{mob.vnum}</span>
                                    <span className="shaper-entity-name">{mob.name}</span>
                                    
                                    <div className="shaper-entity-badges">
                                        {stats.level > 0 && <span className="shaper-badge level">Lvl {stats.level}</span>}
                                        {stats.class !== 'UNKNOWN' && <span className="shaper-badge class">{stats.class}</span>}
                                        {stats.align !== 0 && (
                                            <span className={`shaper-badge align ${stats.align < 0 ? 'evil' : 'good'}`}>
                                                {stats.align}
                                            </span>
                                        )}
                                    </div>

                                    {onAddToRoom && (
                                        <button
                                            type="button"
                                            className="shaper-add-room-btn"
                                            onClick={e => { e.stopPropagation(); onAddToRoom(String(mob.vnum), mob.name); }}
                                            title={roomLabel ? `Add to ${roomLabel}` : 'Add to selected room'}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="shaper-copy-btn"
                                        onClick={e => copyToClipboard(mob.vnum, e)}
                                        title="Copy Vnum"
                                    >
                                        {copiedVnum === mob.vnum ? <Check size={14} className="copied" /> : <Copy size={14} />}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="shaper-db-card-details" onClick={e => e.stopPropagation()}>
                                        {isStatsLoading ? (
                                            <div style={{ padding: '10px', fontSize: '12px', opacity: 0.6 }}>Loading stats from MUD...</div>
                                        ) : (
                                            <>
                                                {stats.info && (
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <strong style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#f0b45b' }}>MUD Info Notes:</strong>
                                                        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid #f0b45b', fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                                            {stats.info}
                                                        </div>
                                                    </div>
                                                )}
                                                <span>Raw /stat output:</span>
                                                <pre className="shaper-db-stat-pre">{stats.rawText}</pre>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                {filteredMobiles.length > displayLimit && (
                    <button
                        type="button"
                        className="shaper-load-more-btn"
                        onClick={() => setDisplayLimit(prev => prev + 100)}
                    >
                        Load More ({filteredMobiles.length - displayLimit} remaining)
                    </button>
                )}
            </div>
        </div>
    );
};
