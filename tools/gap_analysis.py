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

# Parse room 30070 completely
pos = 0
vnum, x, y, z, unk = struct.unpack('>Iiiii', content[pos:pos+20]); pos += 20
name, pos = read_qstring_be(content, pos)
desc, pos = read_qstring_be(content, pos)
s3, pos = read_qstring_be(content, pos)
s4, pos = read_qstring_be(content, pos)
s5, pos = read_qstring_be(content, pos)
print(f"After 5 strings: pos={pos}")

# Bytes 1178 to ~1314 (136 byte gap)
gap = content[pos:pos+136]
print(f"\n136-byte gap hexdump:")
for i in range(0, 136, 8):
    chunk = gap[i:i+8]
    hex_part = binascii.hexlify(chunk).decode()
    vals = " ".join(f"{b:3d}" for b in chunk)
    print(f"  [{pos+i:5d}]: {hex_part}  ({vals})")

# Parse gap as a sequence of uint32s to find patterns
print(f"\nGap as BE uint32 sequence:")
for i in range(0, 136, 4):
    v = struct.unpack('>I', gap[i:i+4])[0]
    print(f"  [{pos+i:5d}+{i:3d}]: {v:10d}  0x{v:08X}")
