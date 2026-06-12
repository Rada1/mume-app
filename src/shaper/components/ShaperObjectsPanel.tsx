/**
 * @file ShaperObjectsPanel.tsx
 * @description Searchable and filterable database for MUME objects with live stats.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Search, Copy, Check, Plus } from 'lucide-react';
import { setEntityDragData } from './shaperEntityDrag';
import { useShaperEntityStore, ObjectEntity } from '../model/useShaperEntityStore';
import { useVitalsStore } from '../../stores/useVitalsStore';

interface ShaperObjectsPanelProps {
    onAddToRoom?: (vnum: string, name: string) => void;
    roomLabel?: string;
}

// --- Component Section ---
export const ShaperObjectsPanel: React.FC<ShaperObjectsPanelProps> = ({ onAddToRoom, roomLabel }) => {
    const characterInfo = useVitalsStore(s => s.characterInfo);
    const isGod = useMemo(() => {
        const name = characterInfo?.name?.toLowerCase();
        return name === 'ellessar' || !!(characterInfo?.level && characterInfo.level >= 100);
    }, [characterInfo]);

    const objects = useShaperEntityStore(s => s.objects);
    const loadingObjects = useShaperEntityStore(s => s.loadingObjects);
    const searchObjects = useShaperEntityStore(s => s.searchObjects);
    const loadObjectStats = useShaperEntityStore(s => s.loadObjectStats);
    const loadingStats = useShaperEntityStore(s => s.loadingStats);
    const objectStats = useShaperEntityStore(s => s.objectStats);
    const objectsQuery = useShaperEntityStore(s => s.objectsQuery);
    const objectsError = useShaperEntityStore(s => s.objectsError);

    const [localSearch, setLocalSearch] = useState(objectsQuery);
    const [maxWeight, setMaxWeight] = useState<string>('');
    const [selectedType, setSelectedType] = useState('ALL');
    const [expandedVnum, setExpandedVnum] = useState<number | null>(null);
    const [copiedVnum, setCopiedVnum] = useState<number | null>(null);
    const [displayLimit, setDisplayLimit] = useState(100);

    // Debounce search query
    useEffect(() => {
        if (!isGod) return;
        const handler = setTimeout(() => {
            searchObjects(localSearch);
        }, 400);
        return () => clearTimeout(handler);
    }, [localSearch, searchObjects, isGod]);

    // Reset display limit on query or filter changes
    useEffect(() => {
        setDisplayLimit(100);
    }, [localSearch, maxWeight, selectedType]);

    // Query stats when expanding a card
    useEffect(() => {
        if (expandedVnum !== null && isGod) {
            loadObjectStats(expandedVnum);
        }
    }, [expandedVnum, loadObjectStats, isGod]);

    const types = useMemo(() => {
        const set = new Set<string>();
        objects.forEach(o => {
            if (o.type) set.add(o.type.toUpperCase());
        });
        return ['ALL', ...Array.from(set).sort()];
    }, [objects]);

    const filteredObjects = useMemo(() => {
        return objects.filter(obj => {
            const matchesMaxWeight = maxWeight === '' || obj.weight <= parseInt(maxWeight, 10);
            const matchesType = selectedType === 'ALL' || obj.type.toUpperCase() === selectedType;

            return matchesMaxWeight && matchesType;
        });
    }, [objects, maxWeight, selectedType]);

    const copyToClipboard = (vnum: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vnum.toString());
        setCopiedVnum(vnum);
        setTimeout(() => setCopiedVnum(null), 2000);
    };

    return (
        <div className="shaper-db-panel">
            <div className="shaper-db-header">
                <h2>Objects Database</h2>
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
                    <strong>Notice:</strong> Object search and stats lookup require an Ainu with appropriate access to be logged in. Live query features are currently disabled.
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
                        <span>Max Weight</span>
                        <input
                            type="number"
                            placeholder={isGod ? "e.g. 10" : ""}
                            value={maxWeight}
                            onChange={e => setMaxWeight(e.target.value)}
                            min={0}
                            disabled={!isGod}
                        />
                    </label>

                    <label>
                        <span>Type</span>
                        <select 
                            value={selectedType} 
                            onChange={e => setSelectedType(e.target.value)}
                            disabled={!isGod}
                        >
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="shaper-db-list">
                {loadingObjects ? (
                    <div className="shaper-db-loading">Searching live MUD database...</div>
                ) : objectsError ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.7, fontSize: '0.85rem' }}>
                        {objectsError}
                    </div>
                ) : !localSearch.trim() ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                        Type a keyword (e.g., 'sword', 'shield') to search live MUD objects.
                    </div>
                ) : localSearch.trim().length < 3 ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                        Type at least 3 characters to search live MUD objects (e.g. 'sword').
                    </div>
                ) : filteredObjects.length === 0 ? (
                    <div className="shaper-db-placeholder" style={{ padding: '20px', textAlign: 'center', opacity: 0.6, fontSize: '0.85rem' }}>
                        No objects found matching "{localSearch}".
                    </div>
                ) : (
                    filteredObjects.slice(0, displayLimit).map(obj => {
                        const isExpanded = expandedVnum === obj.vnum;
                        const isStatsLoading = loadingStats[obj.vnum];
                        const stats = objectStats[obj.vnum] || obj;

                        return (
                            <div
                                key={obj.vnum}
                                className={`shaper-db-card ${isExpanded ? 'expanded' : ''}`}
                                draggable
                                onDragStart={e => setEntityDragData(e, { kind: 'object', vnum: String(obj.vnum), name: obj.name })}
                                onClick={() => setExpandedVnum(isExpanded ? null : obj.vnum)}
                            >
                                <div className="shaper-db-card-summary">
                                    <span className="shaper-entity-vnum">{obj.vnum}</span>
                                    <span className="shaper-entity-name">{obj.name}</span>
                                    
                                    <div className="shaper-entity-badges">
                                        {stats.type !== 'UNKNOWN' && <span className="shaper-badge type">{stats.type}</span>}
                                        {stats.weight > 0 && <span className="shaper-badge weight">{stats.weight} lbs</span>}
                                        {stats.value > 0 && <span className="shaper-badge value">{stats.value} copper</span>}
                                    </div>

                                    {onAddToRoom && (
                                        <button
                                            type="button"
                                            className="shaper-add-room-btn"
                                            onClick={e => { e.stopPropagation(); onAddToRoom(String(obj.vnum), obj.name); }}
                                            title={roomLabel ? `Add to ${roomLabel}` : 'Add to selected room'}
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        className="shaper-copy-btn"
                                        onClick={e => copyToClipboard(obj.vnum, e)}
                                        title="Copy Vnum"
                                    >
                                        {copiedVnum === obj.vnum ? <Check size={14} className="copied" /> : <Copy size={14} />}
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
                {filteredObjects.length > displayLimit && (
                    <button
                        type="button"
                        className="shaper-load-more-btn"
                        onClick={() => setDisplayLimit(prev => prev + 100)}
                    >
                        Load More ({filteredObjects.length - displayLimit} remaining)
                    </button>
                )}
            </div>
        </div>
    );
};
