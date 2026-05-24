import React, { useRef, useCallback, useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { useUIStore } from '../../stores/useUIStore';
import { useGame, useUI } from '../../context/GameContext';
import { ShopItem } from '../../types';
import './ShopPanel.css';

type ShopAction = 'buy' | 'show' | 'compare';
type InvAction = 'sell' | 'value' | 'mend';

const SHOP_ACTIONS: { id: ShopAction; label: string; needsTwo?: boolean }[] = [
    { id: 'buy',     label: 'Buy' },
    { id: 'show',    label: 'Show' },
    { id: 'compare', label: 'Compare', needsTwo: true },
];

const INV_ACTIONS: { id: InvAction; label: string }[] = [
    { id: 'sell',  label: 'Sell' },
    { id: 'value', label: 'Value' },
    { id: 'mend',  label: 'Mend' },
];

export const ShopPanel: React.FC = () => {
    const isShopOpen      = useUIStore(s => s.isShopOpen);
    const setIsShopOpen   = useUIStore(s => s.setIsShopOpen);
    const shopItems        = useUIStore(s => s.shopItems);
    const shopBalance              = useUIStore(s => s.shopBalance);
    const setShopBalance           = useUIStore(s => s.setShopBalance);
    const setShopBalanceRequested  = useUIStore(s => s.setShopBalanceRequested);
    const heldAction       = useUIStore(s => s.heldShopAction);
    const setHeldAction    = useUIStore(s => s.setHeldShopAction);
    const compareFirst     = useUIStore(s => s.compareFirstTarget);
    const setCompareFirst  = useUIStore(s => s.setCompareFirstTarget);

    const { triggerHaptic, executeCommand } = useGame() as any;
    const { handleTabClick, setGearTab } = useUI() as any;
    const [search, setSearch] = useState('');
    const selectedTarget = useUIStore(s => s.selectedTarget);

    useEffect(() => { if (!isShopOpen) setSearch(''); }, [isShopOpen]);

    const filteredItems = search.trim()
        ? shopItems.filter(item => {
              const q = search.toLowerCase();
              return item.name.toLowerCase().includes(q) ||
                     item.price.toLowerCase().includes(q) ||
                     String(item.num) === q.trim();
          })
        : shopItems;

    const refreshBalance = useCallback(() => {
        setShopBalanceRequested(true);
        executeCommand('info %r', true, true);
    }, [setShopBalanceRequested, executeCommand]);

    // Disable MUME pager while shop is open; also open inventory drawer
    useEffect(() => {
        if (isShopOpen) {
            executeCommand('change page off', true, true);
            setGearTab('inv');
            handleTabClick('equipment');
            refreshBalance();
        } else {
            executeCommand('change page on', true, true);
            setShopBalance(null);
        }
    }, [isShopOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const heldActionRef   = useRef(heldAction);
    const compareFirstRef = useRef(compareFirst);
    useEffect(() => { heldActionRef.current = heldAction; }, [heldAction]);
    useEffect(() => { compareFirstRef.current = compareFirst; }, [compareFirst]);

    const handleActionDown = useCallback((action: ShopAction) => {
        triggerHaptic(20);
        if (heldAction === action) {
            heldActionRef.current = null;
            compareFirstRef.current = null;
            setHeldAction(null);
            setCompareFirst(null);
            return;
        }
        heldActionRef.current = action;
        setHeldAction(action);
        if (action !== 'compare') {
            compareFirstRef.current = null;
            setCompareFirst(null);
        }
    }, [heldAction, triggerHaptic, setHeldAction, setCompareFirst]);

    const handleActionUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleItemPress = useCallback((item: ShopItem) => {
        const action = heldActionRef.current;
        if (!action) return;

        if (action === 'compare') {
            const first = compareFirstRef.current;
            if (first === null) {
                triggerHaptic(15);
                compareFirstRef.current = item.num;
                setCompareFirst(item.num);
            } else {
                triggerHaptic(30);
                executeCommand(`compare ${first} ${item.num}`);
                heldActionRef.current = null;
                compareFirstRef.current = null;
                setHeldAction(null);
                setCompareFirst(null);
            }
        } else {
            triggerHaptic(30);
            executeCommand(`${action} ${item.num}`);
            if (action === 'buy') {
                setTimeout(() => {
                    refreshBalance();
                    executeCommand('i', true, true);
                }, 400);
            }
            heldActionRef.current = null;
            setHeldAction(null);
        }
    }, [triggerHaptic, executeCommand, setHeldAction, setCompareFirst]);

    const handleInvActionDown = useCallback((action: InvAction, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = useUIStore.getState().selectedTarget;
        if (!target?.context) return;
        triggerHaptic(30);
        executeCommand(`${action} ${target.context}`);
        useUIStore.getState().clearObjectSelection();
        if (action === 'sell') {
            setTimeout(() => {
                refreshBalance();
                executeCommand('i', true, true);
            }, 500);
        }
    }, [triggerHaptic, executeCommand, refreshBalance]);

    const handleClose = () => {
        triggerHaptic(15);
        setIsShopOpen(false);
        setHeldAction(null);
        setCompareFirst(null);
    };

    const isTargeting = heldAction !== null;

    return (
        <div className={`shop-panel${isShopOpen ? ' open' : ''}`}>

            {/* Search bar */}
            <div className="shop-search-bar">
                <Search className="shop-search-icon" size={14} />
                <input
                    className="shop-search-input"
                    type="text"
                    placeholder="Search items…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onPointerDown={e => e.stopPropagation()}
                />
                {search && (
                    <button className="shop-search-clear" onClick={() => setSearch('')}>
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Balance bar */}
            {shopBalance && (
                <div className="shop-balance-bar">
                    <span className="shop-balance-label">Balance:</span>
                    <span className="shop-balance-value">
                        {shopBalance.split(/([\d,]+)/g).map((part, i) =>
                            /^[\d,]+$/.test(part)
                                ? <span key={i} className="shop-balance-num">{part}</span>
                                : part
                        )}
                    </span>
                </div>
            )}

            {/* Item list */}
            <div className="shop-panel-content">
                {filteredItems.length === 0 ? (
                    <div className="shop-panel-empty">
                        {shopItems.length === 0 ? 'No items listed.' : 'No items match your search.'}
                    </div>
                ) : (
                    <div className="shop-item-list">
                        {filteredItems.map(item => {
                            const isFirstCompare = compareFirst === item.num;
                            return (
                                <div
                                    key={item.num}
                                    className={`shop-item-row${isTargeting ? ' targeting' : ''}${isFirstCompare ? ' compare-selected' : ''}`}
                                    onPointerDown={() => handleItemPress(item)}
                                >
                                    <span className="shop-item-num">{item.num}.</span>
                                    <span className="shop-item-name">{item.name}</span>
                                    {item.vnum && <span className="shop-item-vnum">&lt;{item.vnum}&gt;</span>}
                                    <span className="shop-item-price">{item.price}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Action buttons — styled like DrawerHoldCommandButton (WHOIS/CHAT style) */}
            <div className="shop-panel-tab-bar">
                {SHOP_ACTIONS.map(action => {
                    const isHeld = heldAction === action.id;
                    const isPending = action.needsTwo && compareFirst !== null;
                    const displayLabel = isPending ? `#${compareFirst} → ?` : action.label;
                    return (
                        <button
                            key={action.id}
                            type="button"
                            className={`shop-action-btn${isHeld ? ' held' : ''}${isPending ? ' compare-step2' : ''}`}
                            onPointerDown={() => handleActionDown(action.id)}
                            onPointerUp={handleActionUp}
                            onPointerCancel={handleActionUp}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            {displayLabel}
                        </button>
                    );
                })}

                <div className="shop-action-divider" />

                {INV_ACTIONS.map(action => (
                    <button
                        key={action.id}
                        type="button"
                        className={`shop-action-btn${selectedTarget ? ' held' : ''}`}
                        onPointerDown={e => handleInvActionDown(action.id, e)}
                        onPointerUp={e => { e.preventDefault(); e.stopPropagation(); }}
                        onPointerCancel={e => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                    >
                        {action.label}
                    </button>
                ))}

                <button type="button" className="shop-action-btn shop-close-btn" onClick={handleClose}>
                    Close
                </button>
            </div>
        </div>
    );
};
