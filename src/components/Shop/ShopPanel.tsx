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

    const { triggerHaptic, executeCommand, heldButton, setHeldButton, setCommandPreview } = useGame() as any;
    const { handleTabClick, setGearTab } = useUI() as any;
    const [search, setSearch] = useState('');
    const [heldInvAction, setHeldInvAction] = useState<InvAction | null>(null);

    // Clear search when panel closes
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
            setHeldInvAction(null);
            setShopBalance(null);
        }
    }, [isShopOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // Stable refs so item pointerdown handlers never go stale
    const heldActionRef    = useRef(heldAction);
    const compareFirstRef  = useRef(compareFirst);
    const lastProcessedInvFireRef = useRef(0);
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
        const id = `shop-${action}`;
        if (heldButton?.id === id && !heldButton.didFire) {
            setHeldInvAction(null);
            setHeldButton(null);
            setCommandPreview(null);
            return;
        }
        triggerHaptic(20);
        setHeldInvAction(action);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setHeldButton({
            id,
            baseCommand: `${action} %n`,
            modifiers: [],
            dx: 0, dy: 0, didFire: false,
            initialX: rect.left + rect.width / 2,
            initialY: rect.top + rect.height / 2,
        });
        setCommandPreview(action);
    }, [heldButton, triggerHaptic, setHeldButton, setCommandPreview]);

    const handleInvActionUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    useEffect(() => {
        if (!heldInvAction) return;
        const id = `shop-${heldInvAction}`;
        const firedAt = heldButton?.id === id ? heldButton.lastTargetFireAt : null;
        if (!firedAt || firedAt === lastProcessedInvFireRef.current) return;
        lastProcessedInvFireRef.current = firedAt;
        setHeldInvAction(null);
        setHeldButton((prev: any) => prev?.id === id ? null : prev);
        setCommandPreview(null);
        setTimeout(() => {
            refreshBalance();
            executeCommand('i', true, true);
        }, 500);
    }, [heldButton, heldInvAction, refreshBalance, executeCommand, setHeldButton, setCommandPreview]);

    const handleClose = () => {
        triggerHaptic(15);
        setIsShopOpen(false);
        setHeldAction(null);
        setCompareFirst(null);
        setHeldInvAction(null);
        setHeldButton(null);
        setCommandPreview(null);
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

                {INV_ACTIONS.map(action => {
                    const isHeld = heldInvAction === action.id && heldButton?.id === `shop-${action.id}` && !heldButton.didFire;
                    return (
                        <button
                            key={action.id}
                            type="button"
                            className={`shop-action-btn${isHeld ? ' held' : ''}`}
                            onPointerDown={e => handleInvActionDown(action.id, e)}
                            onPointerUp={handleInvActionUp}
                            onPointerCancel={handleInvActionUp}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            {action.label}
                        </button>
                    );
                })}

                <button type="button" className="shop-action-btn shop-close-btn" onClick={handleClose}>
                    Close
                </button>
            </div>
        </div>
    );
};
