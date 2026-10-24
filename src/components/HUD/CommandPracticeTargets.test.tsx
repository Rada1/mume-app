/** @file CommandPracticeTargets.test.tsx - Regression for deferred toggle events and disclosure render loops. */
// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {CommandPracticeTargets} from './CommandPracticeTargets';
import type {CommandPracticeProps} from '../../types';
// --- Disclosure Regression Section ---
it('handles batched native toggles and guild visibility changes without event reuse or update loops',async()=>{
 const practice={guild:{hasGuildmaster:true,available:true,sessionsLeft:5},groups:[{label:'Warrior',skills:[{name:'Bash',sessions:'1/10',knowledge:'good'}]}],
  skills:[],selected:null,search:'',setSearch:vi.fn(),browse:vi.fn(),canRequest:true,report:{pendingCommand:null},open:true,setOpen:vi.fn(),selectSkill:vi.fn()
 } as unknown as CommandPracticeProps['practice'];
 const host=document.createElement('div');
 const root=createRoot(host);
 try{
  await act(async()=>root.render(<React.StrictMode><CommandPracticeTargets practice={practice} embedded/></React.StrictMode>));
  const details=host.querySelector('details')!;
  await act(async()=>{
   for(const open of [true,false,true,true]){
    details.open=open;
    details.dispatchEvent(new Event('toggle',{bubbles:false}));
   }
  });
  expect(details.open).toBe(true);
  await act(async()=>{
   for(let index=0;index<20;index++) details.dispatchEvent(new Event('toggle'));
  });
  expect(details.open).toBe(true);
  practice.guild.hasGuildmaster=false;
  await act(async()=>root.render(<React.StrictMode><CommandPracticeTargets practice={practice} embedded/></React.StrictMode>));
  expect(host.textContent).toContain('Known skills and spells · Visit a guildmaster to train');
  practice.guild.hasGuildmaster=true;
  await act(async()=>root.render(<React.StrictMode><CommandPracticeTargets practice={practice} embedded/></React.StrictMode>));
  expect(host.querySelector('details')?.open).toBe(true);
 }finally{await act(async()=>root.unmount());}
});
