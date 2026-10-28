/** @file CommandTreeSections.tsx — Independent category chips and a shared command area. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandPanelCategories } from '../../hooks/useCommandPanelCategories';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import './CommandPanelCategories.css';

// --- Render Section ---
export const CommandTreeSections = ({controller, tree, menuHeader, onCommandExecuted, mobileReadabilitySplit, onCommandTouchHoldStart, onCommandTouchHoldEnd}: {controller:ReturnType<typeof useCommandTreeController>; tree:ReturnType<typeof useCommandTree>; menuHeader?: React.ReactNode; onCommandExecuted?: () => void; mobileReadabilitySplit?: boolean; onCommandTouchHoldStart?: (button: CustomButton) => void; onCommandTouchHoldEnd?: (button: CustomButton) => void}) => {
 const menu = useCommandPanelCategories(tree);
 const commandsId = React.useId();
 const label = tree.grouped[tree.group].label;
 return <section className="command-tree-branch terminal-inline-popover command-tree-main-branch is-category-chip-menu" aria-label={label}>
  {menuHeader}
  <div className="command-panel-category-chips" role="group" aria-label={`${label} categories`}>
   {menu.categories.map(category => <button key={category.key} type="button"
    aria-pressed={category.enabled} aria-controls={commandsId}
    onClick={() => menu.toggleCategory(category.key)}>{category.displayLabel}</button>)}
  </div>
  <div className="command-panel-category-scroll">
   <div id={commandsId} className="command-tree-section-commands command-panel-category-flow" role="group" aria-label={`${label} commands`}>
    <CommandTreeCommandList buttons={menu.commands} tree={tree} controller={controller} onCommandExecuted={onCommandExecuted}
     explicitTargetSelection={mobileReadabilitySplit} onTouchHoldStart={onCommandTouchHoldStart} onTouchHoldEnd={onCommandTouchHoldEnd}/>
   </div>
   {!menu.commands.length && <p className="command-tree-section-empty">Choose categories above to show commands.</p>}
  </div>
 </section>;
};
