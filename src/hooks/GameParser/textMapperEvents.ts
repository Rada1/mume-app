/**
 * @file textMapperEvents.ts
 * @description Builds mapper room updates from MUME XML/text output when GMCP is absent.
 */

import { GmcpExitInfo } from '../../components/Mapper/mapperTypes';
import { formatMovementArrow, getMovementDirectionLabel, normalizeMovementDirection } from '../../utils/movementDirections';

// --- Types Section ---
export interface TextMapperRoomEvent {
    num: number;
    name: string;
    desc?: string;
    area?: string;
    terrain?: string;
    exits?: Record<string, GmcpExitInfo>;
    source: 'text';
}

export interface TextMapperState {
    room?: Partial<TextMapperRoomEvent>;
    descLines: string[];
    exitLines: string[];
    inRoom: boolean;
}

export interface TextMapperResult {
    event?: TextMapperRoomEvent;
    roomName?: string;
    roomDesc?: string;
    roomZone?: string;
    terrain?: string;
    exits?: string[];
}

// --- Logic Section ---
const dirMap: Record<string, string> = {
    n: 'n', north: 'n',
    s: 's', south: 's',
    e: 'e', east: 'e',
    w: 'w', west: 'w',
    u: 'u', up: 'u',
    d: 'd', down: 'd',
    ne: 'ne', northeast: 'ne',
    nw: 'nw', northwest: 'nw',
    se: 'se', southeast: 'se',
    sw: 'sw', southwest: 'sw'
};

export const createTextMapperState = (): TextMapperState => ({
    descLines: [],
    exitLines: [],
    inRoom: false
});

export const decodeTextMapperEntities = (text: string) => text
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");

const stripTags = (text: string) => decodeTextMapperEntities(text.replace(/<[^>]+>/g, '')).trim();

const getTagText = (line: string, tagName: string) => {
    const match = line.match(new RegExp(`<${tagName}\\b[^>]*>(.*?)<\\/${tagName}>`, 'i'));
    return match?.[1] ? stripTags(match[1]) : null;
};

const getAttr = (attrs: string, name: string) => {
    const match = attrs.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>/]*))`, 'i'));
    if (!match) return undefined;
    return match[1] || match[2] || match[3];
};

export const extractXmlMovementDir = (line: string): string | null => {
    const decoded = decodeTextMapperEntities(line);
    const attrs = decoded.match(/<movement\b([^>]*)\/?>/i)?.[1];
    if (attrs === undefined) return null;

    const dir = getAttr(attrs, 'dir');
    if (!dir) return '';
    return normalizeMovementDirection(dir) || dir.toLowerCase();
};

export const formatXmlMovementLogText = (dir: string): string => (
    dir ? `Moved ${getMovementDirectionLabel(dir)}.` : 'Movement confirmed.'
);
export const formatXmlMovementArrow = (dir: string): string => formatMovementArrow(dir);

const parseExitLines = (lines: string[]): Record<string, GmcpExitInfo> | undefined => {
    const exits: Record<string, GmcpExitInfo> = {};

    for (const line of lines) {
        const clean = stripTags(line).replace(/^exits:\s*/i, '').trim();
        const longMatch = clean.match(/^(North|South|East|West|Up|Down|Northeast|Northwest|Southeast|Southwest)\s+-\s+(.+)$/i);
        if (longMatch) {
            exits[dirMap[longMatch[1].toLowerCase()]] = { name: longMatch[2].trim() };
            continue;
        }

        for (const token of clean.split(/[\s,]+/)) {
            const dir = dirMap[token.toLowerCase()];
            if (dir) exits[dir] = { name: token };
        }
    }

    return Object.keys(exits).length > 0 ? exits : undefined;
};

const finalize = (state: TextMapperState): TextMapperResult => {
    const room = state.room;
    if (!room?.name) return {};

    const desc = state.descLines.map(stripTags).filter(Boolean).join(' ');
    const parsedTextExits = parseExitLines(state.exitLines) || {};
    const exits = { ...room.exits, ...parsedTextExits };
    const hasAnyExits = Object.keys(exits).length > 0;

    const event: TextMapperRoomEvent = {
        num: room.num || 0,
        name: room.name,
        desc: desc || room.desc,
        area: room.area,
        terrain: room.terrain,
        exits: hasAnyExits ? exits : undefined,
        source: 'text'
    };

    return {
        event,
        roomName: event.name,
        roomDesc: event.desc,
        roomZone: event.area,
        terrain: event.terrain,
        exits: hasAnyExits ? Object.keys(exits) : undefined
    };
};

export const consumeTextMapperLine = (
    state: TextMapperState,
    line: string,
    isPromptBoundary: boolean
): TextMapperResult => {
    if (isPromptBoundary) {
        const result = finalize(state);
        Object.assign(state, createTextMapperState());
        return result;
    }

    const roomAttrs = line.match(/<room\b([^>]*)>/i)?.[1];
    if (roomAttrs !== undefined) {
        Object.assign(state, createTextMapperState());
        state.inRoom = true;
        const id = getAttr(roomAttrs, 'id');
        state.room = {
            num: id ? Number(id) || 0 : 0,
            area: decodeTextMapperEntities(getAttr(roomAttrs, 'area') || ''),
            terrain: decodeTextMapperEntities(getAttr(roomAttrs, 'terrain') || '')
        };
    }

    const name = getTagText(line, 'name');
    if (name) {
        state.inRoom = true;
        state.room = { ...(state.room || {}), name };
    }

    const description = getTagText(line, 'description');
    if (description) state.descLines.push(description);

    const exits = getTagText(line, 'exits');
    if (exits) state.exitLines.push(exits);

    // Parse individual <exit dir="..." to="..."> tags
    const exitMatch = line.match(/<exit\b([^>]*)\/?>/i);
    if (exitMatch) {
        const attrs = exitMatch[1];
        const dirAttr = getAttr(attrs, 'dir');
        if (dirAttr) {
            const dir = dirMap[dirAttr.toLowerCase()] || dirAttr.toLowerCase();
            if (dir) {
                if (!state.room) state.room = {};
                if (!state.room.exits) state.room.exits = {};
                const toVnum = getAttr(attrs, 'to') || getAttr(attrs, 'to_vnum') || getAttr(attrs, 'dest');
                state.room.exits[dir] = { 
                    name: dirAttr,
                    to_vnum: toVnum ? Number(toVnum) : undefined,
                    id: toVnum ? Number(toVnum) : undefined
                };
            }
        }
    }

    if (state.inRoom && /^(?:North|South|East|West|Up|Down|Northeast|Northwest|Southeast|Southwest)\s+-\s+/i.test(stripTags(line))) {
        state.exitLines.push(line);
    }

    if (/<\/room>/i.test(line)) {
        const result = finalize(state);
        Object.assign(state, createTextMapperState());
        return result;
    }

    return {};
};
