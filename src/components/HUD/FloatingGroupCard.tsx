import React, { useState, useEffect } from 'react';
import { useViewport } from '../../hooks/useViewport';
import { useVitals } from '../../context/GameContext';
import { ShopItem } from '../../types';
import ShopItemCard from '../Shop/ShopItemCard';
import { formatCopperToCoins, parsePriceToCopper } from '../../utils/gameUtils';
import { X, Search, Plus, Minus, Check, Coins } from 'lucide-react';

interface FloatingGroupCardProps {
    type: 'shop';
    shopItems?: ShopItem[];
    onClose: () => void;
    executeCommand: (cmd: string, silent?: boolean, isSystem?: boolean) => void;
    shop?: any;
    setPopoverState?: (state: any) => void;
    popoverRef?: React.RefObject<HTMLDivElement>;
}

export const FloatingGroupCard: React.FC<FloatingGroupCardProps> = ({ 
    type, shopItems, onClose, executeCommand, shop, setPopoverState, popoverRef 
}) => {
    const { isMobile, isLandscape } = useViewport();
    const { characterInfo } = useVitals();
    const isPortrait = isMobile && !isLandscape;

    // Trigger gold refresh on open
    useEffect(() => {
        console.log('[ShopCard] WALLET REBUILD: Triggering startup gold check...');
        executeCommand('info %r', true, true);
    }, []);

    const [searchTerm, setSearchTerm] = useState('');
    const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});

    const selectedItemIds = Object.keys(itemQuantities);

    const filteredShopItems = shopItems?.filter(item => {
        const search = searchTerm.toLowerCase();
        return (
            item.name.toLowerCase().includes(search) || 
            item.description?.toLowerCase().includes(search) ||
            item.shortName?.toLowerCase().includes(search) ||
            item.details?.toLowerCase().includes(search) ||
            item.id.toString() === search
        );
    });

    const cartTotalCopper = Object.entries(itemQuantities).reduce((total, [id, qty]) => {
        const item = shopItems?.find(i => i.id === id);
        if (!item) return total;
        return total + (parsePriceToCopper(item.price) * qty);
    }, 0);

    const cartItems = shopItems?.filter(item => selectedItemIds.includes(item.id)) || [];
    const otherItems = filteredShopItems?.filter(item => !selectedItemIds.includes(item.id)) || [];

    const toggleItemSelection = (itemId: string) => {
        setItemQuantities(prev => {
            const next = { ...prev };
            if (next[itemId]) {
                delete next[itemId];
            } else {
                next[itemId] = 1;
            }
            return next;
        });
    };

    const updateItemQuantity = (id: string, delta: number) => {
        setItemQuantities(prev => {
            const next = { ...prev };
            const current = next[id] || 0;
            const updated = current + delta;
            
            console.log(`[ShopCard] Updating ${id}: ${current} -> ${updated}`);

            if (updated <= 0) {
                delete next[id];
            } else {
                next[id] = Math.min(99, updated);
            }
            return next;
        });
    };

    const handleBatchBuy = () => {
        if (selectedItemIds.length === 0) return;
        Object.entries(itemQuantities).forEach(([id, qty]) => {
            for (let i = 0; i < qty; i++) {
                executeCommand(`buy ${id}`);
            }
        });
        setItemQuantities({});
        // Re-check gold after purchase for accurate balance in next session
        setTimeout(() => executeCommand('info %g', true, true), 500);
        onClose();
    };

    const handleBatchShow = () => {
        if (selectedItemIds.length === 0) return;
        selectedItemIds.forEach(id => {
            executeCommand(`show ${id}`);
        });
        setItemQuantities({});
    };

    const renderItemRow = (item: ShopItem, isSelected: boolean) => (
        <div 
            key={item.id} 
            className={`floating-card-item shop-item-entry ${isSelected ? 'selected' : ''}`} 
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button')) return;

                e.preventDefault();
                e.stopPropagation();
                toggleItemSelection(item.id);
            }} 
            style={{ 
                padding: '10px 14px',
                background: isSelected ? 'rgba(var(--accent-rgb), 0.12)' : 'transparent',
                borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                marginBottom: '2px'
            }}
        >

            {isSelected && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    padding: '2px 4px',
                    background: 'rgba(var(--accent-rgb), 0.08)',
                    borderRadius: '4px',
                    border: '1px solid rgba(var(--accent-rgb), 0.2)',
                    marginRight: '2px'
                }}>
                    <button 
                        className="inline-btn shop-btn"
                        onPointerDown={(e) => {
                            console.log('[Shop] Minus button pointerDown');
                            e.preventDefault();
                            e.stopPropagation();
                            updateItemQuantity(item.id, -1);
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--accent)',
                            padding: '4px',
                            display: 'flex',
                            cursor: 'pointer',
                            zIndex: 100,
                            borderRadius: '3px'
                        }}
                    >
                        <Minus size={11} strokeWidth={3} />
                    </button>
                    
                    <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold', 
                        minWidth: '14px', 
                        textAlign: 'center',
                        color: 'var(--accent)',
                        fontFamily: 'monospace'
                    }}>
                        {itemQuantities[item.id] || 0}
                    </span>

                    <button 
                        className="inline-btn shop-btn"
                        onPointerDown={(e) => {
                            console.log('[Shop] Plus button pointerDown');
                            e.preventDefault();
                            e.stopPropagation();
                            updateItemQuantity(item.id, 1);
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'var(--accent)',
                            padding: '4px',
                            display: 'flex',
                            cursor: 'pointer',
                            zIndex: 100,
                            borderRadius: '3px'
                        }}
                    >
                        <Plus size={11} strokeWidth={3} />
                    </button>
                </div>
            )}

            <div style={{ flex: 1, pointerEvents: 'none' }}>
                <ShopItemCard item={item} executeCommand={executeCommand} />
            </div>
        </div>
    );

    return (
        <div 
            className="floating-group-card-overlay" 
            onPointerDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }} 
            style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            padding: isMobile ? '0' : '20px'
        }}>
            <div className="floating-group-card" ref={popoverRef} onClick={(e) => e.stopPropagation()} style={{
                width: isMobile ? 'calc(100% - 32px)' : '92%',
                maxWidth: '800px',
                height: 'auto',
                maxHeight: isMobile ? '75vh' : '85vh',
                background: 'rgba(15, 15, 20, 0.65)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                transform: 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden'
            }}>
                <div className="card-header" style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.02)',
                    gap: '12px'
                }}>
                    <div className="sh-header-main" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        <div className="sh-header-branding" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, color: 'var(--accent)', fontSize: isMobile ? '0.75rem' : '0.85rem', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                Shop
                            </h3>
                        </div>

                        <div className="search-filter-wrapper" style={{
                            flex: 1,
                            position: 'relative',
                            minWidth: '100px',
                            maxWidth: isMobile ? 'none' : '300px'
                        }}>
                            <Search size={14} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.5,
                                color: 'var(--accent)'
                            }} />
                            <input
                                type="text"
                                placeholder="Search keywords..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: '14px',
                                    padding: isMobile ? '7px 8px 7px 30px' : '8px 10px 8px 36px',
                                    color: '#fff',
                                    fontSize: isMobile ? '0.8rem' : '0.85rem',
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        </div>

                        <button 
                            onClick={onClose}
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.05)', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '50%', transition: 'all 0.2s ease', flexShrink: 0
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                        >
                            <X size={isMobile ? 18 : 20} />
                        </button>
                    </div>

                    <div className="sh-header-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                        {/* --- REBUILT WALLET INDICATOR --- */}
                        <div 
                            className="shop-wallet-badge"
                            onClick={() => executeCommand('info %r', true, true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: isMobile ? '6px' : '8px',
                                padding: isMobile ? '6px 14px' : '8px 16px',
                                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.05) 100%)',
                                borderRadius: '14px',
                                border: '1px solid rgba(255, 215, 0, 0.15)',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                                cursor: 'help',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative'
                            }}
                            title="Your Wallet (Click to Refresh)"
                        >
                            <Coins size={15} style={{ color: 'rgba(255, 215, 0, 0.9)', filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.3))' }} />
                            {(() => {
                                const { gold, silver, copper } = formatCopperToCoins(characterInfo?.gold || 0);
                                return (
                                    <div style={{ 
                                        display: 'flex', 
                                        gap: isMobile ? '6px' : '10px', 
                                        fontFamily: '"JetBrains Mono", monospace', 
                                        fontSize: isMobile ? '0.75rem' : '0.8rem', 
                                        fontWeight: 'bold',
                                        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                                        alignItems: 'baseline'
                                    }}>
                                        {gold > 0 && (
                                            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                                <span style={{ color: '#FFD700' }}>{gold}</span>G
                                            </span>
                                        )}
                                        {(gold > 0 || silver > 0) && (
                                            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                                <span style={{ color: '#FFD700' }}>{silver}</span>S
                                            </span>
                                        )}
                                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                                            <span style={{ color: '#FFD700' }}>{copper}</span>C
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                                onClick={handleBatchShow}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'rgba(255,255,255,0.6)',
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    display: selectedItemIds.length > 0 ? 'block' : 'none'
                                }}
                            >
                                SHOW ALL
                            </button>

                            {selectedItemIds.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px',
                                    padding: '4px 6px',
                                    background: 'rgba(var(--accent-rgb), 0.12)',
                                    borderRadius: '20px',
                                    border: '1px solid rgba(var(--accent-rgb), 0.25)'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--accent)', marginLeft: '6px', marginRight: '4px' }}>
                                        {Object.values(itemQuantities).reduce((acc, qty) => acc + qty, 0)}
                                    </span>
                                    <button 
                                        onClick={handleBatchBuy}
                                        style={{ 
                                            background: 'var(--accent)', border: 'none', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px 14px', borderRadius: '14px'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>BUY ALL</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="card-content" style={{
                    padding: '20px 0',
                    overflowY: 'auto',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0'
                }}>
                    {cartItems.length > 0 && (
                        <div className="cart-area" style={{ 
                            background: 'rgba(var(--accent-rgb), 0.05)',
                            borderBottom: '1px solid rgba(var(--accent-rgb), 0.2)',
                            marginBottom: '10px',
                            paddingBottom: '10px'
                        }}>
                            <div style={{ padding: '0 20px 10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Your Cart
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Total:</span>
                                    {(() => {
                                        const { gold, silver, copper } = formatCopperToCoins(cartTotalCopper);
                                        return (
                                            <div style={{ 
                                                display: 'flex', 
                                                gap: '6px', 
                                                fontSize: '0.9rem', 
                                                fontWeight: 'bold', 
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                alignItems: 'baseline'
                                            }}>
                                                {gold > 0 && (
                                                    <span>
                                                        <span style={{ color: '#FFD700' }}>{gold}</span>
                                                        <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>G</span>
                                                    </span>
                                                )}
                                                {(gold > 0 || silver > 0) && (
                                                    <span>
                                                        <span style={{ color: '#FFD700' }}>{silver}</span>
                                                        <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>S</span>
                                                    </span>
                                                )}
                                                <span>
                                                    <span style={{ color: '#FFD700' }}>{copper}</span>
                                                    <span style={{ fontSize: '0.7rem', marginLeft: '1px' }}>C</span>
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            {cartItems.map(item => renderItemRow(item, true))}
                        </div>
                    )}

                    {otherItems.length === 0 && cartItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.4 }}>
                            No items matching "{searchTerm}"
                        </div>
                    )}
                    
                    <div className="shop-list-area">
                        {otherItems.map(item => renderItemRow(item, false))}
                    </div>
                </div>
            </div>
        </div>
    );
};
