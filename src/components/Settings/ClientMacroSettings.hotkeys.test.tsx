/** @file Records and executes full macro key combinations through the settings interface. */
// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ClientMacroSettings } from './ClientMacroSettings';
import { useClientMacroHotkeys } from '../../hooks/useClientMacroHotkeys';
import { useClientMacroStore } from '../../stores/useClientMacroStore';

// --- Isolated Saved Bindings ---
const originalMacros=useClientMacroStore.getState().macros;
beforeEach(()=>{
    vi.spyOn(navigator,'platform','get').mockReturnValue('Win32');
    useClientMacroStore.setState({macros:[{name:'plain',commands:['n'],hotkey:'Numpad8'}]});
});
afterEach(()=>{
    cleanup();
    useClientMacroStore.setState({macros:originalMacros});
    vi.restoreAllMocks();
});

// --- Recording and Playback ---
it.each([
    ['Shift+Numpad8',{code:'Numpad8',key:'ArrowUp',location:3,shiftKey:false,modifierNumLock:true}],
    ['Alt+Numpad8',{code:'Numpad8',key:'8',location:3,altKey:true,modifierNumLock:true}],
    ['Ctrl+Shift+Numpad8',{code:'Numpad8',key:'8',location:3,ctrlKey:true,shiftKey:true,modifierNumLock:true}]
])('records, saves and plays %s without triggering bare movement or the default door handler', (expected, combo) => {
    const execute=vi.fn();
    renderHook(()=>useClientMacroHotkeys(execute,true));
    const legacy=vi.fn();
    window.addEventListener('keydown',legacy,true);
    try {
        render(<><ClientMacroSettings/><input className="input-field" aria-label="Game commands"/></>);
        fireEvent.change(screen.getByLabelText('Name'),{target:{value:'combo'}});
        fireEvent.change(screen.getByLabelText('Commands'),{target:{value:'open north\nnorth'}});
        const recorder=screen.getByLabelText('Optional keybinding') as HTMLInputElement;
        fireEvent.focus(recorder);
        fireEvent.keyDown(recorder,{code:'ShiftLeft',key:'Shift',shiftKey:true});
        expect(recorder.value).toBe('');
        fireEvent.keyUp(recorder,{code:'ShiftLeft',key:'Shift'});
        fireEvent.keyDown(recorder,combo);
        expect(recorder.value).toBe(expected);
        expect(execute).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button',{name:'Add macro'}));
        expect(useClientMacroStore.getState().macros.find(macro=>macro.name==='combo')).toMatchObject({hotkey:expected,commands:['open north','north']});
        legacy.mockClear();
        const input=screen.getByLabelText('Game commands');
        expect(fireEvent.keyDown(input,combo)).toBe(false);
        expect(execute).toHaveBeenCalledExactlyOnceWith('/combo');
        expect(legacy).not.toHaveBeenCalled();
        execute.mockClear();
        fireEvent.keyDown(input,{code:'Numpad8',key:'8',location:3,modifierNumLock:true});
        expect(execute).toHaveBeenCalledExactlyOnceWith('/plain');
        expect(fireEvent.keyDown(input,{code:'Digit8',key:'*',shiftKey:true})).toBe(true);
        expect(execute).toHaveBeenCalledTimes(1);
    } finally {window.removeEventListener('keydown',legacy,true);}
});
it('records keypad Enter separately without submitting the form', () => {
    render(<ClientMacroSettings/>);
    const recorder=screen.getByLabelText('Optional keybinding') as HTMLInputElement;
    fireEvent.focus(recorder);
    fireEvent.keyDown(recorder,{code:'NumpadEnter',key:'Enter',location:3});
    expect(recorder.value).toBe('NumpadEnter');
    expect(useClientMacroStore.getState().macros).toHaveLength(1);
});
