import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { InlineCategoryConfig } from '../../types';

interface CategorySettingsProps {
    categories: InlineCategoryConfig[];
    setCategories: (cats: InlineCategoryConfig[]) => void;
}

const CategorySettings: React.FC<CategorySettingsProps> = ({ categories, setCategories }) => {
    const [newId, setNewId] = useState('');
    // Track local string values to allow typing commas/spaces without immediate "collapsing"
    const [localValueMap, setLocalValueMap] = useState<Record<string, string>>({});

    // Sync local values when categories change externally (e.g. on load)
    useEffect(() => {
        const newMap = { ...localValueMap };
        let changed = false;
        categories.forEach(cat => {
            const joined = cat.keywords.join(', ');
            // If we don't have a local value OR the local value normalized differs from the category, sync it
            const normalizedLocal = (localValueMap[cat.id] || '').split(',').map(k => k.trim()).filter(Boolean).join(', ');
            if (localValueMap[cat.id] === undefined || (normalizedLocal !== joined && !localValueMap[cat.id].endsWith(',') && !localValueMap[cat.id].endsWith(' '))) {
                newMap[cat.id] = joined;
                changed = true;
            }
        });
        if (changed) setLocalValueMap(newMap);
    }, [categories]);

    const handleAddCategory = () => {
        if (!newId) return;
        const id = newId.toLowerCase().replace(/\s+/g, '-');
        if (categories.find(c => c.id === id)) {
            alert('Category already exists');
            return;
        }

        const newCat: InlineCategoryConfig = {
            id,
            keywords: [],
            color: 'rgba(100, 255, 100, 0.5)'
        };

        setCategories([...categories, newCat]);
        setNewId('');
    };

    const handleRemoveCategory = (id: string) => {
        if (confirm(`Remove the "${id}" categorization? (The buttonset will remain in the manager)`)) {
            setCategories(categories.filter(c => c.id !== id));
            const newMap = { ...localValueMap };
            delete newMap[id];
            setLocalValueMap(newMap);
        }
    };

    const handleInputKeywords = (id: string, val: string) => {
        setLocalValueMap(prev => ({ ...prev, [id]: val }));

        // Only update the parent state if it's not a trailing separator
        if (!val.endsWith(',') && !val.endsWith(' ')) {
            const keywords = val.split(',').map(k => k.trim()).filter(Boolean);
            setCategories(categories.map(c => c.id === id ? { ...c, keywords } : c));
        }
    };

    const handleUpdateColor = (id: string, color: string) => {
        setCategories(categories.map(c => c.id === id ? { ...c, color } : c));
    };

    return (
        <div className="settings-section">
            <h3 className="settings-section-title">
                <Tag size={18} /> Inline Categorization
            </h3>
            <p className="settings-help">
                Map keywords in the log to specific buttonsets and glow colors.
                Categories are automatically prefixed with <code>inline-</code> in the Buttonset Manager.
            </p>

            <div className="categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                {categories.map(cat => (
                    <div key={cat.id} className="category-item" style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--accent)' }}>
                                {cat.id} <span style={{ opacity: 0.5, fontWeight: 'normal', fontSize: '0.8rem' }}>(inline-{cat.id})</span>
                            </div>
                            <button
                                onClick={() => handleRemoveCategory(cat.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--ansi-red)', cursor: 'pointer', padding: '5px' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label className="setting-label" style={{ fontSize: '0.8rem' }}>Keywords (comma separated)</label>
                            <input
                                type="text"
                                className="setting-input"
                                value={localValueMap[cat.id] ?? cat.keywords.join(', ')}
                                onChange={(e) => handleInputKeywords(cat.id, e.target.value)}
                                placeholder="e.g. meat, bread, lembas"
                                onBlur={() => {
                                    // Final cleanup on blur
                                    const val = localValueMap[cat.id] || '';
                                    const keywords = val.split(',').map(k => k.trim()).filter(Boolean);
                                    setCategories(categories.map(c => c.id === cat.id ? { ...c, keywords } : c));
                                    setLocalValueMap(prev => ({ ...prev, [cat.id]: keywords.join(', ') }));
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="setting-label" style={{ fontSize: '0.8rem' }}>Glow Color</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={cat.color?.startsWith('rgba') ? '#ffffff' : (cat.color || '#4ade80')}
                                        onChange={(e) => handleUpdateColor(cat.id, e.target.value)}
                                        style={{ width: '40px', height: '24px', padding: 0, border: 'none', background: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        className="setting-input"
                                        value={cat.color || ''}
                                        onChange={(e) => handleUpdateColor(cat.id, e.target.value)}
                                        placeholder="rgba(0,0,0,0.5)"
                                        style={{ flex: 1, fontSize: '0.8rem' }}
                                    />
                                </div>
                            </div>
                            <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '50%',
                                background: cat.color || 'transparent',
                                boxShadow: cat.color ? `0 0 10px ${cat.color}` : 'none',
                                marginTop: '20px'
                            }} />
                        </div>
                    </div>
                ))}

                <div className="add-category" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <input
                        type="text"
                        className="setting-input"
                        value={newId}
                        onChange={(e) => setNewId(e.target.value)}
                        placeholder="New category name (e.g. potion)"
                    />
                    <button
                        className="btn-primary"
                        onClick={handleAddCategory}
                        style={{ width: 'auto', padding: '0 15px' }}
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategorySettings;
