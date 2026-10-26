/** @file CommandTreeGearContents.tsx — Shared selectable contents for quick-menu containers and corpses. */
import React from 'react';
import type { useCommandGearQuickMenu } from '../../hooks/useCommandGearQuickMenu';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { CommandTreeObjectTargetLabel } from './CommandTreeObjectTargetLabel';

// --- Contents Rendering ---
export const CommandTreeGearContents = ({menu, tree, workspace, reset}: {
 menu: ReturnType<typeof useCommandGearQuickMenu>;
 tree: Pick<ReturnType<typeof useCommandTree>, 'defer'|'cancelPreview'>;
 workspace: boolean;
 reset: () => void;
}) => {
 const {getFrom, items, allContent, contentItems, selectedContent, chooseContent} = menu;
 if (getFrom.loading) return <p className="command-tree-section-empty">Loading contents…</p>;
 return <div className="command-tree-gear-content-items" role="group" aria-label={`Items inside ${items.selected?.label || 'container'}`}>
  {allContent&&<button type="button" className="command-tree-gear-content-item command-tree-object" title="All"
   onPointerEnter={event=>{if(event.pointerType==='mouse')getFrom.previewItem(allContent);}}
   onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))getFrom.previewItem(allContent);}}
   onClick={event=>{event.stopPropagation();reset();tree.cancelPreview();getFrom.getItem(allContent);}}><span>All</span></button>}
  {contentItems.map(item=><button type="button" key={item.id}
   className={`command-tree-gear-content-item command-tree-object${workspace?' desktop-workspace-target':''}`}
   aria-expanded={selectedContent?.id===item.id} data-target-kind="object" data-targetable="true" data-target-id={item.id}
   onPointerEnter={event=>{if(!workspace&&event.pointerType==='mouse')tree.defer(()=>{reset();chooseContent(item);});}}
   onFocus={event=>{if(event.currentTarget.matches(':focus-visible')){reset();chooseContent(item);}}}
   onClick={()=>{tree.cancelPreview();reset();chooseContent(item);}} title={item.label}>
   <CommandTreeObjectTargetLabel label={workspace?item.keyword:item.label} category="cat-container-item"/>
  </button>)}
  {!contentItems.length&&<p className="command-tree-section-empty">Empty.</p>}
 </div>;
};
