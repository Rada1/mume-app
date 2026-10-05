/** @file ShopTargetMenu.tsx — Shop catalog presented inside the Buy target slot. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ExecuteCommand, ShopItem } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { ShopItemGroup } from './ShopItemGroup';
import { ShopBrowseNavigation } from './ShopBrowseNavigation';
import { SHOP_BROWSE_CATEGORIES } from './shopBrowseCategories';
import './ShopPanel.css';
import './ShopPanelTerminal.css';
import './ShopTargetMenu.css';

interface Props {
    executeCommand: ExecuteCommand;
    onSelectTarget: (target: string) => void;
    selectedTarget: string | null;
}

// --- Logic Section ---
export const ShopTargetMenu: React.FC<Props> = ({ executeCommand, onSelectTarget, selectedTarget }) => {
    const shopItems = useUIStore(state => state.shopItems);
    const shopVariants = useUIStore(state => state.shopVariants);
    const shopVariantRequest = useUIStore(state => state.shopVariantRequest);
    const setShopVariants = useUIStore(state => state.setShopVariants);
    const setShopVariantRequest = useUIStore(state => state.setShopVariantRequest);
    const shopkeeperName = useUIStore(state => state.shopkeeperName);
    const setShopItems = useUIStore(state => state.setShopItems);
    const [search, setSearch] = useState('');
    const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
    const [activeCategory, setActiveCategory] = useState('all');
    const [activeFilter, setActiveFilter] = useState('');

    useEffect(() => {
        executeCommand('list');
    }, [executeCommand]);

    const toggleProduct = useCallback((num: number) => {
        if (expandedProduct === num) {
            setExpandedProduct(null);
            return;
        }
        setExpandedProduct(num);
        setShopVariants(num, []);
        setShopVariantRequest(num);
        executeCommand(`list ${num}`);
    }, [executeCommand, expandedProduct, setShopVariantRequest, setShopVariants]);

    const filteredItems = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return shopItems;
        return shopItems.filter(item => item.name.toLowerCase().includes(query)
            || item.price.toLowerCase().includes(query)
            || String(item.num) === query);
    }, [search, shopItems]);

    const handleSelectItem = useCallback((item: ShopItem) => {
        onSelectTarget(String(item.num));
    }, [onSelectTarget]);

    const activeCategoryDefinition = SHOP_BROWSE_CATEGORIES.find(category => category.id === activeCategory);
    const runBrowseCommand = useCallback((command: string, categoryId: string, filterId = '') => {
        setActiveCategory(categoryId);
        setActiveFilter(filterId);
        setExpandedProduct(null);
        setSearch('');
        setShopItems([]);
        executeCommand(command);
    }, [executeCommand, setShopItems]);

    const handleCategorySelect = useCallback((categoryId: string) => {
        const category = SHOP_BROWSE_CATEGORIES.find(entry => entry.id === categoryId);
        if (!category) return;
        if (category.filters?.length) {
            setActiveCategory(category.id);
            setActiveFilter('');
            setExpandedProduct(null);
            setSearch('');
            setShopItems([]);
            const defaultFilter = category.filters.find(filter => filter.id === 'all-weapons');
            if (defaultFilter) runBrowseCommand(defaultFilter.command, category.id, defaultFilter.id);
            return;
        }
        if (category.command) runBrowseCommand(category.command, category.id);
    }, [runBrowseCommand, setShopItems]);

    // --- UI Section ---
    return <section className="shop-panel shop-target-menu" aria-label="Shop items to buy">
        <header className="shop-target-menu-header">
            <strong>SHOP</strong>
            <span>{shopkeeperName || 'Select an item to buy'}</span>
            <small>{shopItems.length} products</small>
        </header>
        <div className="shop-search-bar">
            <input
                className="shop-search-input"
                type="search"
                placeholder="Search items…"
                value={search}
                aria-label="Search shop items"
                onChange={event => setSearch(event.target.value)}
                onPointerDown={event => event.stopPropagation()}
            />
        </div>
        <ShopBrowseNavigation activeCategory={activeCategory} activeFilter={activeFilter}
            onCategorySelect={handleCategorySelect}
            onFilterSelect={filterId => {
                const filter = activeCategoryDefinition?.filters?.find(entry => entry.id === filterId);
                if (filter && activeCategoryDefinition) runBrowseCommand(filter.command, activeCategoryDefinition.id, filter.id);
            }} />
        <div className="shop-panel-content">
            {filteredItems.length === 0
                ? <div className="shop-panel-empty">{shopItems.length === 0
                    ? activeCategoryDefinition?.filters && !activeFilter ? 'Choose a filter to browse this category.' : 'No items listed for this category.'
                    : 'No items match your search.'}</div>
                : <div className="shop-item-list">
                    {filteredItems.map(item => <ShopItemGroup
                        key={item.num}
                        item={item}
                        variants={shopVariants[item.num]}
                        expanded={expandedProduct === item.num}
                        loading={shopVariantRequest === item.num}
                        selectedNum={selectedTarget ? Number(selectedTarget) : null}
                        compareNum={null}
                        targeting
                        selectOnRelease
                        compact
                        onSelect={handleSelectItem}
                        onToggle={toggleProduct}
                        onInspect={num => executeCommand(`show ${num}`)}
                    />)}
                </div>}
        </div>
    </section>;
};
