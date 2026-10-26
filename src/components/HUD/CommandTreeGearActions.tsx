/** @file CommandTreeGearActions.tsx — Target actions grouped by the command panel's shared subcategories. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandGearQuickMenu } from '../../hooks/useCommandGearQuickMenu';
import type { useCommandGearTransfer } from '../../hooks/useCommandGearTransfer';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { CommandTreeAction } from './CommandTreeAction';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';

// --- Command Groups and Subcategories ---
export const CommandTreeGearActions = ({menu, controller, transfer, workspace}: {
 menu: ReturnType<typeof useCommandGearQuickMenu>;
 controller: ReturnType<typeof useCommandTreeController>;
 transfer: ReturnType<typeof useCommandGearTransfer>;
 workspace: boolean;
}) => {
 const {items,selectedContent,actionSections}=menu;
 if (!items.selected) return workspace ? <p className="command-tree-section-empty">Select a target to see its commands.</p> : null;
 const renderCommands=(label: string,buttons: CustomButton[]) => <div
  className={`command-tree-section-commands${workspace?' desktop-workspace-command-grid':''}`} role="group" aria-label={`${label} commands`}>
  {buttons.map(button=>{
   const isDirectInspection=/^(?:consider|con|examine)\b/i.test(button.command.trim());
   const action=isDirectInspection?{...button,actionType:'command' as const}:button;
   return <div key={button.id} onClick={event=>event.stopPropagation()}>
    <CommandTreeAction controller={controller} button={action} directObservation
     selected={transfer.command?.id===button.id} onRequestPut={transfer.request}/>
   </div>;
  })}
 </div>;
 return <section className="command-tree-gear-quick-actions" aria-label={`Actions for ${(selectedContent||items.selected).label}`}>
  {workspace ? actionSections.flatMap(group=>group.sections.map(section=><CommandTreeCollapsibleSection key={`${group.label}:${section.label}`} label={section.label}
    className="desktop-workspace-subcategory" ariaLabel={`${group.label} ${section.label}`}>
    {renderCommands(section.label,section.buttons)}
   </CommandTreeCollapsibleSection>)) : actionSections.map(group=><CommandTreeCollapsibleSection key={group.label} label={group.label}>
    {renderCommands(group.label,group.buttons)}
   </CommandTreeCollapsibleSection>)}
  {!actionSections.length&&<p className="command-tree-section-empty">No available actions.</p>}
 </section>;
};
