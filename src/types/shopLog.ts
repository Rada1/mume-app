/** @file shopLog.ts — Structured presentation of plain-text shop stock rows. */
import type { ReactNode } from 'react';

// --- Data Contracts ---
export interface ShopLogLine {
    number: string;
    quantity: string;
    item: string;
    connector: string;
    price: string;
    metadata: string;
}

export interface ShopLogTextProps {
    line: ShopLogLine;
    itemContent?: ReactNode;
}
