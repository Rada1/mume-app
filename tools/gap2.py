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

gap = content[pos:pos+136]
lines = []
for i in range(0, 136, 4):
    v = struct.unpack('>I', gap[i:i+4])[0]
    lines.append(f"  [{pos+i:5d}+{i:3d}]: {v:12d}  0x{v:08X}")
for l in lines:
    print(l)

# The gap has 136 bytes = 34 uint32s
# MMapper exitss: 10 exits * (uint32 dest + uint32 exit_flags + uint32 door_flags) = 10*12 = 120 bytes
# But also 10 door names (each a QString, but all null = 4 bytes each) = 10*4 = 40 bytes
# Total exits = 120 + 40 = 160 bytes... too much

# Maybe exits are stored differently. Let's see:
# 10 exits * (uint32 dest): 40 bytes
# Then some flags... 
# 10*4 = 40, 136-40 = 96...
# Or: 10 exits * (uint16 exit_flags + uint32 dest) = 10*6 = 60 bytes

# Pattern at 1178-1314 as int32s:
print("\n--- As signed int32 ---")
for i in range(0, 136, 4):
    v = struct.unpack('>i', gap[i:i+4])[0]
    print(f"  [{i:3d}]: {v:12d}  {'<-- possible vnum/exit?' if 0<v<150000 else ''}")
