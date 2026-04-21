import { createButton } from '../../utils/buttonFactory';

/**
 * @file inventory.ts
 * @description Inventory and equipment manipulation buttons.
 */

export const INVENTORY_BUTTONS = [
    createButton({ id: 'inv-drop', label: 'Drop', command: 'drop %n', setId: 'inventorylist', color: '#ff4444', shape: 'rect', width: 0, height: 0 }),
    createButton({ id: 'inv-wear', label: 'Wear', command: 'wear %n', setId: 'inventorylist', color: '#44ff44', shape: 'rect', width: 0, height: 0 }),
    createButton({ id: 'inv-put', label: 'Put Target', command: 'put %n', setId: 'inventorylist', color: '#4444ff', shape: 'rect', width: 0, height: 0 }),
    createButton({ id: 'inv-hold', label: 'Hold', command: 'hold %n', setId: 'inventorylist', color: '#ffff44', shape: 'rect', width: 0, height: 0 }),
    createButton({ 
        id: 'inv-give', 
        label: 'Give', 
        command: 'give %n', 
        setId: 'inventorylist', 
        color: '#aa44ff', 
        shape: 'rect', 
        width: 0, 
        height: 0,
        actionType: 'select-recipient'
    }),
    createButton({ id: 'eq-remove', label: 'Remove', command: 'remove %n', setId: 'equipmentlist', color: '#ffaa44', shape: 'rect', width: 0, height: 0 })
];









