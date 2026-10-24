/** @file CommandTreeSections.tsx - Subcategories are headings in one command menu. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import { CommandTreeMovement } from './CommandTreeMovement';
import { isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
// --- Render Section ---
export const CommandTreeSections = ({controller, tree, menuHeader, onCommandExecuted, mobileReadabilitySplit}: {controller:ReturnType<typeof useCommandTreeController>; tree:ReturnType<typeof useCommandTree>; menuHeader?: React.ReactNode; onCommandExecuted?: () => void; mobileReadabilitySplit?: boolean}) => {
 const isMobile = controller.game?.viewport?.isMobile === true;
 return <section className="command-tree-branch terminal-inline-popover command-tree-main-branch" aria-label={tree.grouped[tree.group].label}>
  {menuHeader}
  {tree.commandSections.map(section => {
   const hasMovementPad = !isMobile && section.buttons.some(isCommandTreeMoveAction);
   const buttons = isMobile ? section.buttons : section.buttons.filter(button => !isCommandTreeMoveAction(button));
   const commandClasses = ['command-tree-section-commands', tree.grouped[tree.group]?.label === 'Objects' ? 'is-object-menu' : '', section.label === 'Doors' ? 'is-door-menu' : ''].filter(Boolean).join(' ');
   return <CommandTreeCollapsibleSection key={section.label} label={section.label}>
    {hasMovementPad && <CommandTreeMovement controller={controller}/>}
    {buttons.length > 0 && <div className={commandClasses} role="group" aria-label={`${section.label} commands`} tabIndex={0}>
     <CommandTreeCommandList buttons={buttons} tree={tree} controller={controller} onCommandExecuted={onCommandExecuted}
      explicitTargetSelection={mobileReadabilitySplit}/>
    </div>}
    {!buttons.length && !hasMovementPad && <p className="command-tree-section-empty">No available commands.</p>}
   </CommandTreeCollapsibleSection>;
  })}
 </section>;
};
