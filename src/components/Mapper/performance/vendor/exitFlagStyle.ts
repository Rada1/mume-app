/**
 * @file Maps MMapper exit semantics to the named colors used by its renderer.
 */
// --- Logic Section ---

import { EXIT_FLAG } from '../model';
import { NC } from './palette';

/** Returns null when MMapper would use the normal exit color. */
export function exitFlagColor(flags: number, vertical = false): number | null {
  if (vertical && flags & EXIT_FLAG.CLIMB) return NC.VERTICAL_CLIMB;
  if (flags & EXIT_FLAG.NO_FLEE) return NC.WALL_NO_FLEE;
  if (flags & EXIT_FLAG.RANDOM) return NC.WALL_RANDOM;
  if (flags & (EXIT_FLAG.FALL | EXIT_FLAG.DAMAGE)) return NC.WALL_FALL_DAMAGE;
  if (flags & EXIT_FLAG.SPECIAL) return NC.WALL_SPECIAL;
  if (flags & EXIT_FLAG.CLIMB) return NC.WALL_CLIMB;
  if (flags & EXIT_FLAG.GUARDED) return NC.WALL_GUARDED;
  if (flags & EXIT_FLAG.NO_MATCH) return NC.WALL_NO_MATCH;
  if (flags & EXIT_FLAG.UNMAPPED) return NC.WALL_NOT_MAPPED;
  return null;
}
