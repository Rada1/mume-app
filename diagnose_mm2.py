import zlib, struct, json, collections

with open('arda.mm2', 'rb') as f:
    data = f.read()

content = zlib.decompress(data[12:])
print(f"Decompressed size: {len(content)} bytes")

# Sliding window - what we're currently parsing
rooms = {}
i = 0
limit = len(content) - 16
while i < limit:
    vnum, x, y, z = struct.unpack('>iiii', content[i:i+16])
    if 0 < vnum < 150000 and -10000 < x < 10000 and -10000 < y < 10000 and -500 < z < 500:
        if str(vnum) not in rooms:
            rooms[str(vnum)] = (x, y, z)
            i += 15
    i += 1

print(f"\nFound {len(rooms)} rooms via heuristic")

# Show distribution of values
xs = [v[0] for v in rooms.values()]
ys = [v[1] for v in rooms.values()]
zs = [v[2] for v in rooms.values()]
print(f"X range: {min(xs)} to {max(xs)}")
print(f"Y range: {min(ys)} to {max(ys)}")
print(f"Z range: {min(zs)} to {max(zs)}")
print(f"Z distribution: {dict(sorted(collections.Counter(zs).most_common(20)))}")

# Check some known vnums
print(f"\nKnown rooms:")
print(f"  30070 (Vig's Shop): {rooms.get('30070')}")
print(f"  3 (Hobbiton):       {rooms.get('3')}")
print(f"  1 (The Shire?):     {rooms.get('1')}")

# Find suspicious consecutive vnums - if they have the same coords, those are false positives
print(f"\nSample rooms with low vnums:")
for v in sorted([int(k) for k in rooms.keys()])[:20]:
    print(f"  vnum={v}: {rooms[str(v)]}")
