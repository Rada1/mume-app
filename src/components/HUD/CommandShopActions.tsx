/** @file CommandShopActions.tsx — Stock and carried-item commands within the normal action column. */
import React from 'react';
import type { CommandShopProps } from '../../types';
import { useCommandShopActions } from '../../hooks/useCommandShopActions';
import { InlineTraitActionGroup } from '../Popovers/StandardMenu/InlineTraitActionGroup';
import { getInlineTraitTextColor, getSwipeCommandTextColor } from '../../utils/swipeCommandColors';
import { resolveHelpTopic } from '../../utils/commandHelpUtils';
import './CommandShop.css';

// --- Render Section ---
export const CommandShopActions: React.FC<CommandShopProps> = ({ shop, isHelpMode = false, onRequestHelp }) => {
    const actions = useCommandShopActions(shop);
    if (!actions.length) return null;
    return <section className="command-shop-actions inline-action-groups" aria-label="Shop commands">
        <InlineTraitActionGroup section={{ key: 'trait-shopkeeper', label: 'Shop' }}
            buttons={actions.map(action => action.button)} inspectionCommands={[]} targetContext={null}
            requestInspection={() => {}} renderButton={button => {
                const action = actions.find(entry => entry.button.id === button.id)!;
                const handleClick = (e: React.MouseEvent) => {
                    if (isHelpMode && onRequestHelp) {
                        e.stopPropagation();
                        onRequestHelp(resolveHelpTopic(button.command, button.label));
                        return;
                    }
                    action.run();
                };
                const row = <button key={button.id} type="button" className={`terminal-inspect-row${isHelpMode ? ' is-help-mode' : ''}`}
                    disabled={action.disabled} title={action.title} aria-label={`${button.label} <${button.command}>`}
                    onPointerDown={event => event.stopPropagation()} onClick={handleClick}>
                    <span style={{ color: getSwipeCommandTextColor(button.command) || getInlineTraitTextColor('trait-shopkeeper') }}>{button.label}</span>
                    <span>&lt;{button.command}&gt;</span>
                </button>;
                if (button.label !== 'buy') return row;
                return <div key={button.id} className="command-shop-buy">
                    <div className="command-shop-buy-row">{row}
                        <div className="command-shop-quantity" role="group" aria-label="Buy quantity">
                            <button type="button" aria-label="Decrease quantity" disabled={action.disabled || shop.purchaseQuantity <= 1}
                                onClick={() => shop.setPurchaseQuantity(shop.purchaseQuantity - 1)}>−</button>
                            <output aria-label="Purchase quantity" aria-live="polite">{shop.purchaseQuantity}</output>
                            <button type="button" aria-label="Increase quantity" disabled={action.disabled || shop.purchaseQuantity >= shop.purchaseLimit}
                                onClick={() => shop.setPurchaseQuantity(shop.purchaseQuantity + 1)}>+</button>
                        </div>
                    </div>
                    <p className="command-shop-buy-total" aria-live="polite">Total{shop.purchaseLimit > 1 ? ' (up to)' : ''}: <span>{shop.purchaseTotal || 'Unavailable'}</span></p>
                </div>;
            }} />
        {shop.compareFirst && <p className="command-shop-comparison-prompt">Select another stock, inventory, or worn item to compare with {shop.compareFirst.name}.</p>}
    </section>;
};
