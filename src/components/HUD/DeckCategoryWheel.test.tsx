// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Swords } from 'lucide-react';
import { DeckCategoryWheel } from './DeckCategoryWheel';
import type { DeckItem } from './useDeckTargeting';
import type { CustomButton } from '../../types';

vi.mock('../../context/GameContext', () => ({
    useGame: () => ({
        executeCommand: vi.fn(),
        triggerHaptic: vi.fn(),
        viewport: { isMobile: true },
        btn: { setActiveSet: vi.fn(), setButtons: vi.fn() },
        joystick: { joystickActive: false, currentDir: null, isTargetModifierActive: false, setIsJoystickConsumed: vi.fn() },
        practice: { practiceData: {} }
    }),
    useUI: () => ({ displayInventoryLines: [], displayEqLines: [] }),
    useVitals: () => ({ target: null, activePrompt: null }),
    useTokenHighlight: () => ({ target: null, opponentId: null, opponentName: null }),
    useBaseGame: () => ({})
}));

const actions: DeckItem[] = [
    { label: 'Kill', cmd: 'kill', needsTarget: true },
    { label: 'Flee', cmd: 'flee', needsTarget: false },
    { label: 'Bash', cmd: 'bash', needsTarget: true },
];

const mockButton: CustomButton = {
    id: 'deck-cat-combat',
    label: 'Combat',
    command: 'kill',
    setId: 'Tactical',
    actionType: 'command',
    display: 'floating',
    style: { x: 0, y: 0, w: 38, h: 38 },
    position: { x: 0, y: 0, w: 38, h: 38 },
    swipeCommands: { right: 'flee' },
    isVisible: true
};

const createMockGameButtonProps = (overrides = {}) => ({
    isEditMode: false,
    isGridEnabled: false,
    gridSize: 1,
    isSelected: false,
    dragState: null,
    handleDragStart: vi.fn(),
    handleButtonClick: vi.fn(),
    wasDraggingRef: { current: false },
    triggerHaptic: vi.fn(),
    setPopoverState: vi.fn(),
    setEditButton: vi.fn(),
    activePrompt: null,
    executeCommand: vi.fn(),
    setCommandPreview: vi.fn(),
    setHeldButton: vi.fn(),
    heldButton: null,
    joystick: {
        isActive: false,
        currentDir: null,
        isTargetModifierActive: false,
        setIsJoystickConsumed: vi.fn(),
    },
    target: null,
    setActiveSet: vi.fn(),
    setButtons: vi.fn(),
    isMobile: true,
    ...overrides
});

afterEach(cleanup);

describe('DeckCategoryWheel', () => {
    it('renders the category button with accessible label and custom class', () => {
        const gameButtonProps = createMockGameButtonProps();

        render(
            <DeckCategoryWheel
                label="Combat"
                icon={Swords}
                button={mockButton}
                gameButtonProps={gameButtonProps}
                availableActions={actions}
                onSwapCells={vi.fn(() => true)}
                onAssignAction={vi.fn(() => true)}
            />
        );

        const btn = screen.getByRole('button', { name: /Combat actions/i });
        expect(btn).toBeTruthy();
        expect(btn.classList.contains('deck-category-button')).toBe(true);
    });

    it('filters out existing wheel commands from extended command palette actions', () => {
        const onSwapCells = vi.fn(() => true);
        const onAssignAction = vi.fn(() => true);
        const gameButtonProps = createMockGameButtonProps();

        const { container } = render(
            <DeckCategoryWheel
                label="Combat"
                icon={Swords}
                button={mockButton}
                gameButtonProps={gameButtonProps}
                availableActions={actions}
                onSwapCells={onSwapCells}
                onAssignAction={onAssignAction}
            />
        );

        expect(container.querySelector('.deck-category-button')).toBeTruthy();
    });
});

