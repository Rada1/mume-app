// @vitest-environment jsdom
/** @file BoardDetails.test.tsx — Board entry expansion and command dispatch. */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BoardDetails } from './BoardDetails';
import { useArchiveStore } from '../../stores/useArchiveStore';
vi.mock('../../context/GameContext', () => ({useGame: () => ({mumeEditState:{isOpen:false}, handleSaveMumeEdit:vi.fn(), handleCancelMumeEdit:vi.fn()})}));

// --- Interaction section ---
afterEach(() => { cleanup(); useArchiveStore.getState().clearArchive(); });
it('keeps the list visible while expanding the selected message', () => {
 const executeCommand = vi.fn();
 const lines = ['Board - 2 messages', '1103#: Buggy boards (Manwe)', '2666#: Another (Ilie)'];
 const {rerender} = render(<BoardDetails lines={lines} label="Board" executeCommand={executeCommand}/>);
 fireEvent.click(screen.getByRole('button', {name:/1103/}));
 expect(executeCommand).toHaveBeenCalledWith('read 1103', true, true, false, true, {shouldFocus:false, fromUi:true});
 rerender(<BoardDetails label="read 1103" loading executeCommand={executeCommand}/>);
 expect(screen.getByText('Loading…')).toBeTruthy();
 act(() => useArchiveStore.getState().setActiveDetail({id:1103, source:'board', view:'board', subject:'Buggy boards', author:'Manwe', date:'', body:'Message body'}));
 rerender(<BoardDetails label="read 1103" loading={false} executeCommand={executeCommand}/>);
 expect(screen.getByText('Message body')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', {name:'Reply'}));
 expect(executeCommand).toHaveBeenCalledWith('reply 1103', false, false, false, false, {shouldFocus:false, fromUi:true});
 expect(screen.getByRole('button', {name:/2666/})).toBeTruthy();
});
it('expands mail and requests an inline mail reply', () => {
 useArchiveStore.getState().setActiveView('mail-inbox');
 const executeCommand = vi.fn();
 const {rerender} = render(<BoardDetails mail label="Mail" lines={['Mailbox', 'Mail 12: Hello (Elena)']} executeCommand={executeCommand}/>);
 fireEvent.click(screen.getByRole('button', {name:/12 Hello/}));
 expect(executeCommand).toHaveBeenCalledWith('read 12',true,true,false,true,{shouldFocus:false,fromUi:true});
 act(() => useArchiveStore.getState().setActiveDetail({id:12,source:'mail',view:'mail-inbox',subject:'Hello',author:'Elena',date:'',body:'Mail contents'}));
 rerender(<BoardDetails mail label="read 12" lines={['Mail contents']} executeCommand={executeCommand}/>);
 expect(screen.getByText('Mail contents')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', {name:'Reply'}));
 expect(useArchiveStore.getState().pendingEditorContext).toMatchObject({kind:'archive-reply',source:'mail',entryId:12});
});
