/**
 * @file ShopItemGroup.tsx
 * @description Shop product row and its individual stock entries.
 */

import React from 'react';
import type { ShopItem, ShopVariant } from '../../types';
import { getShopProductCount } from '../../utils/shopVariantParser';

type ShopItemGroupProps = {
    item: ShopItem;
    variants?: ShopVariant[];
    expanded: boolean;
    loading: boolean;
    selectedNum: number | null;
    compareNum: number | null;
    targeting: boolean;
    selectOnRelease?: boolean;
    compact?: boolean;
    onSelect: (item: ShopItem) => void;
    onToggle: (num: number) => void;
    onInspect: (num: number) => void;
};

// --- Render Section ---
export const ShopItemGroup: React.FC<ShopItemGroupProps> = ({
    item, variants, expanded, loading, selectedNum, compareNum, targeting, selectOnRelease = false, compact = false,
    onSelect, onToggle, onInspect
}) => {
    const count = getShopProductCount(item.name);
    const stock = variants?.length || count;
    const variantName = count ? item.name.replace(/^\S+\s+/, '') : item.name;

    return (
        <div className={`shop-product-group${expanded ? ' expanded' : ''}`}>
            <div className={`shop-item-row${selectedNum === item.num ? ' selected' : ''}${targeting ? ' targeting' : ''}${compareNum === item.num ? ' compare-selected' : ''}`}
                data-shop-target-value={selectOnRelease ? item.num : undefined}
                onPointerDown={event => {
                    if (selectOnRelease) event.stopPropagation();
                    else onSelect(item);
                }}
                onPointerUp={event => {
                    if (!selectOnRelease) return;
                    event.stopPropagation();
                    onSelect(item);
                }}>
                <span className="shop-item-num">{item.num}.</span>
                <span className="shop-item-name">{variantName}{count && !compact && <small className="shop-stock-count">{count} in stock</small>}</span>
                {count && compact && <button type="button" className="shop-stock-inline" aria-expanded={expanded}
                    onPointerDown={event => event.stopPropagation()}
                    onPointerUp={event => event.stopPropagation()}
                    onClick={event => { event.stopPropagation(); onToggle(item.num); }}>
                    {expanded ? '▾' : '▸'} {count} in stock
                </button>}
                {item.vnum && <span className="shop-item-vnum">&lt;{item.vnum}&gt;</span>}
                <span className="shop-item-price">{item.price}</span>
            </div>
            {count && !compact && <div className="shop-product-expand-bar">
                <button type="button" className="shop-product-expand" aria-expanded={expanded}
                    onPointerDown={event => event.stopPropagation()} onClick={() => onToggle(item.num)}>
                    {expanded ? '▾ Hide stock' : `▸ Show ${stock} in stock`}
                </button>
                {expanded && <span className="shop-product-command">&gt; {loading ? `listing ${item.num}…` : `list ${item.num}`}</span>}
            </div>}
            {expanded && <div className="shop-variant-list" aria-label={`${variantName} stock`}>
                {loading ? <div className="shop-variant-empty">Loading stock…</div>
                    : variants?.length ? variants.map((variant, index) => {
                        const variantItem: ShopItem = { num: variant.num, name: `${variantName} (${variant.condition})`, price: variant.price };
                        return <div key={`${variant.num}-${index}`} className={`shop-variant-row${selectedNum === variant.num ? ' selected' : ''}`}
                            data-shop-target-value={selectOnRelease ? variant.num : undefined}
                            onPointerDown={event => {
                                if (selectOnRelease) event.stopPropagation();
                                else onSelect(variantItem);
                            }}
                            onPointerUp={event => {
                                if (!selectOnRelease) return;
                                event.stopPropagation();
                                onSelect(variantItem);
                            }}>
                            <span className="shop-item-num">{variant.num}.</span>
                            <span className="shop-variant-condition">{variant.condition}</span>
                            <span className="shop-item-price">{variant.price}</span>
                            <button type="button" className="shop-variant-inspect" onPointerDown={event => event.stopPropagation()}
                                onClick={() => onInspect(variant.num)}>Inspect</button>
                        </div>;
                    }) : <div className="shop-variant-empty">No individual items returned.</div>}
            </div>}
        </div>
    );
};
