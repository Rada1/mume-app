/** @file shopLogLine.ts — Locates item and cost boundaries in formulaic shop output without XML. */
import type { ShopLogLine } from '../types';

// --- Logic Section ---
const currency = /\b(?:gold|silver|copper|lauren|celeb|busc)\b/i;
const quantity = /^(?:(?:\d+)|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty(?:-[a-z]+)?)\s+/i;
const empty = (): ShopLogLine => ({ number: '', quantity: '', item: '', connector: '', price: '', metadata: '' });

export const parseShopLogLine = (text: string): ShopLogLine | null => {
    const metadata = text.match(/\s*<o?\d+>\.?\s*$/i)?.[0] || '';
    const body = metadata ? text.slice(0, -metadata.length) : text;
    const row = /^(\s*\d+\.\s+)(.+)(\s+(?:up to|for)\s+)(.+?)\s*$/i.exec(body);
    if (row && currency.test(row[4])) {
        const count = row[2].match(quantity)?.[0] || '';
        return { number: row[1], quantity: count, item: row[2].slice(count.length),
            connector: row[3], price: row[4], metadata };
    }
    if (/^\s+and\s+/i.test(body) && currency.test(body)) {
        const connector = body.match(/^\s+and\s+/i)?.[0] || '';
        return { ...empty(), connector, price: body.slice(connector.length), metadata };
    }
    if (metadata && !body.trim()) return { ...empty(), metadata };
    return null;
};
