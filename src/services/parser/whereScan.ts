/**
 * @file Parses the fixed-column player table printed by MUME's `where` command.
 */
// --- Logic Section ---

import type { WhereScanPlayer } from '../../types/whereScan';

function cleanWhereCell(value: string): string {
  return value
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

/** Parses data rows only; headings, separators, and empty-nearby notices are ignored. */
export function parseWhereScanPlayers(lines: readonly string[]): WhereScanPlayer[] {
  const players: WhereScanPlayer[] = [];
  for (const line of lines) {
    const columns = cleanWhereCell(line).split(/\s{2,}/).map(cleanWhereCell).filter(Boolean);
    if (columns.length < 3 || /^player$/i.test(columns[0] ?? '') || /^-+$/.test(columns[0] ?? '')) continue;
    const name = (columns[0] ?? '').replace(/^[!*=+?~-]+/, '').replace(/[*!~]+$/, '').trim();
    const room = columns[columns.length - 1] ?? '';
    const distance = columns[1] ?? '';
    const direction = columns.length > 3 ? columns.slice(2, -1).join(' ') : '';
    if (!name || !room || !distance || /^(?:no-?one|nobody)$/i.test(name)) continue;
    players.push({ name, distance, direction, room });
  }
  return players;
}
