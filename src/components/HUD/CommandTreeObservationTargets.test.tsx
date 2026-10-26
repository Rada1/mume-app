/** @file CommandTreeObservationTargets.test.tsx — Touch execution skips previews; hover and keyboard keep them. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it, vi} from 'vitest';
import {CommandTreeObservationTargets} from './CommandTreeObservationTargets';
import {createButton} from '../../utils/buttonFactory';
import type {useCommandTreeController} from '../../hooks/useCommandTreeController';
import type {CommandActionTargetEntry} from '../../objects/commandActionTargetModel';

// --- Preview Fixture Section ---
const actions = vi.hoisted(() => ({preview: vi.fn(), observe: vi.fn()}));
const target: CommandActionTargetEntry = {id: 'guard', label: 'Guard', context: 'guard', keyword: 'guard',
    category: 'cat-npc', group: 'npcs', scope: 'room'};
vi.mock('../../hooks/useCommandTreeObservation', () => ({useCommandTreeObservation: () => ({
    sections: [{label: 'Room', entries: [target]}], selectedSection: {label: 'Room', entries: [target]},
    chooseSection: vi.fn(), disabled: false, lookInOpen: false, ...actions,
})}));
vi.mock('./CommandTreeTargetHeader', () => ({CommandTreeTargetHeader: () => null}));
vi.mock('./CommandTreeCollapsibleSection', () => ({CommandTreeCollapsibleSection: ({children}: {children: React.ReactNode}) => <section>{children}</section>}));

// --- Interaction Regression Section ---
it('executes a touch click without preview work while retaining mouse and keyboard previews', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const controller = {vitals: {target: null}} as unknown as ReturnType<typeof useCommandTreeController>;
    try {
        await act(async () => root.render(<CommandTreeObservationTargets controller={controller} targets={[target]} heldMenu
            button={createButton({id: 'look', label: 'Look', command: 'look %n', setId: 'trait-examine'})}/>));
        expect(host.querySelector('[aria-label="Targets for Look"]')?.classList.contains('command-tree-held-command-targets')).toBe(true);
        const row = host.querySelector<HTMLButtonElement>('[data-menu-item="true"]')!;
        const focus = vi.spyOn(row, 'matches').mockReturnValue(false);
        const enter = (pointerType: string) => {
            const event = new Event('pointerover', {bubbles: true});
            Object.defineProperty(event, 'pointerType', {value: pointerType});
            row.dispatchEvent(event);
        };
        await act(async () => {
            enter('touch');
            row.dispatchEvent(new MouseEvent('mouseover', {bubbles: true}));
            row.dispatchEvent(new FocusEvent('focusin', {bubbles: true}));
            row.click();
        });
        expect(actions.preview).not.toHaveBeenCalled();
        expect(actions.observe).toHaveBeenCalledExactlyOnceWith(target);
        await act(async () => enter('mouse'));
        expect(actions.preview).toHaveBeenCalledExactlyOnceWith(target);
        focus.mockReturnValue(true);
        await act(async () => row.dispatchEvent(new FocusEvent('focusin', {bubbles: true})));
        expect(actions.preview).toHaveBeenCalledTimes(2);
    } finally {
        await act(async () => root.unmount());
    }
});
