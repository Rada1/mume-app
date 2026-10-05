/**
 * @file Checks that crowded door names thin out and return as the map is enlarged.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { FastMapTextLabel } from './model';
import { declutterDoorLabels } from './doorLabelLayout';

describe('door label layout', () => {
  it('hides an overlapping door at low zoom and restores it at high zoom', () => {
    const labels: FastMapTextLabel[] = [
      { x: 0, y: 0, z: 0, text: 'vegetation', fontSize: 17, kind: 'door' },
      { x: 2, y: 0, z: 0, text: 'muddybush', fontSize: 17, kind: 'door' },
      { x: 0, y: 0, z: 0, text: 'Map note' },
    ];

    expect(declutterDoorLabels(labels, 0.45).map(label => label.text)).toEqual(['vegetation', 'Map note']);
    expect(declutterDoorLabels(labels, 1.2).map(label => label.text)).toEqual(['vegetation', 'muddybush', 'Map note']);
  });
});
