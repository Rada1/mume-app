/** @file useCommandTreeShopTargets.ts - Routes shop command targets through existing captures and transactions. */
import { useEffect } from 'react';
import type { CustomButton, ShopItem } from '../types';
import type { CommandActionTargetEntry } from '../objects/commandActionTargetModel';
import type { useCommandTreeController } from './useCommandTreeController';
// --- Shop Target Logic Section ---
export const useCommandTreeShopTargets = (controller:ReturnType<typeof useCommandTreeController>, command:CustomButton) => {
 const {shop}=controller;
 const action=command.command.split(/\s+/)[0];
 useEffect(()=>{
  shop.setCompareFirst(null);
  controller.previewEntity(null);
  if (!shop.browsing) shop.browse();
  else shop.refreshBalance();
 },[action]);
 const disabled=Boolean(shop.pendingCommand)||shop.stockPending;
 const selectStock=(item:ShopItem)=>{
  if(disabled) return;
  if(controller.isHelpMode){controller.executeHelp(action);return;}
  if(action==='show'){shop.runShow(item.num);return;}
  if(action==='buy'){
   controller.previewEntity(null);
   shop.runStockAction('buy',item);
   return;
  }
  if(action==='compare'){
   if(shop.compareFirst) shop.runStockAction('compare',item);
   else shop.setCompareFirst(item);
   return;
  }
  // List is browsing only; selecting stock must never run an item action.
 };
 const selectInventory=(entry:CommandActionTargetEntry)=>{
  if(disabled) return;
  if(controller.isHelpMode){controller.executeHelp(action);return;}
  if(action==='compare') shop.tryCompare(entry);
  else if(action==='sell'||action==='value'||action==='mend') shop.runInventoryAction(action,entry.context,entry.label);
 };
 const inventory=controller.entries.filter(entry=>entry.group==='inventory'||(action==='compare'&&entry.group==='worn'));
 return {action,disabled,selectStock,selectInventory,inventory,
  showStock:['list','buy','show','compare'].includes(action),showInventory:['sell','value','mend'].includes(action)||Boolean(action==='compare'&&shop.compareFirst)};
};
