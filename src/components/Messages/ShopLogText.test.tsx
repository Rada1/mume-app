// @vitest-environment jsdom
/** @file ShopLogText.test.tsx — Shop rows distinguish names, prices, counts, and server IDs. */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { ShopLogText } from './ShopLogText';
import { parseShopLogLine } from '../../hooks/shopLogLine';

// --- Presentation Checks ---
afterEach(cleanup);
it.each([
    '57. eight gem-inlaid knives (flawless, new) up to eleven gold and fourteen silver <o12114>.',
    '337. a small jewel-box for fourteen gold and seven silver <o6013>.',
    '88. a shimmering ring with a brilliantly clear gem for 123 gold <o4115>.'
])('separates item text and cost without requiring XML tags: %s', content => {
    const line = parseShopLogLine(content);
    expect(line).not.toBeNull();
    const { container } = render(<ShopLogText line={line!} />);
    expect(container.textContent).toBe(content);
    expect(container.querySelector('.shop-log-name')?.textContent).toBe(line?.item);
    expect(container.querySelector('.shop-log-price')?.textContent).toBe(line?.price);
    expect(container.querySelector('.shop-log-number')?.textContent).toBe(line?.number);
    expect(container.querySelector('.shop-log-metadata')?.textContent).toBe(line?.metadata);
});

it('subdues quantities and keeps equipment condition colors on item names', () => {
    const line = parseShopLogLine('57. eight gem-inlaid knives (flawless, new) up to eleven gold.');
    const { container } = render(<ShopLogText line={line!} />);
    expect(container.querySelector('.shop-log-quantity')?.textContent).toBe('eight ');
    expect(container.querySelector('.shop-log-name')?.textContent).toBe('gem-inlaid knives (flawless, new)');
    expect(container.querySelector('.item-state-pristine')?.textContent).toBe('(flawless, new)');
});

it('accents wrapped prices and subdues IDs on their own line', () => {
    expect(parseShopLogLine('     and fourteen silver <o12114>.')).toMatchObject({
        connector: '     and ', price: 'fourteen silver', metadata: ' <o12114>.'
    });
    expect(parseShopLogLine('<o5705>.')).toMatchObject({ item: '', price: '', metadata: '<o5705>.' });
});

it('leaves ordinary numbered prose and item names containing for alone', () => {
    expect(parseShopLogLine('1. You have waited for a long time.')).toBeNull();
    expect(parseShopLogLine('1. a gift for a friend for five gold.')?.item).toBe('a gift for a friend');
});
