/**
 * @file TraitSettings.tsx
 * @description UI for managing default and custom entity traits.
 */

import React from 'react';
import { Plus, Settings, Tag, Trash2 } from 'lucide-react';
import { InlineCategoryConfig } from '../../types';
import { DEFAULT_INLINE_CATEGORIES } from '../../utils/categorizationUtils';
import { useButtonStore } from '../../stores/useButtonStore';
import { CATEGORY_BUTTON_MAP } from '../../constants/buttons/inline';
import { useUI } from '../../context/GameContext';

interface TraitSettingsProps {
    inlineCategories: InlineCategoryConfig[];
    setInlineCategories: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
}

const TraitSettings: React.FC<TraitSettingsProps> = ({ inlineCategories: rawCategories, setInlineCategories }) => {
    const inlineCategories = Array.isArray(rawCategories) ? rawCategories : [];
    const [newTraitName, setNewTraitName] = React.useState('');
    const { rawButtons } = useButtonStore();
    const { setIsSetManagerOpen, setManagerSelectedSet, setIsSettingsOpen } = useUI();

    // --- Derived Data ---
    const defaultIds = React.useMemo(() => new Set(DEFAULT_INLINE_CATEGORIES.map(c => c.id)), []);
    const visibleTraits = React.useMemo(() => {
        const customById = new Map(inlineCategories.map(c => [c.id, c]));
        const mergedDefaults = DEFAULT_INLINE_CATEGORIES.map(defaultTrait => ({
            ...defaultTrait,
            ...(customById.get(defaultTrait.id) || {})
        }));
        const customOnly = inlineCategories.filter(c => !defaultIds.has(c.id));
        return [...mergedDefaults, ...customOnly];
    }, [defaultIds, inlineCategories]);

    const availableSetIds = React.useMemo(() => {
        const fromButtons = Array.from(new Set(rawButtons.map(b => b.setId)));
        const fromMap = Object.keys(CATEGORY_BUTTON_MAP);
        return Array.from(new Set([...fromButtons, ...fromMap])).sort();
    }, [rawButtons]);

    // --- Logic Section ---
    const upsertTraitOverride = (trait: InlineCategoryConfig) => {
        setInlineCategories(prev => {
            const categories = Array.isArray(prev) ? prev : [];
            const exists = categories.some(c => c.id === trait.id);
            return exists
                ? categories.map(c => c.id === trait.id ? trait : c)
                : [...categories, trait];
        });
    };

    const handleDeleteTrait = (id: string) => {
        setInlineCategories(prev => Array.isArray(prev) ? prev.filter(c => c.id !== id) : []);
    };

    const handleRemoveKeyword = (trait: InlineCategoryConfig, keyword: string) => {
        upsertTraitOverride({
            ...trait,
            keywords: (trait.keywords || []).filter(k => k.toLowerCase() !== keyword.toLowerCase())
        });
    };

    const handleUpdateSet = (trait: InlineCategoryConfig, setId: string) => {
        upsertTraitOverride({ ...trait, buttonSetId: setId || undefined });
    };

    const handleAddTrait = () => {
        if (!newTraitName.trim()) return;
        const id = `inline-${newTraitName.toLowerCase().replace(/\s+/g, '-')}`;

        setInlineCategories(prev => {
            const categories = Array.isArray(prev) ? prev : [];
            if (visibleTraits.find(c => c.id === id)) return categories;
            return [...categories, { id, kind: 'npc', keywords: [], color: '#ffcc00' }];
        });
        setNewTraitName('');
    };

    // --- Render Section ---
    return (
        <div className="trait-settings" style={{ padding: '8px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    placeholder="New trait name (e.g. Merchant)"
                    value={newTraitName}
                    onChange={(e) => setNewTraitName(e.target.value)}
                    style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '8px',
                        color: '#fff',
                        borderRadius: '4px'
                    }}
                />
                <button
                    onClick={handleAddTrait}
                    style={{
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <Plus size={16} /> Add
                </button>
            </div>

            <div className="trait-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {visibleTraits.map(trait => {
                    const isDefaultTrait = defaultIds.has(trait.id);
                    const hasCustomOverride = inlineCategories.some(c => c.id === trait.id);

                    return (
                        <div
                            key={trait.id}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                padding: '12px',
                                borderLeft: `4px solid ${trait.color || 'var(--accent)'}`
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: trait.color || '#fff' }}>
                                    {trait.id.replace('inline-', '').toUpperCase()}
                                    <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '8px', fontWeight: 'normal' }}>
                                        ({trait.kind})
                                    </span>
                                    {isDefaultTrait && (
                                        <span style={{ fontSize: '0.62rem', opacity: 0.45, marginLeft: '8px', fontWeight: 700 }}>
                                            {hasCustomOverride ? 'DEFAULT + OVERRIDE' : 'DEFAULT'}
                                        </span>
                                    )}
                                </div>
                                {!isDefaultTrait && (
                                    <button
                                        onClick={() => handleDeleteTrait(trait.id)}
                                        style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', opacity: 0.7 }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ fontSize: '0.7rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>Action Menu (Button Set)</label>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <select
                                        value={trait.buttonSetId || ''}
                                        onChange={(e) => handleUpdateSet(trait, e.target.value)}
                                        style={{
                                            flex: 1,
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            padding: '4px 8px',
                                            borderRadius: '4px'
                                        }}
                                    >
                                        <option value="">None (Default)</option>
                                        {availableSetIds.map(setId => (
                                            <option key={setId} value={setId}>{setId}</option>
                                        ))}
                                    </select>
                                    {trait.buttonSetId && (
                                        <button
                                            onClick={() => {
                                                setManagerSelectedSet(trait.buttonSetId!);
                                                setIsSetManagerOpen(true);
                                                setIsSettingsOpen(false);
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                background: 'rgba(255,255,255,0.1)',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                borderRadius: '4px',
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Edit buttons in this set"
                                        >
                                            <Settings size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(trait.keywords || []).length === 0 && (
                                    <div style={{ fontSize: '0.75rem', opacity: 0.3, fontStyle: 'italic' }}>No keywords assigned</div>
                                )}
                                {(trait.keywords || []).map(kw => (
                                    <div
                                        key={kw}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)',
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {kw}
                                        {!isDefaultTrait && (
                                            <span
                                                onClick={() => handleRemoveKeyword(trait, kw)}
                                                style={{ cursor: 'pointer', opacity: 0.5, marginLeft: '2px' }}
                                            >x</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {visibleTraits.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <Tag size={48} style={{ marginBottom: '12px', opacity: 0.2 }} />
                        <p>No traits available yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TraitSettings;
