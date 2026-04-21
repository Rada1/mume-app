import React from 'react';
import { ShopItem } from '../../types';
import { formatMumePrice } from '../../utils/gameUtils';

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
            data-kind="object"
            data-location="shop"
            data-action="menu"
            data-context={item.id}
            data-menu-display="list"
            style={{ 
                '--glow-color': 'rgba(180, 100, 50, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                flex: 1,
                alignItems: 'flex-start',
                gap: '2px',
                padding: '4px 2px',
                margin: '0',
                background: 'transparent',
                border: 'none',
                fontSize: 'var(--dynamic-log-size, 16px)',
                boxSizing: 'border-box'
            } as any}
        >
            <div className="item-row-top" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', width: '100%' }}>
                <span className="shop-item-id" style={{ opacity: 0.3, fontSize: '0.8em', minWidth: '24px' }}>{item.id}. </span>
                <span className="shop-item-name" style={{ color: 'rgba(180, 100, 50, 0.9)', fontWeight: '900', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                
                {(item.condition && item.condition !== 'standard' || item.age) && (
                    <span className="shop-item-status" style={{ opacity: 0.6, fontSize: '0.9em', fontStyle: 'italic', marginLeft: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        ({[item.condition !== 'standard' ? item.condition : null, item.age].filter(Boolean).join(', ')})
                    </span>
                )}
            </div>
            
            <div className="price-container" style={{ display: 'flex', alignItems: 'center', paddingLeft: '24px', opacity: 0.8 }}>
                {renderPrice(item.price)}
            </div>
        </div>
    );
};

export default ShopItemCard;
