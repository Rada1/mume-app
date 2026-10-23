/** @file CommandTreeSections.practice.test.tsx - Practice uses one command section and a separate target menu. */
// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {CommandTreeSections} from './CommandTreeSections';
import {CommandTreePracticeTargets} from './CommandTreePracticeTargets';
import {COMMAND_TREE_PRACTICE_BUTTON} from '../../utils/commandTreePractice';
import type {useCommandTree} from '../../hooks/useCommandTree';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
// --- Target Rendering Stubs ---
vi.mock('./SkillsSyncPrompt',()=>({SkillsSyncPrompt:()=>null}));
vi.mock('./CommandPracticeTargets',()=>({CommandPracticeTargets:()=> <div>Bash available to practice</div>}));
vi.mock('./CommandPracticeActions',()=>({CommandPracticeActions:()=>null}));
// --- Flow Checks ---
it('keeps Training unique and opens skill targets from the Practice command',async()=>{
 const chooseCommand=vi.fn();
 const controller={practice:{guild:{hasGuildmaster:true}},previewEntity:vi.fn()} as unknown as ReturnType<typeof useCommandTreeController>;
 const tree={group:0,grouped:Array.from({length:6},()=>({label:'Abilities'})),commandSections:[{label:'Training',buttons:[COMMAND_TREE_PRACTICE_BUTTON]}],command:null,
  defer:(callback:()=>void)=>callback(),cancelPreview:vi.fn(),chooseCommand
 } as unknown as ReturnType<typeof useCommandTree>;
 const host=document.createElement('div');
 const root=createRoot(host);
 try{
  await act(async()=>root.render(<CommandTreeSections controller={controller} tree={tree}/>));
  expect([...host.querySelectorAll('h3')].filter(node=>node.textContent==='Training')).toHaveLength(1);
  expect(host.textContent).not.toContain('Bash');
  await act(async()=>host.querySelector('button')!.click());
  expect(chooseCommand).toHaveBeenCalledWith(COMMAND_TREE_PRACTICE_BUTTON);
  const targets=renderToStaticMarkup(<CommandTreePracticeTargets controller={controller}/>);
  expect(targets).toContain('Practice skill targets');
  expect(targets).toContain('Bash available to practice');
 }finally{await act(async()=>root.unmount());}
});
