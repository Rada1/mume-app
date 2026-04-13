import React from 'react';
import { ShopItem } from '../types';
import { formatMumePrice } from '../utils/gameUtils';

interface ShopItemCardProps {
    item: ShopItem;
    executeCommand: (cmd: string) => void;
}

const ShopItemCard: React.FC<ShopItemCardProps> = ({ item }) => {
    // Format the price into colored segments
    const renderPrice = (priceStr: string) => {
        const cleanPrice = priceStr.replace(/<[^>]+>/g, '').trim();
        const formatted = formatMumePrice(priceStr);
        if (!formatted) return <span className="price-text" style={{ color: 'var(--text-dim)', fontWeight: 'normal' }}>{cleanPrice}</span>;

        // Split "11 gold 14 silver" to color only the numbers
        const parts = formatted.split(/(\d+)/); 
        return (
            <span className="price-text" style={{ color: 'var(--text-dim)', opacity: 0.6, fontWeight: 'normal', whiteSpace: 'nowrap' }}>
                {parts.map((part, i) => {
                    const isNumber = /^\d+$/.test(part);
                    return isNumber ? (
                        <span key={i} style={{ color: 'var(--ansi-yellow)', fontWeight: 'bold', opacity: 1 }}>{part}</span>
                    ) : (
                        <span key={i}> {part}</span>
                    );
                })}
            </span>
        );
    };

    return (
        <div
            className="shop-item-card inline-btn recent-entry"
            data-id={`shop-item-${item.id}`}
            data-cmd="inline-shopitem"
            data-action="menu"
            data-context={item.id}
            data-menu-display="list"
            style={{ 
                '--glow-color': 'rgba(180, 100, 50, 0.4)',
                display: 'flex',
                width: '100%',
                flex: 1,
                alignItems: 'baseline',
                flexWrap: 'nowrap',
                gap: '8px',
                padding: '0px 2px',
                margin: '0',
                background: 'transparent',
                border: 'none',
                fontSize: 'var(--dynamic-log-size, 16px)',
                boxSizing: 'border-box'
            } as any}
        >
            <span className="shop-item-id" style={{ opacity: 0.4, marginRight: '4px' }}>{item.id}. </span>
            <span className="shop-item-name" style={{ color: 'rgba(180, 100, 50, 0.9)', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            
            {(item.condition && item.condition !== 'standard' || item.age) && (
                <span className="shop-item-status" style={{ opacity: 0.6, fontStyle: 'italic', marginLeft: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    ({[item.condition !== 'standard' ? item.condition : null, item.age].filter(Boolean).join(', ')})
                </span>
            )}
            
            <div style={{ flex: 1 }} />
            
            <div className="price-container" style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                {renderPrice(item.price)}
            </div>
        </div>
    );
};

export default ShopItemCard;
