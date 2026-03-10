import React, { useState } from 'react';
import { Search, Sword, Shield, Apple, Zap, X } from 'lucide-react';

interface ShopSearchPopoverProps {
    executeCommand: (cmd: string) => void;
    onClose: () => void;
}

const ShopSearchPopover: React.FC<ShopSearchPopoverProps> = ({ executeCommand, onClose }) => {
    const [query, setQuery] = useState('');

    const handleSearch = (q: string) => {
        const finalQuery = q || query;
        if (finalQuery.trim()) {
            executeCommand(`list ${finalQuery.trim()}`);
            onClose();
        } else {
            executeCommand('list');
            onClose();
        }
    };

    const categories = [
        { label: 'All', icon: Zap, query: '' },
        { label: 'Weapons', icon: Sword, query: 'weapon' },
        { label: 'Armor', icon: Shield, query: 'armor' },
        { label: 'Food', icon: Apple, query: 'food' },
    ];

    return (
        <div className="shop-search-popover" onPointerDown={(e) => e.stopPropagation()}>
            <div className="popover-header" style={{ marginBottom: '12px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Browse Shop</span>
                <X size={16} onClick={onClose} style={{ cursor: 'pointer', opacity: 0.6 }} />
            </div>

            <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                    autoFocus
                    type="text"
                    placeholder="Search shop (e.g. sword)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch('')}
                    className="shop-search-input"
                />
            </div>

            <div className="shop-category-grid">
                {categories.map((cat) => (
                    <button
                        key={cat.label}
                        onClick={() => handleSearch(cat.query)}
                        className="shop-category-btn"
                    >
                        <cat.icon size={18} />
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            <button onClick={() => handleSearch('')} className="shop-search-submit">
                View Full List
            </button>
        </div>
    );
};

export default ShopSearchPopover;
