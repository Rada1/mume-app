import { createButton } from '../../../utils/buttonFactory';

/**
 * @file items.ts
 * @description Buttons for items (food, water, weapons, armor, inventory/worn items).
 */

export const ITEM_BUTTONS = [
    // --- FOOD & WATER ---
    createButton({ id: 'btn-food-eat', label: 'Eat', command: 'eat %n', setId: 'inline-food', color: '#4ade80' }),
    createButton({ id: 'btn-food-get', label: 'Get', command: 'get %n', setId: 'inline-food', color: '#f59e0b' }),
    createButton({ id: 'btn-water-drink', label: 'Drink', command: 'drink %n', setId: 'inline-water', color: '#3b82f6' }),

    // --- FLUID CONTAINER ---
    createButton({ id: 'btn-fluid-drink', label: 'Drink', command: 'drink %n', setId: 'inline-fluidcontainer', color: '#3b82f6' }),
    createButton({ id: 'btn-fluid-pour', label: 'Pour Water', command: 'pour water %n', setId: 'inline-fluidcontainer', color: '#60a5fa', width: 110 }),
    createButton({ id: 'btn-fluid-empty', label: 'Empty', command: 'empty %n', setId: 'inline-fluidcontainer', color: '#94a3b8' }),
    createButton({ id: 'btn-fluid-look-in', label: 'Look In', command: 'look in %n', setId: 'inline-fluidcontainer', color: '#3b82f6' }),

    // --- WEAPONS & ARMOR ---
    createButton({ id: 'btn-weapon-wield', label: 'Wield', command: 'wield %n', setId: 'inline-weapon', color: '#6366f1' }),
    // --- GENERIC OBJECTS ---
    createButton({ id: 'btn-get', label: 'Get', command: 'get %n', setId: 'inline-in-room-obj', color: '#f59e0b' }),
    createButton({ id: 'btn-obj-examine', label: 'Examine', command: 'examine %n', setId: 'inline-object', color: '#3b82f6', width: 100 }),

    // --- INVENTORY OBJECTS ---
    createButton({ id: 'btn-inv-drop', label: 'Drop', command: 'drop %n', setId: 'inline-inventory', color: '#ef4444' }),
    createButton({ id: 'btn-inv-wear', label: 'Wear', command: 'wear %n', setId: 'inline-inventory', color: '#64748b' }),
    createButton({ id: 'btn-inv-wield', label: 'Wield', command: 'wield %n', setId: 'inline-inventory', color: '#6366f1' }),
    createButton({ id: 'btn-inv-sell', label: 'Sell', command: 'sell %n', setId: 'inline-inventory', color: '#8b5cf6' }),
    createButton({ id: 'btn-inv-value', label: 'Value', command: 'value %n', setId: 'inline-inventory', color: '#8b5cf6' }),
    createButton({ id: 'btn-inv-mend', label: 'Mend', command: 'mend %n', setId: 'inline-inventory', color: '#8b5cf6' }),
    createButton({
        id: 'btn-inv-give',
        label: 'Give',
        command: 'give %n',
        setId: 'inline-inventory',
        color: '#10b981',
        actionType: 'select-recipient'
    }),
    createButton({
        id: 'btn-inv-put',
        label: 'Put',
        command: 'put %n',
        setId: 'inline-inventory',
        color: '#10b981',
        actionType: 'select-container'
    }),

    // --- WORN OBJECTS ---
    createButton({ id: 'btn-worn-remove', label: 'Remove', command: 'remove %n', setId: 'cat-worn-object', color: '#94a3b8', width: 100 }),
    createButton({ id: 'btn-worn-examine', label: 'Examine', command: 'examine %n', setId: 'cat-worn-object', color: '#3b82f6', width: 100 }),
    createButton({ id: 'btn-whet', label: 'Whet', command: 'whet %n', setId: 'inline-whetstone', color: '#64748b' }),
    createButton({ id: 'btn-recite', label: 'Recite', command: 'recite %n', setId: 'inline-scroll', color: '#8b5cf6' }),
    createButton({ id: 'btn-draw', label: 'Draw', command: 'draw %n', setId: 'inline-drawable', color: '#6366f1' }),
    // --- CONTAINER ITEMS ---
    createButton({ id: 'btn-container-get-item', label: 'Get', command: 'get %n %p', setId: 'inline-container-item', color: '#f59e0b' })
];









