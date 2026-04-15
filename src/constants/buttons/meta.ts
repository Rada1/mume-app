import { createButton } from '../../utils/buttonFactory';

/**
 * @file meta.ts
 * @description Meta and UI control buttons.
 */

export const META_BUTTONS = [
    createButton({ id: 'btn-who', label: 'Who', command: 'who', setId: 'info', color: '#8b5cf6', x: 85, y: 75, width: 80 }),
    createButton({ id: 'btn-where', label: 'Where', command: 'where', setId: 'info', color: '#8b5cf6', x: 75, y: 75, width: 80 }),
    createButton({ id: '6a5ofi', label: 'New Button', command: 'look', setId: 'player', color: '#4ade80', x: 50, y: 50, width: 120, shape: 'rect' }),
    createButton({ id: 'z6237j', label: 'Eat Food', command: 'eat food', setId: 'autoeat', color: '#4ade80', x: 61.99, y: 22.17, width: 120, shape: 'rect' }),
    
    // --- INLINE PLAYER ---
    createButton({ id: 'inlp-ex', label: 'Examine', command: 'examine %n', setId: 'inlineplayer', color: '#2563eb' }),
    createButton({ id: 'inlp-whois', label: 'Whois', command: 'whois %n', setId: 'inlineplayer', color: '#0ea5e9' }),
    createButton({ id: 'inlp-soc', label: 'Social', command: 'social list', setId: 'inlineplayer', color: '#06b6d4', actionType: 'menu' }),
    createButton({ id: 'inlp-conv', label: 'Converse', command: '__parley__', setId: 'inlineplayer', color: '#8b5cf6' }),
    createButton({ id: 'inlp-consider', label: 'Consider', command: 'consider %n', setId: 'inlineplayer', color: '#facc15' }),

    // --- TARGET MENU ---
    createButton({ id: 'tgt-examine', label: 'Examine', command: 'examine %n', setId: 'target', color: '#facc15', width: 100 }),
    createButton({ id: 'tgt-get', label: 'Get', command: 'get %n', setId: 'target', color: '#22c55e', width: 100 }),
    createButton({ id: 'tgt-kill', label: 'Kill', command: 'kill %n', setId: 'target', color: '#dc2626', width: 100 }),
    createButton({ id: 'tgt-look', label: 'Look', command: 'look %n', setId: 'target', color: '#3b82f6', width: 100 }),
    createButton({ id: 'tgt-clear', label: 'Clear Target', command: '__clear_target__', setId: 'target', color: 'rgba(100,100,100,0.6)', width: 110 }),

    // --- INLINE NPC ---
    createButton({ id: 'innpc-kill', label: 'Kill', command: 'kill %n', setId: 'inlinenpc', color: '#dc2626' }),
    createButton({ id: 'innpc-ex', label: 'Examine', command: 'examine %n', setId: 'inlinenpc', color: '#2563eb' }),
    createButton({ id: 'innpc-consider', label: 'Consider', command: 'consider %n', setId: 'inlinenpc', color: '#facc15' }),
    
    // --- UNUSED / PLACEHOLDERS ---
    createButton({ id: 'innpc-look', label: 'Look', command: 'look %n', setId: 'unused-npc', color: '#0ea5e9' }),
    createButton({ id: 'innpc-steal', label: 'Steal', command: 'steal %n', setId: 'unused-npc', color: '#14b8a6' })
];
