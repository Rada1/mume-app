/**
 * @file ShaperObjectsPanel.tsx
 * @description Searchable and filterable database for MUME objects with stats.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Search, Copy, Check, Plus } from 'lucide-react';
import { setEntityDragData } from './shaperEntityDrag';

interface ObjectEntity {
    vnum: number;
    name: string;
    type: string;
    weight: number;
    value: number;
    extraFlags: string[];
    wearFlags: string[];
    rawText: string;
}

interface ShaperObjectsPanelProps {
    onAddToRoom?: (vnum: string, name: string) => void;
    roomLabel?: string;
}

// --- Component Section ---
export const ShaperObjectsPanel: React.FC<ShaperObjectsPanelProps> = ({ onAddToRoom, roomLabel }) => {
    const [objects, setObjects] = useState<ObjectEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [maxWeight, setMaxWeight] = useState<string>('');
    const [selectedType, setSelectedType] = useState('ALL');
    const [expandedVnum, setExpandedVnum] = useState<number | null>(null);
    const [copiedVnum, setCopiedVnum] = useState<number | null>(null);

    useEffect(() => {
        fetch('/mume_entities_with_stats.json')
            .then(res => {
                if (!res.ok) throw new Error('Stats JSON not generated yet. Running stat scraper...');
                return res.json();
            })
            .then(data => {
                setObjects(data.objects || []);
                setLoading(false);
            })
            .catch(err => {
                // Try falling back to mume_usable_entities.json
                fetch('/mume_usable_entities.json')
                    .then(res2 => {
                        if (!res2.ok) throw new Error('No entity lists found.');
                        return res2.json();
                    })
                    .then(data2 => {
                        const fallbackObjects = (data2.objects || []).map((item: string) => {
                            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
                            return {
                                vnum: match ? parseInt(match[1], 10) : 0,
                                name: match ? match[2] : item,
                                type: 'UNKNOWN',
                                weight: 0,
                                value: 0,
                                extraFlags: [],
                                wearFlags: [],
                                rawText: 'Stats details are currently being scraped in the background. Check back in a moment!'
                            };
                        });
                        setObjects(fallbackObjects);
                        setLoading(false);
                    })
                    .catch(err2 => {
                        setError(err.message + ' | ' + err2.message);
                        setLoading(false);
                    });
            });
    }, []);

    const types = useMemo(() => {
        const set = new Set<string>();
        objects.forEach(o => {
            if (o.type) set.add(o.type.toUpperCase());
        });
        return ['ALL', ...Array.from(set).sort()];
    }, [objects]);

    const filteredObjects = useMemo(() => {
        return objects.filter(obj => {
            const matchesSearch = obj.name.toLowerCase().includes(search.toLowerCase()) || 
                                 obj.vnum.toString().includes(search);
            const matchesMaxWeight = maxWeight === '' || obj.weight <= parseInt(maxWeight, 10);
            const matchesType = selectedType === 'ALL' || obj.type.toUpperCase() === selectedType;

            return matchesSearch && matchesMaxWeight && matchesType;
        });
    }, [objects, search, maxWeight, selectedType]);

    const copyToClipboard = (vnum: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vnum.toString());
        setCopiedVnum(vnum);
        setTimeout(() => setCopiedVnum(null), 2000);
    };

    if (loading) return <div className="shaper-db-loading">Loading Objects database...</div>;
    if (error) return <div className="shaper-db-error">Error loading database: {error}</div>;

    return (
        <div className="shaper-db-panel">
            <div className="shaper-db-header">
                <h2>Objects Database</h2>
                <p>Showing {filteredObjects.length} of {objects.length} unique objects</p>
            </div>

            <div className="shaper-db-filters">
                <div className="shaper-search-wrapper">
                    <Search size={16} className="shaper-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by name or Vnum..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="shaper-filter-group">
                    <label>
                        <span>Max Weight</span>
                        <input
                            type="number"
                            placeholder="e.g. 10"
                            value={maxWeight}
                            onChange={e => setMaxWeight(e.target.value)}
                            min={0}
                        />
                    </label>

                    <label>
                        <span>Type</span>
                        <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="shaper-db-list">
                {filteredObjects.map(obj => {
                    const isExpanded = expandedVnum === obj.vnum;
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
                                    {obj.type !== 'UNKNOWN' && <span className="shaper-badge type">{obj.type}</span>}
                                    {obj.weight > 0 && <span className="shaper-badge weight">{obj.weight} lbs</span>}
                                    {obj.value > 0 && <span className="shaper-badge value">{obj.value} copper</span>}
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
                                    {obj.extraFlags.length > 0 && (
                                        <div className="shaper-detail-flags">
                                            <strong>Extra: </strong>
                                            {obj.extraFlags.join(', ')}
                                        </div>
                                    )}
                                    {obj.wearFlags.length > 0 && (
                                        <div className="shaper-detail-flags">
                                            <strong>Wear: </strong>
                                            {obj.wearFlags.join(', ')}
                                        </div>
                                    )}
                                    <span>Raw /stat output:</span>
                                    <pre className="shaper-db-stat-pre">{obj.rawText}</pre>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
