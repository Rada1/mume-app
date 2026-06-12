/**
 * @file ShaperMobilesPanel.tsx
 * @description Searchable and filterable database for MUME mobiles with stats.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Search, Copy, Check, Plus } from 'lucide-react';
import { setEntityDragData } from './shaperEntityDrag';

interface MobileEntity {
    vnum: number;
    name: string;
    level: number;
    class: string;
    align: number;
    rawText: string;
    info?: string | null;
}

interface ShaperMobilesPanelProps {
    onAddToRoom?: (vnum: string, name: string) => void;
    roomLabel?: string;
}

// --- Component Section ---
export const ShaperMobilesPanel: React.FC<ShaperMobilesPanelProps> = ({ onAddToRoom, roomLabel }) => {
    const [mobiles, setMobiles] = useState<MobileEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [minLevel, setMinLevel] = useState<string>('');
    const [maxLevel, setMaxLevel] = useState<string>('');
    const [selectedClass, setSelectedClass] = useState('ALL');
    const [expandedVnum, setExpandedVnum] = useState<number | null>(null);
    const [copiedVnum, setCopiedVnum] = useState<number | null>(null);
    const [displayLimit, setDisplayLimit] = useState(100);

    useEffect(() => {
        setDisplayLimit(100);
    }, [search, minLevel, maxLevel, selectedClass]);

    useEffect(() => {
        fetch('/mume_entities_with_stats.json')
            .then(res => {
                if (!res.ok) throw new Error('Stats JSON not generated yet. Running stat scraper...');
                return res.json();
            })
            .then(data => {
                setMobiles(data.mobiles || []);
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
                        const fallbackMobiles = (data2.mobiles || []).map((item: string) => {
                            const match = item.match(/^\s*(\d+)\s*:\s*(.*)$/);
                            return {
                                vnum: match ? parseInt(match[1], 10) : 0,
                                name: match ? match[2] : item,
                                level: 0,
                                class: 'UNKNOWN',
                                align: 0,
                                rawText: 'Stats details are currently being scraped in the background. Check back in a moment!'
                            };
                        });
                        setMobiles(fallbackMobiles);
                        setLoading(false);
                    })
                    .catch(err2 => {
                        setError(err.message + ' | ' + err2.message);
                        setLoading(false);
                    });
            });
    }, []);

    const classes = useMemo(() => {
        const set = new Set<string>();
        mobiles.forEach(m => {
            if (m.class) set.add(m.class.toUpperCase());
        });
        return ['ALL', ...Array.from(set).sort()];
    }, [mobiles]);

    const filteredMobiles = useMemo(() => {
        return mobiles.filter(mob => {
            const matchesSearch = mob.name.toLowerCase().includes(search.toLowerCase()) || 
                                 mob.vnum.toString().includes(search);
            const matchesMinLevel = minLevel === '' || mob.level >= parseInt(minLevel, 10);
            const matchesMaxLevel = maxLevel === '' || mob.level <= parseInt(maxLevel, 10);
            const matchesClass = selectedClass === 'ALL' || mob.class.toUpperCase() === selectedClass;

            return matchesSearch && matchesMinLevel && matchesMaxLevel && matchesClass;
        });
    }, [mobiles, search, minLevel, maxLevel, selectedClass]);

    const copyToClipboard = (vnum: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vnum.toString());
        setCopiedVnum(vnum);
        setTimeout(() => setCopiedVnum(null), 2000);
    };

    if (loading) return <div className="shaper-db-loading">Loading Mobiles database...</div>;
    if (error) return <div className="shaper-db-error">Error loading database: {error}</div>;

    return (
        <div className="shaper-db-panel">
            <div className="shaper-db-header">
                <h2>Mobiles Database</h2>
                <p>Showing {filteredMobiles.length} of {mobiles.length} unique mobiles</p>
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
                        <span>Min Lvl</span>
                        <input
                            type="number"
                            value={minLevel}
                            onChange={e => setMinLevel(e.target.value)}
                            min={0}
                        />
                    </label>

                    <label>
                        <span>Max Lvl</span>
                        <input
                            type="number"
                            value={maxLevel}
                            onChange={e => setMaxLevel(e.target.value)}
                            min={0}
                        />
                    </label>

                    <label>
                        <span>Class</span>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                </div>
            </div>

            <div className="shaper-db-list">
                {filteredMobiles.slice(0, displayLimit).map(mob => {
                    const isExpanded = expandedVnum === mob.vnum;
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
                                    {mob.level > 0 && <span className="shaper-badge level">Lvl {mob.level}</span>}
                                    {mob.class !== 'UNKNOWN' && <span className="shaper-badge class">{mob.class}</span>}
                                    {mob.align !== 0 && (
                                        <span className={`shaper-badge align ${mob.align < 0 ? 'evil' : 'good'}`}>
                                            {mob.align}
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
                                    {mob.info && (
                                        <div style={{ marginBottom: '10px' }}>
                                            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#f0b45b' }}>MUD Info Notes:</strong>
                                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', borderLeft: '3px solid #f0b45b', fontSize: '12px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                                {mob.info}
                                            </div>
                                        </div>
                                    )}
                                    <span>Raw /stat output:</span>
                                    <pre className="shaper-db-stat-pre">{mob.rawText}</pre>
                                </div>
                            )}
                        </div>
                    );
                })}
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
