/** @file CommandTreeGiveColors.test.tsx — Give recipients use their character-category colors. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandGearTransfer } from '../../hooks/useCommandGearTransfer';
import { CommandTargetMenuContext } from '../../context/CommandTargetMenuContext';
import { createButton } from '../../utils/buttonFactory';
import { CommandTreeTransferTargets } from './CommandTreeTransferTargets';
import { CommandTreeGearTransferTargets } from './CommandTreeGearTransferTargets';

// --- Recipient categories and selection ---
afterEach(cleanup);
it('colors NPC and ally recipients in the staged Give menu', () => {
    const colorFor = vi.fn((category: string) => category === 'cat-npc' ? '#d8be18' : '#41dd70');
    const controller = { game:{ gameState:'playing', roomItems:[], characterName:'Tester', setCommandPreview:vi.fn() },
        ui:{ displayInventoryLines:[{ id:'sword', text:'a sword', html:'a sword', isItem:true, context:'sword' }], displayEqLines:[] },
        entries:[{ id:'npc', label:'a guard', context:'guard', keyword:'guard', category:'cat-npc', group:'npcs', scope:'room' },
            { id:'ally', label:'Elena', context:'elena', keyword:'elena', category:'cat-ally', group:'players', scope:'room' }],
        targetSelection:{ colorFor }, vitals:{ target:null }, previewEntity:vi.fn() } as unknown as ReturnType<typeof useCommandTreeController>;
    const tree = { defer:vi.fn(), cancelPreview:vi.fn() } as unknown as ReturnType<typeof useCommandTree>;
    const command = createButton({ id:'give', label:'Give', command:'give %n', setId:'trait-object' });
    const { container } = render(<CommandTargetMenuContext.Provider value><CommandTreeTransferTargets controller={controller} tree={tree} command={command}/></CommandTargetMenuContext.Provider>);
    fireEvent.click(container.querySelectorAll<HTMLButtonElement>('[aria-label="Inventory objects"] button')[1]);
    expect(screen.getByText('a guard').style.color).toBe('rgb(216, 190, 24)');
    expect(screen.getByText('Elena').style.color).toBe('rgb(65, 221, 112)');
    expect(colorFor).toHaveBeenCalledWith('cat-npc');
    expect(colorFor).toHaveBeenCalledWith('cat-ally');
});

it('uses the same recipient colors in the gear transfer menu', () => {
    const transfer = { command:{ id:'give' }, label:'Give', preposition:'to', disabled:false,
        destinationLabel:'Give recipients', sections:[{label:'NPCs', targets:[{key:'guard', label:'Guard', value:'guard', meta:'cat-npc'}]}],
        recipientColor:vi.fn(() => '#d8be18'), previewDestination:vi.fn(), transfer:vi.fn() } as unknown as ReturnType<typeof useCommandGearTransfer>;
    render(<CommandTreeGearTransferTargets transfer={transfer} />);
    expect(screen.getByText('Guard').style.color).toBe('rgb(216, 190, 24)');
});
