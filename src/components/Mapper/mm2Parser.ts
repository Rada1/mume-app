export const parseMM2 = async (file: File, floorHeight = 5.0): Promise<Record<string, [number, number, number, number, Record<string, string | number>, string, string]>> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) throw new Error("Could not read file");

                const dv = new DataView(arrayBuffer);
                const magic = dv.getUint32(0, false);
                const version = dv.getUint32(4, false);

                if (magic !== 0xFFB2AF01) {
                    throw new Error(`Invalid magic: ${magic.toString(16)}`);
                }

                console.log(`[MM2 Parser] Version: ${version}`);

                // Check compression
                let compressedData: Uint8Array;
                if (version >= 34) {
                    // qCompress (QByteArray with int32 length prefix)
                    const baLen = dv.getUint32(8, false);
                    // The actual QByteArray has uncompressed length as 4 bytes BE, then zlib
                    // But in our python analysis, offset 12 is directly zlib 0x78 0x9c if baLen == uncompressed length!
                    // Let's rely on standard DecompressionStream which handles zlib if using 'deflate'
                    compressedData = new Uint8Array(arrayBuffer, 12);
                } else if (version >= 25) {
                    compressedData = new Uint8Array(arrayBuffer, 8);
                } else {
                    throw new Error(`Version ${version} not supported (no compression)?`);
                }

                // Decompress using Web Streams API
                // 'deflate' in Web Streams API actually means ZLIB (RFC 1950)
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
                    // UTF-16 BE
                    for (let i = 0; i < len / 2; i++) {
                        str += String.fromCharCode(ru16());
                    }
                    return str;
                };

                const roomCount = ru32();
                const markCount = ru32();
                // map position
                const currX = ri32();
                const currY = ri32();
                const currZ = ri32();

                console.log(`[MM2 Parser] Found ${roomCount} rooms to parse.`);

                const roomCoords: Record<string, [number, number, number, number, Record<string, string | number>, string, string]> = {};

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
                    const mobFlags = version >= 33 ? ru32() : ru16();
                    const loadFlags = version >= 33 ? ru32() : ru16();
                    const upToDate = version < 39 ? ru8() : 0;

                    const x = ri32();
                    const y = ri32();
                    const z = ri32();

                    const DIRS = ['n', 's', 'e', 'w', 'u', 'd', 'out'];
                    const exits: Record<string, string> = {};

                    // Exits
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
                            exits[DIRS[e]] = firstLink;
                        }
                    }

                    // For GMCP lookup later, we need the internalId as string key
                    const key = String(internalId);
                    roomCoords[key] = [
                        x,
                        -y, // INVERT Y-AXIS to match MUME
                        z * floorHeight,
                        terrain,
                        exits, // Real exits for drawing lines
                        name,
                        key // Keep the ID string handy
                    ];
                }

                resolve(roomCoords);

            } catch (err) {
                console.error("[MM2 Parser] Failed:", err);
                reject(err);
            }
        };

        reader.onerror = () => reject(new Error("File read error"));
        reader.readAsArrayBuffer(file);
    });
};
