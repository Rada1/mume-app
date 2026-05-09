import { createButton } from '../../../utils/buttonFactory';

/**
 * @file world.ts
 * @description Buttons for world objects (lanterns, containers, corpses, exits).
 */

export const WORLD_BUTTONS = [
    // --- LANTERN ---
    createButton({ id: 'btn-lantern-light', label: 'Light', command: 'light %n', setId: 'inline-lantern', color: '#facc15' }),
    createButton({ id: 'btn-lantern-snuff', label: 'Snuff', command: 'snuff %n', setId: 'inline-lantern', color: '#94a3b8' }),
    createButton({ id: 'btn-lantern-fill', label: 'Fill', command: 'fill %n', setId: 'inline-lantern', color: '#3b82f6' }),
    createButton({ id: 'btn-lightsource-cover', label: 'Cover', command: 'cover %n', setId: 'inline-lightsource', color: '#475569' }),
    createButton({ id: 'btn-lightsource-uncover', label: 'Uncover', command: 'uncover %n', setId: 'inline-lightsource', color: '#facc15' }),

    // --- CORPSES ---
    createButton({ id: 'btn-corpse-drag', label: 'Drag', command: 'drag %n', setId: 'inline-corpses', color: '#94a3b8' }),
    createButton({ id: 'btn-corpse-butcher', label: 'Butcher', command: 'butcher %n', setId: 'inline-corpses', color: '#dc2626' }),
    createButton({ id: 'btn-corpse-scalp', label: 'Scalp', command: 'scalp %n', setId: 'inline-corpses', color: '#991b1b' }),

    // --- CONTAINERS ---
    createButton({ id: 'btn-container-open', label: 'Open', command: 'open %n', setId: 'inline-containers', color: '#3b82f6' }),
    createButton({ id: 'btn-container-close', label: 'Close', command: 'close %n', setId: 'inline-containers', color: '#4b5563' }),
    createButton({ id: 'btn-container-get-all', label: 'G/All', command: 'get all from %n', setId: 'inline-containers', color: '#f59e0b' }),
    createButton({ id: 'btn-container-look-in', label: 'Look In', command: 'look in %n', setId: 'inline-containers', color: '#3b82f6' }),

    // --- EXITS ---
    createButton({ id: 'btn-exit-go', label: 'Go', command: '%n', setId: 'inline-exit', color: 'rgba(255, 255, 255, 0.25)' }),
    createButton({ id: 'btn-look', label: 'Look', command: 'look %n', setId: 'inline-exit', color: '#3b82f6' })
];









