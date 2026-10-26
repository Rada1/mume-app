/** @file CommandTreeHeldStages.test.tsx — Held Get and Put grow from two to three direct menu columns. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import type {useCommandTree} from '../../hooks/useCommandTree';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import {createButton} from '../../utils/buttonFactory';
import {CommandTreeGetTargets} from './CommandTreeGetTargets';
import {CommandTreeTransferTargets} from './CommandTreeTransferTargets';

// --- Staged Selection Fixtures ---
const actions = vi.hoisted(() => ({getItem: vi.fn(), getContainer: vi.fn(), transfer: vi.fn()}));
vi.mock('../../hooks/useCommandTreeGetFrom', () => ({useCommandTreeGetFrom: () => {
    const [selected, setSelected] = React.useState(false);
    const container = {key: 'bag', objectId: 'bag', containerId: 'bag', label: 'a leather backpack',
        keyword: 'backpack', value: 'backpack', meta: 'room', category: 'container'};
    return {fromSections: [{meta: 'room', targets: [container]}], selected: selected ? container : null,
        items: [{key: 'sword', label: 'a sharp sword', value: 'sword', keyword: 'sword'}], loading: false, disabled: false,
        selectContainer: () => setSelected(true), clearSelection: () => setSelected(false),
        getItem: actions.getItem, getContainer: actions.getContainer, previewItem: vi.fn()};
}}));
vi.mock('../../hooks/useCommandTreeTransfer', () => ({useCommandTreeTransfer: () => {
    const [selected, setSelected] = React.useState(false);
    const source = {key: 'sword', label: 'a sharp sword', value: 'sword', meta: 'inventory'};
    return {label: 'Put', sources: [source], selected: selected ? source : null,
        sections: [{label: 'Room containers', meta: 'room', targets: [{key: 'bag', label: 'a backpack', value: 'backpack', meta: 'room'}]}],
        chooseSource: () => setSelected(true), currency: null, currencies: [], amountSelected: false,
        disabled: false, destinationLabel: 'Put destination containers', previewDestination: vi.fn(), transfer: actions.transfer};
}}));

// --- Direct Column Navigation Checks ---
it.each(['Get', 'Put'])('%s adds its third target column only after choosing a container or source', async label => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const button = createButton({id: `test-${label}`, label, command: `${label.toLowerCase()} %n`, setId: 'trait-container'});
    const controller = {game: {setCommandPreview: vi.fn()}, entries: [], vitals: {target: null}} as unknown as ReturnType<typeof useCommandTreeController>;
    const tree = {defer: vi.fn(), cancelPreview: vi.fn()} as unknown as ReturnType<typeof useCommandTree>;
    try {
        await act(async () => root.render(<div className="command-tree-branches"><section className="command-tree-branch command-tree-main-branch"/>
            {label === 'Get' ? <CommandTreeGetTargets controller={controller} button={button} targets={[]} heldMenu/>
                : <CommandTreeTransferTargets controller={controller} tree={tree} command={button} heldMenu/>}
        </div>));
        const columns = () => host.querySelectorAll('.command-tree-branches > .command-tree-branch');
        expect(columns()).toHaveLength(2);
        const source = host.querySelector<HTMLButtonElement>(label === 'Get' ? '.command-tree-get-expand' : '[aria-label="Inventory objects"] button')!;
        await act(async () => source.click());
        expect(columns()).toHaveLength(3);
        expect(host.querySelector('.is-ability-side-branch')).toBeNull();
        if (label === 'Get') {
            const contents = host.querySelector<HTMLButtonElement>('[aria-label="Container contents"] button')!;
            expect(contents.textContent).toBe('sword');
            await act(async () => contents.click());
            expect(actions.getItem).toHaveBeenCalledOnce();
            expect(actions.getContainer).not.toHaveBeenCalled();
            await act(async () => source.click());
            expect(columns()).toHaveLength(2);
        } else {
            const destination = host.querySelector<HTMLButtonElement>('[aria-label="Room containers destinations"] button')!;
            expect(actions.transfer).not.toHaveBeenCalled();
            await act(async () => destination.click());
            expect(actions.transfer).toHaveBeenCalledOnce();
        }
    } finally { await act(async () => root.unmount()); }
});
