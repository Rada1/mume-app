/** @file CommandTreeSections.tsx - Subcategories are headings in one command menu. */
import React from 'react';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
// --- Render Section ---
export const CommandTreeSections = ({controller, tree, menuHeader, onCommandExecuted, mobileReadabilitySplit}: {controller:ReturnType<typeof useCommandTreeController>; tree:ReturnType<typeof useCommandTree>; menuHeader?: React.ReactNode; onCommandExecuted?: () => void; mobileReadabilitySplit?: boolean}) => {
 return <section className="command-tree-branch terminal-inline-popover command-tree-main-branch" aria-label={tree.grouped[tree.group].label}>
  {menuHeader}
  {tree.commandSections.map(section => {
   const buttons = section.buttons;
   const commandClasses = ['command-tree-section-commands', tree.grouped[tree.group]?.label === 'Objects' ? 'is-object-menu' : '', section.label === 'Doors' ? 'is-door-menu' : ''].filter(Boolean).join(' ');
   return <CommandTreeCollapsibleSection key={section.label} label={section.label}>
    {buttons.length > 0 && <div className={commandClasses} role="group" aria-label={`${section.label} commands`} tabIndex={0}>
     <CommandTreeCommandList buttons={buttons} tree={tree} controller={controller} onCommandExecuted={onCommandExecuted}
      explicitTargetSelection={mobileReadabilitySplit}/>
    </div>}
    {!buttons.length && <p className="command-tree-section-empty">No available commands.</p>}
   </CommandTreeCollapsibleSection>;
  })}
 </section>;
};
