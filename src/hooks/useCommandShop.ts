/** @file useCommandShop.ts — Connects shared shop data and commands to the target/action workspace. */
import { useEffect, useRef } from 'react';
import type { CustomButton, PopoverState, ShopItem } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import { useGame, useUI } from '../context/GameContext';
import { useMapper } from '../context/MapperContext';
import { useUIStore } from '../stores/useUIStore';
import { useCommandShopStore } from '../stores/useCommandShopStore';
import { usePanelDataStore } from '../stores/usePanelDataStore';
import { findRoomShopkeeper } from '../utils/shopkeeperUtils';
import { getShopRoomLabel } from '../utils/shopRoomUtils';
import { getOccupantCommandKeyword } from '../utils/occupantKeywordUtils';
import { getResolvedTraitSections } from '../utils/inlineActionModel';
import { clampShopPurchaseQuantity, getShopBuyCommand, getShopPurchaseLimit, getShopPurchaseTotal } from '../utils/shopPurchaseUtils';

// --- Logic Section ---
export const useCommandShop = (activeState: PopoverState, isVisible: boolean, activate: () => void) => {
    const game = useGame();
    const ui = useUI();
    const mapper = useMapper();
    const shop = useCommandShopStore();
    const shopItems = useUIStore(state => state.shopItems);
    const variants = useUIStore(state => state.shopVariants);
    const variantRequest = useUIStore(state => state.shopVariantRequest);
    const stockPending = usePanelDataStore(state => state.status.shop === 'loading');
    const keeper = findRoomShopkeeper(game.roomNpcs, game.entities || {});
    const mapShop = getShopRoomLabel(mapper.currentRoomId, mapper.rooms,
        mapper.preloadedCoordsRef.current?.[String(mapper.currentRoomId || '').replace(/^m_/, '')]);
    const keeperSelected = Boolean(keeper && (activeState.entityId === `roomchars:${keeper.id}`
        || activeState.context === getOccupantCommandKeyword(keeper, keeper.name || '')));
    const traitBrowse = getResolvedTraitSections(activeState.category || activeState.setId, activeState.context, game.inlineCategories || [])
        .some(section => section.buttonIds.includes('btn-shopkeeper-shop'));
    const atShop = Boolean(keeper || mapShop || traitBrowse);
    const available = Boolean(atShop || shop.browsing || shopItems.length);
    const showBrowse = available && (keeperSelected || activeState.isRoomDescription) && !traitBrowse;
    const selectedStock = activeState.entityId?.startsWith(`command-shop:${shop.roomKey}:`)
        && shop.selectedItem ? shop.selectedItem : null;
    const inventoryTarget = shop.browsing && activeState.category === 'cat-inventory-object' && activeState.context;
    const purchaseQuantity = clampShopPurchaseQuantity(selectedStock, shop.purchaseQuantity);
    const purchaseLimit = getShopPurchaseLimit(selectedStock);
    const purchaseTotal = selectedStock ? getShopPurchaseTotal(selectedStock.price, purchaseQuantity) : null;
    const outputVisible = isVisible && shop.outputOpen;
    const lastRefreshed = useRef(0);
    useEffect(() => {
        document.body.classList.toggle('has-unified-command-shop', outputVisible);
        return () => document.body.classList.remove('has-unified-command-shop');
    }, [outputVisible]);
    const selectRoom = () => ui.setPopoverState({
        x: 0, y: 0, type: 'menu', setId: 'cat-room', category: 'cat-room', entityId: 'command-panel-room',
        isRoomDescription: true, context: game.roomName || '', displayName: game.roomName || 'Room'
    });
    const refreshBalance = () => usePanelDataStore.getState().request('gold', command =>
        game.executeCommand(command, true, true, false, true, { fromUi: true, shouldFocus: false }), true);
    const requestStock = (command = 'list') => usePanelDataStore.getState().request('shop', () =>
        game.executeCommand(command, true, true, false, true, { fromUi: true, shouldFocus: false }), true);
    const browse = (command = 'list') => {
        if (!available || shop.pendingCommand || stockPending) return;
        activate();
        shop.openCatalog();
        shop.selectItem(null);
        shop.setCompareFirst(null);
        useUIStore.setState({ shopItems: [], shopVariants: {}, shopVariantRequest: null });
        if (activeState.category === 'shopitem') selectRoom();
        requestStock(command);
        refreshBalance();
    };
    useEffect(() => {
        if (!shop.completedId || lastRefreshed.current === shop.completedId) return;
        lastRefreshed.current = shop.completedId;
        if (!/^(buy|sell|mend)\s/i.test(shop.completedCommand || '')) return;
        shop.selectItem(null);
        useUIStore.setState({ shopItems: [], shopVariants: {}, shopVariantRequest: null });
        if (activeState.category === 'shopitem') selectRoom();
        usePanelDataStore.getState().invalidate('inventory');
        refreshBalance();
        requestStock();
    }, [shop.completedId]);
    const report = (command: string, title: string) => {
        if (shop.pendingCommand || !shop.browsing) return;
        activate();
        shop.beginOutput(command, title);
        game.executeCommand(command, true, true, false, true, { fromUi: true, shouldFocus: false });
    };
    const compareWith = (selector: string, label: string) => {
        if (!shop.compareFirst) return false;
        if (selector === String(shop.compareFirst.num)) return true;
        report(`compare ${shop.compareFirst.num} ${selector}`, `${shop.compareFirst.name} ↔ ${label}`);
        shop.setCompareFirst(null);
        return true;
    };
    const selectStock = (item: ShopItem) => {
        if (compareWith(String(item.num), item.name)) return;
        activate();
        shop.openCatalog();
        shop.selectItem(item);
        const id = `command-shop:${shop.roomKey}:${item.num}`;
        game.clearObjectSelection();
        game.toggleObjectSelection({ id, category: 'shopitem', context: String(item.num), displayName: item.name });
        ui.setPopoverState({ x: 0, y: 0, type: 'menu', setId: 'shopitem', category: 'shopitem',
            context: String(item.num), displayName: item.name, entityId: id });
    };
    const tryCompare = (entry: CommandActionTargetEntry) => {
        if (!['worn', 'inventory', 'objects'].includes(entry.group)) return false;
        return compareWith(entry.context, entry.label);
    };
    const runStockAction = (action: 'buy' | 'show' | 'compare', itemOverride?: ShopItem) => {
        const item = itemOverride || selectedStock;
        if (!item || shop.pendingCommand) return;
        if (action === 'compare') {
            if (!shop.compareFirst) { shop.setCompareFirst(item); return; }
            compareWith(String(item.num), item.name);
            return;
        }
        const quantity = itemOverride ? 1 : purchaseQuantity;
        report(action === 'buy' ? getShopBuyCommand(item, quantity) : `show ${item.num}`,
            `${action === 'buy' ? `Buy ${quantity}` : 'Show'} · ${item.name}`);
    };
    const runShow = (num: number) => report(`show ${num}`, `Show · stock #${num}`);
    const runInventoryAction = (action: 'sell' | 'value' | 'mend', target = inventoryTarget, label = activeState.displayName || target) => {
        if (target) report(`${action} ${target}`, `${action} · ${label}`);
    };
    const handleButton = (button: CustomButton) => {
        if (button.id !== 'btn-shopkeeper-shop' && button.label !== 'Browse Shop...') return false;
        browse();
        return true;
    };
    return { ...shop, available, atShop, showBrowse, selectedStock, inventoryTarget, outputVisible, purchaseQuantity, purchaseLimit, purchaseTotal,
        stockPending, refreshBalance,
        shopItems, variants, variantRequest, keeperName: keeper?.name || mapShop || 'Shop',
        browse, selectStock, tryCompare, runStockAction, runInventoryAction, runShow, handleButton };
};
