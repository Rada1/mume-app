/**
 * @file Tests immediate door interaction state and shared-wall synchronization.
 */
// --- Logic Section ---

import { describe, expect, it } from 'vitest';
import type { MapperRoom } from './mapperTypes';
import { updateDoorInteractionState } from './doorInteractionState';

function room(id: string, direction: string, target: string, closed: boolean): MapperRoom {
  return {
    id, gmcpId: Number(id.replace(/\D/g, '')), name: '', desc: '', x: 0, y: 0, z: 0,
    zone: '', terrain: 'indoors', exits: { [direction]: { target, closed, hasDoor: true } },
    notes: '', createdAt: 0,
  };
}

describe('map door interaction state', () => {
  it('changes the tapped door immediately for the next tap', () => {
    const rooms = { m_1: room('m_1', 'e', 'm_2', true) };
    const opened = updateDoorInteractionState(rooms, 'm_1', 'e', false);
    expect(opened.m_1?.exits.e?.closed).toBe(false);
    expect(updateDoorInteractionState(opened, 'm_1', 'e', true).m_1?.exits.e?.closed).toBe(true);
  });

  it('updates the reciprocal exit for a shared wall', () => {
    const rooms = {
      m_1: room('m_1', 'e', 'm_2', true),
      m_2: room('m_2', 'w', 'm_1', true),
    };
    const opened = updateDoorInteractionState(rooms, 'm_1', 'e', false);
    expect(opened.m_1?.exits.e?.closed).toBe(false);
    expect(opened.m_2?.exits.w?.closed).toBe(false);
  });
});
