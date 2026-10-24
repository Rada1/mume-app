/** @file CommandTreeItems.tsx - Item location, object list and contextual action cascades. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeItems } from '../../hooks/useCommandTreeItems';
import { getCommandActionTargetDisplayLabel } from '../../utils/commandTreeTargetSections';
import { GearItemLabel } from '../GearItemLabel';
import { PanelDataEmpty } from './PanelDataEmpty';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandShopStock } from './CommandShopStock';
import { CommandShopActions } from './CommandShopActions';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
// --- Render Section ---
export const CommandTreeItems = ({controller, tree}: {controller: ReturnType<typeof useCommandTreeController>; tree: ReturnType<typeof useCommandTree>}) => {
 const items = useCommandTreeItems(controller, 'All');
 const atShop = controller.shop.atShop ?? controller.shop.available;
 return <>
  <section className="command-tree-branch" aria-label="Items and equipment">
   {items.objectSections.map(section => <CommandTreeCollapsibleSection key={section.label} label={section.label} ariaLabel={`${section.label} objects`}>
    {section.ready ? section.objects.map(entry => <button key={entry.id} className="command-tree-object" aria-expanded={items.selected?.id === entry.id}
     onMouseEnter={() => tree.defer(() => items.chooseObject(entry))} onFocus={() => items.chooseObject(entry)} onClick={() => items.chooseObject(entry)}>
     <span>{section.label === 'Room' ? getCommandActionTargetDisplayLabel(entry)
      : entry.gearRow ? <GearItemLabel row={entry.gearRow} category={entry.category} showSlot={section.label === 'Equipment'}/> : entry.label}</span><span aria-hidden="true">&#8249;</span>
    </button>) : <PanelDataEmpty kind={section.kind} emptyLabel="No items here."/>}
    {section.ready && !section.objects.length && <p>No items here.</p>}
   </CommandTreeCollapsibleSection>)}
   {atShop && <CommandTreeCollapsibleSection label="Shop">
    <CommandShopStock shop={controller.shop} open onOpenChange={() => undefined}/>
    <CommandShopActions shop={controller.shop} isHelpMode={controller.isHelpMode} onRequestHelp={controller.executeHelp}/>
   </CommandTreeCollapsibleSection>}
  </section>
  {items.selected && <section className="command-tree-branch terminal-inline-popover" aria-label={`Actions for ${items.selected.label}`}>
   {items.actions.map(button => <CommandTreeAction key={button.id} controller={controller} button={button}/>)}
   {!items.actions.length && <p>No available actions.</p>}
  </section>}
 </>;
};
