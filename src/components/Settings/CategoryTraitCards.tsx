/**
 * @file CategoryTraitCards.tsx
 * @description Compact category -> traits -> buttons cards for settings.
 */

import React from 'react';
import { Plus, X } from 'lucide-react';
import { CategoryOverride, CustomTraitConfig, EntityKind } from '../../types';
import { useButtonStore } from '../../stores/useButtonStore';
import {
    getAllTraits,
    getCategoryConfig,
    getTraitsForCategoryWithOverrides,
    TraitConfig,
    toCategoryId,
    toTraitId
} from '../../utils/inlineActionModel';

interface CategoryTraitCardsProps {
    categoryId: string;
    kind: EntityKind;
    categoryOverrides: CategoryOverride[];
    setCategoryOverrides: (val: CategoryOverride[] | ((prev: CategoryOverride[]) => CategoryOverride[])) => void;
    customTraits: CustomTraitConfig[];
    setCustomTraits: (val: CustomTraitConfig[] | ((prev: CustomTraitConfig[]) => CustomTraitConfig[])) => void;
}

const buildTraitId = (name: string): string => (
    `trait-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
);

const CategoryTraitCards: React.FC<CategoryTraitCardsProps> = ({
    categoryId,
    kind,
    categoryOverrides,
    setCategoryOverrides,
    customTraits,
    setCustomTraits
}) => {
    const { rawButtons } = useButtonStore();
    const inlineActionConfigs = React.useMemo(
        () => [...categoryOverrides, ...customTraits],
        [categoryOverrides, customTraits]
    );

    // --- Derived Data ---
    const category = React.useMemo(() => getCategoryConfig(categoryId), [categoryId]);
    const canonicalCategoryId = category?.id || toCategoryId(categoryId) || categoryId;
    const defaultTraitIds = React.useMemo(() => new Set(category?.defaultTraitIds || []), [category]);
    const traits = React.useMemo(
        () => getTraitsForCategoryWithOverrides(categoryId, inlineActionConfigs),
        [categoryId, inlineActionConfigs]
    );
    const allTraits = React.useMemo(() => getAllTraits(customTraits), [customTraits]);
    const buttonLabelById = React.useMemo(() => new Map(rawButtons.map(button => [button.id, button.label])), [rawButtons]);

    // --- Logic Section ---
    const upsertCategoryTraitIds = (traitIds: string[]) => {
        setCategoryOverrides(prev => {
            const overrides = Array.isArray(prev) ? prev : [];
            const existing = overrides.find(config => (toCategoryId(config.id) || config.id) === canonicalCategoryId);
            const override: CategoryOverride = {
                ...(existing || {
                    id: category?.id || categoryId,
                    kind
                }),
                defaultTraitIds: traitIds
            };

            return existing
                ? overrides.map(config => config === existing ? override : config)
                : [...overrides, override];
        });
    };

    const handleAddTrait = () => {
        const name = window.prompt('Trait to add:');
        if (!name?.trim()) return;

        const normalized = name.trim().toLowerCase();
        const existingTrait = allTraits.find(trait => (
            trait.id.toLowerCase() === normalized ||
            trait.label.toLowerCase() === normalized ||
            trait.id.toLowerCase() === toTraitId(normalized)
        ));
        const traitId = existingTrait?.id || buildTraitId(name);
        if (traitId === 'trait-') return;

        setCategoryOverrides(prev => {
            const overrides = Array.isArray(prev) ? prev : [];
            const currentTraitIds = traits.map(trait => trait.id);
            const nextTraitIds = currentTraitIds.includes(traitId) ? currentTraitIds : [...currentTraitIds, traitId];
            const existing = overrides.find(config => (toCategoryId(config.id) || config.id) === canonicalCategoryId);
            const override: CategoryOverride = {
                ...(existing || {
                    id: category?.id || categoryId,
                    kind
                }),
                defaultTraitIds: nextTraitIds
            };
            return existing
                ? overrides.map(config => config === existing ? override : config)
                : [...overrides, override];
        });

        if (!existingTrait && !customTraits.some(config => config.id === traitId)) {
            setCustomTraits(prev => [...(Array.isArray(prev) ? prev : []), { id: traitId, kind, keywords: [] }]);
        }
    };

    const handleRemoveTrait = (id: string) => {
        upsertCategoryTraitIds(traits.map(trait => trait.id).filter(traitId => traitId !== id));
    };

    // --- Render Section ---
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {traits.map(trait => {
                const isDefault = defaultTraitIds.has(trait.id);
                const buttonLabels = getButtonLabels(trait, buttonLabelById);
                return (
                    <div
                        key={trait.id}
                        title={`${trait.label}: ${buttonLabels || 'No buttons assigned'}`}
                        style={{
                            position: 'relative',
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: '6px',
                            padding: '4px 20px 4px 8px',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-primary)',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            minHeight: '20px'
                        }}
                    >
                        {trait.label.toUpperCase()}
                        {isDefault && <span style={{ opacity: 0.45, marginLeft: '5px' }}>DEFAULT</span>}
                        <span style={{ opacity: 0.45, marginLeft: '5px', fontWeight: 500 }}>
                            {buttonLabels}
                        </span>
                        <button
                            onClick={() => handleRemoveTrait(trait.id)}
                            title="Remove trait from category"
                            style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                width: '14px',
                                height: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: 'none',
                                borderRadius: '3px',
                                background: 'rgba(0,0,0,0.25)',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <X size={10} />
                        </button>
                    </div>
                );
            })}
            <button
                onClick={handleAddTrait}
                title="Add trait"
                style={{
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px dashed rgba(255,255,255,0.24)',
                    borderRadius: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--accent)',
                    cursor: 'pointer',
                    padding: 0
                }}
            >
                <Plus size={13} />
            </button>
        </div>
    );
};

const getButtonLabels = (trait: TraitConfig, buttonLabelById: Map<string, string>): string => (
    trait.buttonIds
        .map(buttonId => buttonLabelById.get(buttonId) || buttonId.replace(/^btn-/, ''))
        .join(', ')
);

export default CategoryTraitCards;
