/**
 * @file Covers parsing of explicit open and close exit commands.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { parseDoorCommand } from './doorCommand';

describe('parseDoorCommand', () => {
  it('recognizes open and close commands with named directions', () => {
    expect(parseDoorCommand('open exit north')).toEqual({ direction: 'n', closed: false });
    expect(parseDoorCommand('close exit down')).toEqual({ direction: 'd', closed: true });
  });

  it('recognizes abbreviated and diagonal directions', () => {
    expect(parseDoorCommand('OPEN EXIT sw')).toEqual({ direction: 'sw', closed: false });
  });

  it('ignores unrelated or malformed commands', () => {
    expect(parseDoorCommand('open north')).toBeNull();
    expect(parseDoorCommand('open exit nowhere')).toBeNull();
    expect(parseDoorCommand('close exit north extra')).toBeNull();
  });
});
