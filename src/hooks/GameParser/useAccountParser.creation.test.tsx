/** @file useAccountParser.creation.test.tsx — Refresh the account roster after character creation. */
// @vitest-environment jsdom
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAccountParser } from './useAccountParser';
import type { AccountState, AccountStage, GameState } from '../../types';

// --- Account roster refresh ---
it.each([true, false])('refreshes once after creation for mobile=%s', isMobile => {
 vi.useFakeTimers();
 try {
  const send = vi.fn();
  const stageRef = {current:'character-creation' as AccountStage};
  const {result} = renderHook(() => {
   const [accountState,setAccountState] = React.useState<AccountState>({stage:'character-creation',characters:[{name:'Old',race:'Elf',level:25,logon:'now',area:'Bree',rent:'free'}],selectedCharacter:null});
   const [gameState,setGameState] = React.useState<GameState>('account');
   const parser = useAccountParser({accountState,setAccountState,accountStageRef:stageRef,gameState,setGameState,
    sendCommand:vi.fn(),executeCommandRef:{current:send},isMobile,setIsPasswordMode:vi.fn(),captureStage:{current:'none'}});
   return {accountState,parser};
  });
  act(() => result.current.parser.parseAccountLine('Creation in progress'));
  act(() => result.current.parser.parseAccountLine('Account>'));
  act(() => vi.advanceTimersByTime(50));
  expect(send).toHaveBeenCalledExactlyOnceWith('list',true);
  act(() => result.current.parser.parseAccountLine('Old Elf Scout 25 now Bree free'));
  act(() => result.current.parser.parseAccountLine('Falathor Elf Scout 1 now Bree free'));
  act(() => result.current.parser.parseAccountLine('Account>'));
  expect(result.current.accountState.characters.map(character => character.name)).toEqual(['Old','Falathor']);
  act(() => vi.advanceTimersByTime(100));
  expect(send).toHaveBeenCalledOnce();
 } finally { vi.useRealTimers(); }
});
