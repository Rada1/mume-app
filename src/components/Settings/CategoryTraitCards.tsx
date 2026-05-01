/**
 * @file CategoryTraitCards.tsx
 * @description Compact trait cards for category color settings.
 */

import React from 'react';
import { Plus, X } from 'lucide-react';
import { EntityKind, InlineCategoryConfig } from '../../types';
import { DEFAULT_INLINE_CATEGORIES } from '../../utils/categorizationUtils';

interface CategoryTraitCardsProps {
    categoryId: string;
    kind: EntityKind;
    inlineCategories: InlineCategoryConfig[];
    setInlineCategories: (val: InlineCategoryConfig[] | ((prev: InlineCategoryConfig[]) => InlineCategoryConfig[])) => void;
}

const formatTraitName = (id: string): string => (
    id.replace(/^inline-/, '').replace(/-/g, ' ').toUpperCase()
);

const buildTraitId = (name: string): string => (
    `inline-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
);

const getTraitBucket = (trait: InlineCategoryConfig): string => {
    if (trait.parent) return trait.parent;
    if (trait.id === 'inline-ally' || trait.id === 'inline-enemy' || trait.id === 'inline-neutral') return trait.id;
    if (trait.categoryType === 'target') return 'target';
    return trait.kind;
};

const CategoryTraitCards: React.FC<CategoryTraitCardsProps> = ({
    categoryId,
    kind,
    inlineCategories,
    setInlineCategories
}) => {
    // --- Derived Data ---
    const defaultIds = React.useMemo(() => new Set(DEFAULT_INLINE_CATEGORIES.map(c => c.id)), []);
    const traits = React.useMemo(() => {
        const customById = new Map(inlineCategories.map(c => [c.id, c]));
        const mergedDefaults = DEFAULT_INLINE_CATEGORIES
            .filter(c => !c.isGmcpCategory)
            .map(defaultTrait => ({
                ...defaultTrait,
                ...(customById.get(defaultTrait.id) || {})
            }));
        const customOnly = inlineCategories.filter(c => !defaultIds.has(c.id) && !c.isGmcpCategory);
        return [...mergedDefaults, ...customOnly].filter(trait => getTraitBucket(trait) === categoryId);
    }, [categoryId, defaultIds, inlineCategories]);

    // --- Logic Section ---
    const handleAddTrait = () => {
        const name = window.prompt('New trait name:');
        if (!name?.trim()) return;

        const id = buildTraitId(name);
        if (id === 'inline-') return;

        setInlineCategories(prev => {
            const categories = Array.isArray(prev) ? prev : [];
            if (categories.some(c => c.id === id) || DEFAULT_INLINE_CATEGORIES.some(c => c.id === id)) return categories;
            return [...categories, {
                id,
                kind,
                parent: categoryId !== kind ? categoryId : undefined,
                categoryType: categoryId === 'target' ? 'target' : undefined,
                keywords: [],
                color: undefined
            }];
        });
    };

    const handleRemoveTrait = (id: string) => {
        setInlineCategories(prev => (Array.isArray(prev) ? prev : []).filter(c => c.id !== id));
    };

    // --- Render Section ---
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
            {traits.map(trait => {
                const isDefault = defaultIds.has(trait.id);
                return (
                    <div
                        key={trait.id}
                        style={{
                            position: 'relative',
                            border: '1px solid rgba(255,255,255,0.14)',
                            borderRadius: '6px',
                            padding: isDefault ? '4px 8px' : '4px 20px 4px 8px',
                            background: 'rgba(255,255,255,0.06)',
                            color: 'var(--text-primary)',
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            lineHeight: 1.2,
                            minHeight: '20px'
                        }}
                    >
                        {formatTraitName(trait.id)}
                        {isDefault ? (
                            <span style={{ opacity: 0.45, marginLeft: '5px' }}>DEFAULT</span>
                        ) : (
                            <button
                                onClick={() => handleRemoveTrait(trait.id)}
                                title="Remove trait"
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
                        )}
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

export default CategoryTraitCards;
