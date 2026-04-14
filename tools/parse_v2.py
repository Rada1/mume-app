"""
Proper MMapper .mm2 parser based on actual format analysis.

Room structure (all Big Endian):
  [0-3]   vnum  (uint32 BE)
  [4-7]   x     (int32 BE) 
  [8-11]  y     (int32 BE)
  [12-15] z     (int32 BE)
  [16-19] flags (uint32 BE) - terrain/light/etc packed, or padding
  [20+]   Qt QString name: 4b length (byte count), then UTF-16BE chars
  [name_end+] Qt QString desc (same format)
  ... (more strings/fields follow)

Between rooms, once all strings are exhausted, the next 4 bytes are the next vnum.
"""

import re
import zlib, struct, json

def read_qstring_be(data, pos):
    """Read Qt QDataStream QString (4-byte BE length in bytes, then UTF-16BE)"""
    if pos + 4 > len(data):
        return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF:  # null string
        return '', pos
    if length > 65536 or pos + length > len(data):
        return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

def parse_mm2_v2(filepath, floor_height=5.0):
    with open(filepath, 'rb') as f:
        raw = f.read()

    content = b""
    for offset in range(32):
        try:
            content = zlib.decompress(raw[offset:])
            if len(content) > 10000:
                print(f"Decompressed from offset {offset}: {len(content)} bytes")
                break
        except:
            pass

    rooms = {}
    pos = 0

    while pos < len(content) - 20:
        # Try to read a room at this position
        try:
            vnum, x, y, z, flags = struct.unpack('>IiiII', content[pos:pos+20])

            # Sanity check on vnum and coordinates
            if not (0 < vnum < 150000):
                pos += 1
                continue
            if not (-20000 < x < 20000 and -20000 < y < 20000 and -1000 < z < 1000):
                pos += 1
                continue

            # Read name
            name_pos = pos + 20
            name, name_end = read_qstring_be(content, name_pos)
            if name is None:
                pos += 1
                continue
            
            # Read description
            desc, desc_end = read_qstring_be(content, name_end)
            if desc is None:
                pos += 1
                continue

            # If we got here and have a valid name, this is likely a real room
            if len(name) > 0 and len(name) < 100:
                rooms[str(vnum)] = {
                    "x": x * 0.1,
                    "y": y * 0.1,
                    "z": z,  # Store raw z, not scaled
                    "name": name
                }
                # Jump past what we've read
                pos = desc_end
                
                if len(rooms) <= 5:
                    print(f"  Room {vnum}: '{name}' at ({x},{y},{z})")
                elif len(rooms) % 1000 == 0:
                    print(f"  ...parsed {len(rooms)} rooms")
            else:
                pos += 1

        except struct.error:
            pos += 1

    print(f"\nTotal rooms: {len(rooms)}")
    return rooms, floor_height

rooms, floor_height = parse_mm2_v2('arda.mm2')

# Save to JSON
output = {}
for vnum, r in rooms.items():
    output[vnum] = [r['x'], r['y'], r['z']]  # Keep z as raw integer

with open('public/mume_map_data.json', 'w') as f:
    json.dump(output, f)

print(f"Saved {len(output)} rooms to public/mume_map_data.json")

# Show sample
if rooms:
    xs = [r['x'] for r in rooms.values()]
    ys = [r['y'] for r in rooms.values()]
    zs = [r['z'] for r in rooms.values()]
    import collections
    print(f"X range: {min(xs):.1f} to {max(xs):.1f}")
    print(f"Y range: {min(ys):.1f} to {max(ys):.1f}")
    print(f"Z dist: {dict(collections.Counter(zs).most_common(10))}")
