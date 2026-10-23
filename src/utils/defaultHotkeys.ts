/** @file Default editable numpad macros and physical direction key mapping. */
import type { ClientMacro } from '../types';

// --- Default Editable Macro Records ---
export const DEFAULT_NUMPAD_MACROS: ClientMacro[] = [
    { name: 'numpad_north', commands: ['n'], hotkey: 'Numpad8' },
    { name: 'numpad_south', commands: ['s'], hotkey: 'Numpad2' },
    { name: 'numpad_east', commands: ['e'], hotkey: 'Numpad6' },
    { name: 'numpad_west', commands: ['w'], hotkey: 'Numpad4' },
    { name: 'numpad_up', commands: ['u'], hotkey: 'Numpad7' },
    { name: 'numpad_down', commands: ['d'], hotkey: 'Numpad3' },
    { name: 'numpad_look', commands: ['look'], hotkey: 'Numpad5' }
];

// --- Physical Direction Lookup ---
export const NUMPAD_DIRECTION_KEYS = [
    { code: 'Numpad8', command: 'n', alternateKeys: ['ArrowUp', '8'] },
    { code: 'Numpad2', command: 's', alternateKeys: ['ArrowDown', '2'] },
    { code: 'Numpad6', command: 'e', alternateKeys: ['ArrowRight', '6'] },
    { code: 'Numpad4', command: 'w', alternateKeys: ['ArrowLeft', '4'] },
    { code: 'Numpad7', command: 'u', alternateKeys: ['Home', '7'] },
    { code: 'Numpad3', command: 'd', alternateKeys: ['PageDown', '3'] },
    { code: 'Numpad5', command: 'look', alternateKeys: ['Clear', '5'] }
] as const;
