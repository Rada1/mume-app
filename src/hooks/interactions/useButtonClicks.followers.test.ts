// @vitest-environment jsdom
/** @file useButtonClicks.followers.test.ts — Ranger Command arms a one-shot follower prefix. */
import type React from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useButtonClicks } from './useButtonClicks';
import type { InteractionDeps } from '../useInteractionHandlers';
import { formatCommandPrefixPreview, useTacticalCommandPrefixStore } from '../../stores/useTacticalCommandPrefixStore';
import { useCommandPrefixPreview } from '../useCommandPrefixPreview';
import { createButton } from '../../utils/buttonFactory';
import { executeCommandPanelInput } from '../executeCommandPanelInput';

// --- Isolated button execution fixture ---
afterEach(() => { cleanup(); useTacticalCommandPrefixStore.getState().clearPrefix(); vi.useRealTimers(); });
it('arms Command without sending, previews it, then prefixes a resolved target exactly once', () => {
 vi.useFakeTimers();
 const send = vi.fn();
 const optimistic = vi.fn();
 const element = document.createElement('button');
 element.setAttribute('data-menu-item', 'true');
 const event = {stopPropagation: vi.fn(), currentTarget: element} as unknown as React.MouseEvent;
 const deps = {executeCommand: send, setInput: vi.fn(), setCommandPreview: vi.fn(), triggerHaptic: vi.fn(),
  initAudio: vi.fn(), btn: {isEditMode: false}, viewport: {isMobile: true}, joystick: {}, keywordOverrides: {},
  setPopoverState: vi.fn(), applyOptimisticChange: optimistic } as unknown as InteractionDeps;
 const {result} = renderHook(() => ({...useButtonClicks(deps), preview: useCommandPrefixPreview(null)}));
 const command = createButton({id:'ranger-command', label:'Command', command:'command', setId:'rangerskilllist'});
 act(() => result.current.handleButtonClick(command, event));
 expect(send).not.toHaveBeenCalled();
 expect(result.current.preview).toBe('order followers');
 expect(formatCommandPrefixPreview(useTacticalCommandPrefixStore.getState().prefix, 'get sword')).toBe('order followers get sword');
 expect(useTacticalCommandPrefixStore.getState().prefix).toBe('order followers');
 const action = createButton({id:'get', label:'Get', command:'get %n', setId:'trait-utility'});
 act(() => result.current.handleButtonClick(action, event, 'sword'));
 expect(send).toHaveBeenLastCalledWith('order followers get sword', false, false, false, false, expect.anything());
 expect(optimistic).not.toHaveBeenCalled();
 expect(result.current.preview).toBeNull();
 act(() => result.current.handleButtonClick(action, event, 'shield'));
 expect(send).toHaveBeenLastCalledWith('get shield', false, false, false, false, expect.anything());
});

it('leaves the prefix armed during system captures and applies it to a direct panel action', () => {
 const send = vi.fn();
 const game = {initAudio: vi.fn(), isSoundEnabled: false, playClickSound: vi.fn(), executeCommand: send};
 useTacticalCommandPrefixStore.getState().armFollowers();
 executeCommandPanelInput(game, 'look in pack', true, true);
 expect(send.mock.calls[0][0]).toBe('look in pack');
 expect(useTacticalCommandPrefixStore.getState().prefix).toBe('order followers');
 executeCommandPanelInput(game, 'look');
 expect(send.mock.calls[1][0]).toBe('order followers look');
 expect(useTacticalCommandPrefixStore.getState().prefix).toBeNull();
});
