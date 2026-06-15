/**
 * @file ShaperZoneInfoPanel.tsx
 * @description Renders the Zone Info Keywords management panel for Shaper.
 */

import { useMemo, useState, useEffect } from 'react';
import type { ShaperWorkspaceDoc, ShaperZoneInfoKeyword } from '../model/shaperTypes';
import { generateShaperAsciiMap } from '../model/shaperAsciiMap';
import { generateShaperMobsReport } from '../model/shaperMobsKeyword';
import { generateShaperObjectsReport } from '../model/shaperObjectsKeyword';
import { useShaperEntityStore } from '../model/useShaperEntityStore';
import './ShaperZoneInfoPanel.css';

interface ShaperZoneInfoPanelProps {
    doc: ShaperWorkspaceDoc;
    viewZ: number;
    onAddKeyword: (keyword: string, body: string) => void;
    onUpdateKeyword: (id: string, keyword: string, body: string) => void;
    onDeleteKeyword: (id: string) => void;
    onRefreshKeyword?: (keyword: string) => void;
    onDiscoverKeywords?: () => void;
    importableKeywords?: string[];
    onImportAsciiMap?: (text: string) => void;
    onDeployKeyword?: (keyword: string, body: string) => void;
    isImporting?: boolean;
    isConnected?: boolean;
}

// --- Component Section ---
export const ShaperZoneInfoPanel: React.FC<ShaperZoneInfoPanelProps> = ({
    doc,
    viewZ,
    onAddKeyword,
    onUpdateKeyword,
    onDeleteKeyword,
    onRefreshKeyword,
    onDiscoverKeywords,
    importableKeywords = [],
    onImportAsciiMap,
    onDeployKeyword,
    isImporting = false,
    isConnected = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const mobileStats = useShaperEntityStore(state => state.mobileStats);
    const loadMobileStats = useShaperEntityStore(state => state.loadMobileStats);

    const uniqueMobVnums = useMemo(() => {
        const vnums = new Set<number>();
        Object.values(doc.commandNodes).forEach(node => {
            if (node.type === 'mobile' || node.type === 'follow') {
                const vnum = Number(node.fields.vnum);
                if (vnum && !isNaN(vnum)) {
                    vnums.add(vnum);
                }
            }
        });
        return Array.from(vnums);
    }, [doc.commandNodes]);

    const missingStatsCount = useMemo(() => {
        return uniqueMobVnums.filter(vnum => !mobileStats[vnum]).length;
    }, [uniqueMobVnums, mobileStats]);

    const objectStats = useShaperEntityStore(state => state.objectStats);
    const loadObjectStats = useShaperEntityStore(state => state.loadObjectStats);

    const uniqueObjVnums = useMemo(() => {
        const vnums = new Set<number>();
        Object.values(doc.commandNodes).forEach(node => {
            if (['object', 'hide', 'put', 'give', 'equip'].includes(node.type)) {
                const vnum = Number(node.fields.vnum);
                if (vnum && !isNaN(vnum)) {
                    vnums.add(vnum);
                }
            }
        });
        return Array.from(vnums);
    }, [doc.commandNodes]);

    const missingObjStatsCount = useMemo(() => {
        return uniqueObjVnums.filter(vnum => !objectStats[vnum]).length;
    }, [uniqueObjVnums, objectStats]);

    // Form states
    const [formKeyword, setFormKeyword] = useState('');
    const [formBody, setFormBody] = useState('');

    const keywordsList = useMemo(() => {
        return Object.values(doc.zoneInfoKeywords ?? {}).sort((a, b) =>
            a.keyword.localeCompare(b.keyword)
        );
    }, [doc.zoneInfoKeywords]);

    const filteredKeywords = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return keywordsList;
        return keywordsList.filter(item =>
            item.keyword.toLowerCase().includes(query) ||
            item.body.toLowerCase().includes(query)
        );
    }, [keywordsList, searchQuery]);

    const selectedItem = selectedId ? doc.zoneInfoKeywords[selectedId] : null;
    const pendingImportKeywords = useMemo(() => {
        const existing = new Set(Object.keys(doc.zoneInfoKeywords ?? {}));
        return importableKeywords
            .filter(keyword => !existing.has(keyword.toLowerCase()))
            .sort((a, b) => a.localeCompare(b));
    }, [doc.zoneInfoKeywords, importableKeywords]);

    // Auto-select imported keyword if user is adding it and it gets populated in background
    useEffect(() => {
        if (isAdding && formKeyword) {
            const key = formKeyword.trim().toLowerCase();
            if (doc.zoneInfoKeywords[key]) {
                setIsAdding(false);
                setSelectedId(key);
            }
        }
    }, [doc.zoneInfoKeywords, isAdding, formKeyword]);

    const startAdd = () => {
        setIsAdding(true);
        setIsEditing(false);
        setSelectedId(null);
        setFormKeyword('');
        setFormBody('');
    };

    const startEdit = (item: ShaperZoneInfoKeyword) => {
        setIsEditing(true);
        setIsAdding(false);
        setFormKeyword(item.keyword);
        setFormBody(item.body);
    };

    const handleSave = () => {
        const keywordTrim = formKeyword.trim();
        if (!keywordTrim) {
            window.alert('Keyword name cannot be empty.');
            return;
        }

        if (isAdding) {
            const exists = Object.keys(doc.zoneInfoKeywords).includes(keywordTrim.toLowerCase());
            if (exists) {
                window.alert(`Keyword "${keywordTrim}" already exists.`);
                return;
            }
            onAddKeyword(keywordTrim, formBody);
            setIsAdding(false);
            setSelectedId(keywordTrim.toLowerCase());
        } else if (isEditing && selectedId) {
            const existsOther = Object.keys(doc.zoneInfoKeywords).some(
                k => k !== selectedId && k === keywordTrim.toLowerCase()
            );
            if (existsOther) {
                window.alert(`Keyword "${keywordTrim}" already exists.`);
                return;
            }
            onUpdateKeyword(selectedId, keywordTrim, formBody);
            setIsEditing(false);
            setSelectedId(keywordTrim.toLowerCase());
        }
    };

    const handleDelete = (id: string, keyword: string) => {
        if (window.confirm(`Are you sure you want to delete the keyword "${keyword}"?`)) {
            onDeleteKeyword(id);
            if (selectedId === id) {
                setSelectedId(null);
                setIsEditing(false);
            }
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setIsEditing(false);
        if (selectedItem) {
            setFormKeyword(selectedItem.keyword);
            setFormBody(selectedItem.body);
        }
    };

    return (
        <div className="shaper-zone-info-panel">
            <div className="shaper-zone-info-header">
                <h2>Zone Keywords & Info</h2>
                {!isAdding && !isEditing && (
                    <button type="button" className="shaper-btn shaper-btn-primary" onClick={startAdd}>
                        + Add Keyword
                    </button>
                )}
            </div>

            <div className="shaper-zone-info-body">
                {/* Left Sidebar List */}
                <div className="shaper-zone-info-sidebar">
                    <input
                        type="text"
                        placeholder="Search keywords..."
                        className="shaper-zone-info-search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <div className="shaper-zone-info-list">
                        {filteredKeywords.length === 0 ? (
                            <div className="shaper-zone-info-empty-list">No keywords found</div>
                        ) : (
                            filteredKeywords.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`shaper-zone-info-item ${selectedId === item.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedId(item.id);
                                        setIsAdding(false);
                                        setIsEditing(false);
                                    }}
                                >
                                    {item.keyword}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Right detail view or editor */}
                <div className="shaper-zone-info-content">
                    {isAdding || isEditing ? (
                        <div className="shaper-zone-info-editor">
                            <div className="shaper-zone-info-field">
                                <label htmlFor="keyword-name-input">Keyword</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        id="keyword-name-input"
                                        type="text"
                                        value={formKeyword}
                                        onChange={e => setFormKeyword(e.target.value)}
                                        placeholder="e.g., asciimap"
                                        style={{ flex: 1 }}
                                        disabled={isEditing}
                                    />
                                    {isAdding && (
                                        <button
                                            type="button"
                                            className="shaper-btn shaper-btn-secondary"
                                            disabled={isImporting || !isConnected}
                                            onClick={() => {
                                                const keyword = formKeyword.trim();
                                                if (keyword) onRefreshKeyword?.(keyword);
                                                else onDiscoverKeywords?.();
                                            }}
                                            title={!isConnected ? 'Requires MUD connection' : formKeyword.trim() ? 'Import this keyword from MUD' : 'List importable keywords from MUD'}
                                        >
                                            {isImporting ? 'Importing...' : formKeyword.trim() ? 'Import from MUD' : 'List from MUD'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            {isAdding && pendingImportKeywords.length > 0 && (
                                <div className="shaper-zone-info-import-list">
                                    <span>Importable from MUD</span>
                                    <div>
                                        {pendingImportKeywords.map(keyword => (
                                            <button
                                                key={keyword}
                                                type="button"
                                                className="shaper-zone-info-import-keyword"
                                                disabled={isImporting || !isConnected}
                                                onClick={() => onRefreshKeyword?.(keyword)}
                                            >
                                                {keyword}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="shaper-zone-info-field" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label htmlFor="keyword-body-input">Body Content</label>
                                    <button
                                        type="button"
                                        className="shaper-btn shaper-btn-secondary shaper-btn-link"
                                        style={{ fontSize: '11px', padding: '2px 6px' }}
                                        onClick={() => {
                                            const mapText = generateShaperAsciiMap(doc, viewZ);
                                            setFormBody(prev => prev ? `${prev}\n\n${mapText}` : mapText);
                                        }}
                                    >
                                        Insert Connection Map (Z: {viewZ})
                                    </button>
                                </div>
                                <textarea
                                    id="keyword-body-input"
                                    className="shaper-zone-info-body-textarea"
                                    value={formBody}
                                    onChange={e => setFormBody(e.target.value)}
                                    placeholder="Enter documentation body..."
                                />
                            </div>
                            <div className="shaper-zone-info-actions">
                                <button type="button" className="shaper-btn shaper-btn-primary" onClick={handleSave}>
                                    Save Changes
                                </button>
                                <button type="button" className="shaper-btn shaper-btn-secondary" onClick={handleCancel}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : selectedItem ? (
                        <div className="shaper-zone-info-view">
                            <div className="shaper-zone-info-view-header">
                                <h3>{selectedItem.keyword}</h3>
                                <div className="shaper-zone-info-actions" style={{ margin: 0 }}>
                                    {selectedItem.keyword.toLowerCase() === 'asciimap' && onImportAsciiMap && (
                                        <button
                                            type="button"
                                            className="shaper-btn shaper-btn-primary"
                                            onClick={() => {
                                                if (window.confirm('This will overwrite room sectors and create new rooms on the current Z level based on the ASCII map. Continue?')) {
                                                    onImportAsciiMap(selectedItem.body);
                                                }
                                            }}
                                        >
                                            Generate Grid from ASCII Map
                                        </button>
                                    )}
                                    {selectedItem.keyword.toLowerCase() === 'map' && (
                                        <button
                                            type="button"
                                            className="shaper-btn shaper-btn-primary"
                                            onClick={() => {
                                                const mapText = generateShaperAsciiMap(doc, viewZ);
                                                startEdit(selectedItem);
                                                setFormBody(mapText);
                                            }}
                                        >
                                            Generate from Grid
                                        </button>
                                    )}
                                    {selectedItem.keyword.toLowerCase() === 'mobs' && (
                                        <>
                                            {missingStatsCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="shaper-btn shaper-btn-secondary"
                                                    disabled={!isConnected}
                                                    onClick={() => {
                                                        const missing = uniqueMobVnums.filter(vnum => !mobileStats[vnum]);
                                                        missing.forEach((vnum, index) => {
                                                            setTimeout(() => {
                                                                loadMobileStats(vnum);
                                                            }, index * 600);
                                                        });
                                                    }}
                                                    title={!isConnected ? 'Requires MUD connection' : 'Fetch missing levels from MUD'}
                                                >
                                                    Fetch Missing Levels ({missingStatsCount})
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="shaper-btn shaper-btn-primary"
                                                onClick={() => {
                                                    const reportText = generateShaperMobsReport(doc);
                                                    startEdit(selectedItem);
                                                    setFormBody(reportText);
                                                }}
                                            >
                                                Generate from Grid
                                            </button>
                                        </>
                                    )}
                                    {selectedItem.keyword.toLowerCase() === 'objects' && (
                                        <>
                                            {missingObjStatsCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="shaper-btn shaper-btn-secondary"
                                                    disabled={!isConnected}
                                                    onClick={() => {
                                                        const missing = uniqueObjVnums.filter(vnum => !objectStats[vnum]);
                                                        missing.forEach((vnum, index) => {
                                                            setTimeout(() => {
                                                                loadObjectStats(vnum);
                                                            }, index * 600);
                                                        });
                                                    }}
                                                    title={!isConnected ? 'Requires MUD connection' : 'Fetch missing levels from MUD'}
                                                >
                                                    Fetch Missing Levels ({missingObjStatsCount})
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="shaper-btn shaper-btn-primary"
                                                onClick={() => {
                                                    const reportText = generateShaperObjectsReport(doc);
                                                    startEdit(selectedItem);
                                                    setFormBody(reportText);
                                                }}
                                            >
                                                Generate from Grid
                                            </button>
                                        </>
                                    )}
                                    {onDeployKeyword && (
                                        <button
                                            type="button"
                                            className="shaper-btn shaper-btn-primary"
                                            disabled={isImporting || !isConnected}
                                            onClick={() => onDeployKeyword(selectedItem.keyword, selectedItem.body)}
                                            title={!isConnected ? 'Requires MUD connection' : 'Save keyword body to the MUD'}
                                        >
                                            Save to Game
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="shaper-btn shaper-btn-secondary"
                                        disabled={isImporting || !isConnected}
                                        onClick={() => onRefreshKeyword?.(selectedItem.keyword)}
                                        title={!isConnected ? 'Requires MUD connection' : 'Refresh from MUD'}
                                    >
                                        {isImporting ? 'Refreshing...' : 'Refresh from MUD'}
                                    </button>
                                    <button
                                        type="button"
                                        className="shaper-btn shaper-btn-secondary"
                                        onClick={() => startEdit(selectedItem)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="shaper-btn shaper-btn-danger"
                                        onClick={() => handleDelete(selectedItem.id, selectedItem.keyword)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="shaper-zone-info-view-body">
                                {selectedItem.body}
                            </div>
                        </div>
                    ) : (
                        <div className="shaper-zone-info-no-selection">
                            Select a keyword from the list or add a new one to view and edit zone keywords.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
