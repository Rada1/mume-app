/** @file CommandTreeCollapsibleSection.test.tsx — Mobile targets stay visible despite saved desktop collapse choices. */
// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it} from 'vitest';
import {CommandTreeCollapsibleSection} from './CommandTreeCollapsibleSection';
import {CommandTargetMenuContext} from '../../context/CommandTargetMenuContext';
import {useCommandMenuSectionsStore} from '../../stores/useCommandMenuSectionsStore';

// --- Saved Collapse and Mobile Presentation Section ---
it('removes mobile headings and exposes targets without changing the saved collapse choice', async () => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const previous = useCommandMenuSectionsStore.getState().collapsed;
    useCommandMenuSectionsStore.setState({collapsed: {}});
    const render = async (mobile: boolean) => {
        await act(async () => root.render(<div aria-label="Inventory targets">
            <CommandTargetMenuContext.Provider value={mobile}>
                <CommandTreeCollapsibleSection label="Inventory">
                    <button type="button">Sword</button>
                </CommandTreeCollapsibleSection>
            </CommandTargetMenuContext.Provider>
        </div>));
    };
    try {
        await render(false);
        await act(async () => host.querySelector<HTMLButtonElement>('.command-tree-section-heading')!.click());
        expect(host.querySelector('.command-tree-section-content')?.hasAttribute('hidden')).toBe(true);
        await render(true);
        expect(host.querySelector('.command-tree-section-heading')).toBeNull();
        expect(host.querySelector('.command-tree-section-content')?.hasAttribute('hidden')).toBe(false);
        expect(host.querySelector('.command-tree-section-content button')?.textContent).toBe('Sword');
        await render(false);
        expect(host.querySelector('.command-tree-section-content')?.hasAttribute('hidden')).toBe(true);
    } finally {
        await act(async () => root.unmount());
        useCommandMenuSectionsStore.setState({collapsed: previous});
    }
});
