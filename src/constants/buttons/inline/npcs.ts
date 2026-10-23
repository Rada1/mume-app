import { createButton } from '../../../utils/buttonFactory';

/**
 * @file npcs.ts
 * @description Buttons for NPCs (innkeepers, mounts, guildmasters, shopkeepers).
 */

export const NPC_BUTTONS = [
    createButton({ id: 'btn-saddle-mount', label: 'Saddle', command: 'saddle mount', setId: 'trait-saddle', color: '#ffd700' }),
    createButton({ id: 'btn-saddle-unsaddle', label: 'Unsaddle', command: 'unsaddle %p', setId: 'trait-saddle', color: '#ffd700' }),
    createButton({ id: 'btn-mount-object-unsaddle', label: 'Unsaddle', command: 'unsaddle %p %n', setId: 'trait-mount-object', color: '#ffd700' }),
    // --- INNKEEPERS ---
    createButton({ id: 'btn-innkeeper-offer', label: 'Offer', command: 'offer %n', setId: 'inline-innkeeper', color: '#ec4899' }),
    createButton({ id: 'btn-innkeeper-rent', label: 'Rent', command: 'rent', setId: 'inline-innkeeper', color: '#8b5cf6' }),

    // --- MOUNTS ---
    createButton({ id: 'btn-mount-ride', label: 'Ride', command: 'ride %n', setId: 'inline-mounts', color: '#38bdf8' }),
    createButton({ id: 'btn-mount-lead', label: 'Lead', command: 'lead %n', setId: 'inline-mounts', color: '#38bdf8' }),
    createButton({ id: 'btn-mount-abandon', label: 'Abandon', command: 'abandon %n', setId: 'inline-mounts', color: '#38bdf8' }),
    createButton({ id: 'btn-mount-dismount', label: 'Dismount', command: 'dismount %n', setId: 'inline-mounts', color: '#38bdf8' }),

    // --- GUILDMASTER ---
    createButton({ id: 'btn-guildmaster-practice', label: 'Practice Skills', command: 'practice', setId: 'inline-guildmaster', color: '#a855f7', width: 120 }),

    // --- SHOPKEEPERS ---
    createButton({ id: 'btn-shopkeeper-shop', label: 'Shop', command: 'list', setId: 'inline-shopkeeper', color: '#8b5cf6' }),

    // --- SHOP ITEMS ---
    createButton({ id: 'btn-shopitem-buy', label: 'Buy', command: 'buy %n', setId: 'inline-shopitem', color: '#8b5cf6' }),
    createButton({ id: 'btn-shopitem-show', label: 'Show Item', command: 'show item %n', setId: 'inline-shopitem', color: '#3b82f6' }),

    // --- LEGACY/FALLBACK ---
    createButton({ id: 'btn-hit', label: 'Hit', command: 'hit %n', setId: 'inline-default', color: '#ef4444' })
];









