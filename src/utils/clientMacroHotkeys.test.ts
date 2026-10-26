/** @file Macro modifier combinations, keypad identity, and Windows Num Lock regressions. */
import { expect, it } from 'vitest';
import { macroHotkeyFor } from './clientMacroHotkeys';
import type { ClientMacroKeyEvent } from '../types';

// --- Keyboard Fixtures ---
const key = (overrides: Partial<ClientMacroKeyEvent> = {}): ClientMacroKeyEvent => ({
    code:'Numpad8', key:'8', location:3, ctrlKey:false, altKey:false, shiftKey:false, metaKey:false,
    getModifierState:name=>name==='NumLock', ...overrides
});

// --- Combination Identity ---
it.each([
    [{shiftKey:true}, 'Shift+Numpad8'],
    [{altKey:true}, 'Alt+Numpad8'],
    [{ctrlKey:true}, 'Ctrl+Numpad8'],
    [{metaKey:true}, 'Meta+Numpad8'],
    [{ctrlKey:true,altKey:true,shiftKey:true,metaKey:true}, 'Ctrl+Alt+Shift+Meta+Numpad8']
])('retains modifier combination %j', (modifiers, expected) => {
    expect(macroHotkeyFor(key(modifiers),'Win32')).toBe(expected);
});
it('restores Shift when Windows reports navigation with Num Lock on or digits with it off', () => {
    expect(macroHotkeyFor(key({key:'ArrowUp'}),'Win32')).toBe('Shift+Numpad8');
    expect(macroHotkeyFor(key({getModifierState:()=>false}),'Win32')).toBe('Shift+Numpad8');
    expect(macroHotkeyFor(key(),'Win32')).toBe('Numpad8');
    expect(macroHotkeyFor(key({key:'ArrowUp',getModifierState:()=>false}),'Win32')).toBe('Numpad8');
});
it('keeps physical numpad navigation separate from the arrow cluster and number row', () => {
    expect(macroHotkeyFor(key({code:'ArrowUp',key:'ArrowUp'}),'Win32')).toBe('Shift+Numpad8');
    expect(macroHotkeyFor(key({code:'ArrowUp',key:'ArrowUp',location:0}),'Win32')).toBe('ArrowUp');
    expect(macroHotkeyFor(key({code:'Digit8',location:0,shiftKey:true}),'Win32')).toBe('Shift+Digit8');
    expect(macroHotkeyFor(key({code:'',key:'End',getModifierState:()=>false}),'Win32')).toBe('Numpad1');
});
it('does not infer Shift from Alt codes, unidentified keys or another platform', () => {
    expect(macroHotkeyFor(key({key:'ArrowUp',altKey:true}),'Win32')).toBe('Alt+Numpad8');
    expect(macroHotkeyFor(key({key:'Unidentified'}),'Win32')).toBe('Numpad8');
    expect(macroHotkeyFor(key({getModifierState:()=>false}),'MacIntel')).toBe('Numpad8');
    expect(macroHotkeyFor(key({key:'ArrowUp'}),'Linux x86_64')).toBe('Numpad8');
});
it.each(['ShiftLeft','ShiftRight','AltLeft','AltRight','ControlLeft','MetaRight'])('does not bind a modifier by itself: %s', code => {
    expect(macroHotkeyFor(key({code,key:'Shift',location:1}),'Win32')).toBeNull();
});
