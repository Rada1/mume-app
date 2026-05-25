import { CompactMapExit, MapperMarker } from './mapperTypes';

type CompactRoomTuple = [number, number, number, number, Record<string, CompactMapExit>, string, string, string[], string[], string, number?, number?, string?, string?, string?, string?, string?, string?];

export type MapData = {
    rooms: Record<string, CompactRoomTuple>;
    markers: Record<string, MapperMarker>;
};

// MMapper flag name tables (bit index = flag position)
const MOB_FLAG_NAMES = [
    'RENT', 'SHOP', 'WEAPON_SHOP', 'ARMOUR_SHOP', 'FOOD_SHOP',
    'PET_SHOP', 'GUILD', 'SCOUT_GUILD', 'MAGE_GUILD', 'CLERIC_GUILD',
    'WARRIOR_GUILD', 'RANGER_GUILD', 'AGGRESSIVE_MOB', 'QUEST_MOB',
    'PASSIVE_MOB', 'ELITE_MOB', 'SUPER_MOB', 'MILKABLE', 'RATTLESNAKE',
];

const LOAD_FLAG_NAMES = [
    'TREASURE', 'ARMOUR', 'WEAPON', 'WATER', 'FOOD', 'HERB', 'KEY',
    'MULE', 'HORSE', 'PACK_HORSE', 'TRAINED_HORSE', 'ROHIRRIM', 'WARG',
    'BOAT', 'ATTENTION', 'TOWER', 'CLOCK', 'MAIL', 'STABLE',
    'WHITE_WORD', 'DARK_WORD', 'EQUIPMENT', 'COACH', 'FERRY', 'DEATHTRAP',
];

const EXIT_FLAG_NAMES = [
    'EXIT', 'DOOR', 'ROAD', 'CLIMB', 'RANDOM', 'SPECIAL', 'NO_MATCH',
    'FLOW', 'NO_FLEE', 'DAMAGE', 'FALL', 'GUARDED', 'UNMAPPED',
];

const DOOR_FLAG_NAMES = [
    'HIDDEN', 'NEED_KEY', 'NO_BLOCK', 'NO_BREAK', 'NO_PICK',
    'DELAYED', 'CALLABLE', 'KNOCKABLE', 'MAGIC', 'ACTION', 'NO_BASH',
];

const decodeBits = (val: number, names: string[]): string[] => {
    const result: string[] = [];
    for (let i = 0; i < names.length; i++) {
        if (val & (1 << i)) result.push(names[i]);
    }
    return result;
};

export const parseMM2 = async (file: File, floorHeight = 1.0): Promise<MapData> => {
    return new Promise((resolve, reject) => {
        const isXML = file.name.toLowerCase().endsWith('.xml');

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const roomCoords: Record<string, CompactRoomTuple> = {};
                const markers: Record<string, MapperMarker> = {};

                if (isXML) {
                    const text = e.target?.result as string;
                    if (!text) throw new Error("Could not read XML file");

                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "text/xml");

                    const rooms = xmlDoc.getElementsByTagName("room");
                    console.log(`[XML Parser] Found ${rooms.length} rooms to parse.`);

                    const idToServerId: Record<string, string> = {};
                    const parsedRooms: any[] = [];

                    for (let i = 0; i < rooms.length; i++) {
                        const room = rooms[i];
                        const idAttr = room.getAttribute("id");
                        if (!idAttr) continue;
                        const serverIdAttr = room.getAttribute("server_id") || idAttr;
                        idToServerId[idAttr] = serverIdAttr;

                        const name = room.getAttribute("name") || "Unknown";
                        const getFirstText = (tagName: string) => room.getElementsByTagName(tagName)[0]?.textContent?.trim() || "";
                        let x = 0, y = 0, z = 0;
                        const coordNode = room.getElementsByTagName("coord")[0];
                        if (coordNode) {
                            x = parseInt(coordNode.getAttribute("x") || "0", 10);
                            y = parseInt(coordNode.getAttribute("y") || "0", 10);
                            z = parseInt(coordNode.getAttribute("z") || "0", 10);
                        }

                        let terrain = 0;
                        const exits: Record<string, CompactMapExit> = {};
                        const exitNodes = room.getElementsByTagName("exit");
                        for (let j = 0; j < exitNodes.length; j++) {
                            const exitNode = exitNodes[j];
                            const dir = exitNode.getAttribute("dir");
                            const toNode = exitNode.getElementsByTagName("to")[0];
                            const doorAttr = exitNode.getAttribute("door");
                            const doorName = exitNode.getAttribute("doorname")?.trim();

                            const flags: string[] = [];
                            const flagNodes = exitNode.getElementsByTagName("exitflag");
                            for (let k = 0; k < flagNodes.length; k++) {
                                if (flagNodes[k].textContent) flags.push(flagNodes[k].textContent.trim().toUpperCase());
                            }
                            const flagsAttr = exitNode.getAttribute("flags");
                            if (flagsAttr) flagsAttr.split(',').forEach(f => { const t = f.trim().toUpperCase(); if (t) flags.push(t); });

                            const doorFlags: string[] = [];
                            const doorFlagNodes = exitNode.getElementsByTagName("doorflag");
                            for (let k = 0; k < doorFlagNodes.length; k++) {
                                if (doorFlagNodes[k].textContent) doorFlags.push(doorFlagNodes[k].textContent.trim().toUpperCase());
                            }
                            const doorFlagsAttr = exitNode.getAttribute("doorflags");
                            if (doorFlagsAttr) doorFlagsAttr.split(',').forEach(f => { const t = f.trim().toUpperCase(); if (t) doorFlags.push(t); });

                            if (dir && toNode && toNode.textContent) {
                                let d = dir.toLowerCase();
                                if (d === 'up') d = 'u';
                                else if (d === 'down') d = 'd';
                                else d = d.charAt(0);

                                exits[d] = {
                                    target: toNode.textContent.trim(),
                                    hasDoor: doorAttr === '1' || doorAttr === 'true' || flags.includes('DOOR'),
                                    doorName: doorName || undefined,
                                    flags,
                                    doorFlags: doorFlags.length > 0 ? doorFlags : undefined,
                                };
                            }
                        }

                        const mobFlags: string[] = [];
                        const mobNodes = room.getElementsByTagName("mobflag");
                        for (let j = 0; j < mobNodes.length; j++) {
                            if (mobNodes[j].textContent) mobFlags.push(mobNodes[j].textContent.trim());
                        }

                        const loadFlags: string[] = [];
                        const loadNodes = room.getElementsByTagName("loadflag");
                        for (let j = 0; j < loadNodes.length; j++) {
                            if (loadNodes[j].textContent) loadFlags.push(loadNodes[j].textContent.trim());
                        }

                        const lightNode = room.getElementsByTagName("light")[0];
                        const lightText = lightNode ? lightNode.textContent?.trim() : null;
                        const light = lightText === 'DARK' ? 1 : (lightText === 'LIT' ? 2 : 0);

                        const sundeathNode = room.getElementsByTagName("sundeath")[0];
                        const sundeathText = sundeathNode ? sundeathNode.textContent?.trim() : null;
                        const sundeath = sundeathText === 'NO_SUNDEATH' ? 0 : (sundeathText === 'SUNDEATH' ? 1 : undefined);
                        const area = getFirstText("area");
                        const align = getFirstText("align");
                        const portable = getFirstText("portable");
                        const ridable = getFirstText("ridable");
                        const note = getFirstText("note");
                        const contents = getFirstText("contents");
                        const description = getFirstText("description");

                        parsedRooms.push({ idAttr, serverIdAttr, x, y, z, terrain, exits, name, mobFlags, loadFlags, area, light, sundeath, align, portable, ridable, note, contents, description });

                        // Room markers
                        const roomMarkerNodes = room.getElementsByTagName("marker");
                        for (let j = 0; j < roomMarkerNodes.length; j++) {
                            const mNode = roomMarkerNodes[j];
                            const mTextNode = mNode.getElementsByTagName("text")[0];
                            const mText = mTextNode ? mTextNode.textContent : mNode.getAttribute("text");
                            if (mText) {
                                const mId = `mxml_${idAttr}_${j}`;
                                markers[mId] = {
                                    id: mId,
                                    x: x + 1, // Horizontal offset
                                    y: -y + 1, // Vertical offset
                                    z: z * floorHeight,
                                    text: mText.trim(),
                                    dotSize: 4,
                                    fontSize: 12,
                                    createdAt: Date.now()
                                };
                            }
                        }
                    }

                    // Second pass: Finalize rooms with server_id targets and store by server_id
                    for (const pr of parsedRooms) {
                        for (const dir in pr.exits) {
                            const targetId = pr.exits[dir].target;
                            if (idToServerId[targetId]) {
                                pr.exits[dir].target = idToServerId[targetId];
                            }
                        }
                        roomCoords[pr.serverIdAttr] = [pr.x + 1, -pr.y + 1, pr.z * floorHeight, pr.terrain, pr.exits, pr.name, pr.serverIdAttr, pr.mobFlags, pr.loadFlags, pr.area || "", pr.light, pr.sundeath, pr.align, pr.portable, pr.ridable, pr.note, pr.contents, pr.description];
                    }

                    // Parse standalone markers - Use scale 100.0 (Global Arda Alignment)
                    const standaloneMarkers = xmlDoc.getElementsByTagName("marker");
                    const SCALE = 100.0;
                    const X_OFFSET = 1;
                    const Y_OFFSET = 1;
                    for (let i = 0; i < standaloneMarkers.length; i++) {
                        const mNode = standaloneMarkers[i];
                        if (mNode.parentNode?.nodeName === 'room') continue;
                        
                        const mTextNode = mNode.getElementsByTagName("text")[0];
                        const mText = mTextNode ? mTextNode.textContent : mNode.getAttribute("text");
                        
                        let mx = 0, my = 0, mz = 0;
                        const pos1Node = mNode.getElementsByTagName("pos1")[0];
                        if (pos1Node) {
                            mx = parseInt(pos1Node.getAttribute("x") || "0", 10) / SCALE;
                            my = parseInt(pos1Node.getAttribute("y") || "0", 10) / SCALE;
                            mz = parseInt(pos1Node.getAttribute("z") || "0", 10);
                        } else {
                            mx = parseInt(mNode.getAttribute("x") || "0", 10) / SCALE;
                            my = parseInt(mNode.getAttribute("y") || "0", 10) / SCALE;
                            mz = parseInt(mNode.getAttribute("z") || "0", 10);
                        }

                        if (mText) {
                            const mId = `mxml_s_${i}`;
                            markers[mId] = {
                                id: mId,
                                x: mx + X_OFFSET,
                                y: -my + Y_OFFSET,
                                z: mz * floorHeight,
                                text: mText.trim(),
                                dotSize: 4,
                                fontSize: 13,
                                createdAt: Date.now()
                            };
                        }
                    }

                    resolve({ rooms: roomCoords, markers });
                    return;
                }

                // --- BINARY MM2 PARSER ---
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) throw new Error("Could not read file");

                const dv = new DataView(arrayBuffer);
                const magic = dv.getUint32(0, false);
                const version = dv.getUint32(4, false);

                if (magic !== 0xFFB2AF01) {
                    throw new Error(`Invalid magic: ${magic.toString(16)}`);
                }

                let compressedData: Uint8Array;
                if (version >= 34) {
                    compressedData = new Uint8Array(arrayBuffer, 12);
                } else if (version >= 25) {
                    compressedData = new Uint8Array(arrayBuffer, 8);
                } else {
                    throw new Error(`Version ${version} not supported (no compression)?`);
                }

                const ds = new DecompressionStream('deflate');
                const writer = ds.writable.getWriter();
                writer.write(compressedData as any);
                writer.close();

                const response = new Response(ds.readable);
                const decompressedBuffer = await response.arrayBuffer();
                const s = new DataView(decompressedBuffer);
                let offset = 0;

                const ru8 = () => { const v = s.getUint8(offset); offset += 1; return v; };
                const ru16 = () => { const v = s.getUint16(offset, false); offset += 2; return v; };
                const ru32 = () => { const v = s.getUint32(offset, false); offset += 4; return v; };
                const ri32 = () => { const v = s.getInt32(offset, false); offset += 4; return v; };
                const rf64 = () => { const v = s.getFloat64(offset, false); offset += 8; return v; };
                const rstr = () => {
                    const len = ru32();
                    if (len === 0xFFFFFFFF || len === 0) return '';
                    let str = '';
                    for (let i = 0; i < len / 2; i++) {
                        str += String.fromCharCode(ru16());
                    }
                    return str;
                };

                const roomCount = ru32();
                const markCount = ru32();
                ri32(); ri32(); ri32(); // currX, currY, currZ

                for (let i = 0; i < roomCount; i++) {
                    if (version >= 42) rstr(); // area
                    const name = rstr();
                    const description = rstr();
                    const contents = rstr();
                    const internalId = ru32();
                    const serverId = version >= 40 ? ru32() : undefined;
                    const note = rstr();

                    const terrain = ru8();
                    const light = ru8();
                    ru8(); ru8(); // align, portable
                    if (version >= 24) ru8(); // ridable
                    const sundeath = version >= 33 ? ru8() : 0;
                    const mobFlagsVal = version >= 33 ? ru32() : ru16();
                    const loadFlagsVal = version >= 33 ? ru32() : ru16();
                    if (version < 39) ru8(); // upToDate

                    const mobFlags: string[] = decodeBits(mobFlagsVal, MOB_FLAG_NAMES);
                    const loadFlags: string[] = decodeBits(loadFlagsVal, LOAD_FLAG_NAMES);

                    const x = ri32();
                    const y = ri32();
                    const z = ri32();

                    const DIRS = ['n', 's', 'e', 'w', 'u', 'd', 'out'];
                    const exits: Record<string, CompactMapExit> = {};

                    for (let e = 0; e < 7; e++) {
                        const exitFlagsVal = version >= 33 ? ru16() : ru8();
                        const doorFlagsVal = version >= 32 ? ru16() : ru8();
                        const doorName = rstr();

                        if (version < 38) {
                            while (ru32() !== 0xFFFFFFFF) { }
                        }

                        let firstLink: string | null = null;
                        while (true) {
                            const val = ru32();
                            if (val === 0xFFFFFFFF) break;
                            if (firstLink === null) firstLink = String(val);
                        }

                        if (firstLink) {
                            const exitFlagStrs = decodeBits(exitFlagsVal, EXIT_FLAG_NAMES);
                            const doorFlagStrs = decodeBits(doorFlagsVal, DOOR_FLAG_NAMES);
                            exits[DIRS[e]] = {
                                target: firstLink,
                                hasDoor: !!(exitFlagsVal & (1 << 1)), // DOOR bit
                                doorName: doorName || undefined,
                                flags: exitFlagStrs,
                                doorFlags: doorFlagStrs.length > 0 ? doorFlagStrs : undefined,
                            };
                        }
                    }

                    const key = String(internalId);
                    const X_OFFSET_BIN = 1;
                    const Y_OFFSET_BIN = 1;
                    roomCoords[key] = [x + X_OFFSET_BIN, -y + Y_OFFSET_BIN, z * floorHeight, terrain, exits, name, String(serverId || key), mobFlags, loadFlags, "", light, sundeath, undefined, undefined, undefined, note, contents, description];
                }

                // --- MARK / INFOMARK SECTION ---
                // MMapper writes marks as: u8 type, str className, f64 rotationAngle,
                // str text, 3xi32 pos1, 3xi32 pos2.
                // Format varies by version and we don't have the exact spec, so this is
                // wrapped in try/catch — any decode failure preserves the rooms and reports
                // what we got. The actual byte layout below was reverse-engineered.
                const X_OFFSET_BIN = 1;
                const Y_OFFSET_BIN = 1;
                let parsedMarks = 0;
                const markStartOffset = offset;

                // Helper: read u32 in LE for comparison
                const ru32LE = (off: number) => s.getUint32(off, true);
                const ru32BE = (off: number) => s.getUint32(off, false);

                // Diagnostic kept minimal — uncomment for debugging future format changes
                void ru32BE; void ru32LE;

                // Hex dump helper retained for future format-change debugging.
                const hexDump = (start: number, len: number) => {
                    const end = Math.min(start + len, s.byteLength);
                    const bytes: string[] = [];
                    const ascii: string[] = [];
                    for (let p = start; p < end; p++) {
                        const b = s.getUint8(p);
                        bytes.push(b.toString(16).padStart(2, '0'));
                        ascii.push(b >= 32 && b < 127 ? String.fromCharCode(b) : '.');
                    }
                    return `bytes ${start}..${end - 1}: ${bytes.join(' ')}\nascii: ${ascii.join('')}`;
                };

                // Reverse-engineered MMapper2 (v42) mark layout — verified by hand against hex dump:
                //   u32  textLenBytes  // BE; length of UTF-16 BE text in BYTES
                //   N    text          // UTF-16 BE chars (high byte first)
                //   u8   type          // 0=TEXT, 1=LINE, 2=ARROW
                //   5    mystery       // likely color/font flags; not needed for display
                //   3xi32 pos1 BE      // x, y, z in "fine" units (room_grid * 100), same as XML marks
                //   3xi32 pos2 BE      // x, y, z (same as pos1 for TEXT, different for LINE/ARROW)
                // Mark coordinates use 100x fine-grained units (same as MMapper XML format).
                // Divide by 100 to convert to room-grid space before applying the room-space offset.
                const MARK_SCALE = 100;
                try {
                    for (let i = 0; i < markCount; i++) {
                        const markOffsetBefore = offset;
                        try {
                            const textLen = ru32();
                            let mText = '';
                            for (let c = 0; c < textLen / 2; c++) {
                                mText += String.fromCharCode(ru16());
                            }
                            const mType = ru8();
                            // 5 mystery bytes (likely color/font/flags)
                            ru32();
                            ru8();
                            const mx1 = ri32();
                            const my1 = ri32();
                            const mz1 = ri32();
                            const mx2 = ri32();
                            const my2 = ri32();
                            const mz2 = ri32();

                            // verbose per-mark logging removed; enable for future debugging

                            // Only persist marks that have text content (TEXT marks).
                            // LINE/ARROW marks have empty text and are visual annotations — skip for now.
                            if (mText && mType === 0) {
                                const mId = `mbin_${i}`;
                                markers[mId] = {
                                    id: mId,
                                    x: mx1 / MARK_SCALE + X_OFFSET_BIN,
                                    y: -my1 / MARK_SCALE + Y_OFFSET_BIN,
                                    z: mz1 * floorHeight,
                                    text: mText,
                                    dotSize: 4,
                                    fontSize: 10,
                                    createdAt: Date.now()
                                };
                            }
                            parsedMarks++;
                            void mx2; void my2; void mz2;
                        } catch (perMarkErr) {
                            console.warn(`[Parser] Mark #${i} failed at byte ${markOffsetBefore}/${s.byteLength}:`, perMarkErr);
                            console.warn(`[Parser] Hex dump at failure:\n${hexDump(markOffsetBefore, 80)}`);
                            console.warn(`[Parser] Hex dump just before failure (last 16 bytes of prior mark):\n${hexDump(Math.max(0, markOffsetBefore - 16), 16)}`);
                            throw perMarkErr;
                        }
                    }
                } catch (e) {
                    console.warn(`[Parser] Mark section parse failed after ${parsedMarks}/${markCount} marks (started at byte ${markStartOffset}). Rooms preserved.`, e);
                }
                console.log(`[Parser] Decoded ${parsedMarks}/${markCount} marks from .mm2 (version ${version})`);

                resolve({ rooms: roomCoords, markers });

            } catch (err) {
                console.error("[Parser] Failed:", err);
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error("File read error"));

        if (isXML) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
};
