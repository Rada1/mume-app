/**
 * @file Covers parsing MUME's padded `where` response rows.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { parseWhereScanPlayers } from './whereScan';

describe('parseWhereScanPlayers', () => {
  it('parses directional and same-room rows while skipping table decoration', () => {
    expect(parseWhereScanPlayers([
      'Player            Distance      Direction  Room',
      '--------------------------------------------------',
      'Iodvin            Very near     West       Armour Shop',
      'Elénath           Very near                Cobble Street',
      'Nobody is nearby.',
    ])).toEqual([
      { name: 'Iodvin', distance: 'Very near', direction: 'West', room: 'Armour Shop' },
      { name: 'Elénath', distance: 'Very near', direction: '', room: 'Cobble Street' },
    ]);
  });

  it('strips ANSI and markup and supports multiword directions and rooms', () => {
    expect(parseWhereScanPlayers([
      '\u001b[32mIodvin\u001b[0m   Near   North West   The Armour Shop',
    ])).toEqual([
      { name: 'Iodvin', distance: 'Near', direction: 'North West', room: 'The Armour Shop' },
    ]);
  });
});
