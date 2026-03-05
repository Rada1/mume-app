"""
Definitive MMapper .mm2 parser.

Confirmed room binary layout (all Big Endian):
  [0-3]    uint32  vnum
  [4-7]    int32   x
  [8-11]   int32   y  
  [12-15]  int32   z (floor/level)
  [16-19]  uint32  unknown (0x00000000 for most rooms)
  [20...]  QString name  (4b length in bytes, then UTF-16BE)
  [...]    QString desc
  [...]    QString shortDesc (s3)
  [...]    QString note (s4)
  [...]    QString unused? (s5)
  
Then 136 bytes of exit + flag data:
  10 exits x 12 bytes each = 120 bytes:
    [0-3]   uint32  dest_vnum (0xFFFFFFFF = no exit)
    [4-7]   uint32  exit_flags
    [8-11]  uint32  door_flags
  Then 16 bytes room flags (4 x uint32 terrain/light/portab/ridable?)

Total room size = 20 + len(name_bytes)+4 + len(desc)+4 + len(s3)+4 + len(s4)+4 + len(s5)+4 + 136
"""

import zlib, struct, json, collections

def read_qstring_be(data, pos):
    """Qt QDataStream QString: 4-byte BE length (in bytes), then UTF-16BE data.
    0xFFFFFFFF means null/empty string."""
    if pos + 4 > len(data): return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF: return '', pos
    if length > 100000 or pos + length > len(data): return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

def parse_mm2_final(filepath, floor_height=5.0):
    with open(filepath, 'rb') as f:
        raw = f.read()

    # Decompress
    content = b""
    for offset in range(32):
        try:
            content = zlib.decompress(raw[offset:])
            if len(content) > 10000:
                print(f"Decompressed from offset {offset}: {len(content)} bytes")
                break
        except: pass

    if not content:
        print("Failed to decompress!")
        return {}

    rooms = {}
    exits_map = {}  # vnum -> {dir: dest_vnum}
    pos = 0
    exit_dirs = ['n', 's', 'e', 'w', 'u', 'd', 'ne', 'nw', 'se', 'sw']

    while pos < len(content) - 156:  # minimum room size
        saved_pos = pos
        try:
            # Fixed 20-byte header
            vnum, x, y, z, unk = struct.unpack('>Iiiii', content[pos:pos+20])
            pos += 20

            # Sanity check
            if not (0 < vnum < 200000):
                pos = saved_pos + 1
                continue
            if not (-50000 < x < 50000 and -50000 < y < 50000 and -5000 < z < 5000):
                pos = saved_pos + 1
                continue

            # 5 Qt QStrings
            name, pos = read_qstring_be(content, pos)
            if name is None: pos = saved_pos + 1; continue
            desc, pos = read_qstring_be(content, pos)
            if desc is None: pos = saved_pos + 1; continue
            s3, pos = read_qstring_be(content, pos)
            if s3 is None: pos = saved_pos + 1; continue
            s4, pos = read_qstring_be(content, pos)
            if s4 is None: pos = saved_pos + 1; continue
            s5, pos = read_qstring_be(content, pos)
            if s5 is None: pos = saved_pos + 1; continue

            # Must have a reasonable name
            if len(name) == 0 or len(name) > 200:
                pos = saved_pos + 1
                continue

            # 10 exits * 12 bytes each = 120 bytes
            exits = {}
            if pos + 120 > len(content):
                pos = saved_pos + 1
                continue
            
            for i, dir_name in enumerate(exit_dirs):
                dest_vnum, exit_flags, door_flags = struct.unpack('>III', content[pos:pos+12])
                pos += 12
                if dest_vnum != 0xFFFFFFFF and 0 < dest_vnum < 200000:
                    exits[dir_name] = dest_vnum

            # 16 bytes of room flags (terrain, light, etc.) = 4 x uint32
            if pos + 16 > len(content):
                pos = saved_pos + 1
                continue
            terrain_flags, light_flags, ridable_flags, portable_flags = struct.unpack('>IIII', content[pos:pos+16])
            pos += 16

            rooms[str(vnum)] = {
                'x': x * 0.1,
                'y': y * 0.1,
                'z': z,  # raw MMapper z level (NOT scaled)
                'name': name
            }
            exits_map[str(vnum)] = exits

            if len(rooms) <= 5 or len(rooms) % 2000 == 0:
                print(f"  Room {vnum}: '{name}' at ({x},{y},z={z}), exits={list(exits.keys())}")

        except struct.error:
            pos = saved_pos + 1

    print(f"\nTotal rooms: {len(rooms)}")

    if rooms:
        xs = [r['x'] for r in rooms.values()]
        ys = [r['y'] for r in rooms.values()]
        zs = [r['z'] for r in rooms.values()]
        print(f"X range: {min(xs):.1f} to {max(xs):.1f}")
        print(f"Y range: {min(ys):.1f} to {max(ys):.1f}")
        print(f"Z dist: {dict(collections.Counter(zs).most_common(10))}")
        print(f"\nRoom 30070 (Vig's Shop): {rooms.get('30070')}")

    return rooms, exits_map

rooms, exits_map = parse_mm2_final('arda.mm2')

# Build output: vnum -> [x, y, z]
# z is raw integer, we'll handle in the renderer
output = {vnum: [r['x'], r['y'], r['z']] for vnum, r in rooms.items()}

with open('public/mume_map_data.json', 'w') as f:
    json.dump(output, f)

print(f"\nSaved {len(output)} rooms to public/mume_map_data.json")
