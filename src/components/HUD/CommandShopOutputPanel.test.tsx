/** @file CommandShopOutputPanel.test.tsx — Verifies shop output portals into the desktop Details slot and repeated shop chip clicks reopen Buy. */
// @vitest-environment jsdom
import React, { act } from 'react';
import { render, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CommandShopOutputPanel } from './CommandShopOutputPanel';
import { useClientPanelStackStore } from '../../stores/useClientPanelStackStore';
import { useCommandPanelStore } from '../../stores/useCommandPanelStore';
import { useCommandTree } from '../../hooks/useCommandTree';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { CommandShopProps } from '../../types';

const mockViewport = { isMobile: false };
vi.mock('../../context/GameContext', () => ({
    useGame: () => ({ viewport: mockViewport })
}));
vi.mock('../../hooks/useGearPanelData', () => ({
    useGearPanelData: () => ({ status: { skills: 'ready' } })
}));
vi.mock('../../hooks/useRoomDrinkWater', () => ({
    useRoomDrinkWater: () => false
}));

afterEach(() => {
    cleanup();
    useClientPanelStackStore.setState({ detailsOpen: false, detailsEnabled: true });
    useCommandPanelStore.setState({ shopOpenRequest: 0, practiceOpenRequest: 0 });
});

// --- Details Panel Slot Integration ---
it('portals shop output into the desktop Details panel slot and marks detailsOpen', () => {
    const slot = document.createElement('div');
    slot.id = 'client-panel-details-slot';
    document.body.appendChild(slot);
    const setOutputOpen = vi.fn();
    const shop = {
        outputVisible: true,
        outputTitle: 'Show · stock #333',
        pendingCommand: null,
        outputLines: [{ id: 1, text: 'It is a red ruby.', html: 'It is a red ruby.' }],
        setOutputOpen
    } as unknown as CommandShopProps['shop'];
    try {
        render(<CommandShopOutputPanel shop={shop} />);
        const panel = slot.querySelector('.command-shop-output-panel');
        expect(panel).not.toBeNull();
        expect(panel?.classList.contains('client-panel-stack-item')).toBe(true);
        expect(panel?.textContent).toContain('Show · stock #333');
        expect(panel?.textContent).toContain('It is a red ruby.');
        expect(useClientPanelStackStore.getState().detailsOpen).toBe(true);
    } finally {
        slot.remove();
    }
});

// --- Repeated Shop Chip Clicks ---
it('reopens Objects -> Shop -> Buy every time the shop chip requests it', () => {
    const makeController = (shopOpenRequest: number) => ({
        shopOpenRequest,
        practiceOpenRequest: 0,
        shop: { atShop: true, available: true, browsing: true },
        practice: { setOpen: vi.fn() },
        entries: [],
        menuButtons: [],
        game: { characterName: 'Tester', inlineCategories: [], roomNpcs: [], entities: {}, currentTerrain: 'city', roomItems: [], roomNum: 1 },
        vitals: { characterInfo: {} },
        ui: { displayInventoryLines: [], displayEqLines: [] },
        previewEntity: vi.fn(),
        previewTargetContext: vi.fn()
    }) as unknown as ReturnType<typeof useCommandTreeController>;

    let treeState!: ReturnType<typeof useCommandTree>;
    const Harness = () => {
        const shopOpenRequest = useCommandPanelStore(state => state.shopOpenRequest);
        treeState = useCommandTree(makeController(shopOpenRequest));
        return null;
    };

    useCommandPanelStore.getState().requestShopOpen();
    render(<Harness />);
    expect(treeState.group).toBe(3);
    expect(treeState.section).toBe('Shop');
    expect(treeState.command?.command).toBe('buy %n');
    expect(useCommandPanelStore.getState().shopOpenRequest).toBe(0);

    // User closes the menu or switches to another command (e.g. Show)
    act(() => {
        treeState.chooseCommand({ id: 'v2-shop-show', label: 'Show', command: 'show %n', setId: 'shop' } as any);
        treeState.chooseGroup(3); // toggle group closed
    });
    expect(treeState.group).toBeNull();

    // Clicking the shop chip again must reopen Objects -> Shop -> Buy
    act(() => {
        useCommandPanelStore.getState().requestShopOpen();
    });
    expect(treeState.group).toBe(3);
    expect(treeState.section).toBe('Shop');
    expect(treeState.command?.command).toBe('buy %n');
    expect(useCommandPanelStore.getState().shopOpenRequest).toBe(0);
});
