/** @file commandTreeShop.ts - Stable command-first shop entries. */
import type { CustomButton } from '../types';
import { createButton } from './buttonFactory';
// --- Shop Catalog Section ---
export const COMMAND_TREE_SHOP_ACTIONS = ['buy','sell','value','compare','show'] as const;
export const COMMAND_TREE_SHOP_BUTTONS = COMMAND_TREE_SHOP_ACTIONS.map(action=>createButton({
 id:`v2-shop-${action}`,label:action[0].toUpperCase()+action.slice(1),command:`${action} %n`,setId:'trait-shopkeeper'
}));
export const isCommandTreeShopAction = (button: CustomButton | null) => Boolean(button?.id.startsWith('v2-shop-'));
export const isLegacyCommandTreeShopAction = (button: CustomButton) =>
 /^(?:buy|sell|value|compare|show|list|mend|shop-(?:buy|sell|value|compare|show|list|mend))(?:\s|$)/i.test(button.command)
 || /shopkeeper|shopitem|trait-shop/.test(button.setId);
