/** @file ShopBrowseNavigation.tsx — Shared shop category and filter controls. */

import React from 'react';
import { SHOP_BROWSE_CATEGORIES } from './shopBrowseCategories';
import './ShopBrowseNavigation.css';

interface ShopBrowseNavigationProps {
    activeCategory: string;
    activeFilter: string;
    onCategorySelect: (categoryId: string) => void;
    onFilterSelect: (filterId: string) => void;
}

export const ShopBrowseNavigation: React.FC<ShopBrowseNavigationProps> = ({
    activeCategory,
    activeFilter,
    onCategorySelect,
    onFilterSelect,
}) => {
    const activeCategoryDefinition = SHOP_BROWSE_CATEGORIES.find(category => category.id === activeCategory);
    const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, action: () => void) => {
        event.stopPropagation();
        event.preventDefault();
        action();
    };

    return <>
        <nav className="shop-target-categories" aria-label="Shop categories">
            {SHOP_BROWSE_CATEGORIES.map(category => <button
                key={category.id}
                type="button"
                className={activeCategory === category.id ? 'active' : ''}
                aria-pressed={activeCategory === category.id}
                onPointerDown={event => handlePointerDown(event, () => onCategorySelect(category.id))}
                onClick={event => {
                    event.stopPropagation();
                    if (event.detail === 0) onCategorySelect(category.id);
                }}
            >{category.label}</button>)}
        </nav>
        {activeCategoryDefinition?.filters && <nav className="shop-target-filters" aria-label={`${activeCategoryDefinition.label} filters`}>
            {activeCategoryDefinition.filters.map(filter => <button
                key={filter.id}
                type="button"
                className={activeFilter === filter.id ? 'active' : ''}
                aria-pressed={activeFilter === filter.id}
                onPointerDown={event => handlePointerDown(event, () => onFilterSelect(filter.id))}
                onClick={event => {
                    event.stopPropagation();
                    if (event.detail === 0) onFilterSelect(filter.id);
                }}
            >{filter.label}</button>)}
        </nav>}
    </>;
};
