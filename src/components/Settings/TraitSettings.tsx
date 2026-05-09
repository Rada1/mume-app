/**
 * @file TraitSettings.tsx
 * @description UI for managing default and custom entity traits.
 */

import React from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { CustomTraitConfig } from '../../types';
import { useButtonStore } from '../../stores/useButtonStore';
import { DEFAULT_TRAIT_CONFIGS, TraitConfig, inlineConfigToTrait, isTraitConfigRecord } from '../../utils/inlineActionModel';

interface TraitSettingsProps {
    customTraits: CustomTraitConfig[];
    setCustomTraits: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
}

const TraitSettings: React.FC<TraitSettingsProps> = ({ customTraits: rawCustomTraits, setCustomTraits }) => {
    const customTraits = Array.isArray(rawCustomTraits) ? rawCustomTraits : [];
    const [newTraitName, setNewTraitName] = React.useState('');
    const { rawButtons } = useButtonStore();

    // --- Derived Data ---
    const defaultIds = React.useMemo(() => new Set(DEFAULT_TRAIT_CONFIGS.map(c => c.id)), []);
    const buttonLabelById = React.useMemo(() => new Map(rawButtons.map(button => [button.id, button.label])), [rawButtons]);
    const visibleTraits = React.useMemo(() => {
        const traitConfigs = customTraits.filter(isTraitConfigRecord);
        const customById = new Map(traitConfigs.map(config => [inlineConfigToTrait(config).id, config]));
        const mergedDefaults = DEFAULT_TRAIT_CONFIGS.map(defaultTrait => ({
            ...defaultTrait,
            keywords: customById.get(defaultTrait.id)?.keywords || defaultTrait.keywords
        }));
        const customOnly = traitConfigs
            .map(inlineConfigToTrait)
            .filter(trait => !defaultIds.has(trait.id));
        return [...mergedDefaults, ...customOnly].sort((a, b) => a.label.localeCompare(b.label));
    }, [defaultIds, customTraits]);

    // --- Logic Section ---
    const upsertTraitOverride = (trait: TraitConfig) => {
        setCustomTraits(prev => {
            const traits = Array.isArray(prev) ? prev : [];
            const exists = traits.some(c => isTraitConfigRecord(c) && inlineConfigToTrait(c).id === trait.id);
            const stored: CustomTraitConfig = {
                id: trait.id,
                kind: trait.kind || 'object',
                keywords: trait.keywords || [],
                buttonIds: trait.buttonIds || []
            };
            return exists
                ? traits.map(c => isTraitConfigRecord(c) && inlineConfigToTrait(c).id === trait.id ? stored : c)
                : [...traits, stored];
        });
    };

    const handleDeleteTrait = (id: string) => {
        setCustomTraits(prev => Array.isArray(prev) ? prev.filter(c => !isTraitConfigRecord(c) || inlineConfigToTrait(c).id !== id) : []);
    };

    const handleRemoveKeyword = (trait: TraitConfig, keyword: string) => {
        upsertTraitOverride({
            ...trait,
            keywords: (trait.keywords || []).filter(k => k.toLowerCase() !== keyword.toLowerCase())
        });
    };

    const handleAddTrait = () => {
        if (!newTraitName.trim()) return;
        const id = `trait-${newTraitName.toLowerCase().replace(/\s+/g, '-')}`;

        setCustomTraits(prev => {
            const traits = Array.isArray(prev) ? prev : [];
            if (visibleTraits.find(c => c.id === id)) return traits;
            return [...traits, { id, kind: 'object', keywords: [], buttonIds: [] }];
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
                    const hasCustomOverride = customTraits.some(c => isTraitConfigRecord(c) && inlineConfigToTrait(c).id === trait.id);
                    const buttonLabels = trait.buttonIds
                        .map(buttonId => buttonLabelById.get(buttonId) || buttonId.replace(/^btn-/, ''))
                        .join(', ');

                    return (
                        <div
                            key={trait.id}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                padding: '12px',
                                borderLeft: '4px solid var(--accent)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>
                                    {trait.label.toUpperCase()}
                                    <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '8px', fontWeight: 'normal' }}>
                                        {trait.kind ? `(${trait.kind})` : ''}
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
                                <label style={{ fontSize: '0.7rem', opacity: 0.6, display: 'block', marginBottom: '4px' }}>Buttons Provided By This Trait</label>
                                <div style={{ fontSize: '0.78rem', opacity: buttonLabels ? 0.9 : 0.35, lineHeight: 1.35 }}>
                                    {buttonLabels || 'No buttons assigned yet'}
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
