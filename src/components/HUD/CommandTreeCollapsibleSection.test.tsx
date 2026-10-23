// @vitest-environment jsdom
/** @file CommandTreeCollapsibleSection.test.tsx — Section preferences survive reopening and stay scoped to their menu. */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { CommandTreeCollapsibleSection } from './CommandTreeCollapsibleSection';
import { useCommandMenuSectionsStore } from '../../stores/useCommandMenuSectionsStore';

// --- Reopening Checks Section ---
beforeEach(() => useCommandMenuSectionsStore.setState({ collapsed: {} }));
afterEach(cleanup);
const menu = (name: string) => <section aria-label={name}>
    <CommandTreeCollapsibleSection label="Inventory">Items</CommandTreeCollapsibleSection>
</section>;
it('remembers a collapsed section after its menu unmounts and reopens', () => {
    const first = render(menu('Give objects'));
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    first.unmount();
    render(menu('Give objects'));
    expect(screen.getByRole('button', { name: 'Inventory' }).getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    cleanup();
    render(menu('Give objects'));
    expect(screen.getByRole('button', { name: 'Inventory' }).getAttribute('aria-expanded')).toBe('true');
});
it('keeps sections with the same name independent when switching menus', () => {
    const view = render(menu('Give objects'));
    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    view.rerender(menu('Put objects'));
    expect(screen.getByRole('button', { name: 'Inventory' }).getAttribute('aria-expanded')).toBe('true');
    view.rerender(menu('Give objects'));
    expect(screen.getByRole('button', { name: 'Inventory' }).getAttribute('aria-expanded')).toBe('false');
});
