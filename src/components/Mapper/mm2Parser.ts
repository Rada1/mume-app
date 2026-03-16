import { MapperMarker } from './mapperTypes';

export type MapData = {
    rooms: Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean, flags?: string[] }>, string, string, string[], string[]]>;
    markers: Record<string, MapperMarker>;
};

export const parseMM2 = async (file: File, floorHeight = 1.0): Promise<MapData> => {
    return new Promise((resolve, reject) => {
        const isXML = file.name.toLowerCase().endsWith('.xml');

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const roomCoords: Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean, flags?: string[] }>, string, string, string[], string[]]> = {};
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
                        let x = 0, y = 0, z = 0;
                        const coordNode = room.getElementsByTagName("coord")[0];
                        if (coordNode) {
                            x = parseInt(coordNode.getAttribute("x") || "0", 10);
                            y = parseInt(coordNode.getAttribute("y") || "0", 10);
                            z = parseInt(coordNode.getAttribute("z") || "0", 10);
                        }

                        let terrain = 0;
                        const exits: Record<string, { target: string, hasDoor: boolean, flags?: string[] }> = {};
                        const exitNodes = room.getElementsByTagName("exit");
                        for (let j = 0; j < exitNodes.length; j++) {
                            const exitNode = exitNodes[j];
                            const dir = exitNode.getAttribute("dir");
                            const toNode = exitNode.getElementsByTagName("to")[0];
                            const doorAttr = exitNode.getAttribute("door");
                            
                            const flags: string[] = [];
                            const flagNodes = exitNode.getElementsByTagName("exitflag");
                            for (let k = 0; k < flagNodes.length; k++) {
                                if (flagNodes[k].textContent) flags.push(flagNodes[k].textContent.trim());
                            }
                            const flagsAttr = exitNode.getAttribute("flags");
                            if (flagsAttr) flagsAttr.split(',').forEach(f => flags.push(f.trim()));

                            if (dir && toNode && toNode.textContent) {
                                let d = dir.toLowerCase();
                                if (d === 'up') d = 'u';
                                else if (d === 'down') d = 'd';
                                else d = d.charAt(0);
                                
                                exits[d] = {
                                    target: toNode.textContent.trim(), // Sequential ID for now
                                    hasDoor: doorAttr === '1' || doorAttr === 'true' || flags.includes('DOOR'),
                                    flags: flags
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

                        parsedRooms.push({ idAttr, serverIdAttr, x, y, z, terrain, exits, name, mobFlags, loadFlags });

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
                                    x: x,
                                    y: -y,
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
                        roomCoords[pr.serverIdAttr] = [pr.x, -pr.y, pr.z * floorHeight, pr.terrain, pr.exits, pr.name, pr.serverIdAttr, pr.mobFlags, pr.loadFlags];
                    }

                    // Parse standalone markers - Use scale 80.0
                    const standaloneMarkers = xmlDoc.getElementsByTagName("marker");
                    const SCALE = 80.0;
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
                                x: mx,
                                y: -my,
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
                    rstr(); rstr(); // desc, contents
                    const internalId = ru32();
                    const serverId = version >= 40 ? ru32() : undefined;
                    rstr(); // note

                    const terrain = ru8();
                    ru8(); ru8(); ru8(); // light, align, portable
                    if (version >= 24) ru8(); // ridable
                    if (version >= 33) ru8(); // sundeath
                    const mobFlagsVal = version >= 33 ? ru32() : ru16();
                    const loadFlagsVal = version >= 33 ? ru32() : ru16();
                    if (version < 39) ru8(); // upToDate

                    const mobFlags: string[] = mobFlagsVal !== 0 ? [`BIN_MOB_${mobFlagsVal}`] : [];
                    const loadFlags: string[] = loadFlagsVal !== 0 ? [`BIN_LOAD_${loadFlagsVal}`] : [];

                    const x = ri32();
                    const y = ri32();
                    const z = ri32();

                    const DIRS = ['n', 's', 'e', 'w', 'u', 'd', 'out'];
                    const exits: Record<string, { target: string, hasDoor: boolean, flags?: string[] }> = {};

                    for (let e = 0; e < 7; e++) {
                        const exitFlags = version >= 33 ? ru16() : ru8();
                        const doorFlags = version >= 32 ? ru16() : ru8();
                        rstr(); // doorName

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
                            // Map binary flags to string if possible, or just numeric string
                            const flags: string[] = exitFlags !== 0 ? [`BIN_EXIT_${exitFlags}`] : [];
                            exits[DIRS[e]] = {
                                target: firstLink,
                                hasDoor: doorFlags !== 0,
                                flags: flags
                            };
                        }
                    }

                    const key = String(internalId);
                    roomCoords[key] = [x, -y, z * floorHeight, terrain, exits, name, String(serverId || key), mobFlags, loadFlags];
                }

                for (let i = 0; i < markCount; i++) {
                    const mType = ru32();
                    const mClass = rstr();
                    const mText = rstr();
                    const mx = ri32();
                    const my = ri32();
                    const mz = ri32();
                    if (version >= 33) ru32(); // color
                    
                    const mId = `mbin_${i}`;
                    markers[mId] = {
                        id: mId,
                        x: mx,
                        y: -my,
                        z: mz * floorHeight,
                        text: mText,
                        dotSize: 4,
                        fontSize: 12,
                        createdAt: Date.now()
                    };
                }

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
