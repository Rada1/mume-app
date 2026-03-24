import { createButton } from '../../../utils/buttonFactory';

/**
 * @file items.ts
 * @description Buttons for items (food, water, weapons, armor, inventory/worn items).
 */

export const ITEM_BUTTONS = [
    // --- FOOD & WATER ---
    createButton({ id: 'cat-food-eat', label: 'Eat', command: 'eat %n', setId: 'inline-food', color: '#4ade80' }),
    createButton({ id: 'cat-food-get', label: 'Get', command: 'get %n', setId: 'inline-food', color: '#f59e0b' }),
    createButton({ id: 'cat-water-drink', label: 'Drink', command: 'drink %n', setId: 'inline-water', color: '#3b82f6' }),

    // --- FLUID CONTAINER ---
    createButton({ id: 'cat-fluid-drink', label: 'Drink', command: 'drink %n', setId: 'inline-fluidcontainer', color: '#3b82f6' }),
    createButton({ id: 'cat-fluid-pour', label: 'Pour Water', command: 'pour water %n', setId: 'inline-fluidcontainer', color: '#60a5fa', width: 110 }),
    createButton({ id: 'cat-fluid-empty', label: 'Empty', command: 'empty %n', setId: 'inline-fluidcontainer', color: '#94a3b8' }),
    createButton({ id: 'cat-fluid-look-in', label: 'Look In', command: 'look in %n', setId: 'inline-fluidcontainer', color: '#3b82f6' }),

    // --- WEAPONS & ARMOR ---
    createButton({ id: 'cat-weapon-wield', label: 'Wield', command: 'wield %n', setId: 'inline-weapon', color: '#6366f1' }),
    createButton({ id: 'cat-armour-mend', label: 'Mend', command: 'mend %n', setId: 'inline-armour', color: '#8b5cf6' }),

    // --- GENERIC OBJECTS ---
    createButton({ id: 'cat-obj-room-get', label: 'Get', command: 'get %n', setId: 'inline-obj-room', color: '#f59e0b' }),
    createButton({ id: 'cat-obj-examine', label: 'Examine', command: 'examine %n', setId: 'inline-object', color: '#3b82f6', width: 100 }),

    // --- INVENTORY OBJECTS ---
    createButton({ id: 'cat-obj-char-drop', label: 'Drop', command: 'drop %n', setId: 'inline-obj-char', color: '#ef4444' }),
    createButton({ id: 'cat-obj-char-wear', label: 'Wear', command: 'wear %n', setId: 'inline-obj-char', color: '#64748b' }),
    createButton({ id: 'cat-obj-char-wield', label: 'Wield', command: 'wield %n', setId: 'inline-obj-char', color: '#6366f1' }),
    createButton({ id: 'cat-obj-char-sell', label: 'Sell', command: 'sell %n', setId: 'inline-obj-char', color: '#8b5cf6' }),
    createButton({ id: 'cat-obj-char-value', label: 'Value', command: 'value %n', setId: 'inline-obj-char', color: '#8b5cf6' }),
    createButton({ id: 'cat-obj-char-mend', label: 'Mend', command: 'mend %n', setId: 'inline-obj-char', color: '#8b5cf6' }),
    createButton({ 
        id: 'cat-obj-char-give', 
        label: 'Give', 
        command: 'give %n', 
        setId: 'inline-obj-char', 
        color: '#10b981',
        actionType: 'select-recipient'
    }),
    createButton({ 
        id: 'cat-obj-char-put', 
        label: 'Put', 
        command: 'put %n', 
        setId: 'inline-obj-char', 
        color: '#10b981',
        actionType: 'select-container'
    }),

    // --- WORN OBJECTS ---
    createButton({ id: 'cat-obj-worn-remove', label: 'Remove', command: 'remove %n', setId: 'inline-obj-worn', color: '#94a3b8', width: 100 }),
    createButton({ id: 'cat-obj-worn-examine', label: 'Examine', command: 'examine %n', setId: 'inline-obj-worn', color: '#3b82f6', width: 100 })
];
