import { createButton } from '../../../utils/buttonFactory';

/**
 * @file npcs.ts
 * @description Buttons for NPCs (innkeepers, mounts, guildmasters, shopkeepers).
 */

export const NPC_BUTTONS = [
    // --- INNKEEPERS ---
    createButton({ id: 'btn-innkeeper-offer', label: 'Offer', command: 'offer %n', setId: 'inline-innkeeper', color: '#ec4899' }),
    createButton({ id: 'btn-innkeeper-rent', label: 'Rent', command: 'rent', setId: 'inline-innkeeper', color: '#8b5cf6' }),

    // --- MOUNTS ---
    createButton({ id: 'btn-mount-ride', label: 'Ride', command: 'ride %n', setId: 'inline-mounts', color: '#78350f' }),
    createButton({ id: 'btn-mount-lead', label: 'Lead', command: 'lead %n', setId: 'inline-mounts', color: '#92400e' }),
    createButton({ id: 'btn-mount-unsaddle-all', label: 'Unsaddle All', command: 'unsaddle %n all', setId: 'inline-mounts', color: '#451a03', width: 110 }),
    createButton({ id: 'btn-mount-unsaddle', label: 'Unsaddle', command: 'unsaddle %n', setId: 'inline-mounts', color: '#451a03' }),
    createButton({ id: 'btn-mount-abandon', label: 'Abandon', command: 'abandon %n', setId: 'inline-mounts', color: '#ef4444' }),
    createButton({ id: 'btn-mount-saddle', label: 'Saddle', command: 'saddle %n', setId: 'inline-mounts', color: '#78350f' }),

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









