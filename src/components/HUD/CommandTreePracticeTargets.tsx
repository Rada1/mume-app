/** @file CommandTreePracticeTargets.tsx - Left-hand skill targets for Practice Skills. */
import React from 'react';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import {useCommandTreePracticeTargets} from '../../hooks/useCommandTreePracticeTargets';
import {CommandPracticeTargets} from './CommandPracticeTargets';
import {CommandPracticeActions} from './CommandPracticeActions';
import {CommandTreeCollapsibleSection} from './CommandTreeCollapsibleSection';
import {CommandTreeTargetHeader} from './CommandTreeTargetHeader';
// --- Render Section ---
export const CommandTreePracticeTargets=({controller}:{controller:ReturnType<typeof useCommandTreeController>})=>{
 const practice=useCommandTreePracticeTargets(controller);
 return <section className="command-tree-branch terminal-inline-popover" aria-label="Practice skill targets">
  <CommandTreeTargetHeader/>
  <CommandTreeCollapsibleSection label="Practice Skills" ariaLabel="Practice skill targets">
  <CommandPracticeTargets practice={practice} embedded/>
  <CommandPracticeActions practice={practice} isHelpMode={controller.isHelpMode} onRequestHelp={controller.executeHelp}/>
  </CommandTreeCollapsibleSection>
 </section>;
};
