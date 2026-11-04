// @vitest-environment jsdom
/** @file MumeEditor.test.tsx — Floating editor lifecycle and actions. */
import React from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {MumeEditor} from './MumeEditor';

// --- Editor behavior ---
const game = vi.hoisted(() => ({mumeEditState:{isOpen:true,text:'Original',mode:'edit'},
 setMumeEditState:vi.fn(),handleSaveMumeEdit:vi.fn(),handleCancelMumeEdit:vi.fn()}));
vi.mock('../../context/GameContext', () => ({useGame:() => game}));
afterEach(() => {cleanup(); vi.restoreAllMocks();});
it('opens a floating dialog, saves edits, and cancels through the server handler', () => {
 const show = vi.fn(function(this:HTMLDialogElement) {this.open = true;});
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:show});
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:vi.fn()});
 render(<MumeEditor/>);
 expect(show).toHaveBeenCalledOnce();
 const dialog = screen.getByLabelText('MUME Editor');
 expect(dialog.tagName).toBe('DIALOG');
 expect(dialog.classList.contains('docked-panel')).toBe(false);
 fireEvent.change(screen.getByRole('textbox'),{target:{value:'Edited'}});
 fireEvent.click(screen.getByText('Save'));
 expect(game.handleSaveMumeEdit).toHaveBeenCalledWith('Edited');
 fireEvent(dialog,new Event('cancel',{cancelable:true}));
 expect(game.handleCancelMumeEdit).toHaveBeenCalledOnce();
});
