/** @file CommandTreeShopTargets.tsx - Stock and carried targets for the selected shop command. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeShopTargets } from '../../hooks/useCommandTreeShopTargets';
import { CommandShopStock } from './CommandShopStock';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
import { useSecondaryTouchActivation } from '../../hooks/useSecondaryTouchActivation';
// --- Render Section ---
export const CommandTreeShopTargets=({controller,command,onCommandExecuted,heldMenu=false}:{controller:ReturnType<typeof useCommandTreeController>;command:CustomButton;onCommandExecuted?:()=>void;heldMenu?:boolean})=>{
 const targets=useCommandTreeShopTargets(controller,command);
 const touchActivation=useSecondaryTouchActivation();
 const {shop}=controller;
 const commandShop={...shop,
  selectStock:(item:Parameters<typeof shop.selectStock>[0])=>{
   const completesAction=targets.action!=='compare'||Boolean(shop.compareFirst);
   targets.selectStock(item);
   if(completesAction)onCommandExecuted?.();
  },
  runShow:(num:Parameters<typeof shop.runShow>[0])=>{shop.runShow(num);onCommandExecuted?.();}
 };
 return <section className={`command-tree-branch command-tree-shop-stock-targets${heldMenu?' command-tree-held-command-targets':''}`} aria-label={`Targets for ${command.label}`} {...touchActivation}>
  <CommandTreeTargetHeader/>
  {targets.showStock&&<CommandShopStock shop={commandShop} open inline selectOnClick={heldMenu} onOpenChange={()=>undefined}/>}
  {targets.showInventory&&<CommandTreeCollapsibleSection label="Inventory">
   <div className="command-tree-section-commands" role="group" aria-label="Inventory item targets">
    {targets.inventory.map(entry=><button key={entry.id} type="button" data-menu-item="true" className="command-tree-row" disabled={targets.disabled} onClick={()=>{targets.selectInventory(entry);onCommandExecuted?.();}}><span className="command-tree-row-label is-gear-target"><CommandTreeObjectTargetLabel label={entry.label} row={entry.gearRow} category={entry.category}/></span></button>)}
   </div>
   {!targets.inventory.length&&<p>No carried items available.</p>}
  </CommandTreeCollapsibleSection>}
  {targets.action==='compare'&&shop.compareFirst&&<p>Compare {shop.compareFirst.name} with another stock or carried item.</p>}
 </section>;
};
