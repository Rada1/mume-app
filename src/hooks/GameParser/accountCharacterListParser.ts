/**
 * @file accountCharacterListParser.ts
 * @description Parses character rows from MUME account list output.
 */

import type { CharacterEntry } from '../../types';

// --- Logic Section: Account Character Rows ---

const numberedCharacterRow = /^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i;
const logonMarker = /(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|mins?|secs?|ago|years?)|Yesterday|Today|Never|\bnew\b|\bPlaying\b|\bno link\b|\bRetired\b|\bDead\b)/i;
const commandNames = new Set([
    'play', 'create', 'new', 'time', 'list', 'move', 'password', 'add', 'info',
    'practice', 'link', 'lag', 'help', 'menu', 'quit', 'where'
]);

export function parseAccountCharacterRow(line: string): CharacterEntry | null {
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    const trimmedLine = cleanLine.trim();
    if (!trimmedLine) return null;

    const numberedMatch = trimmedLine.match(numberedCharacterRow);
    if (numberedMatch) {
        const [, index, name, level, race, sublevel, logon, rent] = numberedMatch;
        return {
            index: Number.parseInt(index, 10),
            name,
            level: Number.parseInt(level, 10),
            race,
            sublevel,
            logon,
            rent,
            area: '',
            rawLine: cleanLine
        };
    }

    const marker = trimmedLine.match(logonMarker);
    if (!marker || marker.index === undefined) return null;

    const name = trimmedLine.split(/\s+/)[0];
    const lowerName = name.toLowerCase();
    if (!/^[a-zA-Z\u00C0-\u00FF\-]{2,15}$/.test(name) || commandNames.has(lowerName)) {
        return null;
    }

    // Account list columns can shift with the server's output width. Identify a
    // row by its Rce/Sub/Lvl fields instead of assuming Logon starts at column 21.
    const prefixColumns = trimmedLine.slice(name.length, marker.index).trim().split(/\s+/);
    if (prefixColumns.length < 3 || !/^\d{1,3}$/.test(prefixColumns[2])) return null;

    const [race, sublevel, level] = prefixColumns;
    const trailingColumns = trimmedLine.slice(marker.index + marker[0].length).trim().split(/\s+/);
    return {
        name,
        race,
        sublevel,
        level: Number.parseInt(level, 10),
        logon: marker[1].trim(),
        area: trailingColumns[0] || '',
        rent: trailingColumns[1] || '',
        rawLine: cleanLine
    };
}
