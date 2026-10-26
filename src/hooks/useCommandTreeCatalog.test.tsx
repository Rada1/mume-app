/** @file useCommandTreeCatalog.test.tsx — Object section regrouping preserves action and door identities. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it} from 'vitest';
import {useCommandTreeCatalog} from './useCommandTreeCatalog';
import type {useCommandTreeController} from './useCommandTreeController';
import {createButton} from '../utils/buttonFactory';
import {COMMAND_TREE_ACCESS_BUTTONS, COMMAND_TREE_CONTAINER_BUTTONS, COMMAND_TREE_EMPTY_BUTTON} from '../utils/commandTreeAccess';

// --- Catalog Section Checks ---
it('groups Fill/Empty as Move, container and lighting changes as Modify, and consumables/items as Use', async () => {
    const root = createRoot(document.createElement('div'));
    const controller = {menuButtons: [], vitals: {characterInfo: {}}} as unknown as ReturnType<typeof useCommandTreeController>;
    let catalog!: ReturnType<typeof useCommandTreeCatalog>;
    function Harness() { catalog = useCommandTreeCatalog(controller, false); return null; }
    const button = (command: string) => createButton({id: command, command, label: command, setId: 'trait-container'});
    try {
        await act(async () => root.render(<Harness/>));
        for (const command of ['fill %n', 'get %n', 'put %n', 'pour %n']) expect(catalog.preparedCatalog.sectionFor(button(command))).toBe('Move');
        expect(catalog.preparedCatalog.sectionFor(COMMAND_TREE_EMPTY_BUTTON)).toBe('Move');
        for (const command of ['camp', 'light %n', 'snuff %n', 'cover %n']) expect(catalog.preparedCatalog.sectionFor(button(command))).toBe('Modify');
        for (const action of COMMAND_TREE_CONTAINER_BUTTONS.filter(action => action.id !== COMMAND_TREE_EMPTY_BUTTON.id)) {
            expect(catalog.preparedCatalog.sectionFor(action)).toBe('Modify');
        }
        for (const command of ['eat %n', 'drink %n', 'forage', 'recite %n']) expect(catalog.preparedCatalog.sectionFor(button(command))).toBe('Use');
        expect(catalog.preparedCatalog.sectionFor(COMMAND_TREE_ACCESS_BUTTONS[0])).toBe('Doors');
    } finally { await act(async () => root.unmount()); }
});

it('keeps catalog normalization and section metadata stable across target-only changes', async () => {
    const root = createRoot(document.createElement('div'));
    const controller = {menuButtons: [], entries: [], vitals: {characterInfo: {}}} as unknown as ReturnType<typeof useCommandTreeController>;
    let catalog!: ReturnType<typeof useCommandTreeCatalog>;
    function Harness() { catalog = useCommandTreeCatalog(controller, false); return null; }
    try {
        await act(async () => root.render(<Harness/>));
        const prepared = catalog.preparedCatalog;
        const variants = catalog.variantsByAction;
        controller.entries = [...controller.entries];
        await act(async () => root.render(<Harness/>));
        expect(catalog.preparedCatalog).toBe(prepared);
        expect(catalog.variantsByAction).toBe(variants);
        controller.menuButtons = [createButton({id: 'custom-item', label: 'Read', command: 'read %n', setId: 'trait-container'})];
        await act(async () => root.render(<Harness/>));
        expect(catalog.preparedCatalog).not.toBe(prepared);
    } finally { await act(async () => root.unmount()); }
});
