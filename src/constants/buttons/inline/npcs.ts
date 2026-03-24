import { createButton } from '../../../utils/buttonFactory';

/**
 * @file npcs.ts
 * @description Buttons for NPCs (innkeepers, mounts, guildmasters, shopkeepers).
 */

export const NPC_BUTTONS = [
    // --- INNKEEPERS ---
    createButton({ id: 'cat-innkeeper-offer', label: 'Offer', command: 'offer %n', setId: 'inline-innkeeper', color: '#ec4899' }),
    createButton({ id: 'cat-innkeeper-rent', label: 'Rent', command: 'rent', setId: 'inline-innkeeper', color: '#8b5cf6' }),

    // --- MOUNTS ---
    createButton({ id: 'cat-mount-ride', label: 'Ride', command: 'ride %n', setId: 'inline-mounts', color: '#78350f' }),
    createButton({ id: 'cat-mount-lead', label: 'Lead', command: 'lead %n', setId: 'inline-mounts', color: '#92400e' }),
    createButton({ id: 'cat-mount-unsaddle-all', label: 'Unsaddle All', command: 'unsaddle %n all', setId: 'inline-mounts', color: '#451a03', width: 110 }),
    createButton({ id: 'cat-mount-unsaddle', label: 'Unsaddle', command: 'unsaddle %n', setId: 'inline-mounts', color: '#451a03' }),
    createButton({ id: 'cat-mount-abandon', label: 'Abandon', command: 'abandon %n', setId: 'inline-mounts', color: '#ef4444' }),
    createButton({ id: 'cat-mount-saddle', label: 'Saddle', command: 'saddle %n', setId: 'inline-mounts', color: '#78350f' }),

    // --- GUILDMASTER ---
    createButton({ id: 'cat-guildmaster-practice', label: 'Practice Skills', command: 'practice', setId: 'inline-guildmaster', color: '#a855f7', width: 120 }),

    // --- SHOPKEEPERS ---
    createButton({ id: 'cat-shopkeeper-shop', label: 'Shop', command: 'list', setId: 'inline-shopkeeper', color: '#8b5cf6' }),
    createButton({ id: 'cat-shopkeeper-mend', label: 'Mend', command: 'shop-mend', setId: 'inline-shopkeeper', color: '#8b5cf6' }),
    createButton({ id: 'cat-shopkeeper-sell-drag', label: 'Sell %n', command: 'sell %n', setId: 'inline-shopkeeper-drop', color: '#8b5cf6' }),
    createButton({ id: 'cat-shopkeeper-mend-drag', label: 'Mend %n', command: 'mend %n', setId: 'inline-shopkeeper-drop', color: '#8b5cf6' }),

    // --- SHOP ITEMS ---
    createButton({ id: 'cat-shopitem-buy', label: 'Buy', command: 'buy %n', setId: 'inline-shopitem', color: '#8b5cf6' }),
    createButton({ id: 'cat-shopitem-show', label: 'Show Item', command: 'show item %n', setId: 'inline-shopitem', color: '#3b82f6' }),

    // --- DEFAULT NPC ---
    createButton({ id: 'cat-default-kill', label: 'Kill', command: 'kill %n', setId: 'inline-default', color: '#ef4444' })
];
