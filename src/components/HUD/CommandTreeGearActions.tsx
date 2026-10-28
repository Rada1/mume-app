/** @file CommandTreeGearActions.tsx — Target actions grouped by the command panel's shared subcategories. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandGearQuickMenu } from '../../hooks/useCommandGearQuickMenu';
import type { useCommandGearTransfer } from '../../hooks/useCommandGearTransfer';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import { CommandTreeAction } from './CommandTreeAction';
import { useWorkspaceActionCategories } from '../../hooks/useWorkspaceActionCategories';
import { SkillsSyncPrompt } from './SkillsSyncPrompt';

// --- Command Groups and Subcategories ---
export const CommandTreeGearActions = ({menu, controller, transfer, workspace}: {
 menu: ReturnType<typeof useCommandGearQuickMenu>;
 controller: ReturnType<typeof useCommandTreeController>;
 transfer: ReturnType<typeof useCommandGearTransfer>;
 workspace: boolean;
}) => {
 const {items,selectedContent,actionSections}=menu;
 const categoryMenu = useWorkspaceActionCategories(actionSections, (selectedContent || items.selected)?.label || '',
  (selectedContent || items.selected)?.category || '');
 const commandsId = React.useId();
 if (!items.selected) return workspace ? <p className="command-tree-section-empty">Select a target to see its commands.</p> : null;
 const renderButton=(button: CustomButton) => {
   const isDirectInspection=/^(?:consider|con|examine)\b/i.test(button.command.trim());
   const action=isDirectInspection?{...button,actionType:'command' as const}:button;
   return <div key={button.id} onClick={event=>event.stopPropagation()}>
    <CommandTreeAction controller={controller} button={action} directObservation
     selected={transfer.command?.id===button.id} onRequestPut={transfer.request}/>
   </div>;
  };
 const renderCommands=(label: string,buttons: CustomButton[]) => <div
  className="command-tree-section-commands" role="group" aria-label={`${label} commands`}>
  {buttons.map(renderButton)}
 </div>;
 return <section className="command-tree-gear-quick-actions" aria-label={`Actions for ${(selectedContent||items.selected).label}`}>
  {workspace ? <>
   <div className="workspace-action-categories" role="group" aria-label="Command categories">
    {categoryMenu.categories.map(category => <button key={category.key} type="button"
     className="workspace-action-category" aria-pressed={category.key === categoryMenu.selectedKey} aria-controls={commandsId}
     title={category.fullLabel} onClick={() => categoryMenu.select(category.key)}>{category.label}</button>)}
   </div>
   <div id={commandsId} className="workspace-action-flow" role="group" aria-label="Commands for selected category">
    {categoryMenu.isClassCategory && <SkillsSyncPrompt hideWhenReady/>}
    {categoryMenu.commands.map(renderButton)}
   </div>
   {!categoryMenu.needsSkillSync && !categoryMenu.commands.length && <p className="command-tree-section-empty">
    {categoryMenu.isClassCategory ? 'No learned commands in this category can target this entity.' : 'No available actions in this category.'}</p>}
  </> : actionSections.map(group=><section key={group.label} className="command-tree-gear-action-group" aria-label={group.label}>
    {renderCommands(group.label,group.buttons)}
   </section>)}
  {!workspace&&!actionSections.length&&<p className="command-tree-section-empty">No available actions.</p>}
 </section>;
};
