/** @file ShopLogText.tsx — Gives shop names and prices distinct emphasis while keeping stock counts subdued. */
import React from 'react';
import type { ShopLogTextProps } from '../../types';
import { ItemConditionText } from './ItemConditionText';
import './ShopLogText.css';

// --- Render Section ---
export const ShopLogText: React.FC<ShopLogTextProps> = ({ line, itemContent }) => <span className="shop-log-row">
    {line.number && <span className="shop-log-muted shop-log-number">{line.number}</span>}
    {line.quantity && <span className="shop-log-muted shop-log-quantity">{line.quantity}</span>}
    {line.item && <span className="shop-log-name">{itemContent ?? <ItemConditionText content={line.item} />}</span>}
    {line.connector && <span className="shop-log-muted shop-log-connector">{line.connector}</span>}
    {line.price && <span className="shop-log-price">{line.price}</span>}
    {line.metadata && <span className="shop-log-muted shop-log-metadata">{line.metadata}</span>}
</span>;
