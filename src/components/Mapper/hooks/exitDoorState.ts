/**
 * @file Merges partial GMCP exit packets without losing door state.
 */
// --- Logic Section ---

import type { GmcpExitInfo } from '../../../types';
import type { MapperExit } from '../mapperTypes';

export interface MergedExitDoorState {
  name?: string;
  flags: string[];
  closed: boolean;
  hasDoor: boolean;
}

/**
 * Room.Info may be partial, while Room.UpdateExits is a state-change packet.
 * Per MUME's GMCP contract, an updated door without a `closed` flag is open.
 */
export function mergeExitDoorState(
  existing: MapperExit | undefined,
  update: GmcpExitInfo | number,
  isExitStateUpdate = false,
): MergedExitDoorState {
  const payload = typeof update === 'object' ? update : null;
  const hasFlags = payload !== null && Array.isArray(payload.flags);
  const flags = hasFlags ? [...payload.flags!] : [...(existing?.flags ?? [])];
  const doorReported = !!existing?.hasDoor || !!existing?.doorName || !!existing?.name
    || !!payload?.door || !!payload?.name
    || flags.some(flag => /door|gate|portcullis|secret/i.test(flag));
  const closed = hasFlags
    ? flags.some(flag => /^(?:closed|locked)$/i.test(flag))
    : isExitStateUpdate && doorReported
      ? false
      : existing?.closed ?? false;

  if (!hasFlags && isExitStateUpdate && !closed) {
    for (let index = flags.length - 1; index >= 0; index--) {
      if (/^(?:closed|locked)$/i.test(flags[index]!)) flags.splice(index, 1);
    }
  }
  const name = payload?.name || existing?.name || existing?.doorName;
  const hasDoor = closed
    || !!payload?.door
    || !!existing?.hasDoor
    || !!existing?.doorName
    || !!name
    || flags.some(flag => /door|gate|portcullis|secret/i.test(flag));

  return { name, flags, closed, hasDoor };
}
