/** @file CommandTreeSections.tsx - Subcategories are headings in one command menu. */
import React from 'react';
import type { CustomButton } from '../../types';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import { CommandTreeCommandList } from './CommandTreeCommandList';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { COMMAND_TREE_ABILITY_CLASS_ORDER as ABILITY_CLASS_ORDER } from '../../utils/commandTreeSections';
// --- Render Section ---

export const CommandTreeSections = ({controller, tree, menuHeader, onCommandExecuted, mobileReadabilitySplit, onCommandTouchHoldStart, onCommandTouchHoldEnd}: {controller:ReturnType<typeof useCommandTreeController>; tree:ReturnType<typeof useCommandTree>; menuHeader?: React.ReactNode; onCommandExecuted?: () => void; mobileReadabilitySplit?: boolean; onCommandTouchHoldStart?: (button: CustomButton) => void; onCommandTouchHoldEnd?: (button: CustomButton) => void}) => {
 const renderCommands = (label: string, buttons: CustomButton[], abilityModeCommands = false) => {
  const commandClasses = ['command-tree-section-commands', abilityModeCommands ? 'is-ability-mode-commands' : '', tree.grouped[tree.group]?.label === 'Objects' ? 'is-object-menu' : '', label === 'Move' ? 'is-move-menu' : '', label === 'Doors' ? 'is-door-menu' : ''].filter(Boolean).join(' ');
  return <div className={commandClasses} role="group" aria-label={`${label} commands`} tabIndex={0}>
   <CommandTreeCommandList buttons={buttons} tree={tree} controller={controller} onCommandExecuted={onCommandExecuted}
    explicitTargetSelection={mobileReadabilitySplit} onTouchHoldStart={onCommandTouchHoldStart} onTouchHoldEnd={onCommandTouchHoldEnd}/>
  </div>;
 };
 const renderSection = (section: (typeof tree.commandSections)[number]) => <CommandTreeCollapsibleSection key={section.label} label={section.label}>
  {section.buttons.length ? renderCommands(section.label, section.buttons) : <p className="command-tree-section-empty">No available commands.</p>}
 </CommandTreeCollapsibleSection>;

 const isMobile = controller.game.viewport?.isMobile === true;
 const abilitiesMenu = isMobile && tree.grouped[tree.group]?.label === 'Abilities';
 const categoryMenu = isMobile && ['Info', 'Objects', 'Social'].includes(tree.grouped[tree.group]?.label);
 const selectedCategorySection = tree.commandSections.find(section => section.label === tree.categorySection)
  || (tree.grouped[tree.group]?.label === 'Info' ? undefined : tree.commandSections[0]);
 const combatSection = tree.commandSections.find(section => section.label === 'Combat action');
 const classSections = tree.commandSections.filter(section => ABILITY_CLASS_ORDER.includes(section.label))
  .sort((left, right) => ABILITY_CLASS_ORDER.indexOf(left.label) - ABILITY_CLASS_ORDER.indexOf(right.label));
 const selectedClass = classSections.find(section => section.label === tree.abilityClass) || classSections[0];
 const remainingSections = tree.commandSections.filter(section => section.label !== 'Combat action' && !ABILITY_CLASS_ORDER.includes(section.label));

 return <section className={`command-tree-branch terminal-inline-popover command-tree-main-branch${abilitiesMenu ? ' is-ability-class-menu' : categoryMenu ? ' is-category-section-menu' : ''}`} aria-label={tree.grouped[tree.group].label}>
  {menuHeader}
  {abilitiesMenu ? <div className="command-tree-ability-class-area">
   {combatSection && <div className="command-tree-ability-mode-commands" role="group" aria-label="Combat commands">
    {renderCommands('Combat', combatSection.buttons, true)}
   </div>}
   {classSections.length > 0 && <div className="command-tree-ability-class-selector" role="group" aria-label="Ability classes">
    {classSections.map(classSection => <button key={classSection.label} type="button"
     className={classSection.label === selectedClass?.label ? 'is-selected' : ''}
     aria-pressed={classSection.label === selectedClass?.label}
     onClick={() => tree.chooseAbilityClass(classSection.label)}>{classSection.label}</button>)}
   </div>}
   <div className="command-tree-ability-class-commands">
    {selectedClass && renderCommands(selectedClass.label, selectedClass.buttons)}
    {remainingSections.map(renderSection)}
   </div>
  </div> : categoryMenu ? <div className="command-tree-category-section-area">
   <div className="command-tree-category-section-selector" role="group" aria-label={`${tree.grouped[tree.group].label} sections`}>
    {tree.commandSections.map(section => <button key={section.label} type="button"
     className={section.label === selectedCategorySection?.label ? 'is-selected' : ''}
     aria-pressed={section.label === selectedCategorySection?.label}
     onClick={() => tree.chooseCategorySection(section.label)}>{section.label}</button>)}
   </div>
   {selectedCategorySection && <div className="command-tree-category-section-commands">
    {renderCommands(selectedCategorySection.label, selectedCategorySection.buttons)}
   </div>}
  </div> : tree.commandSections.map(renderSection)}
 </section>;
};
