"""
After 5 strings (name, desc, s3, s4, s5) for room 30070, we're at pos=1178.
The bytes show a pattern:
  [1178-1181]: 0x00000002 = 2 (uint32 BE) - terrain?
  [1182-1185]: 0x00000002 = 2 (uint32 BE) - light?  
  [1186]: 0x20 = 32 = space byte - can't be right

Looking at the hex: ff ff ff ff ff ff 00 00 00 00 00 00 ... fff
Let me look at the FULL next-chunk from pos=930 (before str4/str5).

The 5 strings might not all be present. Let me try reading only 3 strings (name, desc, note) and 
then looking for exit/flag bytes.

Actually, let me search for vnum of next known room.
Room 30070 exits would lead to nearby rooms. Let me check what rooms are adjacente.
"""

import zlib, struct, binascii

def read_qstring_be(data, pos):
    if pos + 4 > len(data): return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF: return '', pos
    if length > 200000 or pos + length > len(data): return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

with open('arda.mm2', 'rb') as f:
    raw = f.read()
content = zlib.decompress(raw[12:])

pos = 0
vnum, x, y, z, unk = struct.unpack('>Iiiii', content[pos:pos+20]); pos += 20
name, pos = read_qstring_be(content, pos)
desc, pos = read_qstring_be(content, pos)
s3, pos = read_qstring_be(content, pos)
s4, pos = read_qstring_be(content, pos)
s5, pos = read_qstring_be(content, pos)
print(f"Room {vnum} '{name}' after all 5 strings at pos={pos}")
print(f"String lengths: name={len(name)}, desc={len(desc)}, s3={len(s3)}, s4={len(s4)}, s5={len(s5)}")
print(f"s3='{s3[:60]}'")
print(f"s4='{s4[:60]}'")
print(f"s5='{s5[:60]}'")

# Show the vicinity of where the next vnum might be
# From our earlier sliding window, room 30070 is at offset 0 and "room 1" at offset 20 (but that was raw)
# In the structured parse, we need to find the ACTUAL offset of the next room

print(f"\nSearching for valid vnums after pos={pos}...")
for offset in range(0, 500):
    p = pos + offset
    if p + 4 > len(content): break
    v = struct.unpack('>I', content[p:p+4])[0]
    if 0 < v < 150000:
        xx = struct.unpack('>i', content[p+4:p+8])[0]
        yy = struct.unpack('>i', content[p+8:p+12])[0]
        if -20000 < xx < 20000 and -20000 < yy < 20000:
            print(f"  offset +{offset} (pos={p}): vnum={v}, x={xx:.0f}, y={yy:.0f}")
            if offset < 50:
                print(f"    Hex [pos:pos+20]: {binascii.hexlify(content[p:p+20]).decode()}")
