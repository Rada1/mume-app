"""
Confirmed MMapper .mm2 binary format (per byte analysis of room 30070):
  Offset 0:  vnum  (uint32 BE) = 30070
  Offset 4:  x     (int32 BE)  = 674  
  Offset 8:  y     (int32 BE)  = 450
  Offset 12: z     (int32 BE)  = -35
  Offset 16: ????  (uint32 BE) = 0x00000000  <- unknown, always 0?  flags?
  Offset 20: Qt QString name   = 0x00000014 (20 bytes), then UTF-16BE "Vig's Shop"
  Offset 44: Qt QString desc   = ... next string
  ... more strings/fields ...
  Then the next room starts.

So rooms are variable-length records, concatenated.
We must parse sequentially from position 0.
"""

import zlib, struct, json, collections, binascii

def read_qstring_be(data, pos):
    """Read Qt QDataStream QString. Returns (text, new_pos) or (None, pos) on failure."""
    if pos + 4 > len(data):
        return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF:
        return '', pos
    if length > 100000 or pos + length > len(data):
        return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

with open('arda.mm2', 'rb') as f:
    raw = f.read()

content = zlib.decompress(raw[12:])
print(f"Decompressed: {len(content)} bytes")

# Parse sequentially from the beginning
# Room 30070 is confirmed to be at offset 0
rooms = {}
pos = 0

while pos < len(content) - 20:
    # Read fixedh header (20 bytes)
    if pos + 20 > len(content):
        break
    
    try:
        vnum, x, y, z, unknown = struct.unpack('>Iiiii', content[pos:pos+20])
    except struct.error:
        break
    
    # Sanity check
    if not (0 < vnum < 150000):
        break  # No more rooms
    if not (-30000 < x < 30000 and -30000 < y < 30000 and -5000 < z < 5000):
        break  # Invalid coords
    
    pos += 20
    
    # Read Qt QString name
    name, pos = read_qstring_be(content, pos)
    if name is None:
        print(f"  Failed to read name for vnum {vnum} at pos {pos}")
        break
    
    # Read Qt QString description
    desc, pos = read_qstring_be(content, pos)
    if desc is None:
        print(f"  Failed to read desc for vnum {vnum}")
        break
    
    # Skip any additional strings/bytes between rooms
    # We need to figure out the exact format from here
    # Let's just note what we got and peek at the next bytes
    
    rooms[str(vnum)] = {
        "x": x * 0.1,
        "y": y * 0.1, 
        "z": z,
        "name": name
    }
    
    if len(rooms) <= 5:
        print(f"\nRoom {vnum}: '{name}' at ({x}, {y}, z={z})")
        print(f"  Next 40 bytes: {binascii.hexlify(content[pos:pos+40]).decode()}")

print(f"\nTotal parsed: {len(rooms)}")
if rooms:
    room30070 = rooms.get('30070')
    print(f"Room 30070: {room30070}")
