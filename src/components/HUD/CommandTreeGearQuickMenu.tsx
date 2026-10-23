/** @file CommandTreeGearQuickMenu.tsx — Quick inventory and equipment cascades. */
import React from 'react';
import { useCommandTreeItems } from '../../hooks/useCommandTreeItems';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { GearItemLabel } from '../GearItemLabel';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { useCommandTreeGetFrom } from '../../hooks/useCommandTreeGetFrom';
import { WORN_EQUIPMENT_SLOTS } from '../../utils/gearPanelUtils';
import { commandTreeGroup } from '../../utils/commandTreeGroups';
import { COMMAND_TREE_GROUPS } from '../../hooks/useCommandTree';
import { useUpwardCommandBranches } from '../../hooks/useUpwardCommandBranches';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';

// --- Gear Menu Section ---
export const CommandTreeGearQuickMenu = ({kind, controller, tree, style}: {
 kind: 'Inventory'|'Equipment';
 controller: ReturnType<typeof useCommandTreeController>;
 tree: ReturnType<typeof useCommandTree>;
 style?: React.CSSProperties;
}) => {
 const items = useCommandTreeItems(controller, kind);
 const menuRef = React.useRef<HTMLDivElement>(null);
 useUpwardCommandBranches(menuRef, true, 'gear');
 const getFrom = useCommandTreeGetFrom(controller);
 React.useEffect(()=>{getFrom.clearSelection();},[kind]);
 const section = items.objectSections.find(entry=>entry.label===kind);
 const actionSections = COMMAND_TREE_GROUPS.map((label,index)=>({
  label,
  buttons:items.actions.filter(button=>{
   const group=commandTreeGroup(button);
   return group===index||(group===null&&index===3);
  })
 })).filter(section=>section.buttons.length>0);
 const contentItems=getFrom.items.filter(item=>item.value!=='all');
 const chooseObject = (entry: typeof items.objects[number]) => {
  items.chooseObject(entry);
  const container = getFrom.fromSections.flatMap(group=>group.targets).find(target=>
   target.meta===entry.group&&(target.objectId===entry.id||target.containerId===entry.gearRow?.line.id)
  );
  if(container)getFrom.selectContainer(container);else getFrom.clearSelection();
 };
 const renderEntry = (entry: typeof items.objects[number], slotLabel?: string) => <button type="button" key={entry.id} className="command-tree-object" aria-expanded={items.selected?.id===entry.id}
  onMouseEnter={()=>tree.defer(()=>chooseObject(entry))} onFocus={()=>chooseObject(entry)} onClick={()=>chooseObject(entry)}>
  <span className={kind==='Equipment'&&entry.gearRow?'command-tree-gear-object-label':''}>{entry.gearRow?<GearItemLabel row={slotLabel?{...entry.gearRow,slotLabel}:entry.gearRow} category={entry.category} showSlot={kind==='Equipment'}/>:entry.label}</span><span aria-hidden="true">&#8249;</span>
 </button>;
 return <div ref={menuRef} className="command-tree-gear-quick-menu" style={style} aria-label={`${kind} contents`}>
  <div className="command-tree-gear-quick-details">
  {items.selected&&<section className="command-tree-gear-quick-actions" aria-label={`Actions for ${items.selected.label}`}>
   {actionSections.map(section=><CommandTreeCollapsibleSection key={section.label} label={section.label}>
    <div className="command-tree-section-commands" role="group" aria-label={`${section.label} commands`}>
     {section.buttons.map(button=><CommandTreeAction key={button.id} controller={controller} button={button}/>)}
    </div>
   </CommandTreeCollapsibleSection>)}
   {!items.actions.length&&<p className="command-tree-section-empty">No available actions.</p>}
  </section>}
  {getFrom.selected&&getFrom.selected.meta!=='room'&&items.selected&&<CommandTreeCollapsibleSection className="command-tree-gear-quick-contents" label={`Contents of ${items.selected.label}`}>
   {getFrom.loading?<p className="command-tree-section-empty">Loading contents…</p>
    :contentItems.length
     ?<div role="list" aria-label={`Items inside ${items.selected.label}`}>{contentItems.map(item=><div key={item.key} className="command-tree-gear-content-item" role="listitem" title={item.label}>
       <CommandTreeObjectTargetLabel label={item.label} location={item.objectLocation||item.meta}/>
      </div>)}</div>
     :<p className="command-tree-section-empty">Empty.</p>}
  </CommandTreeCollapsibleSection>}
  </div>
  <CommandTreeCollapsibleSection className={`command-tree-gear-quick-list${kind==='Equipment'?' is-equipment':''}`} label={kind}>
   {!section?.ready&&<p className="command-tree-section-empty">Loading {kind.toLowerCase()}…</p>}
   {section?.ready&&kind==='Equipment'&&<>
    {WORN_EQUIPMENT_SLOTS.map(slot=>{
     const slotEntries=section.objects.filter(entry=>slot.prefixes.some(prefix=>prefix===entry.gearRow?.slot.trim().toLowerCase()));
     return slotEntries.length?slotEntries.map(entry=>renderEntry(entry,slot.label)):<div key={`empty-${slot.key}`} className="command-tree-gear-empty-slot"><span>{slot.label}</span><span>Empty</span></div>;
    })}
    {section.objects.filter(entry=>!WORN_EQUIPMENT_SLOTS.some(slot=>slot.prefixes.some(prefix=>prefix===entry.gearRow?.slot.trim().toLowerCase()))).map(entry=>renderEntry(entry))}
   </>}
   {section?.ready&&kind==='Inventory'&&section.objects.map(entry=>renderEntry(entry))}
   {section?.ready&&kind==='Inventory'&&!section.objects.length&&<p className="command-tree-section-empty">Nothing in your inventory.</p>}
  </CommandTreeCollapsibleSection>
 </div>;
};
