// @vitest-environment jsdom
/**
 * @file CommandActionTargetPicker.test.tsx
 * @description Verifies horizontal tab navigation, hover-to-expand, click-to-pin, and mount popovers.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CommandActionTargetEntry } from '../../../objects/commandActionTargetModel';
import type { CommandTargetSelection } from '../../../hooks/useCommandTargetSelection';
import type { GroupMember } from '../../../types';
import { CommandActionTargetPicker } from './CommandActionTargetPicker';

vi.mock('../../../hooks/useGearPanelData', () => ({
    useGearPanelData: () => ({ status: { equipment: 'ready', inventory: 'ready' }, request: vi.fn(), revision: 0, enabled: true })
}));
vi.mock('../../../hooks/useCommandTargetDragging', () => ({
    useCommandTargetDragging: () => ({ entryProps: () => ({}), categoryProps: () => ({}) })
}));
vi.mock('../../../hooks/useCommandMountContents', () => ({
    useCommandMountContents: () => ({ isMount: false, targets: [], loading: false, open: false, toggle: vi.fn(), containerId: '' })
}));
vi.mock('../../../hooks/useOnlineCommandTargets', () => ({
    useOnlineCommandTargets: () => ({ entries: [], whoLines: [], refresh: vi.fn() })
}));
vi.mock('../../../hooks/useCommandShopCatalog', () => ({
    useCommandShopCatalog: () => ({
        search: '', setSearch: vi.fn(), category: 'all', filter: 'all',
        selectCategory: vi.fn(), selectFilter: vi.fn(), items: [], expanded: null, variantLoading: false, toggleProduct: vi.fn()
    })
}));

const createMockSelection = (): CommandTargetSelection => ({
    selection: null, items: [], selectedItemIds: new Set<string>(), isSelected: () => false, isScopeLocked: () => false,
    toggleItem: vi.fn(), toggleLevel: vi.fn(), getScopeCount: () => 0, clear: vi.fn(), itemFor: () => undefined,
    checkboxProps: () => null, categoryCheckboxProps: () => null, levelCheckboxProps: () => null, colorFor: () => undefined,
    runAction: vi.fn(), containers: [], recipients: []
});

const mockEntries: CommandActionTargetEntry[] = [
    { id: 'npc-1', label: 'Dark Orc', context: 'orc', keyword: 'orc', group: 'npcs', category: 'cat-enemy', scope: 'room' },
    { id: 'obj-1', label: 'a wooden stick', context: 'stick', keyword: 'stick', group: 'objects', category: 'cat-object', scope: 'room' },
    { id: 'exit-n', label: 'north', context: 'north', keyword: 'north', group: 'exits', category: 'cat-exit', scope: 'room' },
    { id: 'worn-1', label: 'a silver ring', context: 'ring', keyword: 'ring', group: 'worn', category: 'cat-worn-object', scope: 'self' },
    { id: 'inv-1', label: 'a loaf of bread', context: 'bread', keyword: 'bread', group: 'inventory', category: 'cat-inventory-object', scope: 'self' },
    { id: 'group-1', label: 'Aragorn', context: 'aragorn', keyword: 'aragorn', group: 'group', category: 'cat-ally', scope: 'room',
        groupMember: { id: 101, name: 'Aragorn', label: 'Aragorn', hits: 100, maxHits: 100, moves: 100, maxMoves: 100, mana: 50, maxMana: 50 } as unknown as GroupMember }
];

describe('CommandActionTargetPicker hover and pin workflow', () => {
    afterEach(() => cleanup());

    it('defaults all sections and categories to closed', () => {
        render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[{ id: 101, name: 'Aragorn', label: 'Aragorn' } as unknown as GroupMember]}
            contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        expect((screen.getByLabelText('Room', { selector: 'details' }) as HTMLDetailsElement).open).toBe(false);
        expect((screen.getByLabelText('You', { selector: 'details' }) as HTMLDetailsElement).open).toBe(false);
        expect((screen.getByLabelText('Group', { selector: 'details' }) as HTMLDetailsElement).open).toBe(false);
    });

    it('expands horizontal tab on hover and closes on mouse away', () => {
        const { container } = render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[]} contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        const roomTab = screen.getByRole('tab', { name: 'Room' });
        const roomDetails = screen.getByLabelText('Room', { selector: 'details' }) as HTMLDetailsElement;
        expect(roomDetails.open).toBe(false);

        fireEvent.mouseEnter(roomTab);
        expect(roomDetails.open).toBe(true);

        const menu = container.querySelector('.command-action-target-menu') as HTMLElement;
        fireEvent.mouseLeave(menu);
        expect(roomDetails.open).toBe(false);
    });

    it('switches between horizontal tabs on hover without layout shifting tabs', () => {
        render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[]} contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        const roomTab = screen.getByRole('tab', { name: 'Room' });
        const youTab = screen.getByRole('tab', { name: 'You' });
        const roomDetails = screen.getByLabelText('Room', { selector: 'details' }) as HTMLDetailsElement;
        const youDetails = screen.getByLabelText('You', { selector: 'details' }) as HTMLDetailsElement;

        fireEvent.mouseEnter(roomTab);
        expect(roomDetails.open).toBe(true);
        expect(youDetails.open).toBe(false);

        fireEvent.mouseEnter(youTab);
        expect(roomDetails.open).toBe(false);
        expect(youDetails.open).toBe(true);
    });

    it('pins a category open on click so mouse away leaves it open, and unpins on click', () => {
        const { container } = render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[]} contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        const roomTab = screen.getByRole('tab', { name: 'Room' });
        const roomDetails = screen.getByLabelText('Room', { selector: 'details' }) as HTMLDetailsElement;

        // Click to pin
        fireEvent.click(roomTab);
        expect(roomTab.getAttribute('data-pinned')).toBe('true');
        expect(roomDetails.open).toBe(true);

        // Mouse leaves the whole menu, should stay open because pinned!
        const menu = container.querySelector('.command-action-target-menu') as HTMLElement;
        fireEvent.mouseLeave(menu);
        expect(roomDetails.open).toBe(true);

        // Click again to unpin
        fireEvent.click(roomTab);
        expect(roomTab.getAttribute('data-pinned')).toBeNull();
        fireEvent.mouseLeave(menu);
        expect(roomDetails.open).toBe(false);
    });

    it('expands and pins room subgroups on click', () => {
        render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[]} contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        fireEvent.click(screen.getByRole('tab', { name: 'Room' }));

        const objectsSubgroup = screen.getByLabelText('Objects', { selector: 'details' }) as HTMLDetailsElement;
        expect(objectsSubgroup.open).toBe(false);

        // Hover opens subgroup
        fireEvent.mouseEnter(objectsSubgroup);
        expect(objectsSubgroup.open).toBe(true);

        // Mouse away closes subgroup
        fireEvent.mouseLeave(objectsSubgroup);
        expect(objectsSubgroup.open).toBe(false);

        // Click summary pins subgroup
        const summary = objectsSubgroup.querySelector('summary')!;
        fireEvent.click(summary);
        expect(objectsSubgroup.open).toBe(true);

        // Mouse away stays open when pinned
        fireEvent.mouseLeave(objectsSubgroup);
        expect(objectsSubgroup.open).toBe(true);
    });

    it('expands Shop on hover and triggers browse', () => {
        const mockShop = {
            available: true, browsing: false, shopItems: [], keeperName: 'Shopkeeper',
            browse: vi.fn(), refreshBalance: vi.fn(), variants: {}, selectedStock: null,
            compareFirst: null, selectStock: vi.fn(), runShow: vi.fn(), setOutputOpen: vi.fn(),
            outputVisible: false, handleButton: vi.fn(), tryCompare: () => false,
            stockPending: false, pendingCommand: null
        };
        const { container } = render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[]} contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            shop={mockShop as any} onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        const shopTab = screen.getByRole('tab', { name: 'Shop' });
        const shopDetails = screen.getByLabelText('Shop', { selector: 'details' }) as HTMLDetailsElement;

        fireEvent.mouseEnter(shopTab);
        expect(shopDetails.open).toBe(true);
        expect(mockShop.browse).toHaveBeenCalled();

        fireEvent.mouseLeave(container.querySelector('.command-action-target-menu')!);
        expect(shopDetails.open).toBe(false);
    });

    it('expands Practice on hover and closes on mouse away', () => {
        const setOpen = vi.fn();
        const mockPractice = {
            open: false, setOpen, guild: { hasGuildmaster: true, available: true, sessionsLeft: 5 },
            skills: [], groups: [{ label: 'Spells', skills: [{ name: 'Magic Missile', knowledge: '100%', sessions: 1 }] }],
            browse: vi.fn(), search: '', setSearch: vi.fn(), selected: null, selectSkill: vi.fn(),
            canRequest: true, report: { pendingCommand: null }
        };
        const { container } = render(<CommandActionTargetPicker entries={mockEntries} selection={createMockSelection()}
            groupMembers={[]} contexts={[{ id: 'room', label: 'Crossroads' }, { id: 'self', label: 'Hero' }]}
            practice={mockPractice as any} onSelectContext={vi.fn()} onSelect={vi.fn()} />);

        const practiceTab = screen.getByRole('tab', { name: 'Practice' });
        fireEvent.mouseEnter(practiceTab);
        expect(setOpen).toHaveBeenCalledWith(true);

        fireEvent.mouseLeave(container.querySelector('.command-action-target-menu')!);
        expect(setOpen).toHaveBeenCalledWith(false);
    });
});
