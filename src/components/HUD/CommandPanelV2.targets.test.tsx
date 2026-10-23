/** @file CommandPanelV2.targets.test.tsx — Target rows retain names instead of array indexes. */
// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CommandPanelV2 } from './CommandPanelV2';
import { useCommandTree } from '../../hooks/useCommandTree';
import { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';

// --- Isolate the target rendering path ---
vi.mock('../../hooks/useCommandTree', () => ({ useCommandTree: vi.fn() }));
vi.mock('../../hooks/useCommandTreeController', () => ({ useCommandTreeController: vi.fn() }));
vi.mock('./CommandTreeSections', () => ({ CommandTreeSections: () => null }));
vi.mock('./CommandTreeOutputs', () => ({ CommandTreeOutputs: () => null }));
vi.mock('./CommandPanelViews', () => ({ CommandPanelViews: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./CommandTreeAction', () => ({ CommandTreeAction: ({ targetLabel }: { targetLabel: string }) => <button data-target-row>{targetLabel}</button> }));

// --- Generic entity targets and grouped object targets ---
it.each(['npcs', 'inventory'] as const)('renders names for %s targets without replacing them with indexes', group => {
    const names = ['Ellessar', 'pack horse', 'Morgundul orc-guard'];
    const targets: CommandActionTargetEntry[] = names.map((label, index) => ({
        id: `target-${index}`, label, keyword: label, context: label,
        category: group === 'npcs' ? 'cat-npc' : 'cat-inventory-object', group,
        scope: group === 'npcs' ? 'room' : 'self'
    }));
    vi.mocked(useCommandTreeController).mockReturnValue({
        game: {}, shop: { available: false }
    } as unknown as ReturnType<typeof useCommandTreeController>);
    vi.mocked(useCommandTree).mockReturnValue({
        grouped: [], group: null, quick: null, targets,
        command: { id: 'assist', label: 'Assist', command: 'assist %n', setId: 'trait-combat' }
    } as unknown as ReturnType<typeof useCommandTree>);
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(<CommandPanelV2 />);
    expect([...host.querySelectorAll('[data-target-row]')].map(row => row.textContent)).toEqual(names);
});
