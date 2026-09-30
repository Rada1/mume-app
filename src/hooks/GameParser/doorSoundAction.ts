/**
 * @file Recognizes successful MUME door state messages for sound feedback.
 */
// --- Logic Section ---

const DOOR_TARGET = '(?:door|gate|hatch|portcullis|exit)';

function actionMatches(line: string, verb: 'open' | 'close'): boolean {
  const target = new RegExp(`\\b${DOOR_TARGET}\\b`);
  const playerAction = new RegExp(`^you ${verb}\\b[^.!?]*\\b${DOOR_TARGET}\\b`);
  const actorAction = new RegExp(`\\b${verb}s\\b[^.!?]*\\b${DOOR_TARGET}\\b`);
  const targetAction = new RegExp(`\\b${DOOR_TARGET}\\b[^.!?]*\\b${verb}s\\b`);
  return target.test(line) && (playerAction.test(line) || actorAction.test(line) || targetAction.test(line));
}

/** Returns true for an opening, false for a closing, or null for no confirmed action. */
export function detectDoorSoundAction(message: string): boolean | null {
  const line = message.toLowerCase().trim().replace(/\s+/g, ' ');
  if (actionMatches(line, 'open')) return true;
  if (actionMatches(line, 'close')) return false;
  return null;
}
