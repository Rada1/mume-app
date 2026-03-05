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

print(f"After 5 strings, pos={pos}. Next 136 bytes:")
# Print each uint32 as both signed and unsigned
for i in range(0, 136, 4):
    u = struct.unpack('>I', content[pos+i:pos+i+4])[0]
    s = struct.unpack('>i', content[pos+i:pos+i+4])[0]
    flag = ''
    if 0 < u < 150000: flag = '<-- valid vnum range!'
    if u == 0xFFFFFFFF: flag = '<-- null/no exit'
    print(f"  [{i:3d}] u={u:12d}  s={s:12d}  0x{u:08X}  {flag}")

# The next room starts at pos+136 = 1314
print(f"\nAt pos={pos+136} (next room start):")
v2,x2,y2,z2 = struct.unpack('>IIii', content[pos+136:pos+152])
print(f"  vnum={v2} (0x{v2:08X}), x={x2}, y={y2} <- if this is a valid room")
