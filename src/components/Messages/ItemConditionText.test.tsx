// @vitest-environment jsdom
/** @file ItemConditionText.test.tsx — Shop conditions reuse equipment colors without requiring object tags. */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Token } from '../../types';
import { ItemConditionText } from './ItemConditionText';
import { TokenRenderer } from './TokenRenderer';
import { classifyItemTier } from '../../utils/itemTier';
import { useSettingsStore } from '../../stores/useSettingsStore';

vi.mock('../../context/GameContext', () => ({
    useTokenHighlight: () => ({ target, opponentId: null, opponentName: null,
        inlineCategories: [], selectedObjectIds: new Set<string>(), inCombat: false })
}));

// --- Condition Rendering ---
let target: string | null = null;
beforeEach(() => { target = null; useSettingsStore.setState({ isClassicMode: false }); });
afterEach(cleanup);
describe('shared equipment and shop condition colors', () => {
    it.each([
        ['flawless', 'pristine'], ['satisfactory, new', 'stable'],
        ['well-maintained', 'stable'], ['used', 'stable'], ['worn, old', 'worn']
    ])('uses the equipment rule for (%s)', (label, state) => {
        const content = `65. a breastplate (${label}) for sixteen lauren.`;
        const { container } = render(<ItemConditionText content={content} />);
        expect(container.textContent).toBe(content);
        expect(container.querySelector(`.item-state-${state}`)?.textContent).toBe(`(${label})`);
        expect(classifyItemTier(content).state).toBe(state);
    });

    it('leaves unknown labels and item descriptions unchanged', () => {
        const content = '333. a red ruby (blue) for fifty-two lauren.';
        const { container } = render(<ItemConditionText content={content} />);
        expect(container.textContent).toBe(content);
        expect(container.querySelector('.inline-item-condition')).toBeNull();
    });

    it.each(['text', 'ansi', 'entity'] as const)('colors combined conditions in %s log tokens', type => {
        const content = '65. a breastplate (satisfactory, new) for sixteen lauren.';
        const token: Token = type === 'entity'
            ? { type, content, entityId: 'shop-65', metadata: { category: 'cat-room-object' } }
            : { type, content };
        const { container } = render(<TokenRenderer tokens={[token]} />);
        expect(container.textContent).toBe(content);
        const highlighted = [...container.querySelectorAll('.item-state-stable')].map(span => span.textContent).join(' ');
        expect(highlighted).toBe('(satisfactory, new)');
    });

    it('keeps condition colors when an active target also appears in the line', () => {
        target = 'guard';
        const content = '65. a guard helmet (satisfactory, new) for sixteen lauren.';
        const { container } = render(<TokenRenderer tokens={[{ type: 'text', content }]} />);
        expect(container.querySelector('.is-target')?.textContent).toBe('guard');
        expect(container.querySelector('.item-state-stable')?.textContent).toBe('(satisfactory, new)');
        expect(container.textContent).toBe(content);
    });
});
