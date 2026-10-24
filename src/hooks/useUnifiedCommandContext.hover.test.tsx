/** @file useUnifiedCommandContext.hover.test.tsx — Floating menu rows retain their object preview. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useUnifiedCommandContext } from './useUnifiedCommandContext';

// --- Context Fixtures ---
vi.mock('../context/GameContext', () => ({
 useGame: () => ({roomName:'Room',characterName:'Player',selectedObjectIds:new Set()}),
 useUI: () => ({}), useVitals: () => ({})
}));
vi.mock('./useCommandActionTargets', () => ({useCommandActionTargets: () => ({entries:[],selectEntity:vi.fn()})}));
vi.mock('./useCommandTargetSelection', () => ({useCommandTargetSelection: () => ({})}));
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT:true});

// --- Hover Lifetime ---
it('keeps previews across the full floating gear row and clears them outside the menu', async () => {
 vi.useFakeTimers();
 const host=document.createElement('div');
 const menu=document.createElement('div');
 menu.className='command-tree-gear-quick-menu';
 menu.innerHTML='<button class="command-tree-object"><span class="gear-slot">On hands</span><span class="gear-item-name">Gloves</span></button><section class="command-tree-gear-quick-actions">Actions</section>';
 document.body.append(host,menu);
 const root=createRoot(host);
 let context!: ReturnType<typeof useUnifiedCommandContext>;
 function Harness(){context=useUnifiedCommandContext({roomLabel:'Room',contextColor:()=>undefined,setPanelOpen:()=>undefined});return null;}
 try {
  await act(async()=>root.render(<Harness/>));
  await act(async()=>context.previewEntity({id:'gloves',label:'Gloves',keyword:'gloves',context:'gloves',category:'cat-worn-object',group:'worn',scope:'self'}));
  for(const selector of ['.command-tree-object','.gear-slot','.gear-item-name','.command-tree-gear-quick-actions']) {
   await act(async()=>{
    document.body.dispatchEvent(new MouseEvent('pointermove',{bubbles:true}));
    menu.querySelector(selector)?.dispatchEvent(new MouseEvent('pointermove',{bubbles:true}));
    vi.advanceTimersByTime(300);
   });
   expect(context.activeState.entityId,selector).toBe('gloves');
  }
  await act(async()=>{document.body.dispatchEvent(new MouseEvent('pointermove',{bubbles:true}));vi.advanceTimersByTime(300);});
  expect(context.activeState.entityId).toBe('command-panel-room');
 } finally {
  await act(async()=>root.unmount());
  host.remove();menu.remove();vi.useRealTimers();
 }
});
