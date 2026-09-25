/** @file ShopPanel.tsx - Shop drawer command and selection controls. */
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useGame, useUI } from '../../context/GameContext';
import { ShopItem } from '../../types';
import { findRoomShopkeeper } from '../../utils/shopkeeperUtils';
import { DrawerResizeHandle } from '../Drawers/DrawerResizeHandle';
import { ShopItemGroup } from './ShopItemGroup';
import { ShopPanelHeader } from './ShopPanelHeader';
import './ShopPanel.css';
import './ShopPanelTerminal.css';

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

interface ShopPanelProps {
    style?: React.CSSProperties;
}

export const ShopPanel: React.FC<ShopPanelProps> = ({ style }) => {
    const isShopOpen      = useUIStore(s => s.isShopOpen);
    const setIsShopOpen   = useUIStore(s => s.setIsShopOpen);
    const shopItems        = useUIStore(s => s.shopItems);
    const shopVariants     = useUIStore(s => s.shopVariants);
    const shopVariantRequest = useUIStore(s => s.shopVariantRequest);
    const setShopVariantRequest = useUIStore(s => s.setShopVariantRequest);
    const setShopVariants = useUIStore(s => s.setShopVariants);
    const shopBalance              = useUIStore(s => s.shopBalance);
    const setShopBalance           = useUIStore(s => s.setShopBalance);
    const setShopBalanceRequested  = useUIStore(s => s.setShopBalanceRequested);
    const heldAction       = useUIStore(s => s.heldShopAction);
    const setHeldAction    = useUIStore(s => s.setHeldShopAction);
    const compareFirst     = useUIStore(s => s.compareFirstTarget);
    const setCompareFirst  = useUIStore(s => s.setCompareFirstTarget);
    const shopkeeperNameFromStore = useUIStore(s => s.shopkeeperName);
    const setShopkeeperName       = useUIStore(s => s.setShopkeeperName);

    const { triggerHaptic, executeCommand, roomNpcs, roomName, entities, viewport } = useGame() as any;
    const { handleTabClick, setGearTab } = useUI() as any;
    const [search, setSearch] = useState('');
    const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
    const selectedTarget = useUIStore(s => s.selectedTarget);

    const shopkeeper = findRoomShopkeeper(roomNpcs, entities ?? {});

    const shopkeeperName = shopkeeperNameFromStore || (shopkeeper ? shopkeeper.name : null);

    useEffect(() => { if (!isShopOpen) { setSearch(''); setExpandedProduct(null); } }, [isShopOpen]);

    const toggleProduct = useCallback((num: number) => {
        if (expandedProduct === num) { setExpandedProduct(null); return; }
        setExpandedProduct(num);
        setShopVariants(num, []);
        setShopVariantRequest(num);
        executeCommand(`list ${num}`);
    }, [expandedProduct, executeCommand, setShopVariants, setShopVariantRequest]);

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

    // Open inventory drawer and refresh balance when shop is open
    useEffect(() => {
        if (isShopOpen) {
            setGearTab('inv');
            handleTabClick('equipment');
            refreshBalance();
        } else {
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

    const handleShopActionDown = useCallback((action: ShopAction, e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const target = useUIStore.getState().selectedTarget;
        if (target && target.category === 'shopitem') {
            triggerHaptic(30);
            if (action === 'compare') {
                setHeldAction('compare');
                setCompareFirst(Number(target.context));
                heldActionRef.current = 'compare';
                compareFirstRef.current = Number(target.context);
                useUIStore.getState().clearObjectSelection();
            } else {
                executeCommand(`${action} ${target.context}`);
                useUIStore.getState().clearObjectSelection();
                if (action === 'buy') {
                    setTimeout(() => {
                        refreshBalance();
                        executeCommand('i', true, true);
                    }, 400);
                }
            }
        } else {
            handleActionDown(action);
        }
    }, [triggerHaptic, executeCommand, refreshBalance, handleActionDown, setHeldAction, setCompareFirst]);

    const handleActionUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleItemPress = useCallback((item: ShopItem) => {
        const action = heldActionRef.current;
        if (!action) {
            triggerHaptic(15);
            const targetInfo = {
                id: `shopitem:${item.num}`,
                context: String(item.num),
                category: 'shopitem'
            };
            useUIStore.getState().toggleObjectSelection(targetInfo);
            return;
        }

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
    }, [triggerHaptic, executeCommand, setHeldAction, setCompareFirst, refreshBalance]);

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
        setShopkeeperName(null);
    };

    const isTargeting = heldAction !== null;

    return (
        <aside className="docked-panel chat-window-panel shop-panel" style={style} aria-label="Shop">
            {!viewport?.isMobile && <DrawerResizeHandle handleType="left" widthVar="--desktop-shop-width" minWidth={18} maxWidth={60} />}

            <ShopPanelHeader shopkeeperName={shopkeeperName} roomName={roomName}
                itemCount={shopItems.length} balance={shopBalance}
                search={search} onSearch={setSearch} onClose={handleClose} />

            <div className="shop-panel-content">
                {filteredItems.length === 0 ? (
                    <div className="shop-panel-empty">
                        {shopItems.length === 0 ? 'No items listed.' : 'No items match your search.'}
                    </div>
                ) : (
                    <div className="shop-item-list">
                        {filteredItems.map(item => <ShopItemGroup key={item.num} item={item}
                            variants={shopVariants[item.num]} expanded={expandedProduct === item.num}
                            loading={shopVariantRequest === item.num}
                            selectedNum={selectedTarget?.category === 'shopitem' ? Number(selectedTarget.context) : null}
                            compareNum={compareFirst} targeting={isTargeting}
                            onSelect={handleItemPress} onToggle={toggleProduct}
                            onInspect={num => executeCommand(`show ${num}`)} />)}
                    </div>
                )}
            </div>

            {/* Action buttons — styled like DrawerHoldCommandButton (WHOIS/CHAT style) */}
            <div className="shop-panel-tab-bar">
                {SHOP_ACTIONS.map(action => {
                    const isShopTargetSelected = selectedTarget?.category === 'shopitem';
                    const isHeld = heldAction === action.id || isShopTargetSelected;
                    const isPending = action.needsTwo && compareFirst !== null;
                    const displayLabel = isPending ? `#${compareFirst} → ?` : action.label;
                    return (
                        <button
                            key={action.id}
                            type="button"
                            className={`shop-action-btn${isHeld ? ' held' : ''}${isPending ? ' compare-step2' : ''}`}
                            onPointerDown={(e) => handleShopActionDown(action.id, e)}
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
                    const isInvTargetSelected = selectedTarget !== null && selectedTarget.category !== 'shopitem';
                    return (
                        <button
                            key={action.id}
                            type="button"
                            className={`shop-action-btn${isInvTargetSelected ? ' held' : ''}`}
                            onPointerDown={e => handleInvActionDown(action.id, e)}
                            onPointerUp={e => { e.preventDefault(); e.stopPropagation(); }}
                            onPointerCancel={e => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        >
                            {action.label}
                        </button>
                    );
                })}

            </div>
        </aside>
    );
};
