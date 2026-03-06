export const parseMM2 = async (file: File, floorHeight = 1.0): Promise<Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]>> => {
    return new Promise((resolve, reject) => {
        const isXML = file.name.toLowerCase().endsWith('.xml');

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                if (isXML) {
                    const text = e.target?.result as string;
                    if (!text) throw new Error("Could not read XML file");

                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(text, "text/xml");

                    const rooms = xmlDoc.getElementsByTagName("room");
                    console.log(`[XML Parser] Found ${rooms.length} rooms to parse.`);

                    const roomCoords: Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]> = {};

                    for (let i = 0; i < rooms.length; i++) {
                        const room = rooms[i];

                        const idAttr = room.getAttribute("id");
                        if (!idAttr) continue;

                        const serverIdAttr = room.getAttribute("server_id") || idAttr;
                        const name = room.getAttribute("name") || "Unknown";

                        let x = 0, y = 0, z = 0;
                        const coordNode = room.getElementsByTagName("coord")[0];
                        if (coordNode) {
                            x = parseInt(coordNode.getAttribute("x") || "0", 10);
                            y = parseInt(coordNode.getAttribute("y") || "0", 10);
                            z = parseInt(coordNode.getAttribute("z") || "0", 10);
                        }

                        // Just map to integer 0 for fallback, or we could parse terrain text.
                        // Usually terrain string is fine, but the old parser returns a number. We'll return 0 to default to 'Field' or let GMCP override it.
                        let terrain = 0;

                        const exits: Record<string, { target: string, hasDoor: boolean }> = {};
                        const exitNodes = room.getElementsByTagName("exit");
                        for (let j = 0; j < exitNodes.length; j++) {
                            const exitNode = exitNodes[j];
                            const dir = exitNode.getAttribute("dir");
                            const toNode = exitNode.getElementsByTagName("to")[0];
                            const doorAttr = exitNode.getAttribute("door");
                            if (dir && toNode && toNode.textContent) {
                                // Mume dir map
                                let d = dir.toLowerCase();
                                if (d === 'up') d = 'u';
                                else if (d === 'down') d = 'd';
                                else d = d.charAt(0);
                                exits[d] = {
                                    target: toNode.textContent.trim(),
                                    hasDoor: doorAttr === '1' || doorAttr === 'true'
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

                        // Key by internal `idAttr`. Index 6 holds the gmcp `serverIdAttr`
                        roomCoords[idAttr] = [
                            x,
                            -y, // Invert Y for MMapper logic
                            z * floorHeight,
                            terrain,
                            exits,
                            name,
                            serverIdAttr,
                            mobFlags,
                            loadFlags
                        ];
                    }

                    resolve(roomCoords);
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

                console.log(`[MM2 Parser] Version: ${version}`);

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
                const currX = ri32();
                const currY = ri32();
                const currZ = ri32();

                console.log(`[MM2 Parser] Found ${roomCount} rooms to parse.`);

                const roomCoords: Record<string, [number, number, number, number, Record<string, { target: string, hasDoor: boolean }>, string, string, string[], string[]]> = {};

                for (let i = 0; i < roomCount; i++) {
                    const area = version >= 42 ? rstr() : '';
                    const name = rstr();
                    const desc = rstr();
                    const contents = rstr();
                    const internalId = ru32();
                    const serverId = version >= 40 ? ru32() : undefined;
                    const note = rstr();

                    const terrain = ru8();
                    const light = ru8();
                    const align = ru8();
                    const portable = ru8();
                    const ridable = version >= 24 ? ru8() : 0;
                    const sundeath = version >= 33 ? ru8() : 0;
                    const mobFlagsVal = version >= 33 ? ru32() : ru16();
                    const loadFlagsVal = version >= 33 ? ru32() : ru16();
                    const upToDate = version < 39 ? ru8() : 0;

                    // Note: Binary format stores flags as bits. 
                    // For now we'll store them as string placeholders or numeric strings if we don't have a bitmask map yet.
                    // But usually people want the text labels from XML. 
                    // We'll store the raw numeric string for now to preserve the data.
                    const mobFlags: string[] = mobFlagsVal !== 0 ? [`BIN_MOB_${mobFlagsVal}`] : [];
                    const loadFlags: string[] = loadFlagsVal !== 0 ? [`BIN_LOAD_${loadFlagsVal}`] : [];

                    const x = ri32();
                    const y = ri32();
                    const z = ri32();

                    const DIRS = ['n', 's', 'e', 'w', 'u', 'd', 'out'];
                    const exits: Record<string, { target: string, hasDoor: boolean }> = {};

                    for (let e = 0; e < 7; e++) {
                        const exitFlags = version >= 33 ? ru16() : ru8();
                        const doorFlags = version >= 32 ? ru16() : ru8();
                        const doorName = rstr();

                        if (version < 38) {
                            while (ru32() !== 0xFFFFFFFF) { } // inbound
                        }

                        let firstLink: string | null = null;
                        while (true) {
                            const val = ru32();
                            if (val === 0xFFFFFFFF) break;
                            if (firstLink === null) firstLink = String(val);
                        }

                        if (firstLink) {
                            exits[DIRS[e]] = {
                                target: firstLink,
                                hasDoor: doorFlags !== 0
                            };
                        }
                    }

                    const key = String(internalId);
                    roomCoords[key] = [
                        x,
                        -y,
                        z * floorHeight,
                        terrain,
                        exits,
                        name,
                        String(serverId || key),
                        mobFlags,
                        loadFlags
                    ];
                }

                resolve(roomCoords);

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
