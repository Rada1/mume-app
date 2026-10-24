/** @file CommandTreeShopTargets.tsx - Stock and carried targets for the selected shop command. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { useCommandTreeShopTargets } from '../../hooks/useCommandTreeShopTargets';
import { CommandShopStock } from './CommandShopStock';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { CommandTreeTargetHeader } from './CommandTreeTargetHeader';
// --- Render Section ---
export const CommandTreeShopTargets=({controller,command}:{controller:ReturnType<typeof useCommandTreeController>;command:CustomButton})=>{
 const targets=useCommandTreeShopTargets(controller,command);
 const {shop}=controller;
 return <section className="command-tree-branch command-tree-shop-stock-targets" aria-label={`Targets for ${command.label}`}>
  <CommandTreeTargetHeader/>
  {targets.showStock&&<CommandShopStock shop={{...shop,selectStock:targets.selectStock}} open inline onOpenChange={()=>undefined}/>}
  {targets.showInventory&&<CommandTreeCollapsibleSection label="Inventory">
   <div className="command-tree-section-commands" role="group" aria-label="Inventory item targets">
    {targets.inventory.map(entry=><button key={entry.id} type="button" className="command-tree-row" disabled={targets.disabled} onClick={()=>targets.selectInventory(entry)}><span className="command-tree-row-label is-gear-target"><CommandTreeObjectTargetLabel label={entry.label} row={entry.gearRow} category={entry.category}/></span></button>)}
   </div>
   {!targets.inventory.length&&<p>No carried items available.</p>}
  </CommandTreeCollapsibleSection>}
  {targets.action==='compare'&&shop.compareFirst&&<p>Compare {shop.compareFirst.name} with another stock or carried item.</p>}
 </section>;
};
