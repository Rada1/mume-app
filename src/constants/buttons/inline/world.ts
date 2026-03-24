import { createButton } from '../../../utils/buttonFactory';

/**
 * @file world.ts
 * @description Buttons for world objects (lanterns, containers, corpses, exits).
 */

export const WORLD_BUTTONS = [
    // --- LANTERN ---
    createButton({ id: 'cat-lantern-light', label: 'Light', command: 'light %n', setId: 'inline-lantern', color: '#facc15' }),
    createButton({ id: 'cat-lantern-snuff', label: 'Snuff', command: 'snuff %n', setId: 'inline-lantern', color: '#94a3b8' }),
    createButton({ id: 'cat-lantern-fill', label: 'Fill', command: 'fill %n', setId: 'inline-lantern', color: '#3b82f6' }),
    createButton({ id: 'cat-lightsource-cover', label: 'Cover', command: 'cover %n', setId: 'inline-lightsource', color: '#475569' }),
    createButton({ id: 'cat-lightsource-uncover', label: 'Uncover', command: 'uncover %n', setId: 'inline-lightsource', color: '#facc15' }),

    // --- CORPSES ---
    createButton({ id: 'cat-corpse-drag', label: 'Drag', command: 'drag %n', setId: 'inline-corpses', color: '#94a3b8' }),
    createButton({ id: 'cat-corpse-butcher', label: 'Butcher', command: 'butcher %n', setId: 'inline-corpses', color: '#dc2626' }),
    createButton({ id: 'cat-corpse-scalp', label: 'Scalp', command: 'scalp %n', setId: 'inline-corpses', color: '#991b1b' }),

    // --- CONTAINERS ---
    createButton({ id: 'cat-container-open', label: 'Open', command: 'open %n', setId: 'inline-containers', color: '#3b82f6' }),
    createButton({ id: 'cat-container-close', label: 'Close', command: 'close %n', setId: 'inline-containers', color: '#4b5563' }),
    createButton({ id: 'cat-container-get-all', label: 'G/All', command: 'get all from %n', setId: 'inline-hidden', color: '#f59e0b' }),
    createButton({ id: 'cat-container-look-in', label: 'Look In', command: 'look in %n', setId: 'inline-containers', color: '#3b82f6' }),

    // --- EXITS ---
    createButton({ id: 'cat-exit-go', label: 'Go', command: '%n', setId: 'inline-exit', color: 'rgba(255, 255, 255, 0.25)' }),
    createButton({ id: 'cat-exit-look', label: 'Look', command: 'look %n', setId: 'inline-exit', color: '#3b82f6' })
];
