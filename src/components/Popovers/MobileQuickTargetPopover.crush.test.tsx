/** @file MobileQuickTargetPopover.crush.test.tsx — Herb quick actions dispatch once. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { useCommandTreeController } from '../../hooks/useCommandTreeController';
import type { CommandActionTargetEntry } from '../../objects/commandActionTargetModel';
import { MobileQuickTargetPopover } from './MobileQuickTargetPopover';

// --- Crush action ---
afterEach(cleanup);
it('crushes the numbered honeycomb once and closes the popover', () => {
    const entry = { id:'honeycomb', label:'a honeycomb', keyword:'honeycomb', context:'2.honeycomb',
        category:'cat-inventory-object', group:'inventory', scope:'self' } as CommandActionTargetEntry;
    const executeCommand = vi.fn(), close = vi.fn();
    const controller = { game:{ inlineCategories:[], roomNum:1, isSpectateMode:false, executeCommand,
        initAudio:vi.fn(), isSoundEnabled:false }, vitals:{ characterInfo:{} } } as unknown as ReturnType<typeof useCommandTreeController>;
    render(<MobileQuickTargetPopover entry={entry} controller={controller} close={close} />);
    fireEvent.click(screen.getByRole('button', { name:'Crush' }));
    expect(executeCommand).toHaveBeenCalledOnce();
    expect(executeCommand).toHaveBeenCalledWith('crush 2.honeycomb', false, false, false, false, { shouldFocus:false, fromUi:true });
    expect(close).toHaveBeenCalledOnce();
});
