/** @file CommandShopStock.tsx — Shop products alongside inventory and equipment in the target column. */
import React from 'react';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import type { CommandShopProps } from '../../types';
import { useCommandShopCatalog } from '../../hooks/useCommandShopCatalog';
import { ShopItemGroup } from '../Shop/ShopItemGroup';
import { ShopBrowseNavigation } from '../Shop/ShopBrowseNavigation';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import '../Shop/ShopPanel.css';
import './CommandShop.css';

// --- Render Section ---
interface CommandShopStockProps extends CommandShopProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    inline?: boolean;
}

export const CommandShopStock: React.FC<CommandShopStockProps> = ({ shop, open, onOpenChange, inline = false }) => {
    const catalog = useCommandShopCatalog(shop);
    if (!shop.available) return null;
    const stockContent = <>
        <div className="command-shop-stock-tools">
            <span>{shop.keeperName}</span>
            {!inline && <button type="button" disabled={Boolean(shop.pendingCommand) || shop.stockPending} onClick={() => shop.browse()}>Refresh stock</button>}
        </div>
        <input type="search" value={catalog.search} onChange={event => catalog.setSearch(event.target.value)} aria-label="Search shop stock" placeholder="Search stock…" />
        <ShopBrowseNavigation activeCategory={catalog.category} activeFilter={catalog.filter}
            onCategorySelect={catalog.selectCategory} onFilterSelect={catalog.selectFilter} />
        {catalog.items.length ? catalog.items.map(item => <ShopItemGroup key={item.num} item={item} objectColorTargets
            variants={shop.variants[item.num]} expanded={catalog.expanded === item.num} loading={catalog.variantLoading}
            selectedNum={shop.selectedStock?.num ?? null} compareNum={shop.compareFirst?.num ?? null}
            targeting={Boolean(shop.compareFirst)} compact onSelect={shop.selectStock} onToggle={catalog.toggleProduct}
            onInspect={num => shop.runShow(num)} />)
            : <p className="command-action-target-empty">No stock listed. Choose another shop category.</p>}
    </>;
    if (inline) return <CommandTreeCollapsibleSection className="command-action-target-group command-shop-stock command-shop-stock-inline" label="Shop">
        {stockContent}
    </CommandTreeCollapsibleSection>;
    return <details className="command-action-target-group command-shop-stock" open={open}
        onMouseEnter={() => { onOpenChange(true); if (!shop.browsing) shop.browse(); else shop.refreshBalance(); }}
        onMouseLeave={() => onOpenChange(false)}
        onToggle={event => { onOpenChange(event.currentTarget.open); if (event.currentTarget.open) {
            if (!shop.browsing) shop.browse(); else shop.refreshBalance();
        } }} aria-label="Shop">
        <summary><ChevronRight className="command-action-target-chevron" size={12} aria-hidden="true" /><ShoppingBag size={12} aria-hidden="true" /><span>Shop</span><small>{shop.shopItems.length}</small></summary>
        {stockContent}
    </details>;
};
