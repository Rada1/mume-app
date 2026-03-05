import zlib, struct, collections

with open('arda.mm2', 'rb') as f:
    data = f.read()

content = zlib.decompress(data[12:])
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

xs = [v[0] for v in rooms.values()]
ys = [v[1] for v in rooms.values()]
zs = [v[2] for v in rooms.values()]
print(f'Total: {len(rooms)}')
print(f'X range: {min(xs)} to {max(xs)}')
print(f'Y range: {min(ys)} to {max(ys)}')
print(f'Z dist: {dict(sorted(collections.Counter(zs).most_common(10)))}')
print(f'30070 (Vigs): {rooms.get("30070")}')

# Check false positives - rooms where x=-1, z=-1 follow sequential vnum pattern
fps = [(k,v) for k,v in rooms.items() if v[0]==-1 and v[2]==-1]
print(f'False positives (x=-1, z=-1): {len(fps)}')
print(f'Sample: {fps[:5]}')

# Rooms with "real" looking coords (not sequential noise)
real = [(k,v) for k,v in rooms.items() if abs(v[0]) > 10 or abs(v[1]) > 10]
print(f'Likely real rooms (|x|>10 or |y|>10): {len(real)}')
