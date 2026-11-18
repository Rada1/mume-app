/** @file useCommandShopCatalog.ts — Shared stock navigation and variant commands for the selection column. */
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useUIStore } from '../stores/useUIStore';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import type { CommandShopProps } from '../types';
import { formatMumePrice } from '../utils/gameUtils';
import { SHOP_BROWSE_CATEGORIES } from '../components/Shop/shopBrowseCategories';
import { categorizeShopStock } from '../utils/shopStockCategories';

// --- Logic Section ---
export const useCommandShopCatalog = (shop: CommandShopProps['shop'], localCategories = false) => {
    const { executeCommand } = useGame();
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [pendingVariant, setPendingVariant] = useState<number | null>(null);
    const [category, setCategory] = useState('all');
    const [filter, setFilter] = useState('');
    const categorized = useMemo(() => localCategories ? categorizeShopStock(shop.shopItems) : null, [localCategories, shop.shopItems]);
    const categories = categorized ? [{ id: 'all', label: 'All' }, ...categorized.categories] : undefined;
    const activeCategory = categorized && category !== 'all' && !categorized.categories.some(entry => entry.id === category) ? 'all' : category;
    useEffect(() => {
        setSearch(''); setExpanded(null); setPendingVariant(null); setCategory('all'); setFilter('');
    }, [shop.roomKey]);
    const runBrowse = (command: string, categoryId: string, filterId = '') => {
        if (shop.pendingCommand || shop.stockPending) return;
        setCategory(categoryId); setFilter(filterId); setExpanded(null); setSearch('');
        shop.browse(command);
    };
    const selectCategory = (id: string) => {
        if (localCategories) { setCategory(id); setFilter(''); setExpanded(null); return; }
        const choice = SHOP_BROWSE_CATEGORIES.find(entry => entry.id === id);
        if (!choice) return;
        const defaultFilter = choice.filters?.[0];
        if (defaultFilter) runBrowse(defaultFilter.command, id, defaultFilter.id);
        else if (choice.command) runBrowse(choice.command, id);
    };
    const selectFilter = (id: string) => {
        const choice = SHOP_BROWSE_CATEGORIES.find(entry => entry.id === category)?.filters?.find(entry => entry.id === id);
        if (choice) runBrowse(choice.command, category, id);
    };
    const toggleProduct = (num: number) => {
        if (expanded === num) { setExpanded(null); return; }
        if (shop.pendingCommand || shop.stockPending) return;
        setExpanded(num);
        setPendingVariant(num);
        usePanelDataStore.getState().request('shop', () => {
            const store = useUIStore.getState();
            store.setShopVariants(num, []); store.setShopVariantRequest(num);
            setPendingVariant(null);
            executeCommand(`list ${num}`, true, true, false, true, { fromUi: true, shouldFocus: false });
        }, true);
    };
    const query = search.trim().toLowerCase();
    const items = shop.shopItems.filter(item => (!categorized || activeCategory === 'all' || categorized.byItem.get(item) === activeCategory)
        && (!query || item.name.toLowerCase().includes(query)
        || item.price.toLowerCase().includes(query) || formatMumePrice(item.price).includes(query) || String(item.num) === query));
    return { search, setSearch, expanded, category: activeCategory, categories, filter, selectCategory, selectFilter, toggleProduct, items,
        variantLoading: expanded !== null && (pendingVariant === expanded || shop.variantRequest === expanded) };
};
