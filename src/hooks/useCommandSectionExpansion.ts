/** @file useCommandSectionExpansion.ts — Scope section preferences to their containing menu. */
import { useLayoutEffect, useRef, useState } from 'react';
import { useCommandMenuSectionsStore } from '../stores/useCommandMenuSectionsStore';

// --- Section Identity Section ---
export function useCommandSectionExpansion(label: string) {
    const sectionRef = useRef<HTMLElement>(null);
    const [key, setKey] = useState('');
    const collapsed = useCommandMenuSectionsStore(state => Boolean(state.collapsed[key]));
    const toggle = useCommandMenuSectionsStore(state => state.toggle);
    // Read the rendered menu label on each commit: React can reuse a section
    // when switching commands that both have, for example, Inventory targets.
    useLayoutEffect(() => {
        const menu = sectionRef.current?.parentElement?.closest('[aria-label]');
        const nextKey = JSON.stringify([menu?.getAttribute('aria-label') || 'Commands', label]);
        if (key !== nextKey) setKey(nextKey);
    });
    return { sectionRef, open: !collapsed, toggle: () => { if (key) toggle(key); } };
}
