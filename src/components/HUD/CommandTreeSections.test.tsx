/** @file CommandTreeSections.test.tsx — Category selectors choose one vertical command list at a time. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import type {CustomButton} from '../../types';
import type {useCommandTree} from '../../hooks/useCommandTree';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import {createButton} from '../../utils/buttonFactory';
import {CommandTreeSections} from './CommandTreeSections';

// --- Command Rendering Fixture ---
vi.mock('./CommandTreeCommandList', () => ({CommandTreeCommandList: ({buttons}: {buttons: CustomButton[]}) =>
    <>{buttons.map(button => <button key={button.id}>{button.label}</button>)}</>}));
const makeButton = (label: string) => createButton({id: label, label, command: label.toLowerCase(), setId: 'trait-utility'});

// --- Category Selection Checks ---
it.each(['Objects', 'Social'])('%s displays only the chosen section under its horizontal selector', async label => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const controller = {} as ReturnType<typeof useCommandTreeController>;
    function Harness() {
        const [categorySection, chooseCategorySection] = React.useState('First');
        const tree = {group: 0, grouped: [{label}], categorySection, chooseCategorySection, commandSections: [
            {label: 'First', buttons: [makeButton('First action')]},
            {label: 'Second', buttons: [makeButton('Second action')]}
        ]} as unknown as ReturnType<typeof useCommandTree>;
        return <CommandTreeSections controller={controller} tree={tree}/>;
    }
    try {
        await act(async () => root.render(<Harness/>));
        const selector = host.querySelector(`[aria-label="${label} sections"]`)!;
        const commands = () => host.querySelector('.command-tree-category-section-commands')!;
        expect(selector.querySelectorAll('button')).toHaveLength(2);
        expect(commands().textContent).toBe('First action');
        await act(async () => selector.querySelectorAll<HTMLButtonElement>('button')[1].click());
        expect(commands().textContent).toBe('Second action');
        expect(selector.querySelector('button[aria-pressed="true"]')?.textContent).toBe('Second');
    } finally { await act(async () => root.unmount()); }
});

it('renders Observation as a normal vertical command list without the horizontal command strip', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const tree = {group: 0, grouped: [{label: 'Observation'}], commandSections: [
        {label: 'Observation', buttons: ['Look', 'Consider', 'Examine'].map(makeButton)}
    ]} as unknown as ReturnType<typeof useCommandTree>;
    try {
        await act(async () => root.render(<CommandTreeSections controller={{} as ReturnType<typeof useCommandTreeController>} tree={tree}/>));
        expect(host.querySelector('.command-tree-ability-mode-commands')).toBeNull();
        expect(host.querySelector('.is-ability-mode-commands')).toBeNull();
        expect(host.querySelector('[aria-label="Observation commands"]')?.textContent).toBe('LookConsiderExamine');
    } finally { await act(async () => root.unmount()); }
});
