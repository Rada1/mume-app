/**
 * @file ShopInventoryActionButtons.tsx
 * @description Inventory actions shown alongside the shop stock controls.
 */

import React from 'react';

// --- Logic Section ---
export type ShopInventoryAction = 'sell' | 'value' | 'mend';

const ACTIONS: { id: ShopInventoryAction; label: string }[] = [
    { id: 'sell', label: 'Sell' },
    { id: 'value', label: 'Value' },
    { id: 'mend', label: 'Mend' },
];

interface ShopInventoryActionButtonsProps {
    hasInventoryTarget: boolean;
    onActionDown: (action: ShopInventoryAction, event: React.PointerEvent<HTMLButtonElement>) => void;
}

// --- Render Section ---
export const ShopInventoryActionButtons: React.FC<ShopInventoryActionButtonsProps> = ({ hasInventoryTarget, onActionDown }) => {
    const stopPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    return <>
        <div className="shop-action-divider" aria-hidden="true" />
        {ACTIONS.map(action => <button
            key={action.id}
            type="button"
            className={`shop-action-btn${hasInventoryTarget ? ' held' : ''}`}
            onPointerDown={event => onActionDown(action.id, event)}
            onPointerUp={stopPointer}
            onPointerCancel={stopPointer}
            onClick={stopPointer}
        >
            {action.label}
        </button>)}
    </>;
};
