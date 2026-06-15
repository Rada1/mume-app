/**
 * @file shaperAsciiMap.ts
 * @description Automatically generates MUME-style ASCII connection maps for Shaper coordinates.
 */

import type { ShaperRoomDraft, ShaperWorkspaceDoc } from './shaperTypes';

// --- Logic Section ---

const getSectorChar = (room: ShaperRoomDraft): string => {
    const sector = room.sector || '';
    const flags = room.flags ?? [];
    if (['inside', 'building', 'city'].includes(sector)) return 'a';
    if (sector === 'brush') return 'b';
    if (sector === 'hills') return 'h';
    if (sector === 'mountain') return 'm';
    if (sector === 'field') return 'p';
    if (sector === 'forest') return 'f';
    if (sector === 'shallows') return '%';
    if (['water', 'rapids', 'underwater'].includes(sector)) return 'r';
    if (['tunnel', 'cavern'].includes(sector)) return 'c';
    if (flags.includes('trail')) return 't';
    return 'p';
};

const getRoomSuffix = (room: ShaperRoomDraft): string => {
    const [_, suffix] = (room.roomNumber || '').split(':');
    if (!suffix) return '00';
    if (/^\d+$/.test(suffix)) {
        if (suffix.length === 1) return `0${suffix}`;
        if (suffix.length >= 3) return suffix.slice(-3);
        return suffix;
    }
    return suffix.slice(0, 2);
};

const getCellText = (room: ShaperRoomDraft): string => {
    const sector = getSectorChar(room);
    const suffix = getRoomSuffix(room);
    if (suffix.length >= 3) return suffix.slice(-3);
    return `${sector}${suffix.padStart(2, '0')}`;
};

/**
 * Generates an ASCII connection map for all active rooms on the given Z level.
 */
export const generateShaperAsciiMap = (doc: ShaperWorkspaceDoc, z: number): string => {
    const levelRooms = Object.values(doc.rooms).filter(r => r.z === z && !r.inactive);
    if (levelRooms.length === 0) {
        return `(No active rooms on Z level ${z} to map)`;
    }

    // Determine bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const grid: Record<string, ShaperRoomDraft> = {};
    for (const room of levelRooms) {
        grid[`${room.x},${room.y}`] = room;
        if (room.x < minX) minX = room.x;
        if (room.x > maxX) maxX = room.x;
        if (room.y < minY) minY = room.y;
        if (room.y > maxY) maxY = room.y;
    }

    const legend = [
        'KEY:',
        'a  inside/city     f  forest        -  horizontal path',
        'b  brushy plains   h  hills         |  vertical path',
        'c  cavern/tunnel   m  mountains     ~  water path',
        'p  plains/fields   r  river/stream  +  road/trail path',
        't  trail room      %  shallows      D  door'
    ].join('\n');

    const lines: string[] = [legend, ''];

    for (let y = minY; y <= maxY; y += 1) {
        // Build Room Row
        let roomRow = '    ';
        for (let x = minX; x <= maxX; x += 1) {
            const room = grid[`${x},${y}`];
            if (room) {
                roomRow += getCellText(room);

                // Draw East connection if not at the right boundary
                if (x < maxX) {
                    const nextRoom = grid[`${x + 1},${y}`];
                    const eastExit = doc.exits[`${room.id}:e`];
                    const westExit = nextRoom ? doc.exits[`${nextRoom.id}:w`] : null;

                    if (eastExit || westExit) {
                        const hasDoor = eastExit?.hasDoor || westExit?.hasDoor;
                        const isWater = room.sector === 'water' || nextRoom?.sector === 'water';
                        const isRoad = room.sector === 'road' || nextRoom?.sector === 'road' ||
                            room.flags.includes('trail') || nextRoom?.flags.includes('trail');

                        if (hasDoor) {
                            roomRow += 'D-D';
                        } else if (isWater) {
                            roomRow += '~~~';
                        } else if (isRoad) {
                            roomRow += '+++';
                        } else {
                            roomRow += '---';
                        }
                    } else {
                        roomRow += '   ';
                    }
                }
            } else {
                roomRow += '   ';
                if (x < maxX) {
                    roomRow += '   ';
                }
            }
        }
        lines.push(roomRow.trimEnd());

        // Build 3 Vertical Connection Rows between room rows
        if (y < maxY) {
            for (let rowIdx = 0; rowIdx < 3; rowIdx += 1) {
                let connRow = '    ';
                for (let x = minX; x <= maxX; x += 1) {
                    const room = grid[`${x},${y}`];
                    const nextRoom = grid[`${x},${y + 1}`];
                    if (room && nextRoom) {
                        const southExit = doc.exits[`${room.id}:s`];
                        const northExit = doc.exits[`${nextRoom.id}:n`];

                        if (southExit || northExit) {
                            const hasDoor = southExit?.hasDoor || northExit?.hasDoor;
                            const isWater = room.sector === 'water' || nextRoom.sector === 'water';
                            const isRoad = room.sector === 'road' || nextRoom.sector === 'road' ||
                                room.flags.includes('trail') || nextRoom.flags.includes('trail');

                            if (hasDoor) {
                                connRow += 'D';
                            } else if (isWater) {
                                connRow += '~';
                            } else if (isRoad) {
                                connRow += '+';
                            } else {
                                connRow += '|';
                            }
                        } else {
                            connRow += ' ';
                        }
                    } else {
                        connRow += ' ';
                    }
                    // Align connection column width (6 characters total per cell column)
                    connRow += '     ';
                }
                lines.push(connRow.trimEnd());
            }
        }
    }

    return lines.join('\n');
};

import { createGridRoom } from './shaperDocument';
import { autoConnectAllRooms } from './shaperExits';
import type { ShaperSector, ShaperRoomFlag } from './shaperTypes';

/**
 * Parses the asciimap body text and populates the level's grid rooms and sectors.
 */
export const importFromAsciiMap = (doc: ShaperWorkspaceDoc, text: string, z: number): ShaperWorkspaceDoc => {
    const lines = text.split('\n');
    const keyToSector: Record<string, ShaperSector> = {};
    const keyToTrail: Record<string, boolean> = {};
    let insideKeySection = false;
    const mapLines: string[] = [];

    // 1. Parse Key Section & Map Lines
    lines.forEach(line => {
        const trimmed = line.trim();
        if (/^Key$/i.test(trimmed)) {
            insideKeySection = true;
            return;
        }
        if (insideKeySection && /^[=-]+$/.test(trimmed)) {
            return;
        }
        
        const keyMatch = line.match(/^\s*(\S+)\s*=\s*(.+)$/);
        if (insideKeySection && keyMatch) {
            const symbol = keyMatch[1];
            const desc = keyMatch[2].toLowerCase();
            let sector: ShaperSector = 'field';
            if (desc.includes('forest') || desc.includes('wood')) sector = 'forest';
            else if (desc.includes('water') || desc.includes('river') || desc.includes('stream') || desc.includes('lake') || desc.includes('ocean')) sector = 'water';
            else if (desc.includes('hill')) sector = 'hills';
            else if (desc.includes('mountain')) sector = 'mountain';
            else if (desc.includes('field') || desc.includes('brush') || desc.includes('plain') || desc.includes('grass') || desc.includes('steppe')) sector = 'field';
            else if (desc.includes('inside') || desc.includes('building') || desc.includes('city') || desc.includes('town')) sector = 'inside';
            else if (desc.includes('road') || desc.includes('path') || desc.includes('trail')) sector = 'road';
            else if (desc.includes('cavern') || desc.includes('cave') || desc.includes('tunnel')) sector = 'cavern';
            else if (desc.includes('shallows')) sector = 'shallows';

            keyToSector[symbol] = sector;
            if (desc.includes('trail')) {
                keyToTrail[symbol] = true;
            }
            return;
        }

        // Collect map lines (skip empty lines at the very beginning of the map block)
        if (insideKeySection) {
            // Stop parsing keys once we see lines that don't match "=" or key format,
            // which are the coordinate labels or grid characters
            mapLines.push(line);
        }
    });

    // Clean up empty lines from the map block start/end
    const firstNonEmpty = mapLines.findIndex(l => l.trim().length > 0);
    const lastNonEmpty = mapLines.map(l => l.trim().length > 0).lastIndexOf(true);
    if (firstNonEmpty < 0) return doc;
    const cleanMapLines = mapLines.slice(firstNonEmpty, lastNonEmpty + 1);

    // 2. Detect the map's left column offset
    let mapStartIndex = -1;
    cleanMapLines.forEach(line => {
        for (let i = 0; i < line.length; i += 1) {
            const char = line[i];
            // Ignore coordinates (numbers) and space, look for parsed key symbols
            if (char !== ' ' && !/^\d$/.test(char) && keyToSector[char]) {
                if (mapStartIndex === -1 || i < mapStartIndex) {
                    mapStartIndex = i;
                }
                break;
            }
        }
    });

    if (mapStartIndex === -1) return doc;

    // 3. Scan the grid and update/instantiate rooms
    const rooms = { ...doc.rooms };
    let docChanged = false;

    // Typically y ranges from 0 to cleanMapLines.length - 1 (capped at 10 to fit standard 10x10)
    const mapHeight = Math.min(10, cleanMapLines.length);
    for (let y = 0; y < mapHeight; y += 1) {
        const line = cleanMapLines[y];
        for (let x = 0; x < 10; x += 1) {
            const colIndex = mapStartIndex + x;
            if (colIndex >= line.length) continue;
            const char = line[colIndex];
            const sector = keyToSector[char];
            if (sector) {
                const targetRoom = Object.values(rooms).find(r => r.x === x && r.y === y && r.z === z);
                if (targetRoom) {
                    const nextFlags = [...(targetRoom.flags ?? [])];
                    if (keyToTrail[char] && !nextFlags.includes('trail')) {
                        nextFlags.push('trail');
                    }
                    rooms[targetRoom.id] = {
                        ...targetRoom,
                        sector,
                        flags: nextFlags as ShaperRoomFlag[],
                        status: targetRoom.status === 'new-draft' ? 'new-draft' : 'modified'
                    };
                } else {
                    const newRoom = createGridRoom(doc.zoneNumber, x, y, z);
                    newRoom.sector = sector;
                    if (keyToTrail[char]) {
                        newRoom.flags = ['trail'];
                    }
                    rooms[newRoom.id] = newRoom;
                }
                docChanged = true;
            }
        }
    }

    if (!docChanged) return doc;

    const nextDoc = { ...doc, rooms };
    nextDoc.exits = autoConnectAllRooms(rooms, doc.exits);
    return nextDoc;
};
