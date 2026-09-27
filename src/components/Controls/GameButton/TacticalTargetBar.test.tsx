// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { TacticalTargetBar } from './TacticalTargetBar';

afterEach(cleanup);

describe('TacticalTargetBar', () => {
    const mockOccupants = [
        { id: 1, name: 'Morgundul orc-guard', short: 'a Morgundul orc-guard', type: 'enemy' },
        { id: 2, name: 'Town Guard', short: 'a burly town guard', type: 'npc' }
    ];

    it('renders null when closed', () => {
        const { container } = render(
            <TacticalTargetBar
                isOpen={false}
                currentTarget="Morgundul orc-guard"
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                roomOccupants={mockOccupants as any}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('selects on tap without bubbling and ignores a scrolling gesture', () => {
        const handleSelect = vi.fn();
        const parentPointerUp = vi.fn();

        render(
            <div onPointerUp={parentPointerUp}>
                <TacticalTargetBar
                    isOpen={true}
                    currentTarget="Morgundul orc-guard"
                    selectedTarget={null}
                    onSelectTarget={handleSelect}
                    roomOccupants={mockOccupants as any}
                />
            </div>
        );

        expect(screen.getByText(/TARGETS/)).toBeTruthy();
        expect(screen.getByText(/Morgundul orc-guard/i)).toBeTruthy();
        expect(screen.getByText('Enemies')).toBeTruthy();
        expect(screen.getByText('NPCs')).toBeTruthy();
        expect(document.querySelector('.tactical-target-bar-badge')).toBeNull();

        const guardItem = screen.getByText(/town guard/i);
        fireEvent.pointerDown(guardItem, { clientX: 30, clientY: 30 });
        expect(handleSelect).not.toHaveBeenCalled();
        fireEvent.pointerUp(guardItem);
        fireEvent.click(guardItem);
        expect(handleSelect).toHaveBeenCalledWith(expect.stringMatching(/guard/i));
        expect(parentPointerUp).not.toHaveBeenCalled();

        handleSelect.mockClear();
        fireEvent.pointerDown(guardItem, { clientX: 30, clientY: 30 });
        fireEvent.pointerMove(guardItem, { clientX: 30, clientY: 55 });
        fireEvent.pointerUp(guardItem);
        fireEvent.click(guardItem);
        expect(handleSelect).not.toHaveBeenCalled();
    });

    it('tracks a held swipe over target rows and scrolls the list instead of selecting while scrolling', () => {
        const handleHover = vi.fn();
        render(
            <TacticalTargetBar
                isOpen={true}
                currentTarget={null}
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                onHoverTarget={handleHover}
                roomOccupants={mockOccupants as any}
            />
        );

        const row = document.querySelector<HTMLElement>('.tactical-target-bar-item')!;
        const list = document.querySelector<HTMLElement>('.tactical-target-bar-list')!;
        list.scrollTop = 100;
        Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => row });

        fireEvent.pointerMove(window, { clientX: 20, clientY: 20, buttons: 1 });
        expect(handleHover).toHaveBeenLastCalledWith(row.dataset.targetValue);

        fireEvent.pointerMove(window, { clientX: 20, clientY: 50, buttons: 1 });
        expect(list.scrollTop).toBe(70);
        expect(handleHover).toHaveBeenLastCalledWith(null);
    });

    it('shows both argument target lists and reports which list was selected', () => {
        const handleSelectColumn = vi.fn();
        render(
            <TacticalTargetBar
                isOpen={true}
                currentTarget={null}
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                onSelectColumnTarget={handleSelectColumn}
                roomOccupants={[]}
                columns={[
                    { title: 'Object', suggestions: [{ key: 'knife', label: 'knife', value: 'knife', meta: 'inventory' }], selectedTarget: null },
                    { title: 'Container', suggestions: [{ key: 'pack', label: 'pack', value: 'pack', meta: 'worn' }], selectedTarget: null },
                ]}
            />
        );

        expect(screen.getByText('Object')).toBeTruthy();
        expect(screen.getByText('Container')).toBeTruthy();
        const packRow = document.querySelector<HTMLElement>('[data-target-value="pack"]')!;
        fireEvent.pointerDown(packRow, { clientX: 20, clientY: 20 });
        fireEvent.pointerUp(packRow);
        fireEvent.click(packRow);
        expect(handleSelectColumn).toHaveBeenCalledWith('pack', 1, { key: 'pack', label: 'pack', value: 'pack', meta: 'worn' });
    });

    it('highlights only the selected container row when labels share a keyword', () => {
        render(
            <TacticalTargetBar
                isOpen={true}
                currentTarget={null}
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                roomOccupants={[]}
                columns={[
                    { title: 'Item', suggestions: [], selectedTarget: null },
                    {
                        title: 'Get From',
                        suggestions: [
                            { key: 'dark-flask', label: 'a dark coloured flask', value: 'flask', meta: 'inventory' },
                            { key: 'glass-flask', label: 'a glass flask', value: 'glass-flask', meta: 'inventory' },
                        ],
                        selectedTarget: 'flask',
                        selectedKey: 'dark-flask',
                    },
                ]}
            />
        );

        expect(document.querySelector('[data-target-value="flask"]')?.classList.contains('is-selected')).toBe(true);
        expect(document.querySelector('[data-target-value="glass-flask"]')?.classList.contains('is-selected')).toBe(false);
    });

    it('shows the active command beside its targets and dismisses on outside tap', () => {
        const onDismiss = vi.fn();
        render(
            <TacticalTargetBar
                isOpen={true}
                currentTarget={null}
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                onDismiss={onDismiss}
                commandLabel="give"
                roomOccupants={mockOccupants as any}
            />
        );

        const body = document.querySelector('.tactical-target-bar-body');
        expect(body?.firstElementChild?.classList.contains('tactical-target-bar-command')).toBe(true);
        expect(screen.getByText('give')).toBeTruthy();
        fireEvent.pointerDown(document.querySelector('.tactical-target-bar-item')!);
        expect(onDismiss).not.toHaveBeenCalled();
        fireEvent.pointerDown(document.body);
        expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('keeps touch scrolling active when the browser reports no pressed buttons and resets after release', () => {
        render(
            <TacticalTargetBar
                isOpen={true}
                currentTarget={null}
                selectedTarget={null}
                onSelectTarget={vi.fn()}
                roomOccupants={mockOccupants as any}
            />
        );

        const row = document.querySelector<HTMLElement>('.tactical-target-bar-item')!;
        const list = document.querySelector<HTMLElement>('.tactical-target-bar-list')!;
        list.scrollTop = 100;
        Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => row });

        fireEvent.pointerMove(window, { pointerType: 'touch', clientX: 20, clientY: 20, buttons: 0 });
        fireEvent.pointerMove(window, { pointerType: 'touch', clientX: 20, clientY: 50, buttons: 0 });
        expect(list.scrollTop).toBe(70);
        expect(list.dataset.scrolling).toBe('true');

        fireEvent.pointerUp(window, { pointerType: 'touch' });
        expect(list.dataset.scrolling).toBe('false');
    });
});
