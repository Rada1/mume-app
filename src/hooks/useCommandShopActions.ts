/** @file useCommandShopActions.ts — Describes shop commands for the shared trait action list. */
import type { CommandShopAction, CommandShopProps } from '../types';
import { createButton } from '../utils/buttonFactory';
import { formatMumePrice } from '../utils/gameUtils';
import { getShopBuyCommand } from '../utils/shopPurchaseUtils';

// --- Logic Section ---
export const useCommandShopActions = (shop: CommandShopProps['shop']): CommandShopAction[] => {
    const actions: CommandShopAction[] = [];
    const add = (label: string, command: string, run: () => void, title?: string) => actions.push({
        button: createButton({ id: `command-shop-${label}`, label, command, setId: 'trait-shopkeeper' }),
        run, disabled: Boolean(shop.pendingCommand), title
    });
    if (shop.showBrowse) add('list', 'list', () => shop.browse());
    if (shop.selectedStock) {
        const item = shop.selectedStock;
        add('show', `show ${item.num}`, () => shop.runStockAction('show'));
        add('compare', `compare ${item.num} item`, () => shop.runStockAction('compare'), 'Choose another item to compare');
        add('buy', getShopBuyCommand(item, shop.purchaseQuantity), () => shop.runStockAction('buy'), `Buy ${shop.purchaseQuantity} · ${formatMumePrice(item.price)} each`);
    }
    if (shop.inventoryTarget) {
        for (const action of ['sell', 'value', 'mend'] as const) {
            add(action, `${action} ${shop.inventoryTarget}`, () => shop.runInventoryAction(action));
        }
    }
    if (shop.compareFirst) add('cancel compare', 'clear comparison', () => shop.setCompareFirst(null));
    return actions;
};
