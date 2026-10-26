/** @file CommandTreeGearQuickMenu.tsx — Quick room, inventory, and equipment cascades. */
import React from 'react';
import { useCommandGearQuickMenu } from '../../hooks/useCommandGearQuickMenu';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { GearItemLabel } from '../GearItemLabel';
import { CommandTreeGearActions } from './CommandTreeGearActions';
import { ChevronRight } from 'lucide-react';
import { CommandTreeGearContents } from './CommandTreeGearContents';
import { WORN_EQUIPMENT_SLOTS } from '../../utils/gearPanelUtils';
import { useUpwardCommandBranches } from '../../hooks/useUpwardCommandBranches';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { getEntityHighlightKind } from '../../utils/inlineCategoryAxes';
import { useCommandGearTransfer } from '../../hooks/useCommandGearTransfer';
import { CommandTreeGearTransferTargets } from './CommandTreeGearTransferTargets';
import { CommandTreeGearLocationSection } from './CommandTreeGearLocationSection';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';

// --- Gear Menu Section ---
export const CommandTreeGearQuickMenu = ({kind, controller, tree, mobileReadabilitySplit = false, style, workspace = false, initialTarget, onSelect}: {
 kind: 'Inventory'|'Equipment'|'Room';
 controller: ReturnType<typeof useCommandTreeController>;
 tree: Pick<ReturnType<typeof useCommandTree>, 'defer' | 'cancelPreview'>;
 mobileReadabilitySplit?: boolean;
 style?: React.CSSProperties;
 workspace?: boolean;
 initialTarget?: CommandActionTargetEntry;
 onSelect?: (entry: CommandActionTargetEntry) => void;
}) => {
 const menu = useCommandGearQuickMenu(controller, kind, initialTarget, workspace, onSelect);
 const {items, getFrom, selectedContent, chooseObject, roomEntities, roomObjects, containerFor, toggleContainer} = menu;
 const transfer = useCommandGearTransfer(controller, kind, items.selected, Boolean(selectedContent), workspace);
 const menuRef = React.useRef<HTMLDivElement>(null);
 useUpwardCommandBranches(menuRef, !mobileReadabilitySplit && !workspace, 'gear');
 const section = items.objectSections.find(entry=>entry.label===kind);
 const contents = <CommandTreeGearContents menu={menu} tree={tree} workspace={workspace} reset={transfer.reset}/>;
 const renderEntry = (entry: typeof items.objects[number], slotLabel?: string) => {
 const container = workspace ? containerFor(entry) : undefined;
 const expanded = Boolean(container && getFrom.selected?.key===container.key);
 const contentsId = `quick-contents-${encodeURIComponent(entry.id)}`;
 const button = <button type="button" key={entry.id} className={`command-tree-object${workspace?' desktop-workspace-target':''}`} aria-expanded={items.selected?.id===entry.id&&(!workspace||!selectedContent)}
  data-target-kind={getEntityHighlightKind(entry.category)} data-targetable="true" data-target-id={entry.id}
  style={workspace?{color:controller.targetSelection.colorFor(entry.category)}:undefined}
  onPointerEnter={event=>{if(!workspace&&event.pointerType==='mouse')tree.defer(()=>{transfer.reset();chooseObject(entry);});}} onFocus={event=>{if(event.currentTarget.matches(':focus-visible')){tree.cancelPreview();transfer.reset();chooseObject(entry);}}} onClick={()=>{tree.cancelPreview();transfer.reset();chooseObject(entry);}}>
  <span className={kind==='Equipment'&&entry.gearRow?'command-tree-gear-object-label':''}>{entry.gearRow?<GearItemLabel row={slotLabel?{...entry.gearRow,slotLabel}:entry.gearRow} category={entry.category} showSlot={kind==='Equipment'&&!items.selected}/>:entry.id==='command-panel-self'?'Self':entry.label}</span>{!workspace&&<span aria-hidden="true">&#8249;</span>}
 </button>;
 return container ? <div className="desktop-target-container" key={entry.id}>
  <div className="desktop-target-container-row">
   {button}
   <button type="button" className="desktop-target-container-toggle" aria-expanded={expanded} aria-controls={contentsId}
    aria-label={`${expanded?'Hide':'Show'} contents of ${entry.label}`}
    onClick={event=>{event.stopPropagation();tree.cancelPreview();transfer.reset();toggleContainer(entry);}}>
    <ChevronRight size={14} aria-hidden="true"/>
   </button>
  </div>
  {expanded&&<div id={contentsId} className="desktop-target-container-contents">{contents}</div>}
 </div> : button;
 };
 return <div ref={menuRef} className={`command-tree-gear-quick-menu${workspace?' desktop-target-columns':''}`} style={style} aria-label={`${kind} contents`}>
  <div className="command-tree-gear-quick-details">
   <CommandTreeGearActions menu={menu} controller={controller} transfer={transfer} workspace={workspace}/>
  </div>
  {!workspace&&getFrom.selected&&items.selected&&<CommandTreeCollapsibleSection className="command-tree-gear-quick-contents" label={`Contents of ${items.selected.label}`}>
   {contents}
  </CommandTreeCollapsibleSection>}
  <CommandTreeGearLocationSection workspace={workspace} className={`command-tree-gear-quick-list${kind==='Equipment'?' is-equipment':''}`} label={kind}>
   {!section?.ready&&<p className="command-tree-section-empty">Loading {kind.toLowerCase()}…</p>}
   {section?.ready&&kind==='Equipment'&&<>
    {section.objects.filter(entry=>entry.id===`command-tree-${kind.toLowerCase()}-all`).map(entry=>renderEntry(entry))}
    {WORN_EQUIPMENT_SLOTS.map(slot=>{
     const slotEntries=section.objects.filter(entry=>slot.prefixes.some(prefix=>prefix===entry.gearRow?.slot.trim().toLowerCase()));
     return slotEntries.length?slotEntries.map(entry=>renderEntry(entry,slot.label)):<div key={`empty-${slot.key}`} className="command-tree-gear-empty-slot"><span>{slot.label}</span><span>Empty</span></div>;
    })}
    {section.objects.filter(entry=>entry.id!==`command-tree-${kind.toLowerCase()}-all`&&!WORN_EQUIPMENT_SLOTS.some(slot=>slot.prefixes.some(prefix=>prefix===entry.gearRow?.slot.trim().toLowerCase()))).map(entry=>renderEntry(entry))}
   </>}
   {section?.ready&&kind==='Inventory'&&section.objects.map(entry=>renderEntry(entry))}
   {section?.ready&&kind==='Inventory'&&!section.objects.length&&<p className="command-tree-section-empty">Nothing in your inventory.</p>}
   {section?.ready&&kind==='Room'&&<>
    <CommandTreeCollapsibleSection label="Characters">
     {roomEntities.map(entry=>renderEntry(entry))}
     {!roomEntities.length&&<p className="command-tree-section-empty">No room entities.</p>}
    </CommandTreeCollapsibleSection>
    <CommandTreeCollapsibleSection label="Objects">
     {roomObjects.map(entry=>renderEntry(entry))}
     {!roomObjects.length&&<p className="command-tree-section-empty">No room objects.</p>}
    </CommandTreeCollapsibleSection>
   </>}
  </CommandTreeGearLocationSection>
  <CommandTreeGearTransferTargets transfer={transfer}/>
 </div>;
};
