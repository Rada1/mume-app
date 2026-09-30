/**
 * @file Tests parsing successful player and world door actions.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import { detectDoorSoundAction } from './doorSoundAction';

describe('door sound action detection', () => {
  it('recognizes successful player open and close confirmations', () => {
    expect(detectDoorSoundAction('You open the wooden door.')).toBe(true);
    expect(detectDoorSoundAction('You close the gate to the south.')).toBe(false);
  });

  it('recognizes world messages that describe a door changing state', () => {
    expect(detectDoorSoundAction('A guard opens a wooden door.')).toBe(true);
    expect(detectDoorSoundAction('The iron gate closes slowly.')).toBe(false);
  });

  it('ignores failed attempts and status descriptions', () => {
    expect(detectDoorSoundAction('You try to open the wooden door but fail.')).toBeNull();
    expect(detectDoorSoundAction('You cannot close the gate.')).toBeNull();
    expect(detectDoorSoundAction('The gate is already open.')).toBeNull();
  });
});
