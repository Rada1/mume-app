import { createButton } from '../../utils/buttonFactory';

/**
 * @file meta.ts
 * @description Meta/UI buttons and shared character action buttons used across multiple traits.
 */

export const META_BUTTONS = [
    createButton({ id: 'btn-who', label: 'Who', command: 'who', setId: 'info', color: '#8b5cf6', x: 85, y: 75, width: 80 }),
    createButton({ id: 'btn-where', label: 'Where', command: 'where', setId: 'info', color: '#8b5cf6', x: 75, y: 75, width: 80 }),
    createButton({ id: 'btn-target-clear', label: 'Clear Target', command: '__clear_target__', setId: 'target', color: 'rgba(100,100,100,0.6)', width: 110 }),

    // --- SHARED CHARACTER ACTIONS (used across ally / enemy / neutral / npc traits) ---
    createButton({ id: 'btn-examine', label: 'Examine', command: 'examine %n', setId: 'inline-ally', color: '#2563eb' }),
    createButton({ id: 'btn-whois', label: 'Whois', command: 'whois %n', setId: 'inline-ally', color: '#0ea5e9' }),
    createButton({ id: 'btn-consider', label: 'Consider', command: 'consider %n', setId: 'inline-ally', color: '#facc15' }),
    createButton({ id: 'btn-hit', label: 'Hit', command: 'hit %n', setId: 'inline-ally', color: '#ef4444' }),
    createButton({ id: 'btn-group', label: 'Group', command: 'group %n', setId: 'inline-ally', color: '#22c55e' }),
    createButton({ id: 'btn-follow', label: 'Follow', command: 'follow %n', setId: 'inline-ally', color: '#16a34a' }),
    createButton({ id: 'btn-social', label: 'Social', command: 'social list', setId: 'inline-ally', color: '#06b6d4', actionType: 'menu' }),
    createButton({ id: 'btn-converse', label: 'Converse', command: '__parley__', setId: 'inline-ally', color: '#8b5cf6' }),

    // --- TARGET MENU ---
    createButton({ id: 'btn-look', label: 'Look', command: 'look %n', setId: 'target', color: '#3b82f6', width: 100 }),
    createButton({ id: 'btn-get', label: 'Get', command: 'get %n', setId: 'target', color: '#22c55e', width: 100 }),
];
