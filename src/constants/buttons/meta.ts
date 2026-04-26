import { createButton } from '../../utils/buttonFactory';

/**
 * @file meta.ts
 * @description Meta and UI control buttons. Includes inline character actions for NPCs, Allies, Enemies, and Neutrals.
 */

export const META_BUTTONS = [
    createButton({ id: 'btn-who', label: 'Who', command: 'who', setId: 'info', color: '#8b5cf6', x: 85, y: 75, width: 80 }),
    createButton({ id: 'btn-where', label: 'Where', command: 'where', setId: 'info', color: '#8b5cf6', x: 75, y: 75, width: 80 }),
    createButton({ id: 'tgt-clear', label: 'Clear Target', command: '__clear_target__', setId: 'target', color: 'rgba(100,100,100,0.6)', width: 110 }),

    // --- SHARED PLAYER ACTIONS (Examine, Whois, Consider) ---
    // setId 'inline-ally' is the canonical home for shared player buttons; enemy
    // and neutral sets reference these buttons by id via CATEGORY_BUTTON_MAP.
    createButton({ id: 'inlp-ex', label: 'Examine', command: 'examine %n', setId: 'inline-ally', color: '#2563eb' }),
    createButton({ id: 'inlp-whois', label: 'Whois', command: 'whois %n', setId: 'inline-ally', color: '#0ea5e9' }),
    createButton({ id: 'inlp-consider', label: 'Consider', command: 'consider %n', setId: 'inline-ally', color: '#facc15' }),
    
    // --- INLINE ALLY ---
    createButton({ id: 'inlp-group', label: 'Group', command: 'group %n', setId: 'inline-ally', color: '#22c55e' }),
    createButton({ id: 'inlp-follow', label: 'Follow', command: 'follow %n', setId: 'inline-ally', color: '#16a34a' }),
    createButton({ id: 'inlp-soc', label: 'Social', command: 'social list', setId: 'inline-ally', color: '#06b6d4', actionType: 'menu' }),
    createButton({ id: 'inlp-conv', label: 'Converse', command: '__parley__', setId: 'inline-ally', color: '#8b5cf6' }),

    // --- INLINE ENEMY ---
    createButton({ id: 'inlp-kill', label: 'Kill', command: 'kill %n', setId: 'inline-enemy', color: '#ef4444' }),
    createButton({ id: 'inlp-track', label: 'Track', command: 'track %n', setId: 'inline-enemy', color: '#f97316' }),

    // --- INLINE NEUTRAL ---
    createButton({ id: 'inlp-neutral-soc', label: 'Social', command: 'social list', setId: 'inline-neutral', color: '#06b6d4', actionType: 'menu' }),
    createButton({ id: 'inlp-neutral-conv', label: 'Converse', command: '__parley__', setId: 'inline-neutral', color: '#8b5cf6' }),

    // --- INLINE NPC ---
    createButton({ id: 'innpc-group', label: 'Group', command: 'group %n', setId: 'inline-npc', color: '#22c55e' }),
    createButton({ id: 'innpc-kill', label: 'Kill', command: 'kill %n', setId: 'inline-npc', color: '#dc2626' }),
    createButton({ id: 'innpc-ex', label: 'Examine', command: 'examine %n', setId: 'inline-npc', color: '#2563eb' }),
    createButton({ id: 'innpc-consider', label: 'Consider', command: 'consider %n', setId: 'inline-npc', color: '#facc15' }),

    // --- TARGET MENU (LEGACY/AUTO) ---
    createButton({ id: 'tgt-examine', label: 'Examine', command: 'examine %n', setId: 'target', color: '#facc15', width: 100 }),
    createButton({ id: 'tgt-get', label: 'Get', command: 'get %n', setId: 'target', color: '#22c55e', width: 100 }),
    createButton({ id: 'tgt-kill', label: 'Kill', command: 'kill %n', setId: 'target', color: '#dc2626', width: 100 }),
    createButton({ id: 'tgt-look', label: 'Look', command: 'look %n', setId: 'target', color: '#3b82f6', width: 100 }),
    
    // --- UNUSED / PLACEHOLDERS ---
    createButton({ id: 'innpc-look', label: 'Look', command: 'look %n', setId: 'unused-npc', color: '#0ea5e9' }),
    createButton({ id: 'innpc-steal', label: 'Steal', command: 'steal %n', setId: 'unused-npc', color: '#14b8a6' })
];
