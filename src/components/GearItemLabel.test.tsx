/** @file GearItemLabel.test.tsx — Visible gear condition text and colors. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { GearItemLabel } from './GearItemLabel';
import { toGearRow } from '../utils/gearPanelUtils';

// --- Condition presentation ---
afterEach(cleanup);
it.each([
    ['(flawless, new)', 'pristine'], ['(satisfactory)', 'stable'], ['(worn out)', 'worn'],
])('shows %s as colored text', (condition, state) => {
    const text = `a sword ${condition}`;
    const row = toGearRow({ id: text, text, html: text, isItem: true })!;
    const { container } = render(<GearItemLabel row={row} category="cat-inventory-object" showSlot={false} />);
    expect(container.querySelector(`.item-state-${state}`)?.textContent).toBe(condition);
    expect(container.querySelector('.gear-condition-indicator')).toBeNull();
});

it('retains unrecognized condition text and equipment slots', () => {
    const text = 'a sword (unusual condition)';
    const row = toGearRow({ id: text, text, html: text, isItem: true, prefix: '<wielded>' })!;
    const { container } = render(<GearItemLabel row={row} category="cat-worn-object" showSlot />);
    expect(container.querySelector('.gear-condition-text')?.textContent).toBe('(unusual condition)');
    expect(container.querySelector('.gear-slot')?.textContent).toBe('Wield');
});
