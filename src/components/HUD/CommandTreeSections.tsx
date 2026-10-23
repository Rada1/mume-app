/** @file CommandTreeSections.tsx - Subcategories are headings in one command menu. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import { CommandTreeMovement } from './CommandTreeMovement';
import { isCommandTreeMoveAction } from '../../utils/commandTreeMovement';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
// --- Render Section ---
export const CommandTreeSections = ({controller, tree, menuHeader}: {controller:ReturnType<typeof useCommandTreeController>; tree:ReturnType<typeof useCommandTree>; menuHeader?: React.ReactNode}) =>
 <section className="command-tree-branch terminal-inline-popover" aria-label={tree.grouped[tree.group].label}>
  {menuHeader}
  {[...tree.commandSections].reverse().map(section => {
   const hasMovementPad = section.buttons.some(isCommandTreeMoveAction);
   const buttons = section.buttons.filter(button => !isCommandTreeMoveAction(button));
   const commandClasses = ['command-tree-section-commands', tree.grouped[tree.group]?.label === 'Objects' ? 'is-object-menu' : '', section.label === 'Doors' ? 'is-door-menu' : ''].filter(Boolean).join(' ');
   return <CommandTreeCollapsibleSection key={section.label} label={section.label}>
    {hasMovementPad && <CommandTreeMovement controller={controller}/>}
    {buttons.length > 0 && <div className={commandClasses} role="group" aria-label={`${section.label} commands`} tabIndex={0}>
     <CommandTreeCommandList buttons={buttons} tree={tree} controller={controller}/>
    </div>}
    {!buttons.length && !hasMovementPad && <p className="command-tree-section-empty">No available commands.</p>}
   </CommandTreeCollapsibleSection>;
  })}
 </section>;
