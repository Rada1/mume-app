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

const parseUnlinkedCharacterRow = (cleanLine: string, trimmedLine: string): CharacterEntry | null => {
    const match = trimmedLine.match(/^([a-zA-Z\u00C0-\u00FF-]{2,15})\s+.*?\bno\s+link\b\s+\S+(?:\s+.*)?$/i);
    if (!match || commandNames.has(match[1].toLowerCase())) return null;

    return {
        name: match[1],
        race: '',
        level: '',
        logon: 'no link',
        area: '',
        rent: '',
        rawLine: cleanLine
    };
};

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
    if (!columns) return parseUnlinkedCharacterRow(cleanLine, trimmedLine);

    const [, name, race, rest] = columns;
    const lowerName = name.toLowerCase();
    if (commandNames.has(lowerName)) return null;

    // A character that is already online can have only its wizard level and
    // "playing" status in the row (for example, "Ellessar Mw playing"). The
    // compact spacing makes the level look like the race column, so retain the
    // character instead of rejecting it as a row with no numeric level.
    if (/^playing\b/i.test(rest)) {
        return {
            name,
            race: '',
            sublevel: '',
            level: race,
            logon: 'playing',
            area: '',
            rent: '',
            rawLine: cleanLine
        };
    }

    const parts = rest.split(/\s+/);
    const hasSublevel = !levelColumn.test(parts[0]);
    const level = parts[hasSublevel ? 1 : 0];
    if (!level || !levelColumn.test(level)) return parseUnlinkedCharacterRow(cleanLine, trimmedLine);
    const sublevel = hasSublevel ? parts[0] : '';
    const remainder = parts.slice(hasSublevel ? 2 : 1).join(' ');
    if (!remainder) return parseUnlinkedCharacterRow(cleanLine, trimmedLine);

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
