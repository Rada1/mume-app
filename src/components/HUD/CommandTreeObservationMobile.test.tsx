/** @file CommandTreeObservationMobile.test.tsx — Mobile locations navigate without executing or adding a fourth lane. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {CommandTreeObservationTargets} from './CommandTreeObservationTargets';
import {createButton} from '../../utils/buttonFactory';
import {LOOK_IN_TARGET_ID} from '../../utils/commandTreeObservation';
import {executeCommandPanelInput} from '../../hooks/executeCommandPanelInput';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import type {CommandActionTargetEntry} from '../../objects/commandActionTargetModel';

vi.mock('../../hooks/executeCommandPanelInput', () => ({executeCommandPanelInput: vi.fn()}));

// --- Location-to-target Workflow Section ---
it('switches Room, Inventory, Worn and In in place and executes only the chosen target', async () => {
    const entries: CommandActionTargetEntry[] = [
        {id: 'guard', label: 'Guard', keyword: 'guard', context: 'guard', category: 'cat-npc', group: 'npcs', scope: 'room'},
        {id: 'coin', label: 'Coin', keyword: 'coin', context: 'coin', category: 'cat-inventory-object', group: 'inventory', scope: 'self'},
        {id: 'sword', label: 'Sword', keyword: 'sword', context: 'sword', category: 'cat-worn-object', group: 'worn', scope: 'self'},
        {id: 'bag', label: 'a backpack', keyword: 'backpack', context: 'backpack', category: 'cat-room-object', group: 'objects', scope: 'room'},
        {id: LOOK_IN_TARGET_ID, label: 'In', keyword: 'in', context: 'in', category: 'cat-room-object', group: 'objects', scope: 'room'}
    ];
    const controller = {game: {viewport: {isMobile: true}, gameState: 'playing', isSpectateMode: false,
        entities: {}, inlineCategories: [], setCommandPreview: vi.fn()}, vitals: {target: null},
        ui: {setPopoverState: vi.fn()}, previewEntity: vi.fn(), previewTargetContext: vi.fn(), dismissOutputs: vi.fn()} as unknown as ReturnType<typeof useCommandTreeController>;
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        await act(async () => root.render(<div className="command-tree-branches">
            <section className="command-tree-branch command-tree-main-branch"/>
            <CommandTreeObservationTargets controller={controller} targets={entries} heldMenu
                button={createButton({id: 'v2-observation-look', label: 'Look', command: 'look %n', setId: 'trait-examine'})}/>
        </div>));
        const locations = host.querySelector('[aria-label="Targets for Look locations"]')!;
        const targets = host.querySelector('[aria-label="Targets for Look"]')!;
        const choose = async (label: string) => {
            const option = [...locations.querySelectorAll<HTMLButtonElement>('button')].find(row => row.textContent === label)!;
            await act(async () => option.click());
        };
        await choose('Inventory');
        expect(targets.textContent?.toLowerCase()).toContain('coin');
        expect(targets.textContent).not.toContain('Guard');
        await choose('Worn');
        expect(targets.textContent?.toLowerCase()).toContain('sword');
        await choose('In');
        expect(targets.querySelector('.command-tree-section-heading')).toBeNull();
        expect(host.querySelectorAll('.command-tree-branches > .command-tree-branch')).toHaveLength(3);
        expect(executeCommandPanelInput).not.toHaveBeenCalled();
        const container = targets.querySelector<HTMLButtonElement>('[aria-label="Room containers containers"] button')!;
        expect(container.textContent).toBe('a backpack');
        await act(async () => container.click());
        expect(executeCommandPanelInput).toHaveBeenCalledWith(controller.game, 'look in backpack', false, false, false, false,
            {shouldFocus: false, fromUi: true});
        await choose('Room');
        expect(targets.querySelector('[aria-label="Room targets"]')).not.toBeNull();
    } finally { await act(async () => root.unmount()); }
});
