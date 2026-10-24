/** @file useEntityRegistry.test.tsx — Unchanged entities retain target eligibility caches. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { useEntityRegistry } from './useEntityRegistry';

// --- Registration Checks ---
it('retains registry identity for repeated registrations and updates changed locations', async () => {
    let registry!: ReturnType<typeof useEntityRegistry>;
    const root = createRoot(document.createElement('div'));
    const Harness = () => { registry = useEntityRegistry(); return null; };
    try {
        await act(async () => root.render(<Harness/>));
        await act(async () => { registry.registerEntity('sword', 'a sword', 'carried', 'cat-inventory-object'); });
        const original = registry.entities;
        await act(async () => { registry.registerEntity('sword', 'a sword', 'carried', 'cat-inventory-object'); });
        expect(registry.entities).toBe(original);
        await act(async () => { registry.registerEntity('sword', 'a sword', 'worn', 'cat-worn-object'); });
        expect(registry.entities).not.toBe(original);
        expect(registry.getEntity('sword')?.location).toBe('worn');
    } finally { await act(async () => root.unmount()); }
});
