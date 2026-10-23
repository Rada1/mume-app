/** @file PopoverActionButton.tree.test.tsx - Flat tree rows retain execution and expose syntax in tooltips. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {PopoverActionButton} from './PopoverActionButton';
import {createButton} from '../../../utils/buttonFactory';
// --- Render and Execution Checks ---
it('renders a flat native row without inline syntax and preserves command behavior', async()=>{
 const handleButtonClick=vi.fn();
 const props: React.ComponentProps<typeof PopoverActionButton>={
  button:createButton({id:'drink',label:'Drink Water',command:'drink water',setId:'cat-room'}),
  favorites:[],toggleFavorite:vi.fn(),popoverState:{x:0,y:0,type:'menu',setId:'cat-room',context:'water'},
  setPopoverState:vi.fn(),setButtons:vi.fn(),handleButtonClick,executeCommand:vi.fn(),addMessage:vi.fn(),
  handleTabClick:vi.fn(),setGearTab:vi.fn(),selectedObjectIds:new Set(),clearObjectSelection:vi.fn(),entities:{},
  compact:true,terminal:true,treeRow:true
 };
 const host=document.createElement('div');
 const root=createRoot(host);
 try{
  await act(async()=>root.render(<PopoverActionButton {...props}/>));
  const row=host.querySelector('button')!;
  expect(row.className).toBe('command-tree-row');
  expect(row.textContent).toBe('Drink Water');
  expect(row.title).toContain('drink water');
  expect(host.querySelector('.terminal-action-command')).toBeNull();
  expect(row.style.border).toBe('');
  await act(async()=>row.click());
  expect(handleButtonClick).toHaveBeenCalledOnce();
  await act(async()=>root.render(<PopoverActionButton {...props} displayLabel="A brass lantern"/>));
  expect(host.querySelector('button')?.textContent).toBe('A brass lantern');
  expect(props.button.label).toBe('Drink Water');
  for (const [spell,color] of [['fireball','red'],['bless','magenta'],['cure light','cyan']]) {
   await act(async()=>root.render(<PopoverActionButton {...props} button={{...props.button,command:`cast '${spell}'`}}/>));
   expect(host.querySelector<HTMLElement>('.command-tree-row-label')?.style.color).toContain(`--ansi-bright-${color}`);
  }

 }finally{await act(async()=>root.unmount());}
});
