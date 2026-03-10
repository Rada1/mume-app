import React from 'react';
import { ShopItem } from '../types';
import { Coins } from 'lucide-react';

interface ShopItemCardProps {
    item: ShopItem;
    executeCommand: (cmd: string) => void;
}

const ShopItemCard: React.FC<ShopItemCardProps> = ({ item }) => {
    // The ShopItemCard now acts as a large inline button.
    // Interaction is handled by the parent MessageLog's handleLogClick 
    // because we added className="inline-btn" and the data attributes.
    return (
        <div
            className="shop-item-card inline-btn recent-entry"
            data-cmd="inline-shopitem"
            data-action="menu"
            data-context={item.id}
            data-menu-display="list"
            style={{ '--glow-color': '#8b5cf6' } as any}
        >
            <div className="shop-item-main">
                <div className="shop-item-info">
                    <span className="shop-item-name">{item.name}</span>
                    {item.condition && item.condition !== 'standard' && (
                        <span className="shop-item-condition"> ({item.condition})</span>
                    )}
                </div>
                <div className="shop-item-price">
                    <Coins size={14} className="price-icon" />
                    <span className="price-text">{item.price}</span>
                </div>
            </div>
        </div>
    );
};

export default ShopItemCard;
