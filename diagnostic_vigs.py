import zlib
import struct

with open('arda.mm2', 'rb') as f:
    data = f.read()
content = zlib.decompress(data[12:])

# Check pos 0 exactly
vnum, x, y, z, flags = struct.unpack('>iiiii', content[0:20])
print(f"Room at 0: vnum={vnum}, x={x}, y={y}, z={z}, flags={flags}")

print("Matches rule?")
print("0 < vnum < 150000:", 0 < vnum < 150000)
print("-5000 < x < 20000:", -5000 < x < 20000)
print("-5000 < y < 20000:", -5000 < y < 20000)
print("-100 < z < 100:", -100 < z < 100)
print("flags == 0:", flags == 0)

# Then why did it skip? Let's check the noise filter
has_noise = (x == -1 and y == -1) or (x == 0 and y == 0 and z == 0 and vnum < 1000)
print("Noise filter pass?", not has_noise)
