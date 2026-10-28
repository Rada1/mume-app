/** @file CommandTreeGearQuickMenu.desktop.test.tsx — Equipment labels survive desktop item selection. */
// @vitest-environment jsdom
import React from 'react';
import {render} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import {CommandTreeGearQuickMenu} from './CommandTreeGearQuickMenu';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import type {CommandActionTargetEntry} from '../../objects/commandActionTargetModel';

// --- Gear menu boundaries ---
const fixture=vi.hoisted(()=>({selected:null as CommandActionTargetEntry|null,objects:[] as CommandActionTargetEntry[]}));
vi.mock('../../hooks/useCommandGearQuickMenu',()=>({useCommandGearQuickMenu:()=>({
 items:{selected:fixture.selected,objects:fixture.objects,objectSections:[{label:'Equipment',ready:true,objects:fixture.objects}]},
 getFrom:{selected:null},selectedContent:null,chooseObject:vi.fn(),roomEntities:[],roomObjects:[],containerFor:vi.fn(),toggleContainer:vi.fn()
})}));
vi.mock('../../hooks/useCommandGearTransfer',()=>({useCommandGearTransfer:()=>({reset:vi.fn()})}));
vi.mock('../../hooks/useUpwardCommandBranches',()=>({useUpwardCommandBranches:vi.fn()}));
vi.mock('./CommandTreeGearActions',()=>({CommandTreeGearActions:()=>null}));
vi.mock('./CommandTreeGearTransferTargets',()=>({CommandTreeGearTransferTargets:()=>null}));
vi.mock('./CommandTreeGearContents',()=>({CommandTreeGearContents:()=>null}));

// --- Equipment slot and name remain on one row ---
it('keeps the equipment slot visible when an item is selected',()=>{
 const sword:CommandActionTargetEntry={id:'sword',label:'a broadsword',keyword:'sword',context:'sword',category:'cat-worn-object',group:'worn',scope:'self',
  gearRow:{line:{id:'sword',text:'a broadsword',html:'',isItem:true},slot:'<wielded>',slotLabel:'Wield',article:'a',name:'broadsword',condition:'',noun:'sword',isContainer:false}};
 fixture.objects=[sword];fixture.selected=sword;
 const controller={game:{viewport:{isMobile:false}}} as unknown as ReturnType<typeof useCommandTreeController>;
 const view=render(<CommandTreeGearQuickMenu kind="Equipment" controller={controller} tree={{defer:vi.fn(),cancelPreview:vi.fn()}}/>);
 const row=view.container.querySelector('[data-target-id="sword"]')!;
 expect(row.getAttribute('aria-expanded')).toBe('true');
 expect(row.querySelector('.gear-slot')?.textContent).toBe('Wield');
 expect(row.querySelector('.gear-item-text')?.textContent).toContain('broadsword');
 expect(row.getAttribute('title')).toBe('a broadsword');
 const mobile={game:{viewport:{isMobile:true}}} as unknown as ReturnType<typeof useCommandTreeController>;
 view.rerender(<CommandTreeGearQuickMenu kind="Equipment" controller={mobile} tree={{defer:vi.fn(),cancelPreview:vi.fn()}}/>);
 expect(view.container.querySelector('[data-target-id="sword"] .gear-slot')).toBeNull();
 fixture.selected=null;fixture.objects=[];
});
