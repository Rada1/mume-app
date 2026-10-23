/** @file TargetArgumentChip.test.tsx — Target classification survives accepted argument rendering. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TargetArgumentChip } from './TargetArgumentChip';

vi.mock('../../context/GameContext', () => ({ useGame: () => ({ triggerHaptic: vi.fn() }) }));

// --- Accepted Target Appearance ---
afterEach(cleanup);
it('uses the same highlight kinds as suggestions and updates when the chip target changes', () => {
    const suggestions = [
        { key: 'guard', label: 'a town guard', value: 'guard', meta: 'npc', category: 'cat-npc' },
        { key: 'friend', label: 'Aranur', value: 'Aranur', meta: 'ally', category: 'cat-ally' }
    ];
    const chip = { id: 'target', title: 'Target argument', displayLabel: 'a town guard', selectedValue: 'guard',
        suggestions, onChoose: vi.fn() };
    const { rerender } = render(<TargetArgumentChip chip={chip} />);
    expect(screen.getByRole('button', { name: /Target argument/ }).getAttribute('data-target-kind')).toBe('enemy');
    expect(screen.getByRole('button', { name: /Target argument/ }).style.getPropertyValue('--argument-target-color')).not.toBe('');
    expect(screen.getByRole('button', { name: /Target argument/ }).querySelector('svg')).toBeNull();
    rerender(<TargetArgumentChip chip={{ ...chip, displayLabel: 'Aranur', selectedValue: 'Aranur' }} />);
    expect(screen.getByRole('button', { name: /Target argument/ }).getAttribute('data-target-kind')).toBe('ally');
});
