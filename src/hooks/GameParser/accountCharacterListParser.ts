/**
 * @file accountCharacterListParser.ts
 * @description Parses character rows from MUME account list output.
 */

import type { CharacterEntry } from '../../types';

// --- Logic Section: Account Character Rows ---

const numberedCharacterRow = /^\s*(\d+)\)\s+([a-zA-Z]+)\s+(\d+)\s+([a-zA-Z\-]+)\s+(.*?)\s+(Yesterday|Today|[\d\w\s]+ago|Never)\s+(.*)$/i;
const characterColumns = /^([a-zA-Z\u00C0-\u00FF\-]{2,15})\s+(\S+)\s+(.+)$/;
const levelColumn = /^(?:\d{1,3}|[a-zA-Z]\d{1,3})$/;
const knownLogon = /^(\d+\s+(?:days?|yrs?|wks?|weeks?|months?|mths?|hours?|hrs?|minutes?|mins?|seconds?|secs?|years?)(?:\s+ago)?|Yesterday|Today|Never|now|new|Playing|no link|Retired|Dead)(?=\s|$)/i;
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

    // Sub can be blank and wizard levels can carry a letter prefix (for
    // example W27). Find Lvl before interpreting the changing Logon text.
    const columns = trimmedLine.match(characterColumns);
    if (!columns) return null;

    const [, name, race, rest] = columns;
    const lowerName = name.toLowerCase();
    if (commandNames.has(lowerName)) return null;

    const parts = rest.split(/\s+/);
    const hasSublevel = !levelColumn.test(parts[0]);
    const level = parts[hasSublevel ? 1 : 0];
    if (!level || !levelColumn.test(level)) return null;
    const sublevel = hasSublevel ? parts[0] : '';
    const remainder = parts.slice(hasSublevel ? 2 : 1).join(' ');
    if (!remainder) return null;

    const marker = remainder.match(knownLogon);
    const unknownColumns = remainder.split(/\s+/);
    const logon = marker?.[1] ?? (unknownColumns.length > 2
        ? unknownColumns.slice(0, -2).join(' ') : unknownColumns[0]);
    const trailingColumns = marker
        ? remainder.slice(marker[0].length).trim().split(/\s+/)
        : unknownColumns.slice(unknownColumns.length > 2 ? -2 : 1);
    return {
        name,
        race,
        sublevel,
        level: /^\d+$/.test(level) ? Number.parseInt(level, 10) : level,
        logon,
        area: trailingColumns[0] || '',
        rent: trailingColumns[1] || '',
        rawLine: cleanLine
    };
}
