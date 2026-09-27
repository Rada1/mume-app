// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Swords } from 'lucide-react';
import { DeckCategoryWheel } from './DeckCategoryWheel';
import type { DeckItem } from './useDeckTargeting';

const actions: DeckItem[] = [
    { label: 'Kill', cmd: 'kill ', needsTarget: true },
    { label: 'Flee', cmd: 'flee', needsTarget: false },
];

afterEach(cleanup);

describe('DeckCategoryWheel', () => {
    it('keeps tap-to-open behavior', () => {
        const onTap = vi.fn();
        render(<DeckCategoryWheel label="Combat" icon={Swords} active={false} actions={actions} onTap={onTap} onChoose={vi.fn()} onHoldAction={vi.fn()} onSelectTarget={vi.fn()} onReleaseTargetMenu={vi.fn()} onCancelTargetMenu={vi.fn()} />);

        fireEvent.click(screen.getByRole('tab', { name: /Combat actions/i }));
        expect(onTap).toHaveBeenCalledOnce();
    });

    it('chooses the matching action when swiping from the category button', () => {
        const onChoose = vi.fn();
        render(<DeckCategoryWheel label="Combat" icon={Swords} active={false} actions={actions} onTap={vi.fn()} onChoose={onChoose} onHoldAction={vi.fn()} onSelectTarget={vi.fn()} onReleaseTargetMenu={vi.fn()} onCancelTargetMenu={vi.fn()} />);
        const tab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(tab, { pointerId: 1, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(tab, { pointerId: 1, buttons: 1, clientX: 150, clientY: 100 });
        expect(screen.getByText('Combat', { selector: '.swipe-center-label' })).toBeTruthy();
        fireEvent.pointerUp(tab, { pointerId: 1, button: 0, clientX: 150, clientY: 100 });

        expect(onChoose).toHaveBeenCalledWith(actions[0]);
    });

    it('keeps the initiating pointer active until the target menu is released', () => {
        vi.useFakeTimers();
        const onHoldAction = vi.fn();
        const onReleaseTargetMenu = vi.fn();
        render(<DeckCategoryWheel label="Combat" icon={Swords} active={false} actions={actions} onTap={vi.fn()} onChoose={vi.fn()} onHoldAction={onHoldAction} onSelectTarget={vi.fn()} onReleaseTargetMenu={onReleaseTargetMenu} onCancelTargetMenu={vi.fn()} />);
        const tab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(tab, { pointerId: 7, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(tab, { pointerId: 7, buttons: 1, clientX: 150, clientY: 100 });
        vi.advanceTimersByTime(220);
        expect(onHoldAction).toHaveBeenCalledWith(actions[0], 7);

        fireEvent.pointerUp(window, { pointerId: 7, button: 0, pointerType: 'touch', clientX: 150, clientY: 100 });
        expect(onReleaseTargetMenu).toHaveBeenCalledWith(7);
        vi.useRealTimers();
    });

    it('keeps the command wheel visible over the target menu until the swipe is released', () => {
        vi.useFakeTimers();
        const onCancelTargetMenu = vi.fn();
        const onReleaseTargetMenu = vi.fn();
        render(<DeckCategoryWheel label="Combat" icon={Swords} active={false} actions={actions} onTap={vi.fn()} onChoose={vi.fn()} onHoldAction={vi.fn()} onSelectTarget={vi.fn()} onReleaseTargetMenu={onReleaseTargetMenu} onCancelTargetMenu={onCancelTargetMenu} />);
        const tab = screen.getByRole('tab', { name: /Combat actions/i });

        fireEvent.pointerDown(tab, { pointerId: 9, button: 0, pointerType: 'touch', clientX: 100, clientY: 100 });
        fireEvent.pointerMove(tab, { pointerId: 9, buttons: 1, clientX: 150, clientY: 100 });
        act(() => vi.advanceTimersByTime(220));
        expect(document.querySelector('.deck-category-swipe-overlay.is-target-menu-visible')).toBeTruthy();

        fireEvent.pointerMove(window, { pointerId: 9, buttons: 1, clientX: 190, clientY: 100 });
        expect(onCancelTargetMenu).not.toHaveBeenCalled();
        expect(document.querySelector('.deck-category-swipe-overlay.is-target-menu-visible')).toBeTruthy();

        fireEvent.pointerUp(window, { pointerId: 9, button: 0, pointerType: 'touch', clientX: 190, clientY: 100 });
        expect(onReleaseTargetMenu).toHaveBeenCalledWith(9);
        expect(document.querySelector('.deck-category-swipe-overlay')).toBeNull();
        vi.useRealTimers();
    });
});
