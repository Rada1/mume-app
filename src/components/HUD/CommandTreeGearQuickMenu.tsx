/** @file CommandTreeGearQuickMenu.tsx — Quick inventory and equipment cascades. */
import React from 'react';
import { useCommandGearQuickMenu } from '../../hooks/useCommandGearQuickMenu';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { GearItemLabel } from '../GearItemLabel';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';
import { WORN_EQUIPMENT_SLOTS } from '../../utils/gearPanelUtils';
import { useUpwardCommandBranches } from '../../hooks/useUpwardCommandBranches';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';

// --- Gear Menu Section ---
export const CommandTreeGearQuickMenu = ({kind, controller, tree, mobileReadabilitySplit = false, style}: {
 kind: 'Inventory'|'Equipment';
 controller: ReturnType<typeof useCommandTreeController>;
 tree: ReturnType<typeof useCommandTree>;
 mobileReadabilitySplit?: boolean;
 style?: React.CSSProperties;
}) => {
 const {items, getFrom, contentItems, selectedContent, chooseObject, chooseContent, actionSections} = useCommandGearQuickMenu(controller, kind);
 const menuRef = React.useRef<HTMLDivElement>(null);
 useUpwardCommandBranches(menuRef, !mobileReadabilitySplit, 'gear');
 const section = items.objectSections.find(entry=>entry.label===kind);
 const renderEntry = (entry: typeof items.objects[number], slotLabel?: string) => <button type="button" key={entry.id} className="command-tree-object" aria-expanded={items.selected?.id===entry.id}
  onPointerEnter={event=>{if(event.pointerType==='mouse')tree.defer(()=>chooseObject(entry));}} onFocus={()=>{tree.cancelPreview();chooseObject(entry);}} onClick={()=>{tree.cancelPreview();chooseObject(entry);}}>
  <span className={kind==='Equipment'&&entry.gearRow?'command-tree-gear-object-label':''}>{entry.gearRow?<GearItemLabel row={slotLabel?{...entry.gearRow,slotLabel}:entry.gearRow} category={entry.category} showSlot={kind==='Equipment'}/>:entry.label}</span><span aria-hidden="true">&#8249;</span>
 </button>;
 return <div ref={menuRef} className="command-tree-gear-quick-menu" style={style} aria-label={`${kind} contents`}>
  <div className="command-tree-gear-quick-details">
  {items.selected&&<section className="command-tree-gear-quick-actions" aria-label={`Actions for ${(selectedContent || items.selected).label}`}>
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
     ?<div role="group" aria-label={`Items inside ${items.selected.label}`}>{contentItems.map(item=><button type="button" key={item.id} className="command-tree-gear-content-item command-tree-object" aria-expanded={selectedContent?.id===item.id}
       onPointerEnter={event=>{if(event.pointerType==='mouse')tree.defer(()=>chooseContent(item));}} onFocus={()=>chooseContent(item)} onClick={()=>{tree.cancelPreview();chooseContent(item);}} title={item.label}>
       <CommandTreeObjectTargetLabel label={item.label} category="cat-container-item"/>
      </button>)}</div>
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
