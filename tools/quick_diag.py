import zlib, struct, json, collections

def read_qstring_be(data, pos):
    if pos + 4 > len(data):
        return None, pos
    length = struct.unpack('>I', data[pos:pos+4])[0]
    pos += 4
    if length == 0xFFFFFFFF:
        return '', pos
    if length > 65536 or pos + length > len(data):
        return None, pos
    text = data[pos:pos+length].decode('utf-16be', errors='replace')
    pos += length
    return text, pos

with open('arda.mm2', 'rb') as f:
    raw = f.read()

content = zlib.decompress(raw[12:])
print(f"Decompressed: {len(content)} bytes")

rooms = {}
pos = 0
attempts = 0
skips = 0

while pos < len(content) - 20:
    try:
        vnum, x, y, z, flags = struct.unpack('>IiiII', content[pos:pos+20])
        
        if not (0 < vnum < 150000):
            pos += 1
            skips += 1
            continue
        if not (-20000 < x < 20000 and -20000 < y < 20000 and -1000 < z < 1000):
            pos += 1
            skips += 1 
            continue

        name, name_end = read_qstring_be(content, pos + 20)
        if name is None or len(name) == 0 or len(name) > 100:
            pos += 1
            continue
        
        desc, desc_end = read_qstring_be(content, name_end)
        if desc is None:
            pos += 1
            continue
        
        rooms[str(vnum)] = {"x": x * 0.1, "y": y * 0.1, "z": z, "name": name}
        pos = desc_end
        
    except struct.error:
        pos += 1

print(f"Parsed {len(rooms)} rooms")
print(f"Sample rooms:")
for (k, v) in list(rooms.items())[:8]:
    print(f"  {k}: '{v['name']}' at ({v['x']:.1f},{v['y']:.1f},z={v['z']})")

if rooms:
    xs = [r['x'] for r in rooms.values()]
    ys = [r['y'] for r in rooms.values()]
    zs = [r['z'] for r in rooms.values()]
    print(f"\nX range: {min(xs):.1f} to {max(xs):.1f}")
    print(f"Y range: {min(ys):.1f} to {max(ys):.1f}")
    print(f"Z distribution: {dict(collections.Counter(zs).most_common(8))}")
    print(f"\nRoom 30070 (Vigs Shop): {rooms.get('30070')}")
