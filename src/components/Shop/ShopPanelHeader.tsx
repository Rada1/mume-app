/**
 * @file ShopPanelHeader.tsx
 * @description Header and search controls for the shop drawer.
 */

import React from 'react';
import { Search, X } from 'lucide-react';

type ShopPanelHeaderProps = {
    shopkeeperName: string | null;
    roomName: string | null;
    itemCount: number;
    balance: string | null;
    search: string;
    onSearch: (value: string) => void;
    onClose: () => void;
};

// --- Render Section ---
export const ShopPanelHeader: React.FC<ShopPanelHeaderProps> = ({ shopkeeperName, roomName, itemCount, balance, search, onSearch, onClose }) => (
    <>
        <div className="chat-window-header">
            <span>Shop</span>
            <div className="shop-heading-actions">
                <span className="chat-window-count">{shopkeeperName ? `Dealing with: ${shopkeeperName}` : (roomName || 'Store')}</span>
                <button type="button" onClick={onClose} title="Close shop" aria-label="Close shop" className="shop-heading-close"><X size={14} /></button>
            </div>
        </div>
        <div className="shop-summary-bar">
            <span>{itemCount} products available</span>
            {balance && <span className="shop-balance-bar"><span className="shop-balance-label">Balance</span>
                <span className="shop-balance-value">{balance.split(/([\d,]+)/g).map((part, index) =>
                    /^[\d,]+$/.test(part) ? <span key={index} className="shop-balance-num">{part}</span> : part
                )}</span></span>}
        </div>
        <div className="shop-search-bar">
            <Search className="shop-search-icon" size={14} />
            <input className="shop-search-input" type="text" placeholder="Search items…" value={search}
                onChange={event => onSearch(event.target.value)} onPointerDown={event => event.stopPropagation()} />
            {search && <button className="shop-search-clear" onClick={() => onSearch('')} aria-label="Clear search"><X size={12} /></button>}
        </div>
    </>
);
